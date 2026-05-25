import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";


const Exam = () => {
  const navigate = useNavigate();
  const {courseId} = useParams();
  const { data, loading, refetch, error } = useGet(`/api/admin/exams/course/${courseId}`);
  const { deleteData, loading: deleteLoading } = useDelete();
  const { putData, loading: usePutLoading } = usePut();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, static, adaptive

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

  const columns = [
    { header: "Title", key: "title" },
    { header: "Course", key: "courseName" },
    { header: "Code", key: "codeName" },
    { header: "Description", key: "description" },
    { header: "Duration (min)", key: "duration" },
    { header: "Total Score", key: "totalScore" },
    { header: "Pass Score", key: "passScore" },
    { header: "Type", key: "examType" },
    { header: "Year", key: "year" },
    { header: "Month", key: "Month" },
  ];

  const tableData = useMemo(() => {
    let exams = [
      ...(data?.data?.data?.exams?.static || []),
      ...(data?.data?.data?.exams?.adaptive || []),
    ];

    if (filterType === "static") exams = data?.data?.data?.exams?.static || [];
    if (filterType === "adaptive") exams = data?.data?.data?.exams?.adaptive || [];

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
      raw: exam,
    }));
  }, [data, filterType]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      {/* أزرار الفلترة */}
      <div className="flex gap-2 justify-center  mb-4">
        <button
          className={`px-4 py-2  w-full ${
            filterType === "all" ? "bg-one text-white rounded-2xl " : "bg-gray-200"
          }`}
          onClick={() => setFilterType("all")}
        >
          All
        </button>
        <button
          className={`px-4 py-2   w-full ${
            filterType === "static" ? "bg-one text-white rounded-2xl "  : "bg-gray-200"
          }`}
          onClick={() => setFilterType("static")}
        >
          Static
        </button>
        <button
          className={`px-4 py-2  w-full ${
            filterType === "adaptive" ? "bg-one text-white rounded-2xl " : "bg-gray-200"
          }`}
          onClick={() => setFilterType("adaptive")}
        >
          Adaptive
        </button>
      </div>

      <ReusableTable
        title="Exams"
        titleAdd="Exam"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || usePutLoading}
        onAddClick={() => navigate("/admin/courses/exam/add", { state: { courseId } })}
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

export default Exam;