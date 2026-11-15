import React, { useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import usePost from "@/hooks/usePost";
import { PageHead } from "@/components/admin/kit";
import { DiffChip, excerpt } from "../Questions/parts/qb";

/* Question → Parallel questions (same skill, new numbers).
   GET /api/admin/questions/parallel/original/:id, POST …/parallel/generate (AI), DELETE /api/admin/questions/:id. */

const Parallel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { lessonId } = location.state || {};

  const { data, loading, error, refetch } = useGet(`/api/admin/questions/parallel/original/${id}`);
  const { postData, loading: saving } = usePost("/api/admin/questions/parallel/generate");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/questions/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/courses/questions/parallel/edit/${row.id}`, { state: { lessonId } });
  };

  const columns = [
    {
      header: "Question",
      key: "question",
      render: (v) => <span className="block min-w-[240px] max-w-[460px] text-sm text-gray-800 line-clamp-2" title={excerpt(v, 600)}>{excerpt(v) || <i className="text-gray-400">No text</i>}</span>,
    },
    { header: "Lesson", key: "lessonName" },
    {
      header: "Answer type",
      key: "answerType",
      filterable: true,
      filterType: "select",
      render: (v) => <span className="text-xs text-gray-500 whitespace-nowrap">{v === "Grid in" ? "Grid-in" : v || "—"}</span>,
    },
    { header: "Difficulty", key: "difficulty", filterable: true, filterType: "select", render: (v) => <DiffChip d={v} /> },
  ];

  const tableData = useMemo(() => {
    return (data?.data?.data || []).map((item) => ({
      id: item.id,
      question: item.question,
      originalQuestion: item.originalQuestion?.question || "-",
      lessonName: item.lesson?.name || "-",
      answerType: item.answerType,
      difficulty: item.difficulty,
      createdAt: new Date(item.createdAt).toLocaleDateString("en-US"),
      raw: item,
    }));
  }, [data]);

  const handlegenerate = async () => {
    try {
      await postData({ origianlQuestionId: id }, "/api/admin/questions/parallel/generate", "Parallel added successfully");
      refetch();
    } catch (e) {
      throw e;
    }
  };

  if (error) return <Errorpage />;

  const original = data?.data?.data?.[0]?.originalQuestion?.question;

  return (
    <div>
      <PageHead
        title="Parallel questions"
        sub={original ? `Same skill as: ${excerpt(original, 90)}` : "New questions on the same skill as the original, with new numbers."}
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(-1)} className="a-btn"><ArrowLeft size={16} /> Back</button>
          <button type="button" onClick={handlegenerate} disabled={saving} className="a-btn" title="Let AI write a new parallel question">
            {saving ? <span className="w-4 h-4 border-2 border-one border-t-transparent rounded-full animate-spin"></span> : <Sparkles size={16} />} AI generate
          </button>
          <button type="button" onClick={() => navigate("/admin/courses/questions/parallel/add", { state: { lessonId, originalQuestionId: id } })} className="a-btn primary">
            <Plus size={16} /> Add parallel question
          </button>
        </div>
      </PageHead>

      {loading && !data ? (
        <div className="a-card p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skel h-12"></div>)}</div>
      ) : (
        <div className={loading || deleteLoading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
          <ReusableTable columns={columns} data={tableData} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete parallel question"
        description="Are you sure you want to delete this parallel question? This can’t be undone."
      />
    </div>
  );
};

export default Parallel;
