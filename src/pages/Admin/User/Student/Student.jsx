import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, ClipboardList, Package, Trash2, UserRound, Users, BarChart3 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pager } from "@/components/ReusableTable";
import { Pill, SkelRows } from "@/components/admin/kit";
import { ActionMenu, Avatar, LoadError, SearchInput, SELECT, ViewSwitch, useStoredState } from "../parts/people";

/* Users → Students (MathPortal design "students").
   GET /api/admin/student/overview — every student with grade, courses, groups, free days, live sessions left,
   wallet and last attendance (same data as Reports → Students). DELETE /api/admin/student/:id */

const PAGE = 12;
const DAYS = [["Saturday", "Sa"], ["Sunday", "Su"], ["Monday", "Mo"], ["Tuesday", "Tu"], ["Wednesday", "We"], ["Thursday", "Th"], ["Friday", "Fr"]];
// Status from live sessions left (design: Package active / Running low / Package expired)
const STATUS = {
  Active: { label: "Package active", tone: "green", bar: "#16a34a" },
  Low: { label: "Running low", tone: "amber", bar: "#f59e0b" },
  Empty: { label: "Package expired", tone: "red", bar: "#dc2626" },
  "No live sessions": { label: "No live package", tone: "gray", bar: "#cbd5e1" },
};
const fmtDate = (v) => (v ? String(v).slice(0, 10) : null);

