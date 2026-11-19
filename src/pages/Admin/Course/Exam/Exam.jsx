import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pill } from "@/components/admin/kit";
import { CourseExamHead } from "../Questions/parts/qb";
import AssignExamModal from "./AssignExamModal";

/* Course → Exams (MathPortal question-bank design).
   GET /api/admin/exams/course/:courseId ({ exams: { static, adaptive } }), DELETE /api/admin/exams/:id. */

const TYPE_TONE = { static: "blue", adaptive: "purple", extra: "amber", trail: "gray" };

const Exam = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { data, loading, refetch, error } = useGet(`/api/admin/exams/course/${courseId}`);
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, static, adaptive
  const [assigning, setAssigning] = useState(null); // exam row being assigned to students/groups

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/exams/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => navigate(`/admin/courses/exam/edit/${row.id}`);
  const goAdd = () => navigate("/admin/courses/exam/add", { state: { courseId } });

  const groups = data?.data?.data?.exams || {};
  const counts = { all: (groups.static || []).length + (groups.adaptive || []).length, static: (groups.static || []).length, adaptive: (groups.adaptive || []).length };

  const tableData = useMemo(() => {
    let exams = [...(groups.static || []), ...(groups.adaptive || [])];
    if (filterType === "static") exams = groups.static || [];
    if (filterType === "adaptive") exams = groups.adaptive || [];
    return exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      courseName: exam.courseName,
      codeName: exam.codeName,
      description: exam.description,
      duration: exam.duration,
      totalScore: exam.totalScore,
      passScore: exam.passScore,
      examType: exam.examType,
      year: exam.year,
      Month: exam.Month,
      isActive: exam.isActive,
      assignedStudents: exam.assignedStudents || 0,
      assignedGroups: exam.assignedGroups || 0,
      raw: exam,
    }));
  }, [data, filterType]);

  if (error) return <Errorpage />;

  const courseName = [...(groups.static || []), ...(groups.adaptive || [])].find((e) => e.courseName)?.courseName;

  return (
    <div>
      <CourseExamHead
        courseId={courseId}
        courseName={courseName}
        mode="exams"
        count={data ? counts.all : null}
        actions={<button onClick={goAdd} className="a-btn primary"><Plus className="w-4 h-4" /> New exam</button>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="inline-flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Exam type">
          {[["all", "All"], ["static", "Static"], ["adaptive", "Adaptive"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setFilterType(v)} aria-pressed={filterType === v}
              className={`h-8 px-3 rounded-lg text-xs font-bold ${filterType === v ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
              {l} <span className="ml-0.5 text-gray-400 font-semibold">{counts[v]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="a-card p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skel h-12"></div>)}</div>
      ) : tableData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center px-4">
          <p className="font-bold text-gray-700">{filterType === "all" ? "No exams yet" : `No ${filterType} exams`}</p>
          <p className="text-sm text-gray-400">Pick questions from this course’s lessons and group them into timed sections.</p>
          <button onClick={goAdd} className="a-btn primary mt-4"><Plus className="w-4 h-4" /> New exam</button>
        </div>
      ) : (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity ${loading || deleteLoading ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Title", "Type", "Exam code", "Date", "Duration", "Pass / total", "Assigned to", "Status"].map((h) => <th key={h} className="a-th">{h}</th>)}
                  <th className="a-th text-right" data-keep>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((e) => (
                  <tr key={e.id} className="a-tr">
                    <td className="a-td min-w-[200px]">
                      <button onClick={() => handleEdit(e)} className="text-left">
                        <span className="block font-bold text-gray-800 hover:text-one">{e.title}</span>
                        {e.description && <span className="block text-xs text-gray-400 line-clamp-1">{e.description}</span>}
                      </button>
                    </td>
                    <td className="a-td"><Pill tone={TYPE_TONE[String(e.examType).toLowerCase()]}>{e.examType ? String(e.examType).charAt(0).toUpperCase() + String(e.examType).slice(1) : "—"}</Pill></td>
                    <td className="a-td whitespace-nowrap">{e.codeName || "—"}</td>
                    <td className="a-td whitespace-nowrap">{[e.Month, e.year].filter(Boolean).join(" ") || "—"}</td>
                    <td className="a-td whitespace-nowrap">{e.duration ? `${e.duration} min` : "—"}</td>
                    <td className="a-td tabular-nums whitespace-nowrap">{e.passScore ?? "—"} / {e.totalScore ?? "—"}</td>
                    <td className="a-td whitespace-nowrap">
                      {e.assignedStudents || e.assignedGroups ? (
                        <button type="button" onClick={() => setAssigning(e)} className="text-xs font-bold text-one hover:underline">
                          {[e.assignedGroups && `${e.assignedGroups} group${e.assignedGroups === 1 ? "" : "s"}`, e.assignedStudents && `${e.assignedStudents} student${e.assignedStudents === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Category only</span>
                      )}
                    </td>
                    <td className="a-td"><Pill tone={e.isActive ? "green" : "gray"}>{e.isActive ? "Active" : "Inactive"}</Pill></td>
                    <td className="a-td">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setAssigning(e)} className="a-act" title="Assign to students or groups" aria-label={`Assign ${e.title}`}><UserPlus className="w-4 h-4" /></button>
                        <button onClick={() => handleEdit(e)} className="a-act" title="Edit" aria-label={`Edit ${e.title}`}><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(e)} className="a-act del" title="Delete" aria-label={`Delete ${e.title}`}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {assigning && <AssignExamModal exam={assigning} onClose={() => setAssigning(null)} onSaved={refetch} />}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete this exam?"
        description={`“${selectedRow?.title || ""}” will be deleted. Its questions stay in their lessons.`}
      />
    </div>
  );
};

export default Exam;
