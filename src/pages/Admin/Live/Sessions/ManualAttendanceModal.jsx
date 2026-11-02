import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import {
  UserCheck,
  CheckSquare,
  Square,
  X,
  Loader2,
  Calendar,
  Users,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "@/api/api";
import SearchStudents from "@/components/SearchStudents";

const ManualAttendanceModal = ({
  open,
  onClose,
  initialSession = null,
  allSessions = [],
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs text-left"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Manual Attendance
              </h3>
              <p className="text-xs text-slate-500">
                Mark students as attended for the selected session(s)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Session Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              Target Session(s) <span className="text-red-500">*</span>
            </label>
            <Select
              isMulti
              options={sessionOptions}
              value={sessionOptions.filter((opt) =>
                selectedSessionIds.includes(opt.value),
              )}
              onChange={(selected) => {
                setSelectedSessionIds(
                  selected ? selected.map((s) => s.value) : [],
                );
              }}
              isLoading={loadingSessions}
              placeholder="Select one or more sessions..."
              className="text-sm"
              classNamePrefix="select"
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderRadius: "0.75rem",
                  borderColor: state.isFocused ? "#6366f1" : "#e2e8f0",
                  backgroundColor: "#f8fafc",
                  minHeight: "42px",
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 60,
                  borderRadius: "0.75rem",
                }),
              }}
            />
            {selectedSessionIds.length > 0 && (
              <p className="text-[11px] text-slate-500">
                {selectedSessionIds.length}{" "}
                {selectedSessionIds.length === 1 ? "session" : "sessions"}{" "}
                selected
              </p>
            )}
          </div>

          {/* 2. Students Section */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" />
                Select Students for Attendance{" "}
                <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowSearchMore(!showSearchMore)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={13} />
                {showSearchMore ? "Hide Student Search" : "Search More Students"}
              </button>
            </div>

            {/* Expandable SearchStudents */}
            {showSearchMore && (
              <div className="p-3 border border-indigo-100 bg-indigo-50/30 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  Search & Add Other Students from System:
                </p>
                <SearchStudents
                  value={selectedStudentIds}
                  onChange={handleAddStudentsFromSearch}
                  limit={6}
                />
              </div>
            )}

            {/* Students List with Checkboxes */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {/* Filter & Actions Bar */}
              <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter students by name..."
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    disabled={sessionStudents.length === 0}
                    className="text-[11px] font-bold text-indigo-600 hover:underline disabled:opacity-40"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    disabled={selectedStudentIds.length === 0}
                    className="text-[11px] font-bold text-slate-500 hover:underline disabled:opacity-40"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Student Items List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {loadingStudents ? (
                  <div className="p-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                    <span>Loading session students...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    {selectedSessionIds.length === 0
                      ? "Select a session above to load its students."
                      : "No students found. Use 'Search More Students' above to add students."}
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${isChecked
                            ? "bg-indigo-50/50 hover:bg-indigo-50"
                            : "hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-indigo-600 focus:outline-none"
                          >
                            {isChecked ? (
                              <CheckSquare size={17} className="text-emerald-600" />
                            ) : (
                              <Square size={17} className="text-slate-300" />
                            )}
                          </button>
                          <div>
                            <p
                              className={`text-xs font-semibold ${isChecked ? "text-slate-800" : "text-slate-600"
                                }`}
                            >
                              {student.name}
                            </p>
                            {student.email && (
                              <p className="text-[11px] text-slate-400">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {student.source && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {student.source}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Count */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>
                  <strong>{selectedStudentIds.length}</strong> of{" "}
                  {sessionStudents.length} students selected
                </span>
                {selectedStudentIds.length > 0 && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <UserCheck size={13} /> Ready to attend
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              selectedSessionIds.length === 0 ||
              selectedStudentIds.length === 0
            }
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <UserCheck size={14} />
                <span>
                  Submit Attendance ({selectedStudentIds.length})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceModal;

