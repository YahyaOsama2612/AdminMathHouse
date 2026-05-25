import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";

const AllQuiz = () => {
  const navigate = useNavigate();

  const { data, loading, error } = useGet("/api/admin/quiz");
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
    {
      header: "Quiz",
      key: "title",
    },
        {
      header: "Category",
      key: "category",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Course",
      key: "course",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Semester",
      key: "semester",
      filterable: true,
      filterType: "select",
    },
     {
      header: "Chapter",
      key: "chapter",
      filterable: true,
      filterType: "select",
    },  
    {
      header: "Lesson",
      key: "lesson",
      filterable: true,
      filterType: "select",
    },
   
    

    {
      header: "Duration",
      key: "duration",
    },
    {
      header: "Pass Score",
      key: "passScore",
    },
    {
      header: "Questions",
      key: "questions",
    },
    {
      header: "Status",
      key: "status",
    },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        lesson: quiz.lesson?.name || "—",
        chapter: quiz.chapter?.name || "—",
        course: quiz.course?.name || "—",
        category: quiz.category?.name || "—",
        duration: `${quiz.durationHours}h ${quiz.durationMinutes}m`,
        passScore: quiz.passScore,
        questions: quiz.questionsCount,
        status: quiz.isActive ? "Active" : "Inactive",
        semester: quiz.semester?.name || "—",
        raw: quiz,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="All Quizzes"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading }
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

export default AllQuiz;