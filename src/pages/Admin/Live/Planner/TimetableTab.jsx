import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Send, Users } from "lucide-react";
import api from "@/api/api";
import { Empty, Modal, Pill, SkelRows, errText, fmtDay, fmtTime } from "@/components/admin/kit";

/* Live → Planner → Timetable (design: master-schedule).
   GET /api/admin/planner/timetable?from&to · POST …/dispatch · POST …/sessions/:id/approve
   Weeks start on Saturday, like the rest of MathPortal. */

export const TYPE_COLORS = {
  Explanation: ["#1d4ed8", "#eff6ff"],
  "Re-Explanation": ["#c2410c", "#fff7ed"],
  Mistakes: ["#7d0a0a", "#fdecec"],
  Exam: ["#7c3aed", "#f5f3ff"],
};
const APPROVAL = { approved: ["Approved", "green"], pending: ["Waiting for student", "amber"], changes: ["Student declined", "red"] };

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const weekStart = (s) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); return iso(d); };
const monthRange = (s) => { const d = new Date(`${s}T00:00:00`); return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))]; };
const TODAY = () => iso(new Date());
const WD = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function rangeFor(view, anchor) {
  if (view === "month") {
    const [f, t] = monthRange(anchor);
    return { from: f, to: t, fetchFrom: weekStart(f), fetchTo: addDays(weekStart(t), 6) };
  }
  const f = weekStart(anchor);
  return { from: f, to: addDays(f, 6), fetchFrom: f, fetchTo: addDays(f, 6) };
}
const who = (s) => {
  const parts = [...s.students.map((x) => x.name), ...s.groups.map((g) => `${g.name} (${g.size})`)];
  if (!parts.length && s.plans.length) return `${s.plans[0].studentName} · plan`;
  return parts.length ? parts.join(", ") : "No students";
};
const isReady = (s) => s.status === "scheduled" && s.approval === "approved" && !s.confirmedAt && s.date >= TODAY();

function TypeTag({ type }) {
  const [c, bg] = TYPE_COLORS[type] || ["#475569", "#f1f5f9"];
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase whitespace-nowrap" style={{ color: c, background: bg, borderColor: `${c}33` }}>{type}</span>;
}

function Chip({ s, onOpen, withTime }) {
  const [c, bg] = TYPE_COLORS[s.type] || ["#475569", "#f1f5f9"];
  const off = s.status === "cancelled";
  return (
    <button onClick={() => onOpen(s)} title={`${s.name} · ${s.teacher.name}`}
      className={`w-full text-left rounded-lg border-l-4 px-2 py-1.5 mb-1 hover:brightness-95 transition ${off ? "opacity-50" : ""}`} style={{ borderColor: c, background: bg }}>
      <p className={`text-[11px] font-bold leading-snug break-words ${off ? "line-through" : ""}`} style={{ color: c }}>{withTime && `${fmtTime(s.timeFrom)} · `}{s.name}</p>
      <p className="text-[10px] text-gray-600 leading-snug break-words">{s.teacher.name} · {s.studentCount ? `${s.studentCount} student${s.studentCount === 1 ? "" : "s"}` : who(s)}</p>
      {s.approval !== "approved" && !off && <p className="text-[9px] font-extrabold uppercase text-amber-700">{APPROVAL[s.approval][0]}</p>}
      {s.confirmedAt && <p className="text-[9px] font-extrabold uppercase text-green-700">✓ Sent</p>}
    </button>
  );
}

