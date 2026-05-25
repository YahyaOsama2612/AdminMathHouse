import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";

const AllExams = () => {
  const navigate = useNavigate();

  const { data, loading, error } = useGet("/api/admin/exams");
  const { deleteData, loading: deleteLoading } = useDelete();
 const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const columns = [
    {
      header: "Exam",
      key: "title",
    },
     {
      header: "Category",
      key: "categoryName",
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
      key: "semesterName",
      filterable: true,
      filterType: "select",
    },

    {
      header: "Code",
      key: "codeName",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Score Name",
      key: "rawScoreName",
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
      header: "Year",
      key: "year",
    },
    {
      header: "Month",
      key: "month",
    },
    {
      header: "Type",
      key: "examType",
    },
    {
      header: "Status",
      key: "status",
    },
  ];
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
        throw e
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/courses/exam/edit/${row.id}`);
  };

  const tableData = useMemo(() => {
    const staticExams = data?.data?.data?.static || [];
    const adaptiveExams = data?.data?.data?.adaptive || [];

    const allExams = [...staticExams, ...adaptiveExams];

    return allExams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      course: exam.courseName || "—",
      codeName: exam.codeName || "—",
      rawScoreName: exam.rawScoreName || "—",
      duration: `${exam.duration} min`,
      totalScore: exam.totalScore,
      passScore: exam.passScore,
      year: exam.year,
      month: exam.Month,
      examType: exam.examType,
      categoryName: exam.categoryName || "—",
      semesterName: exam.semesterName || "—",
      status: exam.isActive ? "Active" : "Inactive",
      raw: exam,
    }));
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="All Exams"
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

export default AllExams;