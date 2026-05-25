import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo ,useState } from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";

const AllDiagnosticExam = () => {
  const navigate = useNavigate();

  const { data, loading, error } = useGet("/api/admin/diagnosticExam");
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
        throw e
    }
  };
  const columns = [
    {
      header: "Exam",
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
      header: "Score Name",
      key: "scoreName",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Questions",
      key: "questions",
    },
    {
      header: "Grade / Question",
      key: "gradePerQuestion",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Duration",
      key: "duration",
    },
    {
      header: "Total Score",
      key: "totalScore",
    },
    {
      header: "Pass Score",
      key: "passScore",
    },
    {
      header: "Status",
      key: "status",
    },
  ];
 const handleEdit = (row) => {
    navigate(`/admin/courses/diagnosticexam/edit/${row.id}`);
  };
  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((exam) => ({
        id: exam.id,
        title: exam.title,
        course: exam.course?.name || "—",
        scoreName: exam.rawScore?.name || "—",
        questions: exam.numberOfQuestions,
        gradePerQuestion: exam.gradePerQuestion,
        duration: `${exam.duration} min`,
        totalScore: exam.totalScore,
        passScore: exam.passScore,
        status: exam.isActive ? "Active" : "Inactive",
        raw: exam,
        category: exam.category?.name || "—",
        semester: exam.semester?.name || "—",
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="All Diagnostic Exams"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
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

export default AllDiagnosticExam;