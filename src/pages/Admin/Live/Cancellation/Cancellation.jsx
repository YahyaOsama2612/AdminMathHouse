import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/api/api";
import { Card, Empty, PageHead, Pill, SkelRows, Stat, errText, fmtDay, fmtStamp, fmtTime, refreshWaiting } from "@/components/admin/kit";

/* Live → Cancellations (MathPortal design):
   - student cancel requests waiting for an answer (sent ≥ 24 h before the session)
   - every cancelled session: by admin, by an approved teacher request, or a student's seat cancelled
   Endpoints: GET /api/admin/student-cancel-requests, PATCH …/:id/respond,
              GET /api/admin/session/cancelled, PATCH /api/admin/session/:id/restore */

const SOURCE_TONE = { "Teacher request": "amber", "Student request": "purple", Schedule: "gray" };

function hoursLeft(date, time) {
  const d = String(date || "").slice(0, 10);
  if (!d || !time) return null;
  const ms = new Date(`${d}T${String(time).slice(0, 5)}:00`) - Date.now();
  return Math.max(0, Math.floor(ms / 3600000));
}

export default function Cancellation() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(null);
  const [cancelled, setCancelled] = useState(null);
  const [teacherPending, setTeacherPending] = useState(0);
  const [deciding, setDeciding] = useState(null); // request id being declined
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [teacher, setTeacher] = useState("all");

  const load = useCallback(async () => {
    try {
      const [r, c, t] = await Promise.all([
        api.get("/api/admin/student-cancel-requests"),
        api.get("/api/admin/session/cancelled"),
        api.get("/api/admin/teacher-requests?status=pending"),
      ]);
      setRequests(r.data?.data?.requests || []);
      setCancelled(c.data?.data?.sessions || []);
      setTeacherPending((t.data?.data?.requests || []).filter((x) => x.type === "cancellation").length);
    } catch (err) {
      toast.error(errText(err, "Could not load cancellations"));
      setRequests((x) => x || []);
      setCancelled((x) => x || []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (req, ok) => {
    if (!ok && deciding !== req.id) { setDeciding(req.id); setNote(""); return; }
    if (!ok && !note.trim()) { toast.error("Write why it is declined — the student sees it"); return; }
    setBusy(req.id);
    try {
      const res = await api.patch(`/api/admin/student-cancel-requests/${req.id}/respond`, { status: ok ? "accepted" : "rejected", adminReply: ok ? undefined : note.trim() });
      toast.success(ok ? `Cancelled${res.data?.data?.refunded ? " and the live session refunded" : ""} — the student was told` : "Declined — the student was told");
      setDeciding(null);
      refreshWaiting();
      await load();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  const restore = async (row) => {
    setBusy(row.id);
    try {
      await api.patch(`/api/admin/session/${row.id}/restore`);
      toast.success("Session restored");
      refreshWaiting();
      await load();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  /** One log: cancelled sessions + students whose seat was cancelled. */
  const log = useMemo(() => {
    const a = (cancelled || []).map((s) => ({
      key: `s-${s.id}`, sessionId: s.id, date: s.sessionDate || s.startDate, from: s.timeFrom, to: s.timeTo, lesson: s.name,
      teacher: s.teacherName || "—", students: "All students", reason: s.cancelReason || "—",
      source: s.cancelledBy === "teacher" ? "Teacher request" : "Schedule", at: s.cancelledAt, restorable: true,
    }));
    const b = (requests || []).filter((r) => r.status === "accepted").map((r) => ({
      key: `r-${r.id}`, date: r.sessionDate, from: r.timeFrom, to: r.timeTo, lesson: r.sessionName, teacher: r.teacherName || "—",
      students: r.studentName, reason: r.reason, source: "Student request", at: r.respondedAt,
    }));
    return [...a, ...b].sort((x, y) => String(y.at || "").localeCompare(String(x.at || "")));
  }, [cancelled, requests]);

  const pending = (requests || []).filter((r) => r.status === "pending");
  const teachers = [...new Set(log.map((r) => r.teacher).filter((t) => t && t !== "—"))].sort();
  const ql = q.trim().toLowerCase();
  const list = log.filter((r) => (src === "all" || r.source === src) && (teacher === "all" || r.teacher === teacher)
    && (!ql || [r.lesson, r.teacher, r.students, r.reason].join(" ").toLowerCase().includes(ql)));
  const month = new Date().toISOString().slice(0, 7);
  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-0";

  return (
    <div>
      <PageHead title="Cancellations" sub="Every cancelled session — by admin, from approved teacher requests and from student requests. Students are told when their session is cancelled." />

      {pending.length > 0 && (
        <section className="bg-white rounded-xl border border-amber-200 shadow-sm mb-4 overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-amber-900">Student cancel requests · {pending.length}</h3>
            <span className="text-[11px] text-amber-800">Sent at least 24 hours before the session</span>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.map((c) => {
              const h = hoursLeft(c.sessionDate, c.timeFrom);
              return (
                <div key={c.id} className="px-5 py-4 flex flex-wrap items-start gap-x-5 gap-y-3">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="font-bold text-gray-900">{c.studentName} · {c.sessionName}</p>
                    <p className="text-xs text-gray-500">
                      {fmtDay(c.sessionDate)} · {fmtTime(c.timeFrom)} – {fmtTime(c.timeTo)} · {c.teacherName || "—"}
                      {h != null && ` · starts in ${h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h`}`}
                    </p>
                    <p className="text-sm text-gray-700 mt-1.5">“{c.reason}”</p>
                    <p className="text-[11px] text-gray-400 mt-1">Asked {fmtStamp(c.createdAt)}</p>
                    {deciding === c.id && (
                      <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it is declined (the student sees this)" className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-one" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    {deciding === c.id && <button onClick={() => setDeciding(null)} className="a-btn !py-2">Cancel</button>}
                    <button onClick={() => decide(c, false)} disabled={busy === c.id} className="a-btn !py-2 !text-red-600 !border-red-200 hover:!bg-red-50">{deciding === c.id ? "Send decline" : "Decline"}</button>
                    {deciding !== c.id && <button onClick={() => decide(c, true)} disabled={busy === c.id} className="a-btn primary !py-2" style={{ background: "#15803d", borderColor: "#15803d" }}>Approve &amp; cancel</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Cancelled" value={log.length} />
        <Stat label="This month" value={log.filter((r) => String(r.at || "").slice(0, 7) === month).length} />
        <Stat label="Teacher requests" value={log.filter((r) => r.source === "Teacher request").length} />
        <Stat label="Waiting for you" value={pending.length + teacherPending} color={pending.length + teacherPending ? "#b45309" : "#94a3b8"}>
          {teacherPending > 0 && <button onClick={() => navigate("/admin/live/teacher?tab=requests")} className="text-[11px] font-bold text-one hover:underline text-left">Review teacher requests →</button>}
        </Stat>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lesson, teacher, student or reason…" className={`${sel} col-span-2 md:flex-1 md:min-w-[240px]`} />
        <select value={src} onChange={(e) => setSrc(e.target.value)} className={sel}>
          <option value="all">All sources</option>
          {["Schedule", "Teacher request", "Student request"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className={sel}>
          <option value="all">All teachers</option>
          {teachers.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-gray-400 col-span-2 md:ml-auto">{list.length} of {log.length}</span>
      </div>

      {requests === null ? <SkelRows /> : list.length ? (
        <Card bodyClass="">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>{["Session date", "Lesson", "Teacher", "Student(s)", "Reason", "Source", "Cancelled", ""].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.key} className="a-tr">
                    <td className="a-td"><p className="font-bold text-gray-800">{fmtDay(r.date)}</p><p className="text-[11px] text-gray-400">{fmtTime(r.from)} – {fmtTime(r.to)}</p></td>
                    <td className="a-td font-semibold text-gray-800">{r.lesson || "—"}</td>
                    <td className="a-td">{r.teacher}</td>
                    <td className="a-td">{r.students}</td>
                    <td className="a-td text-gray-600">{r.reason}</td>
                    <td className="a-td"><Pill tone={SOURCE_TONE[r.source]}>{r.source}</Pill></td>
                    <td className="a-td text-gray-500 whitespace-nowrap">{fmtStamp(r.at) || "—"}</td>
                    <td className="a-td text-right">{r.restorable && <button onClick={() => restore(r)} disabled={busy === r.sessionId} className="text-xs font-bold text-gray-500 hover:text-one">Restore</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : <Empty title="No cancelled sessions" text="Cancelled sessions and approved cancel requests show up here." />}
    </div>
  );
}
