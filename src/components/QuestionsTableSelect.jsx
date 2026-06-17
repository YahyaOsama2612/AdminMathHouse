import React, { useEffect, useState } from "react";
import api from "../api/api";

const QuestionsTableSelect = ({
  value = [],
  onChange,
  error,
  lessonId,
  name,
}) => {
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState(""); // فلتر الصعوبة
  const [year, setYear] = useState(""); // فلتر السنة
  const [loading, setLoading] = useState(false);

  const limit = 10;

  // استدعاء البيانات عند تغير الصفحة، البحث، أو الفلاتر
  useEffect(() => {
    if (lessonId) {
      fetchQuestions();
    }
  }, [page, search, difficulty, year, lessonId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/api/admin/questions/${name}/${lessonId}`, {
        params: {
          page,
          limit,
          search,
          difficulty, // إرسال الفلتر للسيرفر
          year, // إرسال الفلتر للسيرفر
        },
      });

      const responseData = res.data.data;

      setQuestions(responseData.data);
      setTotalPages(responseData.pagination.totalPages);
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const isChecked = (id) => value.includes(id);

  // تشيك لو كل أسئلة الصفحة الحالية مختارة بالفعل
  const isAllCurrentPageSelected =
    questions.length > 0 && questions.every((q) => value.includes(q.id));

  // فانكشن الـ Add All / Remove All للصفحة الحالية
  const handleSelectAllToggle = () => {
    const currentPageIds = questions.map((q) => q.id);

    if (isAllCurrentPageSelected) {
      // إزالة أسئلة الصفحة الحالية فقط
      onChange(value.filter((id) => !currentPageIds.includes(id)));
    } else {
      // إضافة أسئلة الصفحة الحالية بدون تكرار
      const newSelection = Array.from(new Set([...value, ...currentPageIds]));
      onChange(newSelection);
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

      {/* Filters Section (البحث مع الفلاتر الجديدة) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Input Search */}
        <div className="relative md:col-span-2">
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

        {/* Difficulty Filter */}
        <div>
          <select
            value={difficulty}
            onChange={(e) => {
              setPage(1);
              setDifficulty(e.target.value);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm text-slate-600"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <input
            type="number"
            placeholder="Filter by Year (e.g. 2024)"
            value={year}
            onChange={(e) => {
              setPage(1);
              setYear(e.target.value);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
          />
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
                  disabled={loading || questions.length === 0}
                  checked={isAllCurrentPageSelected}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:opacity-40"
                />
              </th>
              <th className="p-4 text-left">Question</th>
              <th className="p-4 text-left">Difficulty</th>
              <th className="p-4 text-left">Year</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">
                  Loading questions...
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">
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
                      onChange={() => toggleSelect(q.id)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </td>

                  <td className="p-4 font-medium text-slate-700">
                    {q.question}
                  </td>

                  <td className="p-4">
                    <span className="px-2 py-1 text-xs bg-slate-100 rounded-md capitalize">
                      {q.difficulty}
                    </span>
                  </td>

                  <td className="p-4 text-slate-500">{q.year}</td>
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

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export default QuestionsTableSelect;
