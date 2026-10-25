import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { FileText, Star, X } from "lucide-react";

const Sessions = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/session");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedSessionPdfs, setSelectedSessionPdfs] = useState(null);

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
    const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
    const hours24 = h || 0;
    const minutes = m || 0;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )} ${period}`;
  };

  const columns = [
    { header: "Name", key: "name" },
    // { header: "Category", key: "categoryName",filterable: true, filterType: 'select' },
    // { header: "Course", key: "courseName",filterable: true, filterType: 'select' },
    // { header: "Lesson", key: "lessonName" ,filterable: true, filterType: 'select'},
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

  const tableData = useMemo(() => {
    return (
      data?.data?.sessions?.map((s) => ({
        id: s.id,
        name: s.name,
        // الحقول دي مش موجودة في الـ JSON الحالي، لو ضفتها في الـ API هتظهر تلقائياً
        categoryName: s.categoryName || "-",
        courseName: s.courseName || "-",
        lessonName: s.lessonName || "-",

        type: s.type,

        // ✅ التعديل هنا: الوصول للاسم من جوه الـ groups object
        groupName: s.groups?.name || "-",

        // ✅ التعديل هنا: الوصول للاسم من جوه الـ teacher object
        teacherName: s.teacher?.name || "-",

        sessionDate: s.sessionDate
          ? new Date(s.sessionDate).toLocaleDateString()
          : "-",
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
              onClick={() => setSelectedSessionPdfs(row)}
              className="px-3 py-1.5 rounded-lg border border-one/20 text-one text-xs font-semibold hover:bg-one hover:text-white transition-colors"
              title="View session PDFs"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/live/sessions/${row.id}/ratings`)}
              className="group p-2 rounded-lg transition-all duration-200 hover:bg-amber-500 hover:scale-105"
              title="Session Ratings"
            >
              <Star className="w-4 h-4 text-amber-500 transition-colors duration-200 group-hover:text-white" />
            </button>
          </>
        )}
      />

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
    </div>
  );
};

export default Sessions;