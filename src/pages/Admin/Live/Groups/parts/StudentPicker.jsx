import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import api from "@/api/api";

/* Student multi-picker in the MathPortal design (Groups form, Extra Homework form).
   Same data source and contract as components/SearchStudents.jsx:
   GET /api/admin/groups/search-students?page&limit&q → onChange(ids, selected[{id,name,nickname,email}]).
   `known` (optional) = [{id,name,nickname,email}] for students already selected (e.g. on edit),
   so the "selected" strip can show their names before they appear in a search page. */

const DEBOUNCE_MS = 400;
const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function StudentPicker({ value = [], onChange, known = [], limit = 20, error }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit });
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [, force] = useState(0);
  const knownRef = useRef(new Map());
  const reqRef = useRef(0);

  // students we already know by id (initial selection on edit)
  const knownKey = known.map((s) => s?.id).join(",");
  useEffect(() => {
    let added = false;
    known.forEach((s) => {
      if (s?.id && !knownRef.current.has(s.id)) {
        knownRef.current.set(s.id, { value: s.id, label: s.name, nickname: s.nickname, email: s.email });
        added = true;
      }
    });
    if (added) force((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownKey]);

  useEffect(() => {
    const t = setTimeout(() => { setQ(input.trim()); setPage(1); }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    const id = ++reqRef.current;
    setLoading(true);
    api.get("/api/admin/groups/search-students", { params: { page, limit, q } })
      .then((res) => {
        if (id !== reqRef.current) return;
        const d = res?.data?.data || {};
        const list = d.data || [];
        const p = d.pagination || {};
        list.forEach((s) => knownRef.current.set(s.value, s));
        const totalPages = Math.max(1, Number(p.totalPages) || 1);
        setRows(list);
        setMeta({ total: Number(p.total) || 0, totalPages, limit: Number(p.limit) || limit });
        if (page > totalPages) setPage(totalPages);
      })
      .catch(() => { if (id === reqRef.current) setRows([]); })
      .finally(() => { if (id === reqRef.current) setLoading(false); });
  }, [page, q, limit]);

  const emit = (ids) => {
    const selected = ids.map((id) => {
      const s = knownRef.current.get(id);
      return { id, name: s?.label ? String(s.label).replace(/\s+/g, " ").trim() : "", nickname: s?.nickname || "", email: s?.email || "" };
    });
    onChange(ids, selected);
  };
  const toggle = (id) => emit(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const pageIds = rows.map((s) => s.value);
  const allOn = pageIds.length > 0 && pageIds.every((id) => value.includes(id));
  const togglePage = () => emit(allOn ? value.filter((id) => !pageIds.includes(id)) : [...new Set([...value, ...pageIds])]);

  const from = meta.total === 0 ? 0 : (page - 1) * meta.limit + 1;
  const to = Math.min(page * meta.limit, meta.total);
  const nameOf = (id) => {
    const s = knownRef.current.get(id);
    return s?.label ? String(s.label).replace(/\s+/g, " ").trim() : "Student";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search name, nickname, email or phone…" className="a-inp !pl-9 !bg-gray-50 focus:!bg-white" />
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-one self-start sm:self-auto whitespace-nowrap">{value.length} selected</span>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {value.slice(0, 40).map((id) => (
            <span key={id} className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-1 py-1 rounded-md bg-red-50 text-one max-w-full">
              <span className="truncate">{nameOf(id)}</span>
              <button type="button" onClick={() => toggle(id)} className="rounded hover:bg-one hover:text-white p-0.5" aria-label={`Remove ${nameOf(id)}`}><X size={12} /></button>
            </span>
          ))}
          {value.length > 40 && <span className="text-[11px] font-semibold text-gray-400 px-1 py-1">+{value.length - 40} more</span>}
          <button type="button" onClick={() => emit([])} className="text-[11px] font-bold text-gray-400 hover:text-red-600 px-1">Clear</button>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="a-th w-10">
                  <input type="checkbox" checked={allOn} onChange={togglePage} disabled={loading || !pageIds.length} className="w-4 h-4 accent-[#7d0a0a] cursor-pointer" aria-label="Select all students on this page" title="Select all on this page" />
                </th>
                <th className="a-th">Name</th>
                <th className="a-th">Nickname</th>
                <th className="a-th">Email</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td className="a-td" colSpan={4}><div className="skel h-6" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-400">{q ? `No students match “${q}”.` : "No students found."}</td></tr>
              ) : rows.map((s) => {
                const on = value.includes(s.value);
                return (
                  <tr key={s.value} onClick={() => toggle(s.value)} className={`cursor-pointer ${on ? "bg-red-50/40" : "a-tr"}`}>
                    <td className="a-td"><input type="checkbox" checked={on} readOnly className="w-4 h-4 accent-[#7d0a0a] pointer-events-none" aria-label={`Select ${s.label}`} /></td>
                    <td className="a-td">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shrink-0" style={{ background: on ? "#7d0a0a" : "#cbd5e1" }}>{initials(s.label)}</span>
                        <span className="font-semibold text-gray-800 truncate">{String(s.label || "").trim()}</span>
                      </div>
                    </td>
                    <td className="a-td font-semibold text-one">{s.nickname || "—"}</td>
                    <td className="a-td text-gray-600">{s.email || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{meta.total > 0 ? <>Showing <b className="text-gray-800">{from}–{to}</b> of <b className="text-gray-800">{meta.total}</b> students</> : "0 students"}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="a-act disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={15} /></button>
            <span className="text-xs font-semibold">Page {page} of {meta.totalPages}</span>
            <button type="button" disabled={page >= meta.totalPages || loading} onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} className="a-act disabled:opacity-30" aria-label="Next page"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-600 mt-2">{String(error)}</p>}
    </div>
  );
}
