import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import RatingsOverview from "./RatingsOverview";
import { ArrowLeft, Download, Pencil, Plus, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import usePut from "@/hooks/usePut";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Empty, Modal, PageHead, Pill, SkelRows, Stat, fmtDay, fmtStamp, fmtTime } from "@/components/admin/kit";
import { toast } from "react-hot-toast";

/* Live → Session Ratings (MathPortal design).
   Ratings are stored 1–10 by the backend and shown here as 5 stars (value ÷ 2).
   Endpoints: GET /api/admin/session, GET /api/admin/session/:id, GET /api/admin/groups/:id,
              GET /api/admin/rating-questions, GET|POST /api/admin/session-ratings/session/:id,
              PUT|DELETE /api/admin/session-ratings/:id */

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const toStars = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v) / 2);
const LOW = 3.5; // stars — "needs follow-up" line, as in the design

const Stars = ({ value }) => {
  const f = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span className="whitespace-nowrap" style={{ color: "#f59e0b", letterSpacing: 1 }} aria-label={`${Number(value || 0).toFixed(1)} of 5 stars`}>
      {"★".repeat(f)}
      <span style={{ color: "#e5e7eb" }}>{"★".repeat(5 - f)}</span>
    </span>
  );
};

const initials = (name) => {
  const w = String(name || "").split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || "?").slice(0, 2)).toUpperCase();
};

