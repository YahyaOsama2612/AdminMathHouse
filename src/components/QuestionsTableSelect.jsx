import React, { useEffect, useState } from "react";
import Select from "react-select";
import api from "../api/api";

const MONTH_OPTIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: currentYear - 2000 + 1 },
  (_, i) => currentYear - i
);

const QuestionsTableSelect = ({
  value = [],
  onChange,
  error,
  lessonId,
  name,
  maxQuestions,
  lessons = [],
  onLessonChange,
}) => {
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [difficulty, setDifficulty] = useState(""); // فلتر الصعوبة
  const [year, setYear] = useState(""); // فلتر السنة
  const [month, setMonth] = useState(""); // فلتر الشهر
  const [loading, setLoading] = useState(false);

  const limit = 10;

  // إعادة ضبط الصفحة إلى 1 عند تغير الـ lessonId
  useEffect(() => {
    setPage(1);
  }, [lessonId]);

  // تأخير البحث لتجنب كثرة الطلبات أثناء الكتابة
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // استدعاء البيانات عند تغير الصفحة، البحث، أو الفلاتر
  useEffect(() => {
    if (lessonId) {
      fetchQuestions();
    } else {
      setQuestions([]);
      setTotalPages(1);
    }
  }, [page, debouncedSearch, difficulty, year, month, lessonId]);

  useEffect(() => {
    if (maxQuestions > 0 && value.length > maxQuestions) {
      onChange(value.slice(0, maxQuestions));
    }
  }, [maxQuestions, value]);

  const isLesson = !name || name === "lesson";

  const fetchQuestions = async () => {
    if (!lessonId) return;
    try {
      setLoading(true);

      const endpoint = name
        ? `/api/admin/questions/${name}/${lessonId}`
        : `/api/admin/questions/lesson/${lessonId}`;

      const params = {
        page,
        limit,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (difficulty) params.difficulty = difficulty;
      if (year) params.year = year;
      if (month) params.month = month;

      const res = await api.get(endpoint, { params });

      const responseData = res.data?.data;

      const questionsList =
        responseData?.data ||
        responseData?.questions ||
        res.data?.questions ||
        (Array.isArray(responseData) ? responseData : []) ||
        [];

      setQuestions(questionsList);
      setTotalPages(
        responseData?.pagination?.totalPages ||
          res.data?.pagination?.totalPages ||
          (responseData?.pagination?.total
            ? Math.ceil(responseData.pagination.total / limit)
            : questionsList.length >= limit
            ? page + 1
            : Math.max(page, 1)) ||
          1,
      );
    } catch (err) {
      console.error("Error fetching questions:", err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }

    if (maxQuestions > 0 && value.length >= maxQuestions) {
      return;
    }

    onChange([...value, id]);
  };

  const isChecked = (id) => value.includes(id);

  // تشيك لو كل أسئلة الصفحة الحالية مختارة بالفعل
  const isAllCurrentPageSelected =
    questions.length > 0 && questions.every((q) => value.includes(q.id));

  // فانكشن الـ Add All / Remove All للصفحة الحالية
  const handleSelectAllToggle = () => {
    const currentPageIds = questions.map((q) => q.id);

    if (isAllCurrentPageSelected) {
      onChange(value.filter((id) => !currentPageIds.includes(id)));
      return;
    }

    const availableQuestions = currentPageIds.filter(
      (id) => !value.includes(id),
    );

    if (maxQuestions > 0) {
      const remaining = maxQuestions - value.length;

      const idsToAdd = availableQuestions.slice(0, remaining);

      onChange([...value, ...idsToAdd]);
    } else {
      onChange([...new Set([...value, ...availableQuestions])]);
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">
          {value.length} Selected
        </span>

        {/* زرار Add All / Remove All الصريح */}
        {questions.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAllToggle}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isAllCurrentPageSelected
                ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                : "bg-indigo-600 text-white border-transparent hover:bg-indigo-700"
            }`}
          >
            {isAllCurrentPageSelected ? "Deselect Page" : "Add All From Page"}
          </button>
        )}
      </div>

      {/* Filters Section (البحث مع الفلاتر) */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
          lessons && lessons.length > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"
        } gap-4`}
      >
        {/* Input Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search question..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
          />
          <svg
            className="absolute left-3 top-3 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m1.85-5.65a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
            />
          </svg>
        </div>

        {/* Lesson Filter if lessons passed */}
        {lessons && lessons.length > 0 && (
          <div>
            <Select
              options={lessons}
              value={
                lessons.find(
                  (opt) => String(opt.value) === String(lessonId)
                ) || null
              }
              onChange={(opt) => {
                if (onLessonChange) {
                  onLessonChange(opt ? opt.value : "");
                }
              }}
              isClearable
              isSearchable
              placeholder="Select Lesson..."
              className="text-sm font-medium"
              classNamePrefix="select"
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderRadius: "0.75rem",
                  borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
                  backgroundColor: state.isFocused ? "#ffffff" : "#f8fafc",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(99, 102, 241, 0.2)"
                    : "none",
                  minHeight: "42px",
                  "&:hover": {
                    borderColor: state.isFocused ? "#6366f1" : "#cbd5e1",
                  },
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 50,
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  boxShadow:
                    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                }),
              }}
            />
          </div>
        )}

        {/* Difficulty Filter */}
        <div>
          <select
            value={difficulty}
            onChange={(e) => {
              setPage(1);
              setDifficulty(e.target.value);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm text-slate-600 cursor-pointer"
          >
            <option value="">All Difficulties</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <select
            value={year}
            onChange={(e) => {
              setPage(1);
              setYear(e.target.value);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm text-slate-600 cursor-pointer"
          >
            <option value="">All Years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <select
            value={month}
            onChange={(e) => {
              setPage(1);
              setMonth(e.target.value);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm text-slate-600 cursor-pointer"
          >
            <option value="">All Months</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="p-4 w-16 text-center">
                <input
                  type="checkbox"
                  disabled={loading || !lessonId || questions.length === 0}
                  checked={isAllCurrentPageSelected}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:opacity-40"
                />
              </th>
              <th className="p-4 text-left">Question</th>
              <th className="p-4 text-left">Difficulty</th>
              <th className="p-4 text-left">Year</th>
              <th className="p-4 text-left">Month</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">
                  Loading questions...
                </td>
              </tr>
            ) : !lessonId ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-amber-600 font-medium">
                  Please select a lesson to load and choose questions
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">
                  No questions found
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr
                  key={q.id}
                  className={`transition hover:bg-slate-50 ${
                    isChecked(q.id) ? "bg-indigo-50" : ""
                  }`}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked(q.id)}
                      disabled={
                        !isChecked(q.id) &&
                        maxQuestions > 0 &&
                        value.length >= maxQuestions
                      }
                      onChange={() => toggleSelect(q.id)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </td>

                  <td className="p-4 font-medium text-slate-700">
                    {q.question}
                  </td>

                  <td className="p-4">
                    <span className="px-2 py-1 text-xs bg-slate-100 rounded-md capitalize">
                      {q.difficulty || "—"}
                    </span>
                  </td>

                  <td className="p-4 text-slate-500">{q.year || "—"}</td>

                  <td className="p-4 text-slate-500">{q.month || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((prev) => prev - 1)}
          className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition"
        >
          ← Previous
        </button>

        <span className="text-sm text-slate-500">
          Page <span className="font-medium text-slate-700">{page}</span> of{" "}
          <span className="font-medium text-slate-700">{totalPages}</span>
        </span>

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => setPage((prev) => prev + 1)}
          className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition"
        >
          Next →
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 font-medium">
          {typeof error === "object"
            ? error.message || JSON.stringify(error)
            : String(error)}
        </p>
      )}
    </div>
  );
};

export default QuestionsTableSelect;
