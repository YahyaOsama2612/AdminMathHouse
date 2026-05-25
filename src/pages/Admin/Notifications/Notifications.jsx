import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const Notifications = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/notification");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/notification/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/notifications/edit/${row.id}`);
  };

  const columns = [
    { header: "Text", key: "text" },
    { header: "Send To All", key: "sendToAll" },
    { header: "Date", key: "dateTime" },
    { header: "Time", key: "time" },
    { header: "Created At", key: "createdAt" },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.map((item) => ({
        id: item.id,
        text: item.text || item.notification,
        sendToAll: item.sendToAll ? "Yes" : "No",
        dateTime: new Date(item.dateTime).toLocaleDateString(),
        time: item.time,
        createdAt: new Date(item.createdAt).toLocaleString(),
        raw: item,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Notifications"
        titleAdd="Notification"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/notifications/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Notification"
        description={`Are you sure you want to delete "${selectedRow?.text}"?`}
      />
    </div>
  );
};

export default Notifications;