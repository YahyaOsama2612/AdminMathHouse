import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ArrowLeft, ExternalLink, FileText, Pencil } from "lucide-react";
import api from "@/api/api";
import { Pill, SkelRows, Stat, errText, fmtStamp } from "@/components/admin/kit";
import { whenText } from "./HomeworkForm";

/* Submissions + grading for one homework (design: ehSubs).
   GET /api/admin/extra-homework/:id (students with status, submittedPdf, notes, score, feedback)
   PUT /api/admin/extra-homework/:id/submissions/:assignmentId/review { score 0–100, feedback, status:"graded" }
   Left out: the design's "Remind" button (no endpoint). Scores are out of 100 (API limit). */

const STATUS = { assigned: ["Not submitted", "gray"], submitted: ["Submitted", "amber"], reviewed: ["Reviewed", "blue"], graded: ["Graded", "green"] };
const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function GradeRow({ hwId, row, due, onSaved }) {
  const [score, setScore] = useState(row.score ?? "");
  const [feedback, setFeedback] = useState(row.feedback || "");
  const [busy, setBusy] = useState(false);
  const st = row.student || {};
  const submitted = row.status !== "assigned";
  const late = submitted && row.submittedAt && due && new Date(row.submittedAt) > new Date(due);
  const dirty = String(score) !== String(row.score ?? "") || feedback !== (row.feedback || "");

  const save = async () => {
    const n = score === "" ? undefined : Number(score);
    if (n !== undefined && (Number.isNaN(n) || n < 0 || n > 100)) { toast.error("The score must be between 0 and 100"); return; }
    setBusy(true);
    try {
      await api.put(`/api/admin/extra-homework/${hwId}/submissions/${row.assignmentId}/review`, { ...(n !== undefined && { score: n }), feedback, status: "graded" });
      toast.success(n !== undefined ? `Graded ${n} / 100` : "Marked as graded");
      onSaved();
    } catch (err) {
      toast.error(errText(err, "Could not save the grade"));
    } finally {
      setBusy(false);
    }
  };

  const [sl, tone] = STATUS[row.status] || [row.status, "gray"];
  return (
    <div className="px-4 sm:px-5 py-3 flex flex-wrap items-start gap-x-4 gap-y-2">
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0" style={{ background: submitted ? "#7d0a0a" : "#cbd5e1" }}>{initials(st.name)}</span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-semibold text-gray-800 truncate">{st.name || "Student"}</p>
        <p className="text-[11px] truncate"><span className="text-one font-bold">{st.nickname || ""}</span>{st.email && <span className="text-gray-400">{st.nickname ? " · " : ""}{st.email}</span>}</p>
        {row.studentNotes && <p className="text-xs text-gray-600 mt-1">“{row.studentNotes}”</p>}
      </div>
      <div className="w-44 text-xs">
        <Pill tone={late ? "amber" : tone}>{late ? "Submitted late" : sl}</Pill>
        {row.submittedAt && <p className="text-gray-400 mt-1">{fmtStamp(row.submittedAt)}</p>}
        {row.submittedPdf && <a href={row.submittedPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 font-bold text-one hover:underline"><FileText size={12} /> Open answer</a>}
      </div>
      {submitted ? (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="—" aria-label={`Score for ${st.name}`} className="w-16 h-9 border border-gray-200 rounded-lg px-2 text-sm font-bold text-center focus:outline-none focus:border-one" />
          <span className="text-xs text-gray-400">/ 100</span>
          <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback (optional)" aria-label={`Feedback for ${st.name}`} className="h-9 border border-gray-200 rounded-lg px-3 text-sm flex-1 min-w-[160px] sm:w-56 focus:outline-none focus:border-one" />
          <button onClick={save} disabled={busy || (!dirty && row.status === "graded")} className="a-btn primary !py-2">{busy ? "Saving…" : row.status === "graded" ? "Update" : "Grade"}</button>
        </div>
      ) : <p className="text-xs text-gray-400 self-center">Waiting for the student</p>}
    </div>
  );
}

export default function Submissions({ id, onBack, onEdit, embedded = false }) {
  const [hw, setHw] = useState(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin/extra-homework/${id}`);
      setHw(res.data?.data?.data || {});
    } catch (err) {
      toast.error(errText(err, "Could not load the submissions"));
      setFailed(true);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (failed && !hw) return <p className="text-sm text-gray-500">Could not load the submissions.</p>;
  if (!hw) return <SkelRows n={5} />;

  const rows = hw.students || [];
  const s = {
    assigned: rows.length,
    submitted: rows.filter((r) => r.status !== "assigned").length,
    graded: rows.filter((r) => r.status === "graded").length,
  };
  s.pending = s.assigned - s.submitted;
  s.toGrade = s.submitted - s.graded;
  s.rate = s.assigned ? Math.round((s.submitted / s.assigned) * 100) : 0;
  const shown = rows.filter((r) => filter === "all" || (filter === "pending" ? r.status === "assigned" : filter === "grade" ? r.status === "submitted" || r.status === "reviewed" : r.status === "graded"));
  const past = hw.dueDate && new Date(hw.dueDate) < new Date();
  const target = hw.targetType === "group" ? `Group · ${hw.groupName || "—"}` : hw.targetType === "individual" ? "Individual students" : hw.targetType;

  return (
    <div>
      {!embedded && (
        <>
          <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-one mb-3 inline-flex items-center gap-1"><ArrowLeft size={15} /> Extra Homework</button>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Pill tone={hw.targetType === "group" ? "purple" : "blue"}>{target}</Pill>
                  {hw.dueDate && <Pill tone={past ? "gray" : "green"}>{past ? "Past due" : "Open"}</Pill>}
                </div>
                <h1 className="font-bold text-xl text-gray-900">{hw.title}</h1>
                {hw.description && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{hw.description}</p>}
                <p className="text-xs text-gray-400 mt-2">Due {whenText(hw.dueDate)}</p>
                {(hw.pdfUrl || hw.link) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hw.pdfUrl && <a href={hw.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-red-50 text-one hover:underline"><FileText size={12} /> Worksheet</a>}
                    {hw.link && <a href={hw.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:underline max-w-full truncate"><ExternalLink size={12} /> {hw.link.replace(/^https?:\/\//, "")}</a>}
                  </div>
                )}
              </div>
              {onEdit && <button onClick={onEdit} className="a-btn"><Pencil size={15} /> Edit</button>}
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Assigned" value={s.assigned} />
        <Stat label="Submitted" value={`${s.submitted} · ${s.rate}%`} color="#15803d" />
        <Stat label="Not submitted" value={s.pending} color={s.pending ? "#b45309" : undefined} />
        <Stat label="To grade" value={s.toGrade} sub={`${s.graded} graded`} color={s.toGrade ? "#7d0a0a" : undefined} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[["all", "All", s.assigned], ["pending", "Not submitted", s.pending], ["grade", "To grade", s.toGrade], ["graded", "Graded", s.graded]].map(([k, l, n]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`a-chip ${filter === k ? "on" : ""}`}>{l} · {n}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {shown.length ? (
          <div className="divide-y divide-gray-50">
            {shown.map((r) => <GradeRow key={`${r.assignmentId}-${r.score}-${r.feedback}-${r.status}`} hwId={id} row={r} due={hw.dueDate} onSaved={load} />)}
          </div>
        ) : <p className="px-5 py-10 text-center text-sm text-gray-400">{rows.length ? "Nobody here." : "No students have this homework yet."}</p>}
      </div>
    </div>
  );
}
