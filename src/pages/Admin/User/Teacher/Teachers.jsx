import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, KeyRound, CalendarDays, Clock } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pager } from "@/components/ReusableTable";
import { SkelRows, fmtDay, fmtTime } from "@/components/admin/kit";
import { Avatar, CARD_BTN_GRAY, CARD_BTN_RED, LoadError, SearchInput, SELECT } from "../parts/people";

/* Users → Teachers (MathPortal design "teachers"): each card shows the days the teacher shared,
   hours per week, sessions this week, open requests and the next session.
   GET /api/admin/teacher/overview · DELETE /api/admin/teacher/:id */

const PAGE = 12;
const DAYS = [["Saturday", "Sa"], ["Sunday", "Su"], ["Monday", "Mo"], ["Tuesday", "Tu"], ["Wednesday", "We"], ["Thursday", "Th"], ["Friday", "Fr"]];

const Stat = ({ label, value, warn }) => (
  <div className={`rounded-lg px-2.5 py-2 ${warn ? "bg-amber-50" : "bg-gray-50"}`}>
    <p className={`text-[9px] font-extrabold uppercase tracking-wider ${warn ? "text-amber-700" : "text-gray-400"}`}>{label}</p>
    <p className={`text-base font-extrabold ${warn ? "text-amber-700" : "text-gray-800"}`}>{value}</p>
  </div>
);

export default function Teachers() {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/teacher/overview");
  const { deleteData } = useDelete();
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");
  const [shared, setShared] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);

  const all = useMemo(() => data?.data?.teachers || [], [data]);
  const courses = useMemo(() => [...new Set(all.flatMap((t) => t.courses))].sort(), [all]);
  const ql = q.trim().toLowerCase();
  const list = all.filter((t) => (!ql || `${t.name} ${t.email} ${t.phone} ${t.courses.join(" ")}`.toLowerCase().includes(ql))
    && (!course || t.courses.includes(course))
    && (!shared || (shared === "yes" ? t.availableDays : !t.availableDays)));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE, cur * PAGE);
  const set = (fn) => (v) => { fn(v); setPage(1); };

  const confirmDelete = async () => {
    try { await deleteData(`/api/admin/teacher/${selectedRow.id}`); setSelectedRow(null); refetch(); } catch (err) { console.error(err); }
  };

  const card = (t) => (
    <article key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <Avatar name={t.name} src={t.avatar} solid shape="rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">{t.name}</p>
          <p className="text-[11px] text-gray-500 truncate">Teacher · {t.courses.join(", ") || "No courses yet"}</p>
          <p className="text-[11px] text-gray-400 truncate">{t.email}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Available days</p>
          {!t.availableDays && <p className="text-[10px] font-bold text-red-600">Not set yet</p>}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(([full, short]) => {
            const on = t.availableDays?.includes(full);
            return <span key={full} title={full} className={`h-7 rounded-md text-[10px] font-bold flex items-center justify-center ${on ? "bg-one text-white" : "bg-gray-100 text-gray-400"}`}>{short}</span>;
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="Hours / week" value={`${t.hoursPerWeek}h`} />
        <Stat label="This week" value={t.weekSessions} />
        <Stat label="Requests" value={t.pendingRequests} warn={t.pendingRequests > 0} />
      </div>

      <p className="text-[11px] text-gray-500 mt-2.5 truncate">
        {t.next ? <>Next: <b className="text-gray-700">{fmtDay(t.next.day)}, {fmtTime(t.next.timeFrom)}</b> · {t.next.name}</> : "Nothing booked yet."}
      </p>

      <div className="mt-auto pt-3 space-y-1.5">
        <button type="button" onClick={() => navigate("/admin/reports/teachers")} className="w-full h-9 rounded-lg text-xs font-bold text-white bg-one hover:bg-one/90">Profile, ratings & sessions</button>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => navigate("/admin/live/teacher")} className={CARD_BTN_GRAY}><CalendarDays className="w-3.5 h-3.5" /> Schedule</button>
          <button type="button" onClick={() => navigate("/admin/live/teacher?tab=availability")} className={CARD_BTN_GRAY}><Clock className="w-3.5 h-3.5" /> Available times</button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" onClick={() => navigate(`/admin/users/teachers/edit/${t.id}`)} className={CARD_BTN_GRAY}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          <button type="button" onClick={() => navigate(`/admin/users/teachers/edit/${t.id}`)} className={CARD_BTN_GRAY} title="Change the password on the edit page"><KeyRound className="w-3.5 h-3.5" /> Password</button>
          <button type="button" onClick={() => setSelectedRow(t)} className={CARD_BTN_RED}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        </div>
      </div>
    </article>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-bold text-xl text-gray-800">Teachers</h1>
          <p className="text-xs text-gray-400">Teacher accounts, their available times and what is booked for them this week.</p>
        </div>
        <button type="button" onClick={() => navigate("/admin/users/teachers/add")} className="a-btn primary"><Plus className="w-4 h-4" /> Add teacher</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <SearchInput className="col-span-2 md:flex-1 md:min-w-[220px]" label="Search teachers" value={q} onChange={set(setQ)} placeholder="Search name, course, email or phone…" />
        <select aria-label="Course" value={course} onChange={(e) => set(setCourse)(e.target.value)} className={SELECT}><option value="">All courses</option>{courses.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Availability" value={shared} onChange={(e) => set(setShared)(e.target.value)} className={SELECT}><option value="">All teachers</option><option value="yes">Shared their times</option><option value="no">Times not set</option></select>
        <span className="text-xs text-gray-400 md:ml-auto">{list.length} of {all.length}</span>
      </div>

      {loading && !data ? <SkelRows n={6} />
        : error && !data ? <LoadError text={error} onRetry={refetch} />
        : shown.length ? <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">{shown.map(card)}</div>
        : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
            <p className="font-bold text-gray-700">{q || course || shared ? "No teachers match" : "No teachers yet"}</p>
          </div>
        )}

      {pages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
          <Pager currentPage={cur} totalPages={pages} setPage={setPage} shown={shown.length} total={list.length} label="teachers" />
        </div>
      )}

      <ConfirmDeleteModal open={!!selectedRow} onClose={() => setSelectedRow(null)} onConfirm={confirmDelete}
        title="Delete Teacher" description={`Are you sure you want to delete "${selectedRow?.name}"? This can’t be undone.`} />
    </div>
  );
}
