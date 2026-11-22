import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/api/api";
import { Card, Empty, Modal, PageHead, Pill, SkelRows, Stat, Tabs, errText, fmtDay, fmtStamp, fmtTime, refreshWaiting } from "@/components/admin/kit";

/* Live → Teacher (MathPortal design): Sessions | Availability | Requests.
   Endpoints: GET /api/admin/teacher, GET /api/admin/session,
              GET /api/admin/teacher-requests, PATCH /api/admin/teacher-requests/:id/respond,
              GET /api/admin/teacher-requests/availability/:teacherId */

const DAYS = [6, 0, 1, 2, 3, 4, 5]; // Saturday → Friday (JS getDay numbers)
const DAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const mins = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
const shortT = (t) => { let [h, m] = String(t).split(":").map(Number); const ap = h >= 12 && h < 24 ? "PM" : "AM"; h = h % 12 || 12; return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""} ${ap}`; };
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sessDate = (s) => String(s.sessionDate || s.startDate || "").slice(0, 10);
const initials = (n = "") => n.replace(/^(mr|mrs|ms|dr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "T";
const STATUS = { pending: ["Waiting", "amber"], accepted: ["Accepted", "green"], rejected: ["Declined", "red"] };

/* ---------- Sessions tab ---------- */
function SessionsTab({ teachers, sessions, q }) {
  const navigate = useNavigate();
  const today = isoDay(new Date());
  const week = isoDay(new Date(Date.now() + 6 * 86400000));
  const rows = teachers.filter((t) => !q || t.name.toLowerCase().includes(q)).map((t) => {
    const mine = sessions.filter((s) => s.teacher?.id === t.id && s.status !== "cancelled");
    const upcoming = mine.filter((s) => sessDate(s) >= today).sort((a, b) => (sessDate(a) + a.timeFrom).localeCompare(sessDate(b) + b.timeFrom));
    return { t, total: mine.length, week: upcoming.filter((s) => sessDate(s) <= week).length, next: upcoming[0], students: upcoming.reduce((a, s) => a + (s.studentCount || 0), 0) };
  }).sort((a, b) => b.week - a.week || b.total - a.total);
  if (!rows.length) return <Empty title="No teachers match" />;
  // Design "Teacher Sessions": a card per teacher with their sessions in the next 7 days.
  const TYPE = { Explanation: ["#1d4ed8", "#eff6ff"], "Re-Explanation": ["#c2410c", "#fff7ed"], Mistakes: ["#7d0a0a", "#fdecec"], Exam: ["#7c3aed", "#f5f3ff"] };
  return (
    <div>
      <h3 className="font-bold text-gray-800">Teacher Sessions</h3>
      <p className="text-xs text-gray-400 mb-3">What each teacher is teaching over the next 7 days ({fmtDay(today)} – {fmtDay(week)}).</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {rows.map(({ t, week: w, total }) => {
          const list = sessions.filter((s) => s.teacher?.id === t.id && s.status !== "cancelled" && sessDate(s) >= today && sessDate(s) <= week)
            .sort((a, b) => (sessDate(a) + a.timeFrom).localeCompare(sessDate(b) + b.timeFrom));
          return (
            <section key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0" style={{ background: "#7d0a0a" }}>{initials(t.name)}</span>
                <div className="min-w-0 flex-1"><p className="font-bold text-gray-800 truncate">{t.name}</p><p className="text-[11px] text-gray-400">Teacher · {total} session{total === 1 ? "" : "s"} in total</p></div>
                <div className="text-right"><p className={`text-xl font-extrabold leading-none ${w ? "text-gray-900" : "text-gray-300"}`}>{w}</p><p className="text-[10px] text-gray-400">next 7 days</p></div>
              </div>
              {list.length ? (
                <ul className="space-y-1.5">
                  {list.slice(0, 5).map((s) => {
                    const [c] = TYPE[s.sessionRelationalType] || ["#475569"];
                    return (
                      <li key={s.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 bg-gray-50 border-l-4" style={{ borderColor: c }}>
                        <div className="w-24 shrink-0"><p className="text-xs font-bold text-gray-800">{fmtDay(sessDate(s))}</p><p className="text-[10px] text-gray-400">{fmtTime(s.timeFrom)}</p></div>
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p><p className="text-[10px] text-gray-400 truncate">{s.studentCount ? `${s.studentCount} student${s.studentCount === 1 ? "" : "s"}` : ""}</p></div>
                        <Pill tone={s.confirmedAt ? "green" : "amber"}>{s.confirmedAt ? "Dispatched" : "Scheduled"}</Pill>
                      </li>
                    );
                  })}
                  {list.length > 5 && <li><button onClick={() => navigate("/admin/live/planner")} className="text-xs font-bold text-one hover:underline">+{list.length - 5} more on the timetable →</button></li>}
                </ul>
              ) : <p className="text-xs text-gray-400 py-3">Nothing booked in the next 7 days.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Teacher states for one date + time: free / busy / off (outside hours) / not_shared. */
function useStatesAt(date, from, to, enabled = true) {
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !date || !from || !to || mins(to) <= mins(from)) { setMap(null); return undefined; }
    let live = true;
    setLoading(true);
    api.post("/api/admin/session/teacher-states", { scheduleType: "once", sessionDate: date, timeFrom: from, timeTo: to })
      .then((res) => live && setMap(new Map((res.data?.data?.teachers || []).map((t) => [String(t.id), t]))))
      .catch(() => live && setMap(null))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [date, from, to, enabled]);
  return { map, loading };
}
const STATE_PILL = { free: ["Free", "green"], not_shared: ["No hours set", "gray"], busy: ["Busy", "red"], off: ["Outside hours", "amber"] };

/* ---------- Working-hours editor (admin sets a teacher's week) ---------- */
function HoursEditor({ teacher, slots, onClose, onSaved }) {
  const [rows, setRows] = useState(() => (slots || []).map((x, i) => ({ k: i, day: x.dayOfWeek, from: String(x.timeFrom).slice(0, 5), to: String(x.timeTo).slice(0, 5) })));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const add = (day = 0) => setRows((r) => [...r, { k: Date.now() + Math.random(), day, from: "14:00", to: "22:00" }]);
  const upd = (k, patch) => { setErr(""); setRows((r) => r.map((x) => (x.k === k ? { ...x, ...patch } : x))); };
  const save = async () => {
    const bad = rows.find((x) => !x.from || !x.to || mins(x.to) <= mins(x.from));
    if (bad) { setErr(`${DAY_NAME[bad.day]}: the end time must be after the start time.`); return; }
    for (const a of rows) for (const b of rows) {
      if (a.k !== b.k && a.day === b.day && mins(a.from) < mins(b.to) && mins(b.from) < mins(a.to)) { setErr(`${DAY_NAME[a.day]}: two time ranges overlap.`); return; }
    }
    setSaving(true);
    try {
      await api.put(`/api/admin/teacher-requests/availability/${teacher.id}`, { slots: rows.map((x) => ({ dayOfWeek: Number(x.day), timeFrom: x.from, timeTo: x.to })) });
      toast.success(`Working hours saved for ${teacher.name}`);
      onSaved();
      onClose();
    } catch (e) {
      setErr(errText(e, "Could not save the hours"));
    } finally {
      setSaving(false);
    }
  };
  const ordered = [...rows].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || mins(a.from) - mins(b.from));
  return (
    <Modal wide title={`Working hours — ${teacher.name}`} onClose={onClose}
      actions={<>
        <button type="button" onClick={onClose} className="a-btn">Cancel</button>
        <button type="button" onClick={save} disabled={saving} className="a-btn primary">{saving ? "Saving…" : "Save hours"}</button>
      </>}>
      <p className="mb-3">Sessions can only be booked inside these hours, and never on top of another session of this teacher. The teacher sees the change in their profile.</p>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {ordered.length === 0 && <p className="text-gray-400 py-3 text-center">No hours yet — add the days this teacher works.</p>}
        {ordered.map((x) => (
          <div key={x.k} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
            <select value={x.day} onChange={(e) => upd(x.k, { day: Number(e.target.value) })} className="a-inp">
              {DAYS.map((d) => <option key={d} value={d}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]}</option>)}
            </select>
            <input type="time" value={x.from} onChange={(e) => upd(x.k, { from: e.target.value })} className="a-inp" aria-label="From" />
            <input type="time" value={x.to} onChange={(e) => upd(x.k, { to: e.target.value })} className="a-inp" aria-label="To" />
            <button type="button" onClick={() => setRows((r) => r.filter((y) => y.k !== x.k))} className="a-act del" aria-label="Remove">✕</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="text-xs font-bold text-gray-500 mr-1 self-center">Add a day:</span>
        {DAYS.map((d) => <button key={d} type="button" onClick={() => add(d)} className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:border-one hover:text-one">+ {DAY_NAME[d]}</button>)}
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
    </Modal>
  );
}

/* ---------- Availability tab ---------- */
function AvailabilityTab({ teachers, avail, q, reload }) {
  const [editing, setEditing] = useState(null);
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("16:00");
  const [to, setTo] = useState("18:00");
  const list = teachers.filter((t) => !q || t.name.toLowerCase().includes(q));
  const { map: states, loading: statesLoading } = useStatesAt(date, from, to);
  const free = states ? teachers.filter((t) => ["free", "not_shared"].includes(states.get(String(t.id))?.state)) : null;
  const blocked = states ? teachers.filter((t) => ["busy", "off"].includes(states.get(String(t.id))?.state)) : [];
  const hours = (id) => (avail[id]?.slots || []).reduce((a, s) => a + (mins(s.timeTo) - mins(s.timeFrom)) / 60, 0);
  const sel = "block mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white";

  return (
    <>
      <Card title="Find a free teacher" sub="Pick a date and a time range" className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-bold text-gray-400 uppercase">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={sel} /></label>
          <label className="text-[11px] font-bold text-gray-400 uppercase">From<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={sel} /></label>
          <label className="text-[11px] font-bold text-gray-400 uppercase">To<input type="time" value={to} onChange={(e) => setTo(e.target.value)} className={sel} /></label>
          {statesLoading && <span className="text-xs text-gray-400">Checking…</span>}
          {free && !statesLoading && (
            <div className="flex flex-wrap gap-2">
              {free.length ? free.map((t) => (
                <span key={t.id} title={states.get(String(t.id))?.reason || ""} className={`text-xs font-bold px-3 py-1.5 rounded-full ${states.get(String(t.id))?.state === "free" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {t.name}{states.get(String(t.id))?.state === "not_shared" ? " (no hours set)" : ""}
                </span>
              )) : <span className="text-xs font-bold text-red-600">Nobody is free then</span>}
              {blocked.length > 0 && <span className="text-[11px] text-gray-400 self-center">Not available: {blocked.map((t) => `${t.name} (${STATE_PILL[states.get(String(t.id))?.state]?.[0]})`).join(", ")}</span>}
            </div>
          )}
        </div>
      </Card>
      <Card bodyClass="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="a-th">Teacher</th>{DAYS.map((d) => <th key={d} className="a-th">{DAY_NAME[d]}</th>)}<th className="a-th">Hours / week</th></tr></thead>
            <tbody>
              {list.map((t) => {
                const a = avail[t.id];
                return (
                  <tr key={t.id} className="a-tr align-top">
                    <td className="a-td">
                      <p className="font-bold text-gray-800">{t.name}</p>
                      <p className={`text-[11px] mt-1 ${a?.sharedAt ? "text-green-700 font-bold" : "text-amber-600 font-bold"}`}>{a?.sharedAt ? `Shared ${fmtStamp(a.sharedAt)}` : "Not shared yet"}</p>
                      <button type="button" onClick={() => setEditing(t)} className="mt-1 text-[11px] font-bold text-one hover:underline">Edit hours</button>
                    </td>
                    {DAYS.map((d) => {
                      const slots = (a?.slots || []).filter((s) => s.dayOfWeek === d);
                      return (
                        <td key={d} className="a-td">
                          {slots.length ? slots.map((s, i) => <span key={i} className="block text-[11px] font-semibold text-one bg-red-50 border border-red-100 rounded-md px-1.5 py-0.5 mb-1 whitespace-nowrap">{shortT(s.timeFrom)}–{shortT(s.timeTo === "23:59" ? "24:00" : s.timeTo)}</span>)
                            : <span className="text-[11px] text-gray-300">Off</span>}
                        </td>
                      );
                    })}
                    <td className="a-td font-extrabold text-gray-800">{Math.round(hours(t.id) * 10) / 10}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <HoursEditor teacher={editing} slots={avail[editing.id]?.slots || []} onClose={() => setEditing(null)} onSaved={reload} />}
    </>
  );
}

/* ---------- Requests tab ---------- */
function RequestsTab({ requests, teachers, sessions, q, reload }) {
  const [f, setF] = useState("pending");
  const [type, setType] = useState("all");
  const [teacher, setTeacher] = useState("all");
  const [dialog, setDialog] = useState(null); // { r, mode: "accept" | "decline" }
  const [reply, setReply] = useState("");
  const [cover, setCover] = useState("");
  const [busy, setBusy] = useState(false);
  const acceptReq = dialog && dialog.mode === "accept" ? dialog.r : null;
  const slotOf = (r) => (r.type === "cover"
    ? [String(r.requestDate || "").slice(0, 10), String(r.timeFrom || "").slice(0, 5), String(r.timeTo || "").slice(0, 5)]
    : [String(r.sessionDate || "").slice(0, 10), String(r.sessionTimeFrom || "").slice(0, 5), String(r.sessionTimeTo || "").slice(0, 5)]);
  const [cDate, cFrom, cTo] = acceptReq ? slotOf(acceptReq) : ["", "", ""];
  const { map: coverStates, loading: coverLoading } = useStatesAt(cDate, cFrom, cTo, !!acceptReq);

  /** Booked sessions of the teacher inside a cover request's slot (one-off and weekly-repeat dates). */
  const affected = (r) => (r.type !== "cover" ? [] : sessions.filter((s) => s.teacher?.id === r.teacherId && s.status !== "cancelled"
    && sessDate(s) === String(r.requestDate || "").slice(0, 10)
    && mins(s.timeFrom) < mins(r.timeTo) && mins(s.timeTo) > mins(r.timeFrom)));

  const n = (st) => requests.filter((r) => r.status === st).length;
  const names = [...new Set(requests.map((r) => r.teacherName))];
  const list = requests
    .filter((r) => (f === "all" || r.status === f) && (type === "all" || r.type === type) && (teacher === "all" || r.teacherName === teacher)
      && (!q || `${r.teacherName} ${r.reason}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || String(b.createdAt).localeCompare(String(a.createdAt)));

  const open = (r, mode) => { setDialog({ r, mode }); setReply(""); setCover(""); };
  const send = async () => {
    const { r, mode } = dialog;
    if (mode === "decline" && !reply.trim()) { toast.error("Write a short reply — the teacher sees it"); return; }
    if (mode === "accept" && r.type === "cover" && affected(r).length && !cover) { toast.error("Pick a cover teacher — these sessions need one"); return; }
    setBusy(true);
    try {
      const res = await api.patch(`/api/admin/teacher-requests/${r.id}/respond`, {
        status: mode === "accept" ? "accepted" : "rejected",
        adminReply: reply.trim() || undefined,
        coverTeacherId: mode === "accept" && cover ? cover : undefined,
      });
      const moved = res.data?.data?.reassignedSessions || 0;
      toast.success(mode === "decline" ? "Declined — the teacher was told"
        : r.type === "cancellation" ? (moved ? "Session handed to the new teacher — everyone was told" : "Session cancelled — the teacher and students were told")
          : moved ? `Accepted — ${moved} session${moved === 1 ? "" : "s"} moved to the cover teacher; the teachers and students were told` : "Accepted — the teacher was told");
      setDialog(null);
      refreshWaiting();
      await reload();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const chip = (k, l, c) => (
    <button key={k} onClick={() => setF(k)} className={`a-chip ${f === k ? "on" : ""}`}>{l} <span className={f === k ? "text-white/70" : "text-gray-400"}>{c}</span></button>
  );

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Waiting for you" value={n("pending")} color="#b45309" />
        <Stat label="Accepted" value={n("accepted")} color="#15803d" />
        <Stat label="Declined" value={n("rejected")} color="#dc2626" />
        <Stat label="Sessions to cover" value={requests.filter((r) => r.status === "pending").reduce((a, r) => a + affected(r).length, 0)} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        {chip("pending", "Waiting", n("pending"))}{chip("accepted", "Accepted", n("accepted"))}{chip("rejected", "Declined", n("rejected"))}{chip("all", "All", requests.length)}
        <select value={type} onChange={(e) => setType(e.target.value)} className="md:ml-auto border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="all">All requests</option><option value="cover">Cover requests</option><option value="cancellation">Cancel requests</option>
        </select>
        <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="all">All teachers</option>{names.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {list.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {list.map((r) => {
            const aff = affected(r);
            const [label, tone] = STATUS[r.status] || STATUS.pending;
            const date = r.type === "cancellation" ? r.sessionDate : r.requestDate;
            const from = r.type === "cancellation" ? r.sessionTimeFrom : r.timeFrom;
            const to = r.type === "cancellation" ? r.sessionTimeTo : r.timeTo;
            return (
              <div key={r.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col ${r.status === "pending" ? "border-l-4" : ""}`} style={r.status === "pending" ? { borderLeftColor: "#f59e0b" } : undefined}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0" style={{ background: "#7d0a0a" }}>{initials(r.teacherName)}</span>
                    <div className="min-w-0"><p className="font-bold text-gray-900 truncate">{r.teacherName}</p><p className="text-xs text-gray-400">{r.type === "cancellation" ? "Cancel a session" : "Cover request"}</p></div>
                  </div>
                  <Pill tone={tone}>{label}</Pill>
                </div>
                {r.type === "cancellation" && <p className="text-sm font-bold text-red-600 mb-2">🚫 {r.sessionName || "Session"}</p>}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">📅 {fmtDay(date)}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">🕒 {fmtTime(from)} – {fmtTime(to)}</span>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 break-words">“{r.reason}”</p>
                {r.type === "cover" && (
                  <div className="mt-3 text-xs">
                    {aff.length ? <><p className="font-bold text-gray-700 mb-1">{aff.length} session{aff.length === 1 ? "" : "s"} in this slot</p>{aff.slice(0, 3).map((a) => <p key={a.id} className="text-gray-500 truncate">• {fmtTime(a.timeFrom)} · {a.name} · {a.studentCount || 0} students</p>)}</>
                      : <p className="text-gray-400">No booked sessions in this slot.</p>}
                  </div>
                )}
                {r.status !== "pending" && (r.coverTeacherName || r.adminReply) && (
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${r.status === "accepted" ? "border-green-100 bg-green-50/60" : "border-red-100 bg-red-50/60"}`}>
                    {r.coverTeacherName && <p className="text-gray-800">Cover teacher: <b>{r.coverTeacherName}</b></p>}
                    {r.adminReply && <p className="text-gray-600">{r.adminReply}</p>}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-auto pt-4">
                  <p className="text-[11px] text-gray-400">Sent {fmtStamp(r.createdAt)}{r.respondedAt ? ` · answered ${fmtStamp(r.respondedAt)}` : ""}</p>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => open(r, "decline")} className="px-3 py-2 rounded-lg text-xs font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50">Decline</button>
                      <button onClick={() => open(r, "accept")} className="px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "#15803d" }}>{r.type === "cancellation" ? "Reassign or cancel" : "Accept & assign cover"}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : <Empty title={f === "pending" ? "No requests waiting" : "No requests here"} text="Cover and cancel requests teachers send from the teacher dashboard appear here." />}

      {dialog && (
        <Modal
          title={dialog.mode === "decline" ? "Decline request" : dialog.r.type === "cancellation" ? "Teacher can't attend this session" : "Accept cover request"}
          onClose={() => setDialog(null)}
          actions={<>
            <button onClick={() => setDialog(null)} className="a-btn">Cancel</button>
            <button onClick={send} disabled={busy} className={`a-btn ${dialog.mode === "decline" ? "danger" : "primary"}`}>{busy ? "Sending…" : dialog.mode === "decline" ? "Send decline" : "Confirm"}</button>
          </>}
        >
          <p className="mb-3"><b className="text-gray-900">{dialog.r.teacherName}</b> — “{dialog.r.reason}”</p>
          {dialog.mode === "accept" && (() => {
            const isCover = dialog.r.type === "cover";
            const n = isCover ? affected(dialog.r).length : dialog.r.sessionId ? 1 : 0;
            const required = isCover && n > 0;
            return (
              <>
                {!isCover && dialog.r.sessionName && (
                  <p className="mb-2 text-gray-700">Session: <b>{dialog.r.sessionName}</b> · {fmtDay(cDate)} {cFrom && fmtTime(cFrom)}</p>
                )}
                <label className="block mb-3">
                  <span className="a-lbl-f">{isCover ? (required ? "Cover teacher *" : "Cover teacher") : "Hand it to another teacher (optional)"}</span>
                  <select value={cover} onChange={(e) => setCover(e.target.value)} className="a-inp">
                    <option value="">{coverLoading ? "Checking who is free…" : isCover ? "— Pick a teacher —" : "— No: cancel the session —"}</option>
                    {teachers.filter((t) => t.id !== dialog.r.teacherId).map((t) => {
                      const st = coverStates?.get(String(t.id));
                      const blockedT = st && (st.state === "busy" || st.state === "off");
                      return (
                        <option key={t.id} value={t.id} disabled={!!blockedT}>
                          {t.name}{st ? ` — ${STATE_PILL[st.state]?.[0] || st.state}` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <span className="block text-[11px] text-gray-400 mt-1">
                    {isCover
                      ? (n ? `${n} booked session${n === 1 ? "" : "s"} in this slot move to the cover teacher, with their lessons and materials. The teachers and students are told.` : "No booked session in this slot.")
                      : cover ? "The session moves to this teacher with its lessons and materials — nothing is cancelled. The teachers and students are told."
                        : "Without a new teacher the session is cancelled for everyone and students won’t be charged."}
                  </span>
                </label>
              </>
            );
          })()}
          <label className="block">
            <span className="a-lbl-f">{dialog.mode === "decline" ? "Reply to the teacher *" : "Reply to the teacher (optional)"}</span>
            <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} className="a-inp" placeholder={dialog.mode === "decline" ? "e.g. Please keep it, the student confirmed." : "e.g. Ms. Nada takes this slot."}></textarea>
          </label>
        </Modal>
      )}
    </>
  );
}

export default function TeacherHub() {
  const [params, setParams] = useSearchParams();
  const tab = ["sessions", "availability", "requests"].includes(params.get("tab")) ? params.get("tab") : "sessions";
  const [teachers, setTeachers] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [avail, setAvail] = useState({});
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const [t, s, r] = await Promise.all([
        api.get("/api/admin/teacher"),
        api.get("/api/admin/session"),
        api.get("/api/admin/teacher-requests"),
      ]);
      const d = t.data?.data;
      const list = (Array.isArray(d) ? d : d?.teacher || d?.teachers || d?.data || []).map((x) => ({ id: x.id, name: x.name, email: x.email }));
      setTeachers(list);
      setSessions(s.data?.data?.sessions || []);
      setRequests(r.data?.data?.requests || []);
      const av = await Promise.all(list.map((x) => api.get(`/api/admin/teacher-requests/availability/${x.id}`).then((res) => [x.id, res.data?.data]).catch(() => [x.id, null])));
      setAvail(Object.fromEntries(av));
    } catch (err) {
      toast.error(errText(err, "Could not load teachers"));
      setTeachers((x) => x || []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ql = q.trim().toLowerCase();
  const waiting = requests.filter((r) => r.status === "pending").length;
  const shown = (teachers || []).filter((t) => !ql || t.name.toLowerCase().includes(ql)).length;

  return (
    <div>
      <PageHead title="Teacher" sub="What teachers are teaching, when they are free, and what they asked for." />
      <Tabs
        value={tab}
        onChange={(k) => setParams({ tab: k })}
        tabs={[{ key: "sessions", label: "Sessions" }, { key: "availability", label: "Availability" }, { key: "requests", label: "Requests", count: waiting }]}
      />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teachers by name…" className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white flex-1 min-w-[200px] focus:outline-none focus:border-one" />
        <span className="text-xs text-gray-400">{shown} of {(teachers || []).length} teachers</span>
        {q && <button onClick={() => setQ("")} className="text-xs font-bold text-gray-400 hover:text-one px-2 py-1">Clear</button>}
      </div>
      {teachers === null ? <SkelRows n={5} /> : tab === "sessions" ? <SessionsTab teachers={teachers} sessions={sessions} q={ql} />
        : tab === "availability" ? <AvailabilityTab teachers={teachers} avail={avail} q={ql} reload={load} />
          : <RequestsTab requests={requests} teachers={teachers} sessions={sessions} q={ql} reload={load} />}
    </div>
  );
}