function SessionModal({ s, onClose, onApprove, onDispatch, busy }) {
  const navigate = useNavigate();
  return (
    <Modal title={s.name} onClose={onClose} wide actions={(
      <>
        <button className="a-btn" onClick={onClose}>Close</button>
        <button className="a-btn" onClick={() => navigate(`/admin/live/sessions/edit/${s.id}`)}><Pencil size={14} /> Edit session</button>
        {s.status === "scheduled" && s.approval === "pending" && <button className="a-btn primary" disabled={busy} onClick={() => onApprove(s)}>Approve for the student</button>}
        {isReady(s) && <button className="a-btn primary" style={{ background: "#15803d", borderColor: "#15803d" }} disabled={busy} onClick={() => onDispatch([s.id])}><Send size={14} /> Dispatch</button>}
      </>
    )}>
      <div className="flex flex-wrap items-center gap-2 mb-4 -mt-1">
        <TypeTag type={s.type} />
        {s.status === "cancelled" ? <Pill tone="red">Cancelled</Pill> : <Pill tone={APPROVAL[s.approval][1]}>{APPROVAL[s.approval][0]}</Pill>}
        {s.confirmedAt && <Pill tone="green">Dispatched</Pill>}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div><dt className="a-lbl-f !mb-0.5 !text-xs !text-gray-400">When</dt><dd className="font-semibold text-gray-800">{fmtDay(s.date)} · {fmtTime(s.timeFrom)} – {fmtTime(s.timeTo)}</dd></div>
        <div><dt className="a-lbl-f !mb-0.5 !text-xs !text-gray-400">Teacher</dt><dd className="font-semibold text-gray-800">{s.teacher.name}</dd></div>
        <div><dt className="a-lbl-f !mb-0.5 !text-xs !text-gray-400">Course</dt><dd className="text-gray-700">{s.course || "—"}</dd></div>
        <div><dt className="a-lbl-f !mb-0.5 !text-xs !text-gray-400">Lessons</dt><dd className="text-gray-700">{s.lessons.join(", ") || "—"}</dd></div>
        <div className="sm:col-span-2"><dt className="a-lbl-f !mb-0.5 !text-xs !text-gray-400">Students</dt><dd className="text-gray-700">{who(s)}</dd></div>
        {s.plans.length > 0 && (
          <div className="sm:col-span-2"><dt className="a-lbl-f !mb-0.5 !text-xs !text-gray-400">Study plan</dt>
            <dd className="text-gray-700">{s.plans.map((p) => `${p.studentName} — "${p.title}" (${p.response})`).join("; ")}</dd></div>
        )}
        {s.status === "cancelled" && <div className="sm:col-span-2"><dt className="a-lbl-f !mb-0.5 !text-xs !text-gray-400">Cancel reason</dt><dd className="text-red-700">{s.cancelReason || "—"}</dd></div>}
      </dl>
    </Modal>
  );
}