function KpiTile({ label, value, sub, color, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left bg-white rounded-xl border p-4 transition-colors min-w-0 ${active ? "border-one ring-2 ring-one/15" : "border-gray-100 shadow-sm hover:border-gray-300"}`}>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold leading-tight mt-1" style={{ color: color || "#111827" }}>{value}</p>
      <p className="text-[11px] text-gray-400 truncate">{sub}</p>
    </button>
  );
}

function DayStrip({ days }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {DAYS.map(([full, short]) => {
        const on = days?.includes(full);
        return <span key={full} title={full} className={`h-6 rounded-md text-[10px] font-bold flex items-center justify-center ${on ? "bg-one text-white" : "bg-gray-100 text-gray-400"}`}>{short}</span>;
      })}
    </div>
  );
}

const Student = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet("/api/admin/student/overview");
  const { deleteData } = useDelete();
  const [view, setView] = useStoredState("admin.students.view", "cards");
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");
  const [type, setType] = useState(""); // group | one
  const [verified, setVerified] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);

  const all = useMemo(() => data?.data?.students || [], [data]);
  const courses = useMemo(() => [...new Set(all.flatMap((s) => s.courses))].sort(), [all]);
  const count = (st) => all.filter((s) => s.status === st).length;

  const ql = q.trim().toLowerCase();
  const list = useMemo(() => {
    const out = all.filter((s) =>
      (!ql || `${s.name} ${s.nickname} ${s.email} ${s.phone}`.toLowerCase().includes(ql))
      && (!course || s.courses.includes(course))
      && (!type || (type === "group" ? s.groups.length > 0 : s.groups.length === 0))
      && (!verified || (verified === "verified" ? s.isVerified : !s.isVerified))
      && (!status || s.status === status));
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      left: (a, b) => (a.status === "No live sessions") - (b.status === "No live sessions") || a.liveBalance - b.liveBalance,
      recent: (a, b) => String(b.lastAttended || "").localeCompare(String(a.lastAttended || "")),
      wallet: (a, b) => b.wallet - a.wallet,
    };
    return out.sort(by[sort]);
  }, [all, ql, course, type, verified, status, sort]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE, cur * PAGE);
  const set = (fn) => (v) => { fn(v); setPage(1); };
  const filtering = q || course || type || verified || status;
  const clear = () => { setQ(""); setCourse(""); setType(""); setVerified(""); setStatus(""); setPage(1); };

  const go = {
    profile: (s) => navigate(`/admin/users/student-information/${s.id}`),
    edit: (s) => navigate(`/admin/users/students/edit/${s.id}`),
    attend: (s) => navigate(`/admin/users/students/attend/${s.id}`),
    packages: (s) => navigate(`/admin/users/packages/${s.id}`),
  };
  const menu = (s) => [
    { label: "Open profile", icon: UserRound, onClick: () => go.profile(s) },
    { label: "Edit details", icon: Pencil, onClick: () => go.edit(s) },
    { label: "Content & attendance", icon: ClipboardList, onClick: () => go.attend(s) },
    { label: "Packages", icon: Package, onClick: () => go.packages(s) },
    "sep",
    { label: "Delete account", icon: Trash2, tone: "text-red-600", onClick: () => setSelectedRow(s) },
  ];
  const confirmDelete = async () => {
    try { await deleteData(`/api/admin/student/${selectedRow.id}`); setSelectedRow(null); refetch(); } catch (err) { console.error(err); }
  };

  const chips = (s) => (
    <div className="flex flex-wrap gap-1.5 mt-3">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.groups.length ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>{s.groups.length ? "Group" : "One-to-one"}</span>
      {s.courses.slice(0, 2).map((c) => <span key={c} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">{c}</span>)}
      {s.courses.length > 2 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">+{s.courses.length - 2}</span>}
      {s.groups.slice(0, 1).map((g) => <span key={g.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700 inline-flex items-center gap-1"><Users size={10} />{g.name}</span>)}
    </div>
  );

  const card = (s) => {
    const st = STATUS[s.status] || STATUS["No live sessions"];
    const live = s.status !== "No live sessions";
    return (
      <article key={s.id} onClick={() => go.profile(s)}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-one/30 transition cursor-pointer flex flex-col p-4 min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={s.name} />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 truncate">{s.name}</p>
            {s.nickname && <p className="text-xs font-extrabold text-one truncate">{s.nickname}</p>}
            <p className="text-[11px] text-gray-400 truncate">{[s.grade, s.country, s.email].filter(Boolean).join(" · ")}</p>
          </div>
          <Pill tone={st.tone}>{st.label}</Pill>
        </div>
        {chips(s)}
        <div className="mt-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
            {s.freeDays ? `Available · ${s.freeDays.length} day${s.freeDays.length === 1 ? "" : "s"}` : "No free times sent yet"}
          </p>
          <DayStrip days={s.freeDays} />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
            <span>Live sessions left</span>
            <span className="text-gray-800 text-xs normal-case tracking-normal">{live ? s.liveBalance : "—"}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: live ? `${Math.min(100, (s.liveBalance / 10) * 100)}%` : "0%", background: st.bar }}></span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
          <span>Wallet <b className="text-gray-700">{s.wallet.toLocaleString("en-US")} EGP</b></span>
          <span>{s.lastAttended ? `Active ${fmtDate(s.lastAttended)}` : "No attendance yet"}</span>
        </div>
        <div className="mt-auto pt-3 flex items-center gap-1.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); go.profile(s); }} className="flex-1 h-9 rounded-lg text-xs font-bold text-white bg-one hover:bg-one/90">Open profile</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go.attend(s); }} title="Content & attendance" className="h-9 px-3 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:border-one hover:text-one inline-flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /><span className="hidden sm:inline">Attendance</span>
          </button>
          <ActionMenu label={`More actions for ${s.name}`} items={menu(s)} />
        </div>
      </article>
    );
  };

  const table = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr>{["Student", "Grade", "Courses", "Type", "Live left", "Wallet", "Status", ""].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
        <tbody>
          {shown.map((s) => {
            const st = STATUS[s.status] || STATUS["No live sessions"];
            return (
              <tr key={s.id} onClick={() => go.profile(s)} className="a-tr cursor-pointer">
                <td className="a-td min-w-[220px]"><div className="flex items-center gap-3"><Avatar name={s.name} size="w-9 h-9" shape="rounded-lg" text="text-xs" />
                  <div className="min-w-0"><p className="font-bold text-gray-900 truncate">{s.name}</p>{s.nickname && <p className="text-[11px] font-extrabold text-one truncate">{s.nickname}</p>}</div></div></td>
                <td className="a-td text-xs text-gray-700 whitespace-nowrap">{s.grade || "—"}</td>
                <td className="a-td text-xs text-gray-600 max-w-[200px]"><span className="line-clamp-2">{s.courses.join(", ") || "—"}</span></td>
                <td className="a-td text-xs">{s.groups.length ? "Group" : "One-to-one"}</td>
                <td className="a-td font-extrabold">{s.status === "No live sessions" ? "—" : s.liveBalance}</td>
                <td className="a-td text-xs whitespace-nowrap">{s.wallet.toLocaleString("en-US")} EGP</td>
                <td className="a-td"><Pill tone={st.tone}>{st.label}</Pill></td>
                <td className="a-td"><div className="flex justify-end"><ActionMenu label={`More actions for ${s.name}`} items={menu(s)} /></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-bold text-xl text-gray-800">Students</h1>
          <p className="text-xs text-gray-400">Accounts, courses, free times, live sessions left and wallets. Click a card for the full profile.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate("/admin/reports/students")} className="a-btn"><BarChart3 className="w-4 h-4" /> Report</button>
          <button type="button" onClick={() => navigate("/admin/users/students/add")} className="a-btn primary"><Plus className="w-4 h-4" /> Add student</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile label="All students" value={all.length} sub={`${all.filter((s) => !s.isVerified).length} not verified`} active={!status} onClick={() => set(setStatus)("")} />
        <KpiTile label="Package active" value={count("Active")} sub="4+ live sessions · click to filter" color="#15803d" active={status === "Active"} onClick={() => set(setStatus)(status === "Active" ? "" : "Active")} />
        <KpiTile label="Running low" value={count("Low")} sub="3 sessions or fewer" color="#b45309" active={status === "Low"} onClick={() => set(setStatus)(status === "Low" ? "" : "Low")} />
        <KpiTile label="Expired" value={count("Empty")} sub="Need a new package" color="#dc2626" active={status === "Empty"} onClick={() => set(setStatus)(status === "Empty" ? "" : "Empty")} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <SearchInput className="col-span-2 md:flex-1 md:min-w-[220px]" label="Search students" value={q} onChange={set(setQ)} placeholder="Search name, nickname, email or phone…" />
        <select aria-label="Course" value={course} onChange={(e) => set(setCourse)(e.target.value)} className={SELECT}><option value="">All courses</option>{courses.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Session type" value={type} onChange={(e) => set(setType)(e.target.value)} className={SELECT}><option value="">Group & one-to-one</option><option value="group">In a group</option><option value="one">One-to-one</option></select>
        <select aria-label="Account" value={verified} onChange={(e) => set(setVerified)(e.target.value)} className={SELECT}><option value="">All accounts</option><option value="verified">Verified</option><option value="unverified">Not verified</option></select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={SELECT}>
          <option value="name">Sort: Name A–Z</option><option value="recent">Sort: Recently active</option><option value="left">Sort: Fewest sessions left</option><option value="wallet">Sort: Wallet high–low</option>
        </select>
        <div className="col-span-2 md:col-span-1 md:ml-auto"><ViewSwitch value={view} onChange={setView} /></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <span className="text-gray-500"><b className="text-gray-900">{list.length}</b> of {all.length} students{loading && data && <span className="ml-2 text-gray-400">Updating…</span>}</span>
        {filtering && <button type="button" onClick={clear} className="font-bold text-one hover:underline">Clear filters</button>}
      </div>

      {loading && !data ? <SkelRows n={6} />
        : error && !data ? <LoadError text={error} onRetry={refetch} />
        : shown.length ? (view === "table" ? table() : <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">{shown.map(card)}</div>)
        : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
            <p className="font-bold text-gray-700">{filtering ? "No students match" : "No students yet"}</p>
            <p className="text-sm text-gray-400">{filtering ? "Try another search or filter." : "Add the first student to get started."}</p>
          </div>
        )}

      {pages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
          <Pager currentPage={cur} totalPages={pages} setPage={setPage} shown={shown.length} total={list.length} label="students" />
        </div>
      )}

      <ConfirmDeleteModal open={!!selectedRow} onClose={() => setSelectedRow(null)} onConfirm={confirmDelete}
        title="Delete Student" description={`Are you sure you want to delete "${selectedRow?.name}"? This can’t be undone.`} />
    </div>
  );
};

export default Student;
