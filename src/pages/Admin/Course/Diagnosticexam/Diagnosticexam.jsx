import React, { useMemo, useState } from "react";
import { useNavigate ,useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const Diagnosticexam = () => {
  const navigate = useNavigate();
const { courseId } = useParams();
  const { data, loading, refetch, error } = useGet(`/api/admin/diagnosticExam/course/${courseId}`);
  const { deleteData, loading: deleteLoading } = useDelete();
  const { putData, loading: usePutLoading } = usePut();

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
        throw e
    }
  };


  const handleEdit = (row) => {
    navigate(`/admin/courses/diagnosticexam/edit/${row.id}`);
  };

  const columns = [
    { header: "Title", key: "title" },
    { header: "Description", key: "description" },
    { header: "Duration (min)", key: "duration" },
    { header: "Total Score", key: "totalScore" },
    { header: "Pass Score", key: "passScore" },
    { header: "Questions", key: "numberOfQuestions" },
  ];

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
        raw: exam,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Diagnostic Exams"
        titleAdd="Exam"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || usePutLoading}
        onAddClick={() => navigate("/admin/courses/diagnosticexam/add" , { state: { courseId } })}
        onEdit={handleEdit}
        onDelete={handleDelete}
        
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Exam"
        description={`Are you sure you want to delete "${selectedRow?.title}"?`}
      />
    </div>
  );
};

export default Diagnosticexam;