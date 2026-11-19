import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pill } from "@/components/admin/kit";
import { CourseExamHead } from "../Questions/parts/qb";

/* Course → Diagnostic exams (MathPortal question-bank design).
   GET /api/admin/diagnosticExam/course/:courseId, DELETE /api/admin/diagnosticExam/:id. */

const Diagnosticexam = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { data, loading, refetch, error } = useGet(`/api/admin/diagnosticExam/course/${courseId}`);
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/diagnosticExam/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => navigate(`/admin/courses/diagnosticexam/edit/${row.id}`, { state: { courseId } });
  const goAdd = () => navigate(`/admin/courses/diagnosticexam/add?courseId=${courseId}`, { state: { courseId } });

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((exam) => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        totalScore: exam.totalScore,
        passScore: exam.passScore,
        numberOfQuestions: exam.numberOfQuestions,
        isActive: exam.isActive,
        courseName: exam.course?.name,
        raw: exam,
      })) || []
    );
  }, [data]);

  if (error) return <Errorpage />;

  return (
    <div>
      <CourseExamHead
        courseId={courseId}
        courseName={tableData.find((e) => e.courseName)?.courseName}
        mode="diagnostic"
        count={data ? tableData.length : null}
        actions={<button onClick={goAdd} className="a-btn primary"><Plus className="w-4 h-4" /> New diagnostic</button>}
      />

      {loading && !data ? (
        <div className="a-card p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skel h-12"></div>)}</div>
      ) : tableData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center px-4">
          <p className="font-bold text-gray-700">No diagnostic exams yet</p>
          <p className="text-sm text-gray-400">A diagnostic is a trial paper that finds the student’s level.</p>
          <button onClick={goAdd} className="a-btn primary mt-4"><Plus className="w-4 h-4" /> New diagnostic</button>
        </div>
      ) : (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity ${loading || deleteLoading ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Title", "Questions", "Duration", "Pass / total", "Status"].map((h) => <th key={h} className="a-th">{h}</th>)}
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
                    <td className="a-td tabular-nums">{e.numberOfQuestions ?? "—"}</td>
                    <td className="a-td whitespace-nowrap">{e.duration ? `${e.duration} min` : "—"}</td>
                    <td className="a-td tabular-nums whitespace-nowrap">{e.passScore ?? "—"} / {e.totalScore ?? "—"}</td>
                    <td className="a-td"><Pill tone={e.isActive ? "green" : "gray"}>{e.isActive ? "Active" : "Inactive"}</Pill></td>
                    <td className="a-td">
                      <div className="flex justify-end gap-1">
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

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete this diagnostic exam?"
        description={`“${selectedRow?.title || ""}” will be deleted. Its questions stay in their lessons.`}
      />
    </div>
  );
};

export default Diagnosticexam;
