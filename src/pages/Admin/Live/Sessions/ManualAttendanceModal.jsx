import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { UserCheck, CheckSquare, Square, X, Loader2, Search, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "@/api/api";
import SearchStudents from "@/components/SearchStudents";
import { SELECT_STYLES } from "./parts/formKit";

const NO_SESSIONS = [];

const ManualAttendanceModal = ({
  open,
  onClose,
  initialSession = null,
  allSessions = NO_SESSIONS,
  onSuccess,
}) => {
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Students loaded from the selected session(s)
  const [sessionStudents, setSessionStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Checked student IDs to send in manual-attendance
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Filter text for the loaded students list
  const [studentFilter, setStudentFilter] = useState("");

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Toggle to show SearchStudents to add more students
  const [showSearchMore, setShowSearchMore] = useState(false);

  // Initialize selected session(s) when modal opens or initialSession changes
  useEffect(() => {
    if (open) {
      if (initialSession?.id) {
        setSelectedSessionIds([initialSession.id]);
      } else if (typeof initialSession === "string") {
        setSelectedSessionIds([initialSession]);
      } else {
        setSelectedSessionIds([]);
      }
      setSelectedStudentIds([]);
      setSessionStudents([]);
      setShowSearchMore(false);
      setStudentFilter("");
    }
  }, [open, initialSession]);

  // Load sessions list if not passed via props
  useEffect(() => {
    if (!open) return;
    if (allSessions && allSessions.length > 0) {
      setSessionList(allSessions);
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoadingSessions(true);
        const res = await api.get("/api/admin/session");
        const list = res?.data?.data?.sessions || res?.data?.sessions || [];
        setSessionList(list);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [open, allSessions]);

  // Format session options for react-select
  const sessionOptions = useMemo(() => {
    return sessionList.map((s) => ({
      value: s.id,
      label: `${s.name || "Untitled"} ${s.sessionDate
          ? `• ${new Date(s.sessionDate).toLocaleDateString()}`
          : ""
        } ${s.teacher?.name ? `(${s.teacher.name})` : ""}`,
      raw: s,
    }));
  }, [sessionList]);

  // Fetch students for the selected session(s)
  useEffect(() => {
    if (!open || selectedSessionIds.length === 0) {
      setSessionStudents([]);
      return;
    }

    const loadStudentsForSessions = async () => {
      try {
        setLoadingStudents(true);
        const studentMap = new Map();

        for (const sessionId of selectedSessionIds) {
          try {
            const res = await api.get(`/api/admin/session/${sessionId}`);
            const session = res?.data?.data?.session || res?.data?.session;

            if (session) {
              // Direct students
              if (Array.isArray(session.students)) {
                session.students.forEach((st) => {
                  const sid = st.id || st.studentId;
                  if (sid) {
                    studentMap.set(sid, {
                      id: sid,
                      name: st.name || st.studentName || st.fullName || "Student",
                      email: st.email || "",
                      source: "Session",
                    });
                  }
                });
              }

              // Group members if session has a groupId
              const groupId = session.groupId || session.groupIds?.[0];
              if (groupId) {
                try {
                  const gRes = await api.get(
                    `/api/admin/groups/${groupId}/members`,
                  );
                  const members =
                    gRes?.data?.data?.members ||
                    gRes?.data?.data?.students ||
                    gRes?.data?.members ||
                    [];
                  members.forEach((m) => {
                    const mid = m.id || m.studentId;
                    if (mid && !studentMap.has(mid)) {
                      studentMap.set(mid, {
                        id: mid,
                        name: m.name || m.studentName || m.fullName || "Student",
                        email: m.email || "",
                        source: "Group",
                      });
                    }
                  });
                } catch {
                  // Ignore group members fetch error
                }
              }
            }
          } catch (err) {
            console.error(`Failed to load session ${sessionId}`, err);
          }
        }

        const mergedStudents = Array.from(studentMap.values());
        setSessionStudents(mergedStudents);

        // Pre-check all loaded students by default
        setSelectedStudentIds(mergedStudents.map((s) => s.id));
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudentsForSessions();
  }, [open, selectedSessionIds]);

  // Handle adding students from SearchStudents component
  const handleAddStudentsFromSearch = (ids, selectedObjects) => {
    if (!ids || ids.length === 0) return;

    setSessionStudents((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      ids.forEach((id) => {
        if (!map.has(id)) {
          const found = selectedObjects?.find((o) => (o.value || o.id) === id);
          map.set(id, {
            id,
            name: found?.label || found?.name || `Student (${id.slice(0, 8)})`,
            email: found?.email || "",
            source: "Search",
          });
        }
      });
      return Array.from(map.values());
    });

    setSelectedStudentIds((prev) => {
      const set = new Set([...prev, ...ids]);
      return Array.from(set);
    });
  };

  // Toggle individual student checkbox
  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Select all shown students
  const selectAll = () => {
    const allIds = sessionStudents.map((s) => s.id);
    setSelectedStudentIds(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedStudentIds([]);
  };

  // Filtered students for display
  const filteredStudents = useMemo(() => {
    if (!studentFilter.trim()) return sessionStudents;
    const q = studentFilter.toLowerCase();
    return sessionStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)),
    );
  }, [sessionStudents, studentFilter]);

  // Submit manual attendance
  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!selectedSessionIds || selectedSessionIds.length === 0) {
      toast.error("Please select at least one session");
      return;
    }

    if (!selectedStudentIds || selectedStudentIds.length === 0) {
      toast.error("Please select at least one student to mark as attended");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        studentIds: selectedStudentIds,
        sessionIds: selectedSessionIds,
      };

      const res = await api.post(
        "/api/admin/session/manual-attendance",
        payload,
      );

      toast.success(
        res?.data?.message ||
        `Manual attendance recorded for ${selectedStudentIds.length} student(s)!`,
      );

      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      const rawError =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        (typeof err?.response?.data?.error === "string"
          ? err?.response?.data?.error
          : err?.response?.data?.error?.message) ||
        err?.message ||
        "Failed to record manual attendance";

      const errorMsg =
        typeof rawError === "object" && rawError !== null
          ? rawError.message || JSON.stringify(rawError)
          : String(rawError);

      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  return (
    <div className="a-modal-bg text-left" onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="manual-att-title" className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="manual-att-title" className="text-lg font-bold text-gray-900">Manual attendance</h3>
            <p className="text-xs text-gray-400">Mark students as attended for the selected session(s)</p>
          </div>
          <button type="button" onClick={onClose} className="a-act shrink-0" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. Sessions */}
          <div>
            <label className="a-lbl-f">Session(s) <span className="text-red-500">*</span></label>
            <Select
              isMulti
              options={sessionOptions}
              value={sessionOptions.filter((opt) => selectedSessionIds.includes(opt.value))}
              onChange={(selected) => setSelectedSessionIds(selected ? selected.map((s) => s.value) : [])}
              isLoading={loadingSessions}
              placeholder="Select one or more sessions…"
              styles={SELECT_STYLES}
            />
            {selectedSessionIds.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-1">
                {selectedSessionIds.length} {selectedSessionIds.length === 1 ? "session" : "sessions"} selected
              </p>
            )}
          </div>

          {/* 2. Students */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <span className="a-lbl-f !mb-0">Students to mark as attended <span className="text-red-500">*</span></span>
              <button type="button" onClick={() => setShowSearchMore(!showSearchMore)} className="text-xs font-bold text-one hover:underline inline-flex items-center gap-1">
                {showSearchMore ? <X size={13} /> : <Plus size={13} />}
                {showSearchMore ? "Hide student search" : "Add other students"}
              </button>
            </div>

            {showSearchMore && (
              <div className="p-3 mb-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Search all students</p>
                <SearchStudents value={selectedStudentIds} onChange={handleAddStudentsFromSearch} limit={6} />
              </div>
            )}

            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              {/* Filter & select-all bar */}
              <div className="p-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by name or email…"
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-one"
                  />
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <button type="button" onClick={selectAll} disabled={sessionStudents.length === 0} className="text-one hover:underline disabled:opacity-40">Select all</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={deselectAll} disabled={selectedStudentIds.length === 0} className="text-gray-500 hover:underline disabled:opacity-40">Clear</button>
                </div>
              </div>

              {/* Student list */}
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                {loadingStudents ? (
                  <div className="p-3 space-y-2">
                    <div className="skel h-9"></div>
                    <div className="skel h-9"></div>
                    <div className="skel h-9"></div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="p-8 text-center text-xs text-gray-400">
                    {selectedSessionIds.length === 0
                      ? "Select a session above to load its students."
                      : "No students found. Use “Add other students” to add some."}
                  </p>
                ) : (
                  filteredStudents.map((student) => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onClick={() => toggleStudent(student.id)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleStudent(student.id);
                          }
                        }}
                        className={`px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer ${isChecked ? "bg-red-50/40" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isChecked ? <CheckSquare size={17} className="text-one shrink-0" /> : <Square size={17} className="text-gray-300 shrink-0" />}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${isChecked ? "text-gray-800" : "text-gray-600"}`}>{student.name}</p>
                            {student.email && <p className="text-[11px] text-gray-400 truncate">{student.email}</p>}
                          </div>
                        </div>
                        {student.source && <span className="a-pill bg-gray-100 text-gray-500 shrink-0">{student.source}</span>}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-3 py-2 bg-gray-50/70 border-t border-gray-100 text-xs text-gray-500">
                <b className="text-gray-800">{selectedStudentIds.length}</b> of {sessionStudents.length} students selected
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="a-btn">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting || selectedSessionIds.length === 0 || selectedStudentIds.length === 0} className="a-btn primary">
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
            {submitting ? "Saving…" : `Mark attended (${selectedStudentIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceModal;

