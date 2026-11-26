// Session ratings (GET /api/admin/session-ratings/student/:id) and extra homework review
// (GET /api/admin/extra-homework/student/:id, PUT /api/admin/extra-homework/:hw/submissions/:assignment/review).
import { useMemo, useState } from "react";
import { AlertCircle, Award, CheckCircle2, Clock, ExternalLink, Eye, FileText, MessageSquare, Pencil, Save, Star } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { Card, Pill, SkelRows } from "@/components/admin/kit";
import { fmtDate, fmtDateTime } from "./shared";

/* One card per rated session: stars, the student's comment and each question's score/comment,
   plus the sessions they attended but have not rated yet. Ratings are stored out of 10. */
const tone10 = (v) => (v >= 8 ? "text-green-700" : v >= 5 ? "text-amber-600" : "text-red-600");
const Stars10 = ({ value }) => {
  const full = Math.round((Number(value) || 0) / 2); // out of 5
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 10`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={i <= full ? "fill-amber-400 text-amber-400" : "text-gray-200"} />)}
    </span>
  );
};

export const SessionRatingsSection = ({ studentId }) => {
  const { data: res, loading, error } = useGet(studentId ? `/api/admin/session-ratings/student/${studentId}` : "");
  const [q, setQ] = useState("");
  const [onlyComments, setOnlyComments] = useState(false);
  const [open, setOpen] = useState({});

  // GET .../session-ratings/student/:id -> { success, data: { message, data: { sessions, notRated, averageScore } } }
  const payload = res?.data?.data || {};
  const sessions = useMemo(() => (Array.isArray(payload.sessions) ? payload.sessions : []), [payload.sessions]);
  const notRated = Array.isArray(payload.notRated) ? payload.notRated : [];
  const ql = q.trim().toLowerCase();
  const hasComment = (r) => Boolean((r.generalComment || "").trim()) || (r.questionRatings || []).some((x) => (x.comment || "").trim());
  const shown = sessions.filter((r) => (!onlyComments || hasComment(r))
    && (!ql || [r.sessionName, r.teacherName, r.generalComment, ...(r.questionRatings || []).map((x) => x.comment)].join(" ").toLowerCase().includes(ql)));
  const avg = sessions.length ? sessions.reduce((n, r) => n + (Number(r.overallRating) || 0), 0) / sessions.length : null;
  const withComment = sessions.filter((r) => (r.generalComment || "").trim()).length;

  return (
    <Card
      title="Session ratings & comments"
      sub="Every session this student rated, with their comment, and the attended sessions they have not rated yet"
      right={sessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="gray">{sessions.length} rated</Pill>
          <Pill tone="amber"><Star size={12} className="fill-amber-500 text-amber-500" /> Avg {(avg / 2).toFixed(1)} / 5</Pill>
          <Pill tone="blue"><MessageSquare size={12} /> {withComment} comments</Pill>
          {notRated.length > 0 && <Pill tone="red">{notRated.length} not rated</Pill>}
        </div>
      )}
    >
      {loading ? (
        <SkelRows n={3} />
      ) : error ? (
        <p className="py-4 text-center text-sm text-red-600 bg-red-50 rounded-xl">Unable to fetch this student's session ratings.</p>
      ) : !sessions.length && !notRated.length ? (
        <p className="py-8 text-center text-sm text-gray-400">This student has not attended or rated any session yet.</p>
      ) : (
        <>
          {sessions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search session, teacher or comment..." className="a-inp !py-2 sm:max-w-xs" />
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={onlyComments} onChange={(e) => setOnlyComments(e.target.checked)} className="w-4 h-4 accent-[#7d0a0a]" />
                Only ratings with a comment
              </label>
              <span className="text-xs text-gray-400 sm:ml-auto">{shown.length} of {sessions.length}</span>
            </div>
          )}

          <div className="space-y-3">
            {shown.map((r) => {
              const qs = r.questionRatings || [];
              const isOpen = open[r.id];
              return (
                <article key={r.id} className={`rounded-xl border p-4 ${Number(r.overallRating) < 5 ? "border-red-100 bg-red-50/30" : "border-gray-100"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 leading-snug">{r.sessionName || "Session"}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span className="inline-flex items-center gap-1"><Clock size={12} />{r.sessionDate ? fmtDate(r.sessionDate) : "-"}</span>
                        {r.teacherName && <span>· with {r.teacherName}</span>}
                        <span>· rated {fmtDateTime(r.updatedAt || r.createdAt)}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Stars10 value={r.overallRating} />
                      <p className={`text-sm font-extrabold tabular-nums ${tone10(Number(r.overallRating))}`}>{Number(r.overallRating).toFixed(1)} <span className="text-xs text-gray-400 font-normal">/ 10</span></p>
                    </div>
                  </div>

                  {(r.generalComment || "").trim()
                    ? <blockquote className="mt-3 text-sm text-gray-700 bg-gray-50 border-l-4 border-[#7d0a0a] rounded-r-lg px-3 py-2">{r.generalComment}</blockquote>
                    : <p className="mt-3 text-xs text-gray-400 italic">No comment written.</p>}

                  {qs.length > 0 && (
                    <>
                      <button type="button" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))} className="mt-3 text-xs font-bold text-one hover:underline">
                        {isOpen ? "Hide" : "Show"} the {qs.length} question{qs.length === 1 ? "" : "s"}
                      </button>
                      {isOpen && (
                        <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100">
                          {qs.map((x) => (
                            <li key={x.id} className="px-3 py-2 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-gray-700 min-w-0">{x.questionTitle}{x.category && <span className="ml-1.5 text-[10px] font-bold uppercase text-gray-400">{x.category}</span>}</span>
                                <b className={`tabular-nums shrink-0 ${tone10(Number(x.rating))}`}>{x.rating}/10</b>
                              </div>
                              {x.comment && <p className="text-xs text-gray-500 mt-0.5">{x.comment}</p>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </article>
              );
            })}
            {sessions.length > 0 && !shown.length && <p className="py-6 text-center text-sm text-gray-400">No ratings match.</p>}
          </div>

          {notRated.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">Attended, not rated yet ({notRated.length})</p>
              <ul className="rounded-xl border border-dashed border-gray-200 divide-y divide-gray-100">
                {notRated.map((s) => (
                  <li key={s.sessionId} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-gray-700">{s.sessionName}</span>
                    <span className="text-xs text-gray-400">{fmtDate(s.sessionDate)}{s.teacherName ? ` · with ${s.teacherName}` : ""}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-gray-400 mt-1.5">Students must rate sessions from the last 14 days before using the student site; older ones stay listed here.</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

const EH_STATUS = {
  assigned: { label: "Not submitted", tone: "gray" },
  submitted: { label: "Needs review", tone: "amber" },
  graded: { label: "Graded", tone: "green" },
};

export const ExtraHomeworkSection = ({ studentId }) => {
  // { [assignmentId]: { open, score, feedback, saving, error } }
  const [forms, setForms] = useState({});
  // edits saved in this session until the data refreshes
  const [overrides, setOverrides] = useState({});

  const { data: res, loading, error, refetch } = useGet(studentId ? `/api/admin/extra-homework/student/${studentId}` : "");
  const { putData } = usePut();

  const homework = useMemo(() => {
    const payload = res?.data?.data || res?.data || {};
    const list = Array.isArray(payload.homework) ? payload.homework : [];
    return list.map((h) => ({ ...h, ...(overrides[h.assignmentId] || {}) }));
  }, [res, overrides]);

  const counts = useMemo(
    () =>
      homework.reduce(
        (acc, h) => {
          acc[h.status] = (acc[h.status] || 0) + 1;
          return acc;
        },
        { assigned: 0, submitted: 0, graded: 0 },
      ),
    [homework],
  );

  const updateForm = (key, patch) => setForms((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  const openForm = (h) => updateForm(h.assignmentId, { open: true, score: h.score ?? "", feedback: h.feedback ?? "", error: null });
  const closeForm = (key) => updateForm(key, { open: false, error: null });

  const handleSaveReview = async (h) => {
    const key = h.assignmentId;
    const form = forms[key] || {};
    const score = Number(form.score);

    if (form.score === "" || form.score === null || Number.isNaN(score) || score < 0) {
      updateForm(key, { error: "Enter a score of 0 or more." });
      return;
    }

    updateForm(key, { saving: true, error: null });
    try {
      await putData(
        { score, feedback: form.feedback?.trim() || "", status: "graded" },
        `/api/admin/extra-homework/${h.homeworkId}/submissions/${h.assignmentId}/review`,
        "Grade saved",
      );
      setOverrides((prev) => ({
        ...prev,
        [key]: { status: "graded", score, feedback: form.feedback?.trim() || null, reviewedAt: new Date().toISOString() },
      }));
      updateForm(key, { open: false, saving: false });
      refetch?.();
    } catch (err) {
      updateForm(key, { saving: false, error: err?.message || "The grade couldn't be saved. Try again." });
    }
  };

  return (
    <Card
      title="Extra homework"
      sub="What this student submitted, and their grades"
      right={
        homework.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone="amber">{counts.submitted} to review</Pill>
            <Pill tone="green">{counts.graded} graded</Pill>
            <Pill tone="gray">{counts.assigned} not submitted</Pill>
          </div>
        )
      }
    >
      {loading ? (
        <SkelRows n={3} />
      ) : error ? (
        <p className="py-4 text-center text-sm text-red-600 bg-red-50 rounded-xl">Unable to fetch extra homework for this student.</p>
      ) : homework.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No extra homework assigned to this student yet.</p>
      ) : (
        <div className="space-y-3">
          {homework.map((h) => {
            const key = h.assignmentId;
            const form = forms[key] || {};
            const st = EH_STATUS[h.status] || EH_STATUS.assigned;
            const hasSubmission = h.status === "submitted" || h.status === "graded";
            const isLate = h.submittedAt && h.dueDate && new Date(h.submittedAt) > new Date(h.dueDate);

            return (
              <div
                key={key}
                className={`rounded-xl border px-4 sm:px-5 py-4 space-y-3 ${h.status === "submitted" ? "border-amber-200 bg-amber-50/30" : "border-gray-100"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-800">{h.title || "Untitled homework"}</h4>
                    {h.description && <p className="text-sm text-gray-500 mt-0.5">{h.description}</p>}
                  </div>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Due {fmtDateTime(h.dueDate)}
                  </span>
                  {h.submittedAt && (
                    <span className={`flex items-center gap-1 ${isLate ? "text-red-600 font-semibold" : ""}`}>
                      <CheckCircle2 size={12} /> Submitted {fmtDateTime(h.submittedAt)}
                      {isLate && " (late)"}
                    </span>
                  )}
                  {h.reviewedAt && (
                    <span className="flex items-center gap-1">
                      <Award size={12} /> Reviewed {fmtDateTime(h.reviewedAt)}
                    </span>
                  )}
                </div>

                {(h.submittedPdf || h.pdfUrl || h.link) && (
                  <div className="flex flex-wrap gap-2">
                    {h.submittedPdf && (
                      <a href={h.submittedPdf} target="_blank" rel="noopener noreferrer" className="a-btn primary !py-2 !shadow-none">
                        <Eye size={15} /> Student's solution
                      </a>
                    )}
                    {h.pdfUrl && (
                      <a href={h.pdfUrl} target="_blank" rel="noopener noreferrer" className="a-btn !py-2">
                        <FileText size={15} /> Homework PDF
                      </a>
                    )}
                    {h.link && (
                      <a href={h.link} target="_blank" rel="noopener noreferrer" className="a-btn !py-2">
                        <ExternalLink size={15} /> Homework link
                      </a>
                    )}
                  </div>
                )}

                {h.studentNotes && (
                  <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="font-semibold">Student notes: </span>
                    {h.studentNotes}
                  </p>
                )}

                {h.status === "graded" && !form.open && (
                  <div className="flex flex-wrap items-start justify-between gap-3 bg-green-50/50 border border-green-100 px-4 py-3 rounded-xl">
                    <div className="space-y-1 min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                        <Award size={15} /> Score: {h.score ?? "—"}
                      </p>
                      {h.feedback && (
                        <p className="flex items-start gap-1.5 text-sm text-gray-600">
                          <MessageSquare size={15} className="mt-0.5 shrink-0" />
                          {h.feedback}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => openForm(h)} className="a-btn !py-1.5 !text-xs">
                      <Pencil size={13} /> Edit grade
                    </button>
                  </div>
                )}

                {h.status === "submitted" && !form.open && (
                  <button type="button" onClick={() => openForm(h)} className="a-btn primary !py-2">
                    <Award size={15} /> Grade submission
                  </button>
                )}

                {!hasSubmission && <p className="text-sm text-gray-400">The student hasn't submitted this homework yet.</p>}

                {hasSubmission && form.open && (
                  <div className="bg-white px-4 py-4 rounded-xl border border-red-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <label className="sm:col-span-1">
                        <span className="a-lbl-f">Score</span>
                        <input
                          type="number"
                          min="0"
                          value={form.score}
                          onChange={(e) => updateForm(key, { score: e.target.value })}
                          disabled={form.saving}
                          className="a-inp disabled:opacity-60"
                        />
                      </label>
                      <label className="sm:col-span-3">
                        <span className="a-lbl-f">Feedback for the student</span>
                        <textarea
                          rows={2}
                          value={form.feedback}
                          onChange={(e) => updateForm(key, { feedback: e.target.value })}
                          disabled={form.saving}
                          placeholder="e.g. Great work on step 4!"
                          className="a-inp disabled:opacity-60"
                        />
                      </label>
                    </div>

                    {form.error && (
                      <p className="flex items-center gap-1.5 text-sm text-red-600">
                        <AlertCircle size={15} className="shrink-0" />
                        {typeof form.error === "object" ? form.error?.message || JSON.stringify(form.error) : String(form.error)}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleSaveReview(h)} disabled={form.saving} className="a-btn primary !py-2">
                        <Save size={15} /> {form.saving ? "Saving..." : "Save grade"}
                      </button>
                      <button type="button" onClick={() => closeForm(key)} disabled={form.saving} className="a-btn !py-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
