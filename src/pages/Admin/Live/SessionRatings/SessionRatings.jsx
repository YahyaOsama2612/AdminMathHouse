import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Star,
  Plus,
  ArrowLeft,
  Search,
  User,
  Calendar,
  Clock,
  Users,
  Edit2,
  Trash2,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Filter,
  Sparkles,
  Phone,
  Mail,
  Award,
} from "lucide-react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import usePut from "@/hooks/usePut";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { toast } from "react-hot-toast";

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

  // Search & Filters in Ratings View
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // --- API Calls ---
  // 1. All sessions (for selector dropdown if needed)
  const { data: allSessionsRes, loading: sessionsLoading } = useGet(
    !paramSessionId ? "/api/admin/session" : ""
  );

  // 2. Active Session Details
  const {
    data: sessionRes,
    loading: sessionLoading,
    error: sessionError,
  } = useGet(activeSessionId ? `/api/admin/session/${activeSessionId}` : "");

  // 3. Session Ratings from API
  const {
    data: ratingsRes,
    loading: ratingsLoading,
    error: ratingsError,
    refetch: refetchRatings,
  } = useGet(
    activeSessionId ? `/api/admin/session-ratings/session/${activeSessionId}` : ""
  );

  // Extract Session Data (prioritizing ratingsRes session object or sessionRes)
  const sessionData = useMemo(() => {
    const fromRatings =
      ratingsRes?.data?.data?.data?.session ||
      ratingsRes?.data?.data?.session ||
      ratingsRes?.data?.session;
    const fromSession = sessionRes?.data?.session || sessionRes?.data;
    return fromRatings || fromSession || null;
  }, [ratingsRes, sessionRes]);

  // Extract Session Statistics
  const sessionStats = useMemo(() => {
    const payload =
      ratingsRes?.data?.data?.data ||
      ratingsRes?.data?.data ||
      ratingsRes?.data ||
      {};
    return {
      averageOverallRating:
        payload.averageOverallRating !== undefined
          ? payload.averageOverallRating
          : null,
      totalRatedStudents:
        payload.totalRatedStudents !== undefined
          ? payload.totalRatedStudents
          : null,
    };
  }, [ratingsRes]);

  // Extract Rated Students from API Response
  const ratedStudents = useMemo(() => {
    const payload =
      ratingsRes?.data?.data?.data ||
      ratingsRes?.data?.data ||
      ratingsRes?.data ||
      {};
    const studentsArr =
      payload.students || (Array.isArray(payload) ? payload : []);
    return Array.isArray(studentsArr) ? studentsArr : [];
  }, [ratingsRes]);

  // 4. Group students (if session belongs to a group)
  const groupId = sessionData?.groupId || sessionData?.groups?.id;
  const { data: groupData } = useGet(groupId ? `/api/admin/groups/${groupId}` : "");

  // 5. Rating Questions from API
  const { data: questionsRes, loading: questionsLoading } = useGet(
    "/api/admin/rating-questions"
  );

  const activeQuestions = useMemo(() => {
    const rawQuestions =
      questionsRes?.data?.data?.data ||
      questionsRes?.data?.data ||
      questionsRes?.data?.questions ||
      questionsRes?.data ||
      [];
    const list = Array.isArray(rawQuestions) ? rawQuestions : [];
    return list.filter((q) => q.isActive !== false);
  }, [questionsRes]);

  // Combined Students for the Session (from session + group + already rated)
  const sessionStudents = useMemo(() => {
    const map = new Map();

    // From session.students
    if (sessionData?.students && Array.isArray(sessionData.students)) {
      sessionData.students.forEach((s) => {
        const id = s.id || s.studentId;
        if (id) {
          const name =
            s.name ||
            `${s.firstname || ""} ${s.lastname || ""}`.trim() ||
            s.studentName ||
            s.email ||
            "Student";
          map.set(id, {
            id,
            name,
            email: s.email,
            phone: s.phone,
            nickname: s.nickname,
          });
        }
      });
    }

    // From group students
    const groupStudents =
      groupData?.data?.group?.students ||
      groupData?.data?.students ||
      groupData?.students ||
      [];
    if (Array.isArray(groupStudents)) {
      groupStudents.forEach((s) => {
        const id = s.id || s.studentId;
        if (id && !map.has(id)) {
          const name =
            s.name ||
            `${s.firstname || ""} ${s.lastname || ""}`.trim() ||
            s.studentName ||
            s.email ||
            "Student";
          map.set(id, {
            id,
            name,
            email: s.email,
            phone: s.phone,
            nickname: s.nickname,
          });
        }
      });
    }

    // From ratedStudents
    ratedStudents.forEach((item) => {
      const s = item.student || item;
      const id = s.id || item.studentId;
      if (id && !map.has(id)) {
        const name =
          s.name ||
          `${s.firstname || ""} ${s.lastname || ""}`.trim() ||
          s.studentName ||
          s.nickname ||
          s.email ||
          "Student";
        map.set(id, {
          id,
          name,
          email: s.email,
          phone: s.phone,
          nickname: s.nickname,
        });
      }
    });

    return Array.from(map.values());
  }, [sessionData, groupData, ratedStudents]);

  // Normalized Student Evaluations with Search and Category Filtering
  const filteredRatedStudents = useMemo(() => {
    return ratedStudents
      .map((item) => {
        const studentInfo = item.student || {};
        const studentName =
          `${studentInfo.firstname || ""} ${studentInfo.lastname || ""}`.trim() ||
          studentInfo.name ||
          item.studentName ||
          "Student";

        const qRatings =
          item.questionRatings || item.ratings || [];

        // Filter question ratings by category if category filter is active
        const filteredQRatings = qRatings.filter((qr) => {
          if (selectedCategoryFilter === "all") return true;
          return (
            (qr.category || "").toLowerCase() ===
            selectedCategoryFilter.toLowerCase()
          );
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
      })
      .filter((studentItem) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const matchName = studentItem.studentName.toLowerCase().includes(q);
        const matchNickname = (studentItem.studentNickname || "")
          .toLowerCase()
          .includes(q);
        const matchEmail = (studentItem.studentEmail || "").toLowerCase().includes(q);
        const matchComment = (studentItem.generalComment || "").toLowerCase().includes(q);
        const matchQuestions = studentItem.questionRatings.some(
          (qr) =>
            (qr.questionTitle || "").toLowerCase().includes(q) ||
            (qr.comment || "").toLowerCase().includes(q)
        );
        return matchName || matchNickname || matchEmail || matchComment || matchQuestions;
      });
  }, [ratedStudents, searchQuery, selectedCategoryFilter]);

  // Overall calculations
  const totalEvaluationsCount = useMemo(() => {
    return ratedStudents.reduce((acc, curr) => {
      const qrs = curr.questionRatings || curr.ratings || [];
      return acc + qrs.length;
    }, 0);
  }, [ratedStudents]);

  // --- CRUD Operations ---
  const { postData, loading: postLoading } = usePost();
  const { putData, loading: putLoading } = usePut();
  const { deleteData, loading: deleteLoading } = useDelete();

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
    setFormSelectedStudentIds(
      sessionStudents.length > 0 ? [sessionStudents[0].id] : []
    );
    setFormGeneralComment("");
    setIsAddModalOpen(true);
  };

  const handleRatingChange = (qId, field, val) => {
    setFormRatings((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [field]: val,
      },
    }));
  };

  const toggleSelectAllStudents = () => {
    if (formSelectedStudentIds.length === sessionStudents.length) {
      setFormSelectedStudentIds([]);
    } else {
      setFormSelectedStudentIds(sessionStudents.map((s) => s.id));
    }
  };

  const toggleStudentSelection = (sId) => {
    setFormSelectedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
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

    // Build the ratings payload matching user's spec
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
      ...(formGeneralComment.trim()
        ? { generalComment: formGeneralComment.trim() }
        : {}),
      ratings: ratingsArray,
    }));

    const payload = { students: studentsPayload };

    try {
      await postData(
        payload,
        `/api/admin/session-ratings/session/${activeSessionId}`,
        "Ratings saved successfully"
      );
      setIsAddModalOpen(false);
      refetchRatings();
    } catch (err) {
      console.error("Save ratings error:", err);
    }
  };

  // Edit Rating (Question or Overall)
  const handleOpenEditQuestion = (qr, studentName) => {
    setRatingToEdit({
      type: "question",
      id: qr.id,
      studentName,
      title: qr.questionTitle,
      rating: qr.rating,
      comment: qr.comment || "",
    });
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
        ...(ratingToEdit.rating !== undefined
          ? { overallRating: Number(ratingToEdit.rating) }
          : {}),
      };
    } else {
      payload = {
        rating: Number(ratingToEdit.rating),
        comment: ratingToEdit.comment || null,
      };
    }

    try {
      await putData(
        payload,
        `/api/admin/session-ratings/${ratingToEdit.id}`,
        "Updated successfully"
      );
      setIsEditModalOpen(false);
      setRatingToEdit(null);
      refetchRatings();
    } catch (err) {
      console.error("Update rating error:", err);
    }
  };

  // Delete Action
  const handleOpenDelete = (item, type) => {
    setItemToDelete({
      id: item.id,
      title: item.title || item.studentName || "evaluation",
      type,
    });
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
    const sessions =
      allSessionsRes?.data?.sessions || allSessionsRes?.data || [];
    return Array.isArray(sessions) ? sessions : [];
  }, [allSessionsRes]);

  if (sessionLoading && activeSessionId && !sessionData) return <Loader />;
  if (sessionError && activeSessionId && !sessionData) return <Errorpage />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Session Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => navigate("/admin/live/sessions")}
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sessions
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Session Ratings</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            {sessionData ? sessionData.name : "Session Ratings"}
          </h1>

          {sessionData && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-md">
                <Calendar className="w-3.5 h-3.5" />
                {sessionData.sessionDate
                  ? new Date(sessionData.sessionDate).toLocaleDateString()
                  : "N/A"}
              </span>
              {(sessionData.timeFrom || sessionData.timeTo) && (
                <span className="flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-md">
                  <Clock className="w-3.5 h-3.5" />
                  {sessionData.timeFrom || "-"} - {sessionData.timeTo || "-"}
                </span>
              )}
              <span className="flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-md">
                <User className="w-3.5 h-3.5" />
                Teacher:{" "}
                {sessionData.teacherName ||
                  sessionData.teacher?.name ||
                  "Assigned Teacher"}
              </span>
              {sessionData.groups?.name && (
                <span className="flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-md">
                  <Users className="w-3.5 h-3.5" />
                  Group: {sessionData.groups.name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions & Session Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {!paramSessionId && (
            <div className="min-w-[240px]">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full p-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-one outline-none"
              >
                <option value="">Select a Session...</option>
                {allSessionOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (
                    {s.sessionDate
                      ? new Date(s.sessionDate).toLocaleDateString()
                      : "-"}
                    )
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSessionId && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-[#7D0A0A] hover:bg-[#5C0707] text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Rate Students
            </button>
          )}
        </div>
      </div>

      {!activeSessionId ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground shadow-sm">
          <Star className="w-12 h-12 mx-auto text-amber-500/50 mb-3" />
          <h2 className="text-lg font-semibold text-foreground">
            Select a Session to View Ratings
          </h2>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Choose a session from the dropdown above or access this page directly
            from the Sessions table.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground">Rated Students</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {sessionStats.totalRatedStudents !== null
                    ? sessionStats.totalRatedStudents
                    : ratedStudents.length}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground">Average Overall Rating</p>
                <p className="text-2xl font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                  {sessionStats.averageOverallRating !== null
                    ? `${Number(sessionStats.averageOverallRating).toFixed(1)} / 10`
                    : "N/A"}
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500 inline" />
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total Criteria Evaluated</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {totalEvaluationsCount}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-4 rounded-xl shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, criteria, comment..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-one outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="p-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="behavioral">Behavioral</option>
              </select>
            </div>
          </div>

          {/* Ratings List Content */}
          {ratingsLoading ? (
            <Loader />
          ) : ratingsError ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-center text-sm">
              Failed to load session ratings.
            </div>
          ) : filteredRatedStudents.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground shadow-sm">
              <Star className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">
                No Ratings Found
              </h3>
              <p className="text-sm mt-1 max-w-md mx-auto">
                {searchQuery || selectedCategoryFilter !== "all"
                  ? "No evaluations match your search or filter criteria."
                  : "No students have been evaluated for this session yet. Click 'Rate Students' to start."}
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-4 inline-flex items-center gap-2 bg-[#7D0A0A] hover:bg-[#5C0707] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Rate Students Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRatedStudents.map((studentItem) => (
                <div
                  key={studentItem.sessionRatingId}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
                >
                  {/* Student Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7D0A0A]/20 to-[#7D0A0A]/10 text-[#7D0A0A] font-extrabold flex items-center justify-center text-lg shadow-inner">
                        {studentItem.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-foreground text-base">
                            {studentItem.studentName}
                          </h3>
                          {studentItem.studentNickname && (
                            <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">
                              @{studentItem.studentNickname}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {studentItem.studentEmail && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {studentItem.studentEmail}
                            </span>
                          )}
                          {studentItem.studentPhone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {studentItem.studentPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Overall Rating & Overall Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-bold border border-amber-500/20">
                        <Star className="w-4 h-4 fill-amber-500" />
                        Overall: {studentItem.overallRating ?? "-"} / 10
                      </div>

                      <button
                        onClick={() => handleOpenEditStudentComment(studentItem)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Student Evaluation & Comment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleOpenDelete(
                            {
                              id: studentItem.sessionRatingId,
                              studentName: studentItem.studentName,
                            },
                            "student"
                          )
                        }
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Delete Entire Student Evaluation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* General Comment (if present) */}
                  {studentItem.generalComment && (
                    <div className="p-3.5 bg-muted/20 border border-border/80 rounded-xl flex items-start gap-2.5">
                      <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          General Feedback:
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          "{studentItem.generalComment}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Question Ratings Grid */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                      Evaluated Criteria ({studentItem.questionRatings.length})
                    </h4>

                    {studentItem.questionRatings.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No criteria match the selected category filter.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {studentItem.questionRatings.map((qr) => (
                          <div
                            key={qr.id}
                            className="bg-muted/10 border border-border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 hover:border-primary/40 transition-colors"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[11px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  {qr.category || "general"}
                                </span>
                                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                                  {qr.rating}
                                  <span className="text-xs text-muted-foreground font-normal">
                                    / 10
                                  </span>
                                </div>
                              </div>

                              <h5 className="text-sm font-semibold text-foreground mt-2 leading-snug">
                                {qr.questionTitle}
                              </h5>

                              {qr.comment && (
                                <p className="text-xs text-muted-foreground mt-2 bg-card p-2 rounded-lg border border-border/70">
                                  {qr.comment}
                                </p>
                              )}
                            </div>

                            {/* Actions for this question rating */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                              <span>Weight: {qr.weight ?? 1}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handleOpenEditQuestion(
                                      qr,
                                      studentItem.studentName
                                    )
                                  }
                                  className="p-1 rounded hover:bg-blue-500/10 text-blue-600 transition-colors"
                                  title="Edit Criteria Score"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleOpenDelete(
                                      {
                                        id: qr.id,
                                        title: qr.questionTitle,
                                      },
                                      "question"
                                    )
                                  }
                                  className="p-1 rounded hover:bg-red-500/10 text-red-600 transition-colors"
                                  title="Delete Criteria Score"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- ADD / BULK RATING MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Evaluate Students
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select student(s), rate configured questions (1-10), and leave
                  general feedback.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Student Selection Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    Select Student(s) to Rate:
                  </label>
                  {sessionStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllStudents}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {formSelectedStudentIds.length === sessionStudents.length
                        ? "Deselect All"
                        : "Select All Enrolled"}
                    </button>
                  )}
                </div>

                {sessionStudents.length === 0 ? (
                  <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                    No enrolled students detected for this session.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-border rounded-xl bg-muted/10">
                    {sessionStudents.map((s) => {
                      const isSelected = formSelectedStudentIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleStudentSelection(s.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-[#7D0A0A] text-white shadow-sm"
                              : "bg-card border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          <User className="w-3 h-3" />
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {formSelectedStudentIds.length} student(s) selected for this
                  evaluation.
                </p>
              </div>

              {/* General Session Feedback */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  General Comment (Optional):
                </label>
                <textarea
                  rows={2}
                  value={formGeneralComment}
                  onChange={(e) => setFormGeneralComment(e.target.value)}
                  placeholder="e.g., Excellent participation throughout the session, understood core concepts quickly..."
                  className="w-full p-3 text-sm border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-one outline-none resize-none"
                />
              </div>

              {/* Rating Questions Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Rating Criteria ({activeQuestions.length} Questions)
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Scale: 1 (Lowest) to 10 (Highest)
                  </span>
                </div>

                {questionsLoading ? (
                  <Loader />
                ) : activeQuestions.length === 0 ? (
                  <div className="p-4 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground">
                    No active rating questions found. Please add questions under
                    Settings &gt; Rating Questions.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeQuestions.map((q, idx) => {
                      const currentVal = formRatings[q.id]?.rating ?? 10;
                      const currentComment = formRatings[q.id]?.comment ?? "";

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl border border-border bg-card space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground">
                                  #{idx + 1}
                                </span>
                                <span className="text-xs uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  {q.category}
                                </span>
                              </div>
                              <h4 className="font-semibold text-sm text-foreground mt-1">
                                {q.title}
                              </h4>
                              {q.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {q.description}
                                </p>
                              )}
                            </div>

                            {/* Rating Selector (1-10) */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                Score:
                              </span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() =>
                                      handleRatingChange(q.id, "rating", num)
                                    }
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                      currentVal === num
                                        ? "bg-amber-500 text-white shadow-md scale-105"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Per-Question Comment */}
                          <div>
                            <input
                              type="text"
                              value={currentComment}
                              onChange={(e) =>
                                handleRatingChange(q.id, "comment", e.target.value)
                              }
                              placeholder="Add specific note or observation for this question (optional)..."
                              className="w-full p-2 text-xs border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-one outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-muted/20">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRatings}
                disabled={postLoading || activeQuestions.length === 0}
                className="px-6 py-2 text-sm rounded-xl bg-[#7D0A0A] hover:bg-[#5C0707] text-white font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {postLoading ? "Saving Ratings..." : "Submit Ratings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT RATING MODAL --- */}
      {isEditModalOpen && ratingToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" /> Edit Evaluation
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Student:{" "}
                <span className="font-semibold text-foreground">
                  {ratingToEdit.studentName}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Item:{" "}
                <span className="font-semibold text-foreground">
                  {ratingToEdit.title}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              {ratingToEdit.type === "question" && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Score (1-10):
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() =>
                          setRatingToEdit((prev) => ({ ...prev, rating: num }))
                        }
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          Number(ratingToEdit.rating) === num
                            ? "bg-amber-500 text-white shadow-md scale-105"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  {ratingToEdit.type === "student"
                    ? "General Comment:"
                    : "Observation / Comment:"}
                </label>
                <textarea
                  rows={3}
                  value={ratingToEdit.comment || ""}
                  onChange={(e) =>
                    setRatingToEdit((prev) => ({
                      ...prev,
                      comment: e.target.value,
                    }))
                  }
                  className="w-full p-2.5 text-xs border border-border rounded-xl bg-background text-foreground focus:ring-1 focus:ring-one outline-none resize-none"
                  placeholder="Enter feedback or comment..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRating}
                disabled={putLoading}
                className="px-5 py-2 text-xs rounded-xl bg-[#7D0A0A] hover:bg-[#5C0707] text-white font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {putLoading ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      <ConfirmDeleteModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={
          itemToDelete?.type === "student"
            ? "Delete Student Session Evaluation"
            : "Delete Criteria Rating"
        }
        description={`Are you sure you want to delete "${itemToDelete?.title}"?`}
      />
    </div>
  );
};

export default SessionRatings;
