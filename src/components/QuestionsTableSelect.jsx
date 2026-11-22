import React, { useEffect, useState } from "react";
import Select from "react-select";
import api from "../api/api";
import QuestionPhoto from "./QuestionPhoto";

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
  courseId, // with no lesson picked, every question of this course is listed ("All lessons")
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

  // "Full module": add every question of one module (exam code + year + month + section) in one go
  const [mode, setMode] = useState("pick"); // pick | module
  const [modules, setModules] = useState({ loading: false, error: "", list: null });
  const [moduleKey, setModuleKey] = useState("");
  const [moduleQs, setModuleQs] = useState({ loading: false, error: "", list: [] });
  const [moduleNote, setModuleNote] = useState("");
  const keyOf = (m) => `${m.codeId}|${m.year ?? "none"}|${m.month ?? "none"}|${m.sectionId ?? "none"}`;
  const labelOf = (m) =>
    `${m.code} · ${[m.month, m.year].filter(Boolean).join(" ") || "No date"} · ${m.sectionName || "No section"} — ${m.count} question${m.count === 1 ? "" : "s"}`;
  const pickedModule = (modules.list || []).find((m) => keyOf(m) === moduleKey) || null;

  useEffect(() => {
    if (mode !== "module" || !courseId || modules.list || modules.loading) return;
    setModules({ loading: true, error: "", list: null });
    api.get("/api/admin/questions/modules", { params: { courseId } })
      .then((r) => setModules({ loading: false, error: "", list: r.data?.data?.modules || [] }))
      .catch(() => setModules({ loading: false, error: "Could not load the modules", list: [] }));
  }, [mode, courseId, modules.list, modules.loading]);
  // a different course → reload its modules
  useEffect(() => { setModules({ loading: false, error: "", list: null }); setModuleKey(""); }, [courseId]);

  useEffect(() => {
    setModuleNote("");
    if (!pickedModule) { setModuleQs({ loading: false, error: "", list: [] }); return undefined; }
    let alive = true;
    setModuleQs({ loading: true, error: "", list: [] });
    api.get(`/api/admin/questions/course/${courseId}`, {
      params: {
        page: 1, limit: 2000, codeId: pickedModule.codeId,
        year: pickedModule.year ?? "none", month: pickedModule.month ?? "none", sectionId: pickedModule.sectionId ?? "none",
      },
    })
      .then((r) => alive && setModuleQs({ loading: false, error: "", list: r.data?.data?.data || [] }))
      .catch(() => alive && setModuleQs({ loading: false, error: "Could not load this module's questions", list: [] }));
    return () => { alive = false; };
  }, [moduleKey, courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const moduleIds = moduleQs.list.map((q) => q.id);
  const moduleInExam = moduleIds.filter((id) => value.includes(id)).length;
  const addModule = () => {
    const missing = moduleIds.filter((id) => !value.includes(id));
    if (maxQuestions > 0) {
      const room = Math.max(0, maxQuestions - value.length);
      onChange([...value, ...missing.slice(0, room)]);
      setModuleNote(missing.length > room ? `Only ${room} more question${room === 1 ? "" : "s"} fit (the limit is ${maxQuestions}), so the first ${room} were added.` : "");
    } else {
      onChange([...value, ...missing]);
      setModuleNote("");
    }
  };
  const removeModule = () => { onChange(value.filter((id) => !moduleIds.includes(id))); setModuleNote(""); };

  const limit = 10;

  // إعادة ضبط الصفحة إلى 1 عند تغير الـ lessonId
  useEffect(() => {
    setPage(1);
  }, [lessonId, courseId]);

  // تأخير البحث لتجنب كثرة الطلبات أثناء الكتابة
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // استدعاء البيانات عند تغير الصفحة، البحث، أو الفلاتر
  useEffect(() => {
    if (lessonId || courseId) {
      fetchQuestions();
    } else {
      setQuestions([]);
      setTotalPages(1);
    }
  }, [page, debouncedSearch, difficulty, year, month, lessonId, courseId]);

  useEffect(() => {
    if (maxQuestions > 0 && value.length > maxQuestions) {
      onChange(value.slice(0, maxQuestions));
    }
  }, [maxQuestions, value]);

  const isLesson = !name || name === "lesson";

  const fetchQuestions = async () => {
    if (!lessonId && !courseId) return;
    try {
      setLoading(true);

      const endpoint = !lessonId
        ? `/api/admin/questions/course/${courseId}`
        : name
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

  /** one question row — click anywhere on it to select / unselect */
  const renderRow = (q, showLesson) => {
    const on = isChecked(q.id);
    const full = !on && maxQuestions > 0 && value.length >= maxQuestions;
    return (
      <tr
        key={q.id}
        onClick={() => !full && toggleSelect(q.id)}
        title={full ? `You already picked ${maxQuestions} questions` : on ? "Click to remove" : "Click to select"}
        className={`transition-colors ${full ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${on ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50"}`}
      >
        <td className="p-4 text-center">
          <input
            type="checkbox"
            checked={on}
            disabled={full}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelect(q.id)}
            className="w-4 h-4 accent-[#7d0a0a] cursor-pointer"
          />
        </td>
        <td className="p-4 font-medium text-slate-700 min-w-[220px]">
          <QuestionPhoto id={q.id} image={q.image} text={q.question} size="sm" inCard />
          {showLesson && q.lesson?.name && <p className="text-[11px] text-slate-400 mt-1">{q.lesson.name}</p>}
        </td>
        <td className="p-4">
          <span className="px-2 py-1 text-xs bg-slate-100 rounded-md capitalize">{q.difficulty || "—"}</span>
        </td>
        <td className="p-4 text-slate-500">{q.year || "—"}</td>
        <td className="p-4 text-slate-500">{q.month || "—"}</td>
      </tr>
    );
  };
  const tableHead = (checkbox) => (
    <thead className="bg-gray-50 text-gray-400 text-[11px] font-extrabold uppercase tracking-wider">
      <tr>
        <th className="p-4 w-16 text-center">{checkbox}</th>
        <th className="p-4 text-left">Question</th>
        <th className="p-4 text-left">Difficulty</th>
        <th className="p-4 text-left">Year</th>
        <th className="p-4 text-left">Month</th>
      </tr>
    </thead>
  );
  const modeSwitch = courseId ? (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-fit" role="tablist" aria-label="How to add questions">
      {[["pick", "Pick questions"], ["module", "Full module"]].map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
          className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === k ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
          {label}
        </button>
      ))}
    </div>
  ) : null;

  if (mode === "module" && courseId) {
    const allIn = moduleIds.length > 0 && moduleInExam === moduleIds.length;
    return (
      <div className="w-full bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {modeSwitch}
          <span className="px-3 py-1 text-xs bg-red-50 text-one rounded-full font-bold">{value.length} Selected</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Module — exam code · month year · section</label>
          <Select
            options={(modules.list || []).map((m) => ({ value: keyOf(m), label: labelOf(m) }))}
            value={pickedModule ? { value: moduleKey, label: labelOf(pickedModule) } : null}
            onChange={(opt) => setModuleKey(opt ? opt.value : "")}
            isClearable
            isSearchable
            isLoading={modules.loading}
            placeholder={modules.loading ? "Loading modules…" : "Search e.g. SAT Nov 2024 Section 1"}
            noOptionsMessage={() => (modules.error || "No module in this course")}
            className="text-sm font-medium"
            classNamePrefix="select"
            styles={{
              control: (base, state) => ({
                ...base, borderRadius: "0.75rem", minHeight: "42px",
                borderColor: state.isFocused ? "#7d0a0a" : "#e5e7eb",
                boxShadow: state.isFocused ? "0 0 0 2px rgba(125, 10, 10, 0.15)" : "none",
                "&:hover": { borderColor: state.isFocused ? "#7d0a0a" : "#cbd5e1" },
              }),
              menu: (base) => ({ ...base, zIndex: 50, borderRadius: "0.75rem", overflow: "hidden" }),
            }}
          />
          {modules.error && <p className="text-xs text-red-500 mt-1">{modules.error}</p>}
        </div>

        {pickedModule && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">{labelOf(pickedModule).split(" — ")[0]}</p>
              <p className="text-xs text-gray-500">
                {moduleQs.loading ? "Loading questions…" : `${moduleInExam} of ${moduleIds.length} in this exam`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {moduleInExam > 0 && (
                <button type="button" onClick={removeModule} className="px-4 py-2 text-xs font-semibold rounded-lg border bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100">
                  Remove module
                </button>
              )}
              <button type="button" onClick={addModule} disabled={moduleQs.loading || !moduleIds.length || allIn}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-one text-white hover:brightness-110 disabled:opacity-40">
                {allIn ? "All added ✓" : `Add all ${moduleIds.length - moduleInExam} question${moduleIds.length - moduleInExam === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
        {moduleNote && <p className="text-xs font-semibold text-amber-700">{moduleNote}</p>}

        {pickedModule && (
          <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              {tableHead(null)}
              <tbody className="divide-y divide-slate-100">
                {moduleQs.loading ? (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-400">Loading questions...</td></tr>
                ) : moduleQs.error ? (
                  <tr><td colSpan="5" className="p-6 text-center text-red-500">{moduleQs.error}</td></tr>
                ) : !moduleQs.list.length ? (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-400">No questions found</td></tr>
                ) : (
                  moduleQs.list.map((q) => renderRow(q, true))
                )}
              </tbody>
            </table>
          </div>
        )}
        {!pickedModule && !modules.loading && (
          <p className="text-sm text-slate-400 text-center py-6">Pick a module to add all its questions at once. You can still untick single questions after.</p>
        )}

        {error && (
          <p className="text-sm text-red-500 font-medium">
            {typeof error === "object" ? error.message || JSON.stringify(error) : String(error)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-5">
      {modeSwitch}
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 text-xs font-medium bg-red-50 text-one rounded-full font-bold">
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
                : "bg-one text-white border-transparent hover:brightness-110"
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
            className="a-inp !pl-10"
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
              placeholder={courseId ? "All lessons (whole course)" : "Select Lesson..."}
              className="text-sm font-medium"
              classNamePrefix="select"
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderRadius: "0.75rem",
                  borderColor: state.isFocused ? "#7d0a0a" : "#e5e7eb",
                  backgroundColor: state.isFocused ? "#ffffff" : "#f8fafc",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(125, 10, 10, 0.15)"
                    : "none",
                  minHeight: "42px",
                  "&:hover": {
                    borderColor: state.isFocused ? "#7d0a0a" : "#cbd5e1",
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
            className="a-inp cursor-pointer"
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
            className="a-inp cursor-pointer"
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
            className="a-inp cursor-pointer"
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

      {/* Table — click anywhere on a row to select / unselect it */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-400 text-[11px] font-extrabold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-16 text-center">
                <input
                  type="checkbox"
                  disabled={loading || (!lessonId && !courseId) || questions.length === 0}
                  checked={isAllCurrentPageSelected}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 accent-[#7d0a0a] cursor-pointer disabled:opacity-40"
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
            ) : !lessonId && !courseId ? (
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
              questions.map((q) => renderRow(q, !lessonId))
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
          className="a-btn disabled:opacity-40"
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
          className="a-btn disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 font-medium">
          {typeof error === "object" ? error.message || JSON.stringify(error) : String(error)}
        </p>
      )}
    </div>
  );
};

export default QuestionsTableSelect;
