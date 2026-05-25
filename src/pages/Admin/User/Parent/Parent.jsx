import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
const Parent = () => {
  const navigate = useNavigate();

  const { data, loading, refetch ,error} = useGet("/api/admin/parent");
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
      await deleteData(`/api/admin/parent/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phoneNumber" },
    
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((parent) => ({
        id: parent.id,
        name: parent.name,
        email: parent.email,
        phoneNumber: parent.phoneNumber,
        status: parent.status,
        createdAt: parent.createdAt,
        raw: parent,
      })) || []
    );
  }, [data]);
const handleToggleStatus = async (row) => {
    await putData(
      { status: row.status === "active" ? "inactive" : "active" },
      `/api/admin/parent/${row.id}/status`,
      "Status updated successfully"
    );
    refetch();
  
};
  const handleEdit = (row) => {
    navigate(`/admin/users/parents/edit/${row.id}`);
  };
if (loading ) {
    return <Loader />;
  }

  if (error) {
    return <div><Errorpage /></div>;
  }

  return (
    <div>
      <ReusableTable
        title="Parents"
        titleAdd="Parent"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || usePutLoading}
        onAddClick={() => navigate("/admin/users/parents/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
         showStatusInActions
  onToggleStatus={handleToggleStatus}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Parent"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Parent;
