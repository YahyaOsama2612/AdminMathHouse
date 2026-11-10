import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { FileText, Star, X, UserCheck } from "lucide-react";
import ManualAttendanceModal from "./ManualAttendanceModal";

const Sessions = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/session");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedSessionPdfs, setSelectedSessionPdfs] = useState(null);
  const [openManualAttendance, setOpenManualAttendance] = useState(false);
  const [manualAttendanceSession, setManualAttendanceSession] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/session/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/live/sessions/edit/${row.id}`);
  };

  // الأوقات (timeFrom/timeTo) جاية صح من الباك اند، فبنعرضها زي ما هي
  // "11:30:00" -> "11:30 AM"
  const formatUTCTimeToLocal = (timeStr) => {
    if (!timeStr) return "-";
    const [h, m] = String(timeStr).split(":").map((v) => parseInt(v, 10));
    const hours24 = isNaN(h) ? 0 : h;
    const minutes = isNaN(m) ? 0 : m;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )} ${period}`;
  };

  const getSessionType = (s) => {
    if (s.sessionRelationalType) return s.sessionRelationalType;
    if (s.type) return s.type;
    if (s.scheduleType === "once") return "Once";
    if (s.scheduleType === "recurring") return "Recurring";
    return "-";
  };

  const getGroupName = (s) => {
    if (Array.isArray(s.groups) && s.groups.length > 0) {
      const names = s.groups
        .map((g) => (typeof g === "string" ? g : g?.name || g?.groupName))
        .filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
    if (s.groups && typeof s.groups === "object" && s.groups.name) {
      return s.groups.name;
    }
    if (s.group && typeof s.group === "object" && s.group.name) {
      return s.group.name;
    }
    if (s.groupName) return s.groupName;
    if (s.group_name) return s.group_name;
    return "-";
  };

  const getTeacherName = (s) => {
    if (s.teacher?.name) return s.teacher.name;
    if (s.teacher?.firstname || s.teacher?.lastname) {
      return `${s.teacher.firstname || ""} ${s.teacher.lastname || ""}`.trim();
    }
    if (s.teacherName) return s.teacherName;
    if (s.teacher_name) return s.teacher_name;
    return "-";
  };

  const formatSessionDate = (s) => {
    if (s.sessionDate) {
      const str = String(s.sessionDate);
      const match = str.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
      const d = new Date(str);
      return isNaN(d.getTime()) ? str : d.toISOString().split("T")[0];
    }
    if (s.startDate && s.endDate) {
      const start = String(s.startDate).slice(0, 10);
      const end = String(s.endDate).slice(0, 10);
      return `${start} to ${end}`;
    }
    if (s.startDate) return String(s.startDate).slice(0, 10);
    if (Array.isArray(s.recurringDays) && s.recurringDays.length > 0) {
      const days = s.recurringDays
        .map((d) => (typeof d === "string" ? d : d.dayOfWeek))
        .filter(Boolean)
        .join(", ");
      if (days) return `Recurring (${days})`;
    }
    return "-";
  };

  const getCategoryName = (s) => {
    if (s.categoryName) return s.categoryName;
    if (s.category?.name) return s.category.name;
    if (s.examCategory?.name) return s.examCategory.name;
    if (Array.isArray(s.lessons) && s.lessons[0]?.category?.name) {
      return s.lessons[0].category.name;
    }
    if (Array.isArray(s.lessons) && s.lessons[0]?.course?.category?.name) {
      return s.lessons[0].course.category.name;
    }
    return "-";
  };

  const getCourseName = (s) => {
    if (s.courseName) return s.courseName;
    if (s.course?.name) return s.course.name;
    if (s.examCourse?.name) return s.examCourse.name;
    if (Array.isArray(s.lessons) && s.lessons[0]?.course?.name) {
      return s.lessons[0].course.name;
    }
    return "-";
  };

  const getLessonName = (s) => {
    if (s.lessonName) return s.lessonName;
    if (s.lesson?.name) return s.lesson.name;
    if (Array.isArray(s.lessons) && s.lessons.length > 0) {
      return (
        s.lessons
          .map((l) => l.name || l.lessonName)
          .filter(Boolean)
          .join(", ") || "-"
      );
    }
    return "-";
  };

  const hasCategories = useMemo(() => {
    return (
      data?.data?.sessions?.some((s) => getCategoryName(s) !== "-") || false
    );
  }, [data]);

  const hasCourses = useMemo(() => {
    return data?.data?.sessions?.some((s) => getCourseName(s) !== "-") || false;
  }, [data]);

  const columns = useMemo(() => {
    return [
      { header: "Name", key: "name", filterable: true },
      ...(hasCategories
        ? [
            {
              header: "Category",
              key: "categoryName",
              filterable: true,
              filterType: "select",
            },
          ]
        : []),
      ...(hasCourses
        ? [
            {
              header: "Course",
              key: "courseName",
              filterable: true,
              filterType: "select",
            },
          ]
        : []),
      { header: "Type", key: "type", filterable: true, filterType: "select" },
      {
        header: "Group",
        key: "groupName",
        filterable: true,
        filterType: "select",
      },
      {
        header: "Teacher",
        key: "teacherName",
        filterable: true,
        filterType: "select",
      },
      {
        header: "Date",
        key: "sessionDate",
        filterable: true,
        filterType: "select",
      },
      { header: "From", key: "timeFrom" },
      { header: "To", key: "timeTo" },
    ];
  }, [hasCategories, hasCourses]);

  const tableData = useMemo(() => {
    return (
      data?.data?.sessions?.map((s) => ({
        id: s.id,
        name: s.name || "-",
        categoryName: getCategoryName(s),
        courseName: getCourseName(s),
        lessonName: getLessonName(s),

        type: getSessionType(s),
        groupName: getGroupName(s),
        teacherName: getTeacherName(s),

        sessionDate: formatSessionDate(s),
        timeFrom: formatUTCTimeToLocal(s.timeFrom),
        timeTo: formatUTCTimeToLocal(s.timeTo),
        sessionRelationalType: s.sessionRelationalType,
        effectiveSessionPdf: s.effective_session_pdf,
        effectiveSessionAnswersPdf: s.effective_session_answers_pdf,
        effectiveSessionPdfs: Array.isArray(s.effective_session_pdfs)
          ? s.effective_session_pdfs
          : [],
        effectiveSessionAnswersPdfs: Array.isArray(
          s.effective_session_answers_pdfs,
        )
          ? s.effective_session_answers_pdfs
          : [],
        raw: s,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Sessions"
        titleAdd="Session"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/live/sessions/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        extraActions={(row) => (
          <>
            <button
              type="button"
              onClick={() => {
                setManualAttendanceSession(row);
                setOpenManualAttendance(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-600 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              title="Manual Attendance"
            >
              <UserCheck size={13} />
              Attendance
            </button>
            <button
              type="button"
              onClick={() => setSelectedSessionPdfs(row)}
              className="px-3 py-1.5 rounded-lg border border-one/20 text-one text-xs font-semibold hover:bg-one hover:text-white transition-colors cursor-pointer"
              title="View session PDFs"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/live/sessions/${row.id}/ratings`)}
              className="group p-2 rounded-lg transition-all duration-200 hover:bg-amber-500 hover:scale-105 cursor-pointer"
              title="Session Ratings"
            >
              <Star className="w-4 h-4 text-amber-500 transition-colors duration-200 group-hover:text-white" />
            </button>
          </>
        )}
      >
        <button
          type="button"
          onClick={() => {
            setManualAttendanceSession(null);
            setOpenManualAttendance(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          <UserCheck size={15} />
          Manual Attendance
        </button>
      </ReusableTable>

      {selectedSessionPdfs && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedSessionPdfs(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-pdfs-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="session-pdfs-title"
                className="text-lg font-bold text-slate-800"
              >
                PDFs for {selectedSessionPdfs.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSessionPdfs(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {selectedSessionPdfs.sessionRelationalType === "Mistakes" ? (
                [
                  {
                    label: "Session PDF",
                    url: selectedSessionPdfs.effectiveSessionPdf,
                  },
                  {
                    label: "Session Answers PDF",
                    url: selectedSessionPdfs.effectiveSessionAnswersPdf,
                  },
                ].map(({ label, url }) =>
                  url ? (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-one hover:bg-one/5"
                    >
                      <FileText size={18} />
                      <span className="font-semibold">{label}</span>
                      <span className="ml-auto text-xs underline">
                        Open PDF
                      </span>
                    </a>
                  ) : (
                    <p
                      key={label}
                      className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500"
                    >
                      {label} is not available for this session.
                    </p>
                  ),
                )
              ) : (
                [
                  {
                    label: "Session PDFs",
                    files: selectedSessionPdfs.effectiveSessionPdfs,
                  },
                  {
                    label: "Session Answers PDFs",
                    files: selectedSessionPdfs.effectiveSessionAnswersPdfs,
                  },
                ].map(({ label, files }) => (
                  <section key={label} className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-700">
                      {label}
                    </h3>
                    {files.length ? (
                      files.map((file, index) => (
                        <a
                          key={`${file.sourceId || file.pdf}-${index}`}
                          href={file.pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-one hover:bg-one/5"
                        >
                          <FileText size={18} />
                          <span className="font-semibold">
                            {file.name || `PDF ${index + 1}`}
                          </span>
                          <span className="ml-auto text-xs underline">
                            Open PDF
                          </span>
                        </a>
                      ))
                    ) : (
                      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                        No PDFs are available.
                      </p>
                    )}
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Session"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />

      <ManualAttendanceModal
        open={openManualAttendance}
        onClose={() => {
          setOpenManualAttendance(false);
          setManualAttendanceSession(null);
        }}
        initialSession={manualAttendanceSession}
        allSessions={data?.data?.sessions || []}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default Sessions;