import React, { useMemo, useState } from "react";
import ReusableTable from "@/components/ReusableTable";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
const Admin = () => {
  const navigate = useNavigate();

  const { data, loading, refetch ,error} = useGet("/api/admin/admin");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const columns = [
    { header: "Full Name", key: "name" , filterable : true, filterType: 'select'},
    { header: "Email", key: "email",filterable: true, filterType: 'select' },
    { header: "Role", key: "roleName",filterable: true, filterType: 'select' },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        roleName: admin.role?.name || "-",
        raw: admin,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/admin/edit/${row.id}`);
  };

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/admin/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };


if (loading) {
    return <Loader />;
  }

  if (error) {
    return <div><Errorpage /></div>;
  }

  return (
    <div className="p-6">
      <ReusableTable
        title="Admin Management"
        titleAdd="Admin"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading }
        onAddClick={() => navigate("/admin/admin/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        
       
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Admin"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Admin;
