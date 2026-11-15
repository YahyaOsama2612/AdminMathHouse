import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { errText } from "@/components/admin/kit";
import { LessonHead, Switch } from "../Questions/parts/qb";

/* Lesson → Quizzes (MathPortal question-bank design).
   GET /api/admin/lessons/:id (header), GET /api/admin/quiz/lesson/:id, DELETE /api/admin/quiz/:id,
   PATCH /api/admin/quiz/:id/toggle-active (the Active switch). */

const fmtDuration = (h, m) => {
  const hh = Number(h) || 0, mm = Number(m) || 0;
  if (!hh && !mm) return "—";
  return [hh ? `${hh} h` : "", mm ? `${mm} min` : ""].filter(Boolean).join(" ");
};

const Quiz = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const { data, loading, refetch, error } = useGet(`/api/admin/quiz/lesson/${lessonId}`);
  const { data: lessonRes } = useGet(`/api/admin/lessons/${lessonId}`);
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [activeOverride, setActiveOverride] = useState({});

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/quiz/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => navigate(`/admin/courses/quiz/edit/${row.id}`);
  const goAdd = () => navigate("/admin/courses/quiz/add", { state: { lessonId } });

  const toggleActive = async (row) => {
    setToggling(row.id);
    try {
      const res = await api.patch(`/api/admin/quiz/${row.id}/toggle-active`);
      const now = res.data?.data?.data?.isActive ?? !row.isActive;
      setActiveOverride((p) => ({ ...p, [row.id]: now }));
      toast.success(`“${row.title}” is ${now ? "active — students can take it" : "inactive — hidden from students"}`);
    } catch (e) {
      toast.error(errText(e, "Couldn’t change the status"));
    } finally {
      setToggling(null);
    }
  };

  const tableData = useMemo(() => {
    return (data?.data?.data || [])
      .map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        lessonName: quiz.lesson?.name || "-",
        description: quiz.description,
        durationHours: quiz.durationHours,
        durationMinutes: quiz.durationMinutes,
        totalScore: quiz.totalScore,
        passScore: quiz.passScore,
        quizOrder: quiz.quizOrder,
        questionsCount: quiz.questionsCount,
        isActive: activeOverride[quiz.id] ?? quiz.isActive,
        raw: quiz,
      }))
      .sort((a, b) => (Number(a.quizOrder) || 0) - (Number(b.quizOrder) || 0));
  }, [data, activeOverride]);

  if (error) return <Errorpage />;

  const addBtn = <button onClick={goAdd} className="a-btn primary"><Plus className="w-4 h-4" /> Add quiz</button>;

  return (
    <div>
      <LessonHead lessonId={lessonId} info={lessonRes?.data || null} mode="quizzes" count={data ? tableData.length : null} actions={addBtn} />

      {loading && !data ? (
        <div className="a-card p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skel h-12"></div>)}</div>
      ) : tableData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center px-4">
          <p className="font-bold text-gray-700">No quizzes yet</p>
          <p className="text-sm text-gray-400">Build a quiz from this lesson’s questions.</p>
          <button onClick={goAdd} className="a-btn primary mt-4"><Plus className="w-4 h-4" /> Add the first quiz</button>
        </div>
      ) : (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity ${loading || deleteLoading ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Order", "Quiz", "Questions", "Duration", "Total score", "Pass score", "Active"].map((h) => <th key={h} className="a-th">{h}</th>)}
                  <th className="a-th text-right" data-keep>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((z) => (
                  <tr key={z.id} className="a-tr">
                    <td className="a-td font-bold text-gray-500 tabular-nums">{z.quizOrder ?? "—"}</td>
                    <td className="a-td min-w-[200px]">
                      <button onClick={() => handleEdit(z)} className="text-left">
                        <span className="block font-bold text-gray-800 hover:text-one">{z.title}</span>
                        {z.description && <span className="block text-xs text-gray-400 line-clamp-1">{z.description}</span>}
                      </button>
                    </td>
                    <td className="a-td tabular-nums">{z.questionsCount ?? 0}</td>
                    <td className="a-td whitespace-nowrap">{fmtDuration(z.durationHours, z.durationMinutes)}</td>
                    <td className="a-td tabular-nums">{z.totalScore ?? "—"}</td>
                    <td className="a-td tabular-nums">{z.passScore ?? "—"}</td>
                    <td className="a-td">
                      <Switch on={z.isActive} disabled={toggling === z.id} onClick={() => toggleActive(z)} label={`${z.isActive ? "Deactivate" : "Activate"} ${z.title}`} />
                    </td>
                    <td className="a-td">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(z)} className="a-act" title="Edit" aria-label={`Edit ${z.title}`}><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(z)} className="a-act del" title="Delete" aria-label={`Delete ${z.title}`}><Trash2 className="w-4 h-4" /></button>
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
        title="Delete this quiz?"
        description={`“${selectedRow?.title || ""}” will be deleted. Its questions stay in the lesson.`}
      />
    </div>
  );
};

export default Quiz;
