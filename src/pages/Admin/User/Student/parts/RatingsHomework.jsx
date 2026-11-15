// Session ratings (GET /api/admin/session-ratings/student/:id) and extra homework review
// (GET /api/admin/extra-homework/student/:id, PUT /api/admin/extra-homework/:hw/submissions/:assignment/review).
import { useMemo, useState } from "react";
import { AlertCircle, Award, CheckCircle2, Clock, ExternalLink, Eye, FileText, MessageSquare, Pencil, Save, Star } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { Card, Pill, SkelRows } from "@/components/admin/kit";
import { fmtDate, fmtDateTime } from "./shared";

export const SessionRatingsSection = ({ studentId }) => {
  const { data: res, loading, error } = useGet(studentId ? `/api/admin/session-ratings/student/${studentId}` : "");

  const ratingsList = useMemo(() => {
    const raw = res?.data?.data || res?.data?.ratings || res?.data || [];
    if (!Array.isArray(raw)) return [];

    const list = [];
    raw.forEach((item) => {
      const qrs = item.questionRatings || item.ratings;
      if (qrs && Array.isArray(qrs) && qrs.length > 0) {
        qrs.forEach((r) => {
          list.push({
            id: r.id || `${item.id}-${r.questionId}`,
            sessionName: item.session?.name || item.sessionName || "Session",
            sessionDate: item.session?.sessionDate || item.sessionDate,
            generalComment: item.generalComment,
            overallRating: item.overallRating,
            questionTitle: r.questionTitle || r.question?.title || "Evaluation Criteria",
            category: r.category || r.question?.category || "general",
            rating: Number(r.rating) || 0,
            comment: r.comment || "",
            createdAt: r.createdAt || item.createdAt,
          });
        });
      } else {
        list.push({
          id: item.id,
          sessionName: item.session?.name || item.sessionName || "Session",
          sessionDate: item.session?.sessionDate || item.sessionDate,
          generalComment: item.generalComment,
          overallRating: item.overallRating,
          questionTitle: item.questionTitle || item.question?.title || "Evaluation Criteria",
          category: item.category || item.question?.category || "general",
          rating: Number(item.overallRating ?? item.rating ?? 0),
          comment: item.comment || "",
          createdAt: item.createdAt,
        });
      }
    });
    return list;
  }, [res]);

  const avgRating = useMemo(() => {
    if (ratingsList.length === 0) return 0;
    const sum = ratingsList.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / ratingsList.length).toFixed(1);
  }, [ratingsList]);

  return (
    <Card
      title="Session evaluations & ratings"
      sub="Teacher evaluations and criteria scores recorded during live sessions"
      right={
        ratingsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="gray">{ratingsList.length} reviews</Pill>
            <Pill tone="amber">
              <Star size={12} className="fill-amber-500 text-amber-500" /> Avg {avgRating} / 10
            </Pill>
          </div>
        )
      }
    >
      {loading ? (
        <SkelRows n={3} />
      ) : error ? (
        <p className="py-4 text-center text-sm text-red-600 bg-red-50 rounded-xl">Unable to fetch session evaluations for this student.</p>
      ) : ratingsList.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No session ratings recorded for this student yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ratingsList.map((r) => (
            <div key={r.id} className={`rounded-xl border px-4 py-3 space-y-2 ${r.rating < 5 ? "border-red-100" : "border-gray-100"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-one bg-red-50 px-2 py-0.5 rounded-full">
                  {r.category}
                </span>
                <span className="text-sm font-extrabold text-gray-900 flex items-center gap-1 tabular-nums">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  {r.rating}
                  <span className="text-xs text-gray-400 font-normal">/ 10</span>
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 leading-snug">{r.questionTitle}</h4>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock size={12} />
                  {r.sessionName}
                  {r.sessionDate ? ` · ${fmtDate(r.sessionDate)}` : ""}
                </p>
              </div>
              {r.comment && <p className="text-xs text-gray-600 bg-gray-50 px-2.5 py-2 rounded-lg">{r.comment}</p>}
              {r.generalComment && <p className="text-[11px] text-gray-400 italic">Session note: "{r.generalComment}"</p>}
            </div>
          ))}
        </div>
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