function WeekView({ days, list, onOpen }) {
  const today = TODAY();
  const times = [...new Set(list.map((s) => `${s.timeFrom}-${s.timeTo}`))].sort();
  if (!times.length) return <Empty title="No sessions this week" text="Add one from the Add session tab, or build a student's plan." />;
  return (
    <>
      {/* phones: agenda per day */}
      <div className="md:hidden space-y-3">
        {days.filter((d) => list.some((s) => s.date === d)).map((d) => (
          <div key={d} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className={`text-xs font-extrabold uppercase tracking-wider mb-2 ${d === today ? "text-one" : "text-gray-500"}`}>{d === today ? "Today · " : ""}{fmtDay(d)}</p>
            {list.filter((s) => s.date === d).map((s) => <Chip key={s.id} s={s} onOpen={onOpen} withTime />)}
          </div>
        ))}
      </div>
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm" style={{ minWidth: 860 }}>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-24 px-2 py-2.5 text-[10px] font-extrabold text-gray-400 uppercase text-left">Time</th>
                {days.map((d, i) => (
                  <th key={d} className={`px-1.5 py-2.5 text-left ${d === today ? "bg-red-50/60" : ""}`}>
                    <p className={`text-[10px] font-extrabold uppercase ${d === today ? "text-one" : "text-gray-400"}`}>{WD[i]}</p>
                    <p className="text-sm font-extrabold text-gray-800">{Number(d.slice(8))}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t) => {
                const [f, to] = t.split("-");
                return (
                  <tr key={t} className="border-b border-gray-50 align-top">
                    <td className="px-2 py-2 text-[11px] font-bold text-gray-500">{fmtTime(f)}<br />{fmtTime(to)}</td>
                    {days.map((d) => (
                      <td key={d} className={`px-1 py-1.5 ${d === today ? "bg-red-50/30" : ""}`}>
                        {list.filter((s) => s.date === d && `${s.timeFrom}-${s.timeTo}` === t).map((s) => <Chip key={s.id} s={s} onOpen={onOpen} />)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function MonthView({ anchor, list, onOpen, onDay }) {
  const [first] = monthRange(anchor);
  const start = weekStart(first), month = Number(first.slice(5, 7)), today = TODAY();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  const used = weeks.filter((w) => w.some((d) => Number(d.slice(5, 7)) === month));
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">{WD.map((d) => <div key={d} className="px-2 py-2 text-[10px] font-extrabold text-gray-400 uppercase">{d}</div>)}</div>
      {used.map((w) => (
        <div key={w[0]} className="grid grid-cols-7 border-b border-gray-50">
          {w.map((d) => {
            const rs = list.filter((s) => s.date === d), inMonth = Number(d.slice(5, 7)) === month;
            return (
              <div key={d} className={`min-h-[92px] border-r border-gray-50 p-1.5 min-w-0 ${inMonth ? "" : "bg-gray-50/60"} ${d === today ? "bg-red-50/50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-extrabold ${d === today ? "text-white rounded-full bg-one w-6 h-6 flex items-center justify-center" : inMonth ? "text-gray-700" : "text-gray-300"}`}>{Number(d.slice(8))}</span>
                  {rs.length > 0 && <span className="md:hidden text-[10px] font-bold text-one">{rs.length}</span>}
                </div>
                <div className="hidden md:block">{rs.slice(0, 2).map((s) => <Chip key={s.id} s={s} onOpen={onOpen} withTime />)}</div>
                {rs.length > 0 && <button onClick={() => onDay(d)} className={`text-[10px] font-bold text-one hover:underline ${rs.length > 2 ? "" : "md:hidden"}`}>{rs.length > 2 ? `+${rs.length - 2} more` : "Open day"}</button>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ListView({ list, onOpen, onApprove, onDispatch, busy }) {
  const navigate = useNavigate();
  const today = TODAY();
  const days = [];
  list.forEach((s) => {
    let d = days[days.length - 1];
    if (!d || d.date !== s.date) { d = { date: s.date, blocks: [] }; days.push(d); }
    const key = `${s.timeFrom}-${s.timeTo}`;
    let b = d.blocks.find((x) => x.key === key);
    if (!b) { b = { key, from: s.timeFrom, to: s.timeTo, rows: [] }; d.blocks.push(b); }
    b.rows.push(s);
  });
  if (!days.length) return <Empty title="No sessions match" text="Try another range or clear the filters." />;
  return days.map((d) => (
    <div key={d.date} className="mb-5">
      <div className="flex items-center gap-3 mb-2">
        <p className="text-sm font-extrabold text-gray-900">{d.date === today ? "Today · " : ""}{fmtDay(d.date)}</p>
        <span className="flex-1 h-px bg-gray-200"></span>
      </div>
      <div className="space-y-3">
        {d.blocks.map((b) => (
          <div key={b.key} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gray-900 text-white px-5 py-2.5 flex flex-wrap justify-between items-center gap-2">
              <p className="font-bold tracking-wide">{fmtTime(b.from)} – {fmtTime(b.to)}</p>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">{b.rows.length === 1 ? "1 session" : `${b.rows.length} at the same time`}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 820 }}>
                <thead><tr>{["Teacher", "Student(s)", "Type", "Lesson", "Status", ""].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
                <tbody>
                  {b.rows.map((s) => (
                    <tr key={s.id} className={`a-tr ${s.status === "cancelled" ? "opacity-60" : s.approval !== "approved" ? "bg-amber-50/40" : ""}`}>
                      <td className="a-td font-bold text-gray-800 whitespace-nowrap">{s.teacher.name}</td>
                      <td className="a-td text-gray-700 max-w-[240px]"><span className="line-clamp-2">{who(s)}</span></td>
                      <td className="a-td"><TypeTag type={s.type} /></td>
                      <td className="a-td max-w-[260px]"><button onClick={() => onOpen(s)} className="text-left"><p className={`text-sm font-semibold text-gray-800 truncate hover:text-one ${s.status === "cancelled" ? "line-through" : ""}`}>{s.name}</p><p className="text-[11px] text-gray-500 truncate">{s.course || "—"}</p></button></td>
                      <td className="a-td">
                        {s.status === "cancelled" ? <Pill tone="red">Cancelled</Pill> : <Pill tone={APPROVAL[s.approval][1]}>{APPROVAL[s.approval][0]}</Pill>}
                        {s.confirmedAt && <p className="text-[10px] text-green-700 font-bold mt-1">✓ Dispatched</p>}
                      </td>
                      <td className="a-td">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="a-act" title="Edit session" aria-label="Edit session" onClick={() => navigate(`/admin/live/sessions/edit/${s.id}`)}><Pencil size={15} /></button>
                          {s.status === "scheduled" && s.approval === "pending" && (
                            <button disabled={busy} onClick={() => onApprove(s)} className="px-3 py-1.5 text-xs font-bold text-one border border-[#7d0a0a] hover:bg-red-50 rounded-lg whitespace-nowrap">Approve</button>
                          )}
                          {isReady(s) && (
                            <button disabled={busy} onClick={() => onDispatch([s.id])} className="px-3 py-1.5 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg whitespace-nowrap">Dispatch</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  ));
}

export default function TimetableTab({ refreshKey = 0, onAdd }) {
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(TODAY());
  const [listRange, setListRange] = useState(null); // {from,to} when a month day is opened in the list
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [f, setF] = useState({ teacher: "all", status: "all", types: [], q: "" });

  const r = view === "list" && listRange
    ? { from: listRange.from, to: listRange.to, fetchFrom: listRange.from, fetchTo: listRange.to }
    : rangeFor(view === "list" ? "week" : view, anchor);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/api/admin/planner/timetable?from=${r.fetchFrom}&to=${r.fetchTo}`);
      setData(res.data?.data?.sessions || []);
    } catch (err) {
      setError(errText(err, "Could not load the timetable"));
      setData((d) => d || []);
    }
  }, [r.fetchFrom, r.fetchTo]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const all = data || [];
  const teachers = useMemo(() => [...new Set(all.map((s) => s.teacher.name))].sort(), [all]);
  const ql = f.q.trim().toLowerCase();
  const list = all.filter((s) => (f.teacher === "all" || s.teacher.name === f.teacher)
    && (f.status === "all" || (f.status === "cancelled" ? s.status === "cancelled" : s.status === "scheduled" && (f.status === "ready" ? isReady(s) : f.status === "pending" ? s.approval !== "approved" : s.approval === f.status)))
    && (!f.types.length || f.types.includes(s.type))
    && (!ql || [s.name, s.course, who(s), ...s.lessons].join(" ").toLowerCase().includes(ql)));
  const inRange = list.filter((s) => s.date >= r.from && s.date <= r.to);
  const live = inRange.filter((s) => s.status === "scheduled");
  const ready = live.filter(isReady);
  const days = Array.from({ length: 7 }, (_, i) => addDays(r.from, i));

  const shift = (n) => {
    setListRange(null);
    if (view === "month") { const d = new Date(`${anchor}T00:00:00`); setAnchor(iso(new Date(d.getFullYear(), d.getMonth() + n, 1))); }
    else setAnchor(addDays(weekStart(anchor), n * 7));
  };
  const setViewKeep = (v) => { setListRange(null); setView(v); };

  const approve = async (s) => {
    setBusy(true);
    try {
      await api.post(`/api/admin/planner/sessions/${s.id}/approve`);
      toast.success(`Approved for ${s.plans[0]?.studentName || "the student"} — they were told`);
      setOpen(null);
      await load();
    } catch (err) { toast.error(errText(err)); } finally { setBusy(false); }
  };
  const dispatch = async (ids) => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await api.post("/api/admin/planner/dispatch", { sessionIds: ids });
      const d = res.data?.data || {};
      toast.success(`${d.dispatched} session${d.dispatched === 1 ? "" : "s"} dispatched — ${d.studentsNotified} student${d.studentsNotified === 1 ? "" : "s"} and ${d.teachersNotified} teacher${d.teachersNotified === 1 ? "" : "s"} notified`);
      setOpen(null);
      await load();
    } catch (err) { toast.error(errText(err)); } finally { setBusy(false); }
  };

  const title = view === "month"
    ? new Date(`${anchor}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${fmtDay(r.from)} – ${fmtDay(r.to)}`;
  const sel = "a-inp !py-2";
  const lbl = (t) => <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t}</span>;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rs-stat"><p className="rs-stat-label">Sessions</p><p className="rs-stat-value">{live.length}</p><p className="text-[11px] text-gray-400">{live.filter((s) => s.approval !== "approved").length} waiting for a student</p></div>
        <div className="rs-stat"><p className="rs-stat-label">Teachers</p><p className="rs-stat-value">{new Set(live.map((s) => s.teacher.id)).size}</p><p className="text-[11px] text-gray-400">teaching in this range</p></div>
        <div className="rs-stat"><p className="rs-stat-label">Seats</p><p className="rs-stat-value">{live.reduce((a, s) => a + s.studentCount, 0)}</p><p className="text-[11px] text-gray-400">students across sessions</p></div>
        <button onClick={() => dispatch(ready.map((s) => s.id))} disabled={!ready.length || busy}
          className="rounded-xl p-4 text-left text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" style={{ background: "#15803d" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/75">Dispatch</p>
          <p className="text-2xl font-extrabold">{ready.length}</p>
          <p className="text-[11px] text-white/80">approved sessions ready to send</p>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">Filters</p>
          <button onClick={() => setF({ teacher: "all", status: "all", types: [], q: "" })} className="text-xs font-bold text-gray-400 hover:text-one">↺ Reset all</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <label>{lbl("Teacher")}<select value={f.teacher} onChange={(e) => setF({ ...f, teacher: e.target.value })} className={sel}><option value="all">All teachers</option>{teachers.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>{lbl("Status")}<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={sel}>
            <option value="all">All statuses</option><option value="approved">Approved</option><option value="pending">Waiting for student</option>
            <option value="ready">Ready to dispatch</option><option value="cancelled">Cancelled</option></select></label>
          <label className="col-span-2">{lbl("Student, lesson or course")}<input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search…" className={sel} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Type</span>
          {Object.entries(TYPE_COLORS).map(([t, [c, bg]]) => {
            const on = f.types.includes(t);
            return (
              <button key={t} onClick={() => setF({ ...f, types: on ? f.types.filter((x) => x !== t) : [...f.types, t] })}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors"
                style={on ? { background: c, color: "#fff", borderColor: c } : { background: bg, color: c, borderColor: `${c}33` }}>{t}</button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <button onClick={() => shift(-1)} className="a-btn !px-3 !py-2" aria-label="Previous"><ChevronLeft size={16} /></button>
          <button onClick={() => { setListRange(null); setAnchor(TODAY()); }} className="a-btn !py-2">Today</button>
          <button onClick={() => shift(1)} className="a-btn !px-3 !py-2" aria-label="Next"><ChevronRight size={16} /></button>
          <p className="text-sm font-extrabold text-gray-900 ml-1 truncate">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[["week", "Week"], ["month", "Month"], ["list", "List"]].map(([k, l]) => (
              <button key={k} onClick={() => setViewKeep(k)} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${view === k ? "bg-white text-one shadow-sm" : "text-gray-500"}`}>{l}</button>
            ))}
          </div>
          {onAdd && <button onClick={onAdd} className="a-btn primary !py-2"><CalendarDays size={15} /> Add session</button>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {data === null ? <SkelRows n={6} /> : view === "week"
        ? <WeekView days={days} list={inRange} onOpen={setOpen} />
        : view === "month"
          ? <MonthView anchor={anchor} list={list} onOpen={setOpen} onDay={(d) => { setListRange({ from: d, to: d }); setView("list"); }} />
          : <ListView list={inRange} onOpen={setOpen} onApprove={approve} onDispatch={dispatch} busy={busy} />}

      {open && <SessionModal s={open} onClose={() => setOpen(null)} onApprove={approve} onDispatch={dispatch} busy={busy} />}
      <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5"><Users size={12} /> Dispatch sends each student and teacher one message with their confirmed sessions. Sessions waiting for a student's answer can't be dispatched until they accept (or you approve them).</p>
    </div>
  );
}