/** 1–10 score picker; shows the star value next to it. */
const ScorePicker = ({ value, onChange }) => (
  <div className="flex flex-wrap items-center gap-1">
    {SCORES.map((num) => (
      <button
        key={num}
        type="button"
        onClick={() => onChange(num)}
        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${Number(value) === num ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800"}`}
      >
        {num}
      </button>
    ))}
    <span className="ml-1 text-xs text-gray-400 whitespace-nowrap">= {(Number(value) / 2).toFixed(1)} ★</span>
  </div>
);

const SessionRatings = () => {
  const { sessionId: paramSessionId } = useParams();
  const navigate = useNavigate();

  // Selected session state (if no param in URL)
  const [selectedSessionId, setSelectedSessionId] = useState(paramSessionId || "");
  const activeSessionId = paramSessionId || selectedSessionId;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ratingToEdit, setRatingToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Search, filters, sort, expanded rows
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [minStars, setMinStars] = useState(0);
  const [sort, setSort] = useState("newest");
  const [open, setOpen] = useState({});

  // --- API Calls ---
  // 1. All sessions (for selector dropdown if needed)
  const { data: allSessionsRes } = useGet(!paramSessionId ? "/api/admin/session" : "");

  // 2. Active Session Details
  const { data: sessionRes, loading: sessionLoading, error: sessionError } = useGet(
    activeSessionId ? `/api/admin/session/${activeSessionId}` : ""
  );

  // 3. Session Ratings from API
  const {
    data: ratingsRes,
    loading: ratingsLoading,
    error: ratingsError,
    refetch: refetchRatings,
  } = useGet(activeSessionId ? `/api/admin/session-ratings/session/${activeSessionId}` : "");

  // Extract Session Data (prioritizing ratingsRes session object or sessionRes)
  const sessionData = useMemo(() => {
    const fromRatings =
      ratingsRes?.data?.data?.data?.session || ratingsRes?.data?.data?.session || ratingsRes?.data?.session;
    const fromSession = sessionRes?.data?.session || sessionRes?.data;
    return fromRatings || fromSession || null;
  }, [ratingsRes, sessionRes]);

  // Extract Session Statistics
  const sessionStats = useMemo(() => {
    const payload = ratingsRes?.data?.data?.data || ratingsRes?.data?.data || ratingsRes?.data || {};
    return {
      averageOverallRating: payload.averageOverallRating !== undefined ? payload.averageOverallRating : null,
      totalRatedStudents: payload.totalRatedStudents !== undefined ? payload.totalRatedStudents : null,
    };
  }, [ratingsRes]);

  // Extract Rated Students from API Response
  const ratedStudents = useMemo(() => {
    const payload = ratingsRes?.data?.data?.data || ratingsRes?.data?.data || ratingsRes?.data || {};
    const studentsArr = payload.students || (Array.isArray(payload) ? payload : []);
    return Array.isArray(studentsArr) ? studentsArr : [];
  }, [ratingsRes]);

  // 4. Group students (if session belongs to a group)
  const groupId = sessionData?.groupId || sessionData?.groups?.id;
  const { data: groupData } = useGet(groupId ? `/api/admin/groups/${groupId}` : "");

  // 5. Rating Questions from API
  const { data: questionsRes, loading: questionsLoading } = useGet("/api/admin/rating-questions");

  const activeQuestions = useMemo(() => {
    const rawQuestions =
      questionsRes?.data?.data?.data || questionsRes?.data?.data || questionsRes?.data?.questions || questionsRes?.data || [];
    const list = Array.isArray(rawQuestions) ? rawQuestions : [];
    return list.filter((q) => q.isActive !== false);
  }, [questionsRes]);

  // Combined Students for the Session (from session + group + already rated)
  const sessionStudents = useMemo(() => {
    const map = new Map();
    const add = (s, id, withNickname) => {
      if (!id || map.has(id)) return;
      const name =
        s.name ||
        `${s.firstname || ""} ${s.lastname || ""}`.trim() ||
        s.studentName ||
        (withNickname ? s.nickname : "") ||
        s.email ||
        "Student";
      map.set(id, { id, name, email: s.email, phone: s.phone, nickname: s.nickname });
    };

    if (sessionData?.students && Array.isArray(sessionData.students)) {
      sessionData.students.forEach((s) => add(s, s.id || s.studentId));
    }
    const groupStudents = groupData?.data?.group?.students || groupData?.data?.students || groupData?.students || [];
    if (Array.isArray(groupStudents)) groupStudents.forEach((s) => add(s, s.id || s.studentId));
    ratedStudents.forEach((item) => {
      const s = item.student || item;
      add(s, s.id || item.studentId, true);
    });
    return Array.from(map.values());
  }, [sessionData, groupData, ratedStudents]);

  // Normalized student evaluations
  const normalized = useMemo(
    () =>
      ratedStudents.map((item) => {
        const studentInfo = item.student || {};
        const studentName =
          `${studentInfo.firstname || ""} ${studentInfo.lastname || ""}`.trim() || studentInfo.name || item.studentName || "Student";
        const qRatings = item.questionRatings || item.ratings || [];
        const filteredQRatings = qRatings.filter((qr) => {
          if (selectedCategoryFilter === "all") return true;
          return (qr.category || "").toLowerCase() === selectedCategoryFilter.toLowerCase();
        });
        return {
          sessionRatingId: item.id,
          studentId: studentInfo.id || item.studentId,
          studentName,
          studentNickname: studentInfo.nickname,
          studentEmail: studentInfo.email,
          studentPhone: studentInfo.phone,
          overallRating: item.overallRating,
          generalComment: item.generalComment,
          createdAt: item.createdAt,
          questionRatings: filteredQRatings,
          allQuestionRatings: qRatings,
        };
      }),
    [ratedStudents, selectedCategoryFilter]
  );

  // Search + rating filter + sort
  const filteredRatedStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const list = normalized.filter((studentItem) => {
      const stars = toStars(studentItem.overallRating);
      if (minStars > 0 && !(stars !== null && stars >= minStars)) return false;
      if (minStars < 0 && !(stars !== null && stars <= -minStars)) return false;
      if (!q) return true;
      const matchName = studentItem.studentName.toLowerCase().includes(q);
      const matchNickname = (studentItem.studentNickname || "").toLowerCase().includes(q);
      const matchEmail = (studentItem.studentEmail || "").toLowerCase().includes(q);
      const matchComment = (studentItem.generalComment || "").toLowerCase().includes(q);
      const matchQuestions = studentItem.questionRatings.some(
        (qr) => (qr.questionTitle || "").toLowerCase().includes(q) || (qr.comment || "").toLowerCase().includes(q)
      );
      return matchName || matchNickname || matchEmail || matchComment || matchQuestions;
    });
    const num = (v) => (v === null || v === undefined ? null : Number(v));
    if (sort === "low") list.sort((a, b) => (num(a.overallRating) ?? 99) - (num(b.overallRating) ?? 99));
    else if (sort === "high") list.sort((a, b) => (num(b.overallRating) ?? -1) - (num(a.overallRating) ?? -1));
    else if (sort === "name") list.sort((a, b) => a.studentName.localeCompare(b.studentName));
    else list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return list;
  }, [normalized, searchQuery, minStars, sort]);

  // Overall calculations
  const totalEvaluationsCount = useMemo(
    () => ratedStudents.reduce((acc, curr) => acc + (curr.questionRatings || curr.ratings || []).length, 0),
    [ratedStudents]
  );
  const lowCount = normalized.filter((s) => {
    const st = toStars(s.overallRating);
    return st !== null && st <= LOW;
  }).length;
  const commentCount = normalized.filter((s) => s.generalComment).length;

  // --- CRUD Operations ---
  const { postData, loading: postLoading } = usePost();
  const { putData, loading: putLoading } = usePut();
  const { deleteData } = useDelete();

  // New Rating Form State
  const [formSelectedStudentIds, setFormSelectedStudentIds] = useState([]);
  const [formGeneralComment, setFormGeneralComment] = useState("");
  const [formRatings, setFormRatings] = useState({}); // { [questionId]: { rating: 10, comment: "" } }

  const handleOpenAddModal = () => {
    const initial = {};
    activeQuestions.forEach((q) => {
      initial[q.id] = { rating: 10, comment: "" };
    });
    setFormRatings(initial);
    setFormSelectedStudentIds(sessionStudents.length > 0 ? [sessionStudents[0].id] : []);
    setFormGeneralComment("");
    setIsAddModalOpen(true);
  };

  const handleRatingChange = (qId, field, val) => {
    setFormRatings((prev) => ({ ...prev, [qId]: { ...prev[qId], [field]: val } }));
  };

  const toggleSelectAllStudents = () => {
    if (formSelectedStudentIds.length === sessionStudents.length) setFormSelectedStudentIds([]);
    else setFormSelectedStudentIds(sessionStudents.map((s) => s.id));
  };

  const toggleStudentSelection = (sId) => {
    setFormSelectedStudentIds((prev) => (prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]));
  };

  // Submit Bulk / Single Rating
  const handleSaveRatings = async () => {
    if (formSelectedStudentIds.length === 0) {
      toast.error("Please select at least one student to rate");
      return;
    }
    if (activeQuestions.length === 0) {
      toast.error("No active rating questions found");
      return;
    }

    const ratingsArray = activeQuestions.map((q) => {
      const qVal = formRatings[q.id] || { rating: 10, comment: "" };
      return {
        questionId: q.id,
        rating: Number(qVal.rating),
        ...(qVal.comment?.trim() ? { comment: qVal.comment.trim() } : {}),
      };
    });

    const studentsPayload = formSelectedStudentIds.map((sId) => ({
      studentId: sId,
      ...(formGeneralComment.trim() ? { generalComment: formGeneralComment.trim() } : {}),
      ratings: ratingsArray,
    }));

    try {
      await postData({ students: studentsPayload }, `/api/admin/session-ratings/session/${activeSessionId}`, "Ratings saved successfully");
      setIsAddModalOpen(false);
      refetchRatings();
    } catch (err) {
      console.error("Save ratings error:", err);
    }
  };

  // Edit Rating (Question or Overall)
  const handleOpenEditQuestion = (qr, studentName) => {
    setRatingToEdit({ type: "question", id: qr.id, studentName, title: qr.questionTitle, rating: qr.rating, comment: qr.comment || "" });
    setIsEditModalOpen(true);
  };

  const handleOpenEditStudentComment = (studentItem) => {
    setRatingToEdit({
      type: "student",
      id: studentItem.sessionRatingId,
      studentName: studentItem.studentName,
      title: "General Session Comment",
      rating: studentItem.overallRating,
      comment: studentItem.generalComment || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRating = async () => {
    if (!ratingToEdit?.id) {
      toast.error("Rating ID is missing");
      return;
    }
    let payload = {};
    if (ratingToEdit.type === "student") {
      payload = {
        generalComment: ratingToEdit.comment || "",
        ...(ratingToEdit.rating !== undefined ? { overallRating: Number(ratingToEdit.rating) } : {}),
      };
    } else {
      payload = { rating: Number(ratingToEdit.rating), comment: ratingToEdit.comment || null };
    }
    try {
      await putData(payload, `/api/admin/session-ratings/${ratingToEdit.id}`, "Updated successfully");
      setIsEditModalOpen(false);
      setRatingToEdit(null);
      refetchRatings();
    } catch (err) {
      console.error("Update rating error:", err);
    }
  };

  // Delete Action
  const handleOpenDelete = (item, type) => {
    setItemToDelete({ id: item.id, title: item.title || item.studentName || "evaluation", type });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete?.id) return;
    try {
      await deleteData(`/api/admin/session-ratings/${itemToDelete.id}`);
      toast.success("Deleted successfully");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      refetchRatings();
    } catch (err) {
      console.error("Delete rating error:", err);
      toast.error("Failed to delete");
    }
  };

  const allSessionOptions = useMemo(() => {
    const sessions = allSessionsRes?.data?.sessions || allSessionsRes?.data || [];
    return Array.isArray(sessions) ? sessions : [];
  }, [allSessionsRes]);

  const allOpen = filteredRatedStudents.length > 0 && filteredRatedStudents.every((s) => open[s.sessionRatingId]);
  const toggleAll = () => {
    const next = {};
    if (!allOpen) filteredRatedStudents.forEach((s) => (next[s.sessionRatingId] = true));
    setOpen(next);
  };

  // CSV of what is on screen — one row per criteria score (client-side, no extra request)
  const exportCsv = () => {
    const rows = [["Student", "Email", "Overall (1-10)", "Overall stars", "General comment", "Rated at", "Category", "Criteria", "Score (1-10)", "Stars", "Comment"]];
    filteredRatedStudents.forEach((s) => {
      const qrs = s.questionRatings.length ? s.questionRatings : [{}];
      qrs.forEach((qr) =>
        rows.push([
          s.studentName, s.studentEmail || "", s.overallRating ?? "", toStars(s.overallRating)?.toFixed(1) ?? "", s.generalComment || "",
          s.createdAt || "", qr.category || "", qr.questionTitle || "", qr.rating ?? "", toStars(qr.rating)?.toFixed(1) ?? "", qr.comment || "",
        ])
      );
    });
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
    a.download = `session-ratings${sessionData?.name ? "-" + String(sessionData.name).replace(/[^\w-]+/g, "_") : ""}.csv`;
    a.click();
    toast.success("Exported — one row per criteria score");
  };

  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-0";
  const avgStars = toStars(sessionStats.averageOverallRating);
  const ratedCount = sessionStats.totalRatedStudents !== null ? sessionStats.totalRatedStudents : ratedStudents.length;
  const teacherName = sessionData ? sessionData.teacherName || sessionData.teacher?.name || "Assigned Teacher" : "";
  const sessionSub = sessionData
    ? [
        sessionData.sessionDate ? fmtDay(sessionData.sessionDate) : null,
        sessionData.timeFrom || sessionData.timeTo ? `${fmtTime(sessionData.timeFrom) || "-"} – ${fmtTime(sessionData.timeTo) || "-"}` : null,
        `Teacher: ${teacherName}`,
        sessionData.groups?.name ? `Group: ${sessionData.groups.name}` : null,
      ].filter(Boolean).join(" · ")
    : "What each student was rated on every criteria, with comments. Ratings are out of 10, shown as 5 stars.";
  const filtersOn = searchQuery || selectedCategoryFilter !== "all" || minStars;

  return (
    <div>
      <button onClick={() => navigate("/admin/live/sessions")} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-one">
        <ArrowLeft size={14} /> Back to sessions
      </button>

      <PageHead title={sessionData?.name ? `Session Ratings · ${sessionData.name}` : "Session Ratings"} sub={sessionSub}>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!paramSessionId && (
            <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)} className={`${sel} w-full sm:w-64`}>
              <option value="">Select a session…</option>
              {allSessionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sessionDate ? new Date(s.sessionDate).toLocaleDateString("en-US") : "-"})
                </option>
              ))}
            </select>
          )}
          {activeSessionId && filteredRatedStudents.length > 0 && (
            <>
              <button onClick={exportCsv} className="a-btn"><Download size={15} /> Export CSV</button>
              <button onClick={toggleAll} className="a-btn">{allOpen ? "Collapse all" : "Expand all"}</button>
            </>
          )}
          {activeSessionId && (
            <button onClick={handleOpenAddModal} className="a-btn primary"><Plus size={16} /> Rate students</button>
          )}
        </div>
      </PageHead>

      {!activeSessionId ? (
        <Empty title="Select a session to view its ratings" text="Choose a session above, or open ratings from a row in the Sessions table." />
      ) : sessionLoading && !sessionData ? (
        <SkelRows n={5} />
      ) : sessionError && !sessionData ? (
        <div className="bg-white rounded-xl border border-red-100 p-6 text-center text-sm text-red-600">Could not load this session.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Stat label="Average rating" value={avgStars !== null ? `${avgStars.toFixed(2)} ★` : "—"} sub={`${ratedCount} student rating${ratedCount === 1 ? "" : "s"}`} color={avgStars !== null ? "#b45309" : "#94a3b8"} />
            <Stat label="Rated students" value={ratedCount} sub={sessionStudents.length > ratedCount ? `of ${sessionStudents.length} in this session` : "In this session"} />
            <Stat label="Criteria scored" value={totalEvaluationsCount} sub={`${commentCount} with a general comment`} />
            <Stat label="Needs follow-up" value={lowCount} sub={`Students at ${LOW}★ or less`} color={lowCount ? "#7d0a0a" : "#94a3b8"} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, criteria or comment…"
              className={`${sel} col-span-2 md:flex-1 md:min-w-[220px]`}
            />
            <select value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value)} className={sel}>
              <option value="all">All categories</option>
              <option value="general">General</option>
              <option value="academic">Academic</option>
              <option value="behavioral">Behavioral</option>
            </select>
            <select value={minStars} onChange={(e) => setMinStars(Number(e.target.value))} className={sel}>
              {[[0, "Any rating"], [4.5, "4.5★ and up"], [4, "4★ and up"], [-LOW, `${LOW}★ or less`]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel}>
              {[["newest", "Newest first"], ["low", "Lowest rated first"], ["high", "Highest rated first"], ["name", "Student name"]].map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            {filtersOn ? (
              <button onClick={() => { setSearchQuery(""); setSelectedCategoryFilter("all"); setMinStars(0); }} className="text-xs font-bold text-one hover:underline px-2 text-left">
                Clear filters
              </button>
            ) : null}
            <span className="text-xs text-gray-400 col-span-2 md:ml-auto">{filteredRatedStudents.length} of {normalized.length}</span>
          </div>

          {ratingsLoading && !ratingsRes ? (
            <SkelRows n={5} />
          ) : ratingsError && !ratingsRes ? (
            <div className="bg-white rounded-xl border border-red-100 p-6 text-center text-sm text-red-600">Failed to load session ratings.</div>
          ) : filteredRatedStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 px-4 text-center">
              <p className="font-bold text-gray-700">No ratings found</p>
              <p className="text-sm text-gray-400">
                {filtersOn ? "No evaluations match these filters." : "No student has been rated for this session yet."}
              </p>
              {!filtersOn && (
                <button onClick={handleOpenAddModal} className="a-btn primary mt-4"><Plus size={16} /> Rate students now</button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="sr-row sr-head">
                <span>Student</span><span>General comment</span><span>Criteria</span><span>Rating</span><span>Rated</span><span></span>
              </div>
              {filteredRatedStudents.map((s) => (
                <RatingRow
                  key={s.sessionRatingId}
                  s={s}
                  isOpen={!!open[s.sessionRatingId]}
                  onToggle={() => setOpen((o) => ({ ...o, [s.sessionRatingId]: !o[s.sessionRatingId] }))}
                  onEditStudent={() => handleOpenEditStudentComment(s)}
                  onDeleteStudent={() => handleOpenDelete({ id: s.sessionRatingId, studentName: s.studentName }, "student")}
                  onEditQuestion={(qr) => handleOpenEditQuestion(qr, s.studentName)}
                  onDeleteQuestion={(qr) => handleOpenDelete({ id: qr.id, title: qr.questionTitle }, "question")}
                  filtered={selectedCategoryFilter !== "all"}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* --- ADD / BULK RATING MODAL --- */}
      {isAddModalOpen && (
        <Modal
          wide
          title="Rate students"
          onClose={() => setIsAddModalOpen(false)}
          actions={
            <>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="a-btn">Cancel</button>
              <button type="button" onClick={handleSaveRatings} disabled={postLoading || activeQuestions.length === 0} className="a-btn primary">
                {postLoading ? "Saving ratings…" : "Submit ratings"}
              </button>
            </>
          }
        >
          <p className="text-xs text-gray-400 mb-4">Pick the student(s), score each question from 1 to 10 (shown to students as 5 stars) and add optional feedback.</p>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="a-lbl-f !mb-0">Students</label>
              {sessionStudents.length > 0 && (
                <button type="button" onClick={toggleSelectAllStudents} className="text-xs font-bold text-one hover:underline">
                  {formSelectedStudentIds.length === sessionStudents.length ? "Deselect all" : "Select all enrolled"}
                </button>
              )}
            </div>
            {sessionStudents.length === 0 ? (
              <p className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500">No enrolled students detected for this session.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-gray-100 rounded-xl bg-gray-50/60">
                {sessionStudents.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleStudentSelection(st.id)}
                    className={`a-chip ${formSelectedStudentIds.includes(st.id) ? "on" : ""}`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1">{formSelectedStudentIds.length} student(s) selected.</p>
          </div>

          <div className="mb-4">
            <label className="a-lbl-f">General comment <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              rows={2}
              value={formGeneralComment}
              onChange={(e) => setFormGeneralComment(e.target.value)}
              placeholder="e.g. Excellent participation, understood the core ideas quickly…"
              className="a-inp resize-none"
            />
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
            <p className="font-bold text-gray-800">Criteria · {activeQuestions.length}</p>
            <span className="text-[11px] text-gray-400">1 = lowest · 10 = highest</span>
          </div>

          {questionsLoading ? (
            <SkelRows n={3} />
          ) : activeQuestions.length === 0 ? (
            <p className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
              No active rating questions found. Add questions under Settings &gt; Rating Questions.
            </p>
          ) : (
            <div className="space-y-2.5">
              {activeQuestions.map((q, idx) => {
                const currentVal = formRatings[q.id]?.rating ?? 10;
                const currentComment = formRatings[q.id]?.comment ?? "";
                return (
                  <div key={q.id} className="sr-review space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400">#{idx + 1}</span>
                      {q.category && <Pill tone="gray">{q.category}</Pill>}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{q.title}</p>
                      {q.description && <p className="text-xs text-gray-400">{q.description}</p>}
                    </div>
                    <ScorePicker value={currentVal} onChange={(num) => handleRatingChange(q.id, "rating", num)} />
                    <input
                      type="text"
                      value={currentComment}
                      onChange={(e) => handleRatingChange(q.id, "comment", e.target.value)}
                      placeholder="Note for this question (optional)…"
                      className="a-inp !py-2 !text-xs"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {/* --- EDIT RATING MODAL --- */}
      {isEditModalOpen && ratingToEdit && (
        <Modal
          title="Edit evaluation"
          onClose={() => setIsEditModalOpen(false)}
          actions={
            <>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="a-btn">Cancel</button>
              <button type="button" onClick={handleUpdateRating} disabled={putLoading} className="a-btn primary">
                {putLoading ? "Updating…" : "Save changes"}
              </button>
            </>
          }
        >
          <div className="sr-box mb-4">
            <div className="flex justify-between gap-3 text-sm py-0.5"><span className="text-gray-400">Student</span><span className="font-semibold text-gray-800 text-right">{ratingToEdit.studentName}</span></div>
            <div className="flex justify-between gap-3 text-sm py-0.5"><span className="text-gray-400">Item</span><span className="font-semibold text-gray-800 text-right">{ratingToEdit.title}</span></div>
          </div>
          {ratingToEdit.type === "question" && (
            <div className="mb-3">
              <label className="a-lbl-f">Score (1–10)</label>
              <ScorePicker value={ratingToEdit.rating} onChange={(num) => setRatingToEdit((prev) => ({ ...prev, rating: num }))} />
            </div>
          )}
          <label className="a-lbl-f">{ratingToEdit.type === "student" ? "General comment" : "Observation / comment"}</label>
          <textarea
            rows={3}
            value={ratingToEdit.comment || ""}
            onChange={(e) => setRatingToEdit((prev) => ({ ...prev, comment: e.target.value }))}
            className="a-inp resize-none"
            placeholder="Enter feedback or comment…"
          />
        </Modal>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      <ConfirmDeleteModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={itemToDelete?.type === "student" ? "Delete student evaluation" : "Delete criteria rating"}
        description={`Are you sure you want to delete "${itemToDelete?.title}"?`}
      />
    </div>
  );
};

/** One student's evaluation: a summary row that expands into details + criteria cards (design: srRowHtml). */
function RatingRow({ s, isOpen, onToggle, onEditStudent, onDeleteStudent, onEditQuestion, onDeleteQuestion, filtered }) {
  const stars = toStars(s.overallRating);
  const low = stars !== null && stars <= LOW;
  const all = s.allQuestionRatings;
  const dist = [5, 4, 3, 2, 1].map((v) => all.filter((qr) => Math.round(Number(qr.rating) / 2) === v).length);
  const maxD = Math.max(1, ...dist);

  return (
    <div className={`sr-item ${isOpen ? "open" : ""} ${low ? "low" : ""}`}>
      <button className="sr-row" onClick={onToggle} aria-expanded={isOpen}>
        <span className="flex items-center gap-2 min-w-0">
          <span className="sr-av student">{initials(s.studentName)}</span>
          <span className="min-w-0">
            <span className="block font-bold text-gray-800 truncate">{s.studentName}</span>
            <span className="block text-xs text-gray-400 truncate">{s.studentNickname ? `@${s.studentNickname}` : s.studentEmail || ""}</span>
          </span>
        </span>
        <span className="min-w-0">
          <span className={`block text-sm truncate ${s.generalComment ? "text-gray-600" : "text-gray-300 italic"}`}>
            {s.generalComment ? `“${s.generalComment}”` : "No general comment"}
          </span>
        </span>
        <span className="text-sm text-gray-600">{s.questionRatings.length}{filtered && s.questionRatings.length !== all.length ? ` of ${all.length}` : ""} scored</span>
        <span>
          {stars !== null ? (
            <>
              <span className="font-extrabold text-gray-800">{stars.toFixed(1)}</span> <span className="text-sm"><Stars value={stars} /></span>
            </>
          ) : (
            <span className="text-xs text-gray-400">No rating</span>
          )}
        </span>
        <span className="text-xs text-gray-500">{fmtStamp(s.createdAt) || "—"}</span>
        <span className="text-right text-gray-400 text-xs font-bold whitespace-nowrap">
          {low && <span className="sr-flag">Follow up</span>}{" "}
          <span style={{ display: "inline-block", transform: `rotate(${isOpen ? 90 : 0}deg)`, transition: "transform .2s" }}>›</span>
        </span>
      </button>

      {isOpen && (
        <div className="sr-detail">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="sr-box">
                <p className="sr-label">Student</p>
                {[
                  ["Name", s.studentName],
                  ["Nickname", s.studentNickname ? `@${s.studentNickname}` : "—"],
                  ["Email", s.studentEmail || "—"],
                  ["Phone", s.studentPhone || "—"],
                  ["Overall", stars !== null ? `${s.overallRating} / 10 · ${stars.toFixed(1)} ★` : "—"],
                  ["Rated", fmtStamp(s.createdAt) || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-sm py-1">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-semibold text-gray-800 text-right break-all">{v}</span>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={onEditStudent} className="a-btn !py-1.5 !text-xs"><Pencil size={13} /> Edit comment</button>
                  <button onClick={onDeleteStudent} className="a-btn !py-1.5 !text-xs !text-red-600 !border-red-200 hover:!bg-red-50"><Trash2 size={13} /> Delete evaluation</button>
                </div>
              </div>
              <div className="sr-box">
                <p className="sr-label">Rating breakdown</p>
                {[5, 4, 3, 2, 1].map((v, i) => (
                  <div key={v} className="flex items-center gap-2 py-0.5">
                    <span className="text-xs font-bold text-gray-600 w-7">{v} ★</span>
                    <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${(dist[i] / maxD) * 100}%`, background: v >= 4 ? "#16a34a" : v === 3 ? "#f59e0b" : "#dc2626" }} />
                    </span>
                    <span className="text-xs font-bold text-gray-500 w-4 text-right">{dist[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <p className="sr-label mb-2">Criteria & comments ({s.questionRatings.length})</p>
              {s.questionRatings.length === 0 ? (
                <p className="text-sm text-gray-400">{filtered ? "No criteria match the selected category." : "No criteria scored."}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {s.questionRatings.map((qr) => {
                    const qs = toStars(qr.rating);
                    return (
                      <div key={qr.id} className={`sr-review ${qs !== null && qs <= 1.5 ? "low" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <Pill tone="gray">{qr.category || "general"}</Pill>
                          <span className="text-sm whitespace-nowrap">
                            <span className="font-extrabold text-gray-800 mr-1">{qr.rating}<span className="text-xs font-normal text-gray-400">/10</span></span>
                            <Stars value={qs} />
                          </span>
                        </div>
                        <p className="font-bold text-sm text-gray-800 mt-2 leading-snug">{qr.questionTitle}</p>
                        <p className={`text-sm mt-1 ${qr.comment ? "text-gray-600" : "text-gray-300 italic"}`}>{qr.comment ? `“${qr.comment}”` : "No comment."}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[11px] text-gray-400">Weight {qr.weight ?? 1}</span>
                          <span className="flex gap-1.5">
                            <button onClick={() => onEditQuestion(qr)} className="a-act !w-8 !h-8" title="Edit score" aria-label="Edit score"><Pencil size={15} /></button>
                            <button onClick={() => onDeleteQuestion(qr)} className="a-act del !w-8 !h-8" title="Delete score" aria-label="Delete score"><Trash2 size={15} /></button>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** /live/session-ratings → overview of all held sessions; /live/sessions/:sessionId/ratings → one session. */
const SessionRatingsRoute = () => {
  const { sessionId } = useParams();
  return sessionId ? <SessionRatings /> : <RatingsOverview />;
};

export default SessionRatingsRoute;
