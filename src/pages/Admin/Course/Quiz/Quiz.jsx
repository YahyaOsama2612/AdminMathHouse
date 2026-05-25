import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const Quiz = () => {
  const navigate = useNavigate();
const { lessonId }=useParams();
  const { data, loading, refetch, error } = useGet(`/api/admin/quiz/lesson/${lessonId}`);
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

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
        throw e
    }
  };

 

  const handleEdit = (row) => {
    navigate(`/admin/courses/quiz/edit/${row.id}`);
  };

  const columns = [
    { header: "Title", key: "title" },
    { header: "Lesson", key: "lessonName" , filterable: true, filterType: 'select' },
    { header: "Description", key: "description" },
    { header: "Duration (min)", key: "durationMinutes" },
    { header: "Total Score", key: "totalScore" , filterable: true, filterType: 'select' },
    { header: "Pass Score", key: "passScore", filterable: true, filterType: 'select' },
    { header: "Questions", key: "questionsCount" , filterable: true, filterType: 'select' },  
   
  ];

  const tableData = useMemo(() => {
    return (data?.data?.data || []).map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
    
      lessonName: quiz.lesson?.name || "-",
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      totalScore: quiz.totalScore,
      passScore: quiz.passScore,
      questionsCount: quiz.questionsCount,
      isActive: quiz.isActive,
      raw: quiz,
    }));
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Quizzes"
        titleAdd="Quiz"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading }
        onAddClick={() => navigate("/admin/courses/quiz/add" , { state: { lessonId } })}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Quiz"
        description={`Are you sure you want to delete "${selectedRow?.title}"?`}
      />
    </div>
  );
};

export default Quiz;