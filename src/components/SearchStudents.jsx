import React, { useEffect, useState } from "react";
import api from "../api/api";

const SearchStudents = ({ value = [], onChange, error ,limit=10 }) => {
  const [students, setStudents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setSearch] = useState("");
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    fetchStudents();
  }, [page, q]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      const res = await api.get("/api/admin/groups/search-students", {
        params: {
          page,
          limit,
          q,
        },
      });

      const responseData = res.data.data;

      setStudents(responseData.data);
      setTotalPages(responseData.pagination.totalPages);
    } catch (err) {
      console.error("Error fetching students:", err);
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
          value={q}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
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
              <th className="p-4 w-16"></th>
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
                  No students found
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr
                  key={s.value}
                  className={`transition hover:bg-slate-50 ${
                    isChecked(s.value) ? "bg-indigo-50" : ""
                  }`}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked(s.value)}
                      onChange={() => toggleSelect(s.value)}
                      className="w-4 h-4 accent-one cursor-pointer"
                    />
                  </td>

                  <td className="p-4 font-medium text-slate-700">
                    {s.label}
                  </td>

                  <td className="p-4 text-slate-500">
                    {s.nickname}
                  </td>

                  <td className="p-4 text-slate-500">
                    {s.email}
                  </td>
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
          {error}
        </p>
      )}
    </div>
  );
};

export default SearchStudents;