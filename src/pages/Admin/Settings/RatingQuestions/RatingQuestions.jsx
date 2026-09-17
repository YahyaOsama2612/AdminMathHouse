import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const RatingQuestions = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/rating-questions");
  const { deleteData, loading: deleteLoading } = useDelete();
  const { putData, loading: toggleLoading } = usePut();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/rating-questions/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleToggleStatus = async (row) => {
    try {
      await putData({}, `/api/admin/rating-questions/${row.id}/toggle`, "Status updated successfully");
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const columns = [
    { header: "Title", key: "title" },
    { header: "Description", key: "description" },
    {
      header: "Category",
      key: "category",
      filterable: true,
      filterType: "select",
    },
    { header: "Order", key: "order" },
  ];

  const tableData = useMemo(() => {
    const questions = data?.data?.data || [];
    return (
      (Array.isArray(questions) ? questions : []).map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category,
        order: q.order,
        status: q.isActive ? "active" : "inactive",
        raw: q,
      }))
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/settings/rating-questions/edit/${row.id}`);
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Rating Questions"
        titleAdd="Rating Question"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || toggleLoading}
        onAddClick={() => navigate("/admin/settings/rating-questions/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        showStatusInActions={true}
        onToggleStatus={handleToggleStatus}
        statusKey="status"
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Rating Question"
        description={`Are you sure you want to delete "${selectedRow?.title}" ?`}
      />
    </div>
  );
};

export default RatingQuestions;
