import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
const Teachers = () => {
  const navigate = useNavigate();

  const { data, loading, refetch ,error } = useGet("/api/admin/teacher");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/teacher/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const columns = [
    {
      header: "Avatar",
      key: "avatar",
      render: (value) => (
        <img
          src={value || "/placeholder.png"}
          alt="teacher"
          className="w-12 h-12 object-cover rounded-full border bg-gray-100"
        />
      ),
    },
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phoneNumber" },

  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.teacher?.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phoneNumber: t.phoneNumber,
        avatar: t.avatar,
        raw: t,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/users/teachers/edit/${row.id}`);
  };

if (loading) {
    return <Loader />;
  }

  if (error) {
    return <div><Errorpage /></div>;
  }
  return (
    <div>
      <ReusableTable
        title="Teachers"
        titleAdd="Teacher"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/users/teachers/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Teacher"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Teachers;
