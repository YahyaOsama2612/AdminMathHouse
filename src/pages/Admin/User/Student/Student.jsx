import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
const Student = () => {
  const navigate = useNavigate();

  // 🔹 جلب الداتا من الـ API
  const { data, loading, error, refetch } = useGet("/api/admin/student");
  const { deleteData, loading: deleteLoading } = useDelete();

  // 🔹 إدارة حذف الطالب
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/student/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      header: "Full Name",
      key: "name",
      render: (
        value,
        row, // ✅ "render" not "cell", args are (value, row)
      ) => (
        <button
          onClick={() => navigate(`/admin/users/students/attend/${row.id}`)}
          className="text-blue-600 hover:underline font-medium text-left cursor-pointer"
        >
          {row.name}
        </button>
      ),
    },
    { header: "Email", key: "email" },
    { header: "Grade", key: "grade", filterable: true, filterType: "select" },
    { header: "Parent Phone", key: "parentphone" },
  ];

  // 🔹 تحويل الداتا من شكل الـ API لشكل الجدول
  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((student) => ({
        id: student.id,
        name: `${student.firstname} ${student.lastname}`,
        email: student.email,
        grade: student.grade?.name,
        parentphone: student.parentPhone,
        raw: student,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/users/students/edit/${row.id}`);
  };
  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div>
        <Errorpage />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ReusableTable
        title="Students Management"
        titleAdd="Student"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/users/students/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 🔹 Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Student"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Student;
