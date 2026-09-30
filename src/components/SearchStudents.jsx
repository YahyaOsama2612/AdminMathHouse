import React, { useEffect, useRef, useState } from "react";
import api from "../api/api";

const SEARCH_DEBOUNCE_MS = 400;

const SearchStudents = ({ value = [], onChange, error, limit = 10 }) => {
  const [students, setStudents] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState(""); // اللي بيتكتب في الـ input
  const [q, setQ] = useState(""); // اللي بيتبعت للباك اند بعد الـ debounce
  const [loading, setLoading] = useState(false);

  // كل طالب ظهر في أي صفحة بنحفظه هنا، عشان نقدر نبعت اسمه مع الـ onChange
  // حتى لو المستخدم راح لصفحة تانية
  const knownStudentsRef = useRef(new Map());
  // عشان لو request قديم رجع متأخر مايغطيش على نتيجة أحدث
  const requestIdRef = useRef(0);

  // 🔹 Debounce للبحث: مابنبعتش request مع كل حرف
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, limit]);

  const fetchStudents = async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);

      const res = await api.get("/api/admin/groups/search-students", {
        params: { page, limit, q },
      });

      if (requestId !== requestIdRef.current) return; // response قديم

      const responseData = res?.data?.data || {};
      const list = responseData.data || [];
      const p = responseData.pagination || {};

      list.forEach((s) => knownStudentsRef.current.set(s.value, s));

      const totalPages = Math.max(1, Number(p.totalPages) || 1);
      setStudents(list);
      setPagination({
        total: Number(p.total) || 0,
        page: Number(p.page) || page,
        limit: Number(p.limit) || limit,
        totalPages,
      });

      // لو الصفحة الحالية بقت أكبر من عدد الصفحات (مثلاً النتايج قلّت)
      if (page > totalPages) setPage(totalPages);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error fetching students:", err);
      setStudents([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // بيبعت الـ ids زي الأول، وكمان الطلاب المختارين { id, name } كـ argument تاني
  const emitChange = (ids) => {
    const selected = ids.map((id) => {
      const s = knownStudentsRef.current.get(id);
      return {
        id,
        name: s?.label ? String(s.label).replace(/\s+/g, " ").trim() : "",
        nickname: s?.nickname || "",
        email: s?.email || "",
      };
    });
    onChange(ids, selected);
  };

  const toggleSelect = (id) => {
    if (value.includes(id)) {
      emitChange(value.filter((item) => item !== id));
    } else {
      emitChange([...value, id]);
    }
  };

  const isChecked = (id) => value.includes(id);

  // تحديد/إلغاء كل طلاب الصفحة الحالية
  const pageIds = students.map((s) => s.value);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => value.includes(id));
  const togglePage = () => {
    if (allPageSelected) {
      emitChange(value.filter((id) => !pageIds.includes(id)));
    } else {
      emitChange([...new Set([...value, ...pageIds])]);
    }
  };

  const { total, totalPages } = pagination;
  const from = total === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const to = Math.min(page * pagination.limit, total);
  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-700">
          Select Students
        </h3>

        <span className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">
          {value.length} Selected
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search student..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />

        <svg
          className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="p-4 w-16 text-center">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={togglePage}
                  disabled={loading || pageIds.length === 0}
                  title="Select all on this page"
                  className="w-4 h-4 accent-one cursor-pointer"
                />
              </th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Nickname</th>
              <th className="p-4 text-left">Email</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">
                  {q ? `No students match "${q}"` : "No students found"}
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr
                  key={s.value}
                  onClick={() => toggleSelect(s.value)}
                  className={`cursor-pointer transition hover:bg-slate-50 ${isChecked(s.value) ? "bg-indigo-50" : ""
                    }`}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked(s.value)}
                      onChange={() => toggleSelect(s.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-one cursor-pointer"
                    />
                  </td>

                  <td className="p-4 font-medium text-slate-700">
                    {String(s.label || "").trim()}
                  </td>

                  <td className="p-4 text-slate-500">{s.nickname}</td>

                  <td className="p-4 text-slate-500">{s.email}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2">
        <span className="text-xs text-slate-400">
          {total > 0
            ? `Showing ${from}–${to} of ${total} students`
            : "0 students"}
        </span>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Previous
          </button>

          <span className="text-sm text-slate-500">
            Page <span className="font-medium text-slate-700">{page}</span> of{" "}
            <span className="font-medium text-slate-700">{totalPages}</span>
          </span>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next →
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export default SearchStudents;