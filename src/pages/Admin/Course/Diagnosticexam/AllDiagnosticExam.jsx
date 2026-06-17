import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";

const AllDiagnosticExam = () => {
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useGet("/api/admin/diagnosticExam");
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
      if (refetch) refetch(); // التأكد من عمل تحديث للبيانات بعد الحذف
    } catch (e) {
      throw e;
    }
  };

  const columns = [
    {
      header: "Exam",
      key: "title",
    },
    {
      header: "Code",
      key: "code",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Year",
      key: "year",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Month",
      key: "month",
      filterable: true,
      filterType: "select",
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
      data?.data?.data?.map((exam) => {
        // إذا كان الـ Back-end لا يحسب الـ totalScore، نقوم بحسابه تلقائياً كخيار احتياطي
        const calculatedTotal =
          exam.totalScore ||
          Number(exam.numberOfQuestions || 0) *
            Number(exam.gradePerQuestion || 0);

        return {
          id: exam.id,
          title: exam.title || "—",
          code: exam.code || "—", // مابينج الكود
          year: exam.year || "—", // مابينج السنة
          month: exam.month || "—", // مابينج الشهر
          course: exam.course?.name || "—",
          scoreName: exam.rawScore?.name || "—",
          questions: exam.numberOfQuestions || 0,
          gradePerQuestion: exam.gradePerQuestion || 0,
          duration: exam.duration ? `${exam.duration} min` : "—",
          totalScore: calculatedTotal || "—", // عرض الـ Total Score المضمون
          passScore: exam.passScore || "—",
          status: exam.isActive ? "Active" : "Inactive",
          raw: exam,
          category: exam.category?.name || "—",
          semester: exam.semester?.name || "—",
        };
      }) || []
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
