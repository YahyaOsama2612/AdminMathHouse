import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
const Exam = () => {
  const navigate = useNavigate();

  const { data, loading, refetch ,error } = useGet("/api/admin/examCodes");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/examCodes/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const columns = [
    { header: "Code", key: "code" },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((exam) => ({
        id: exam.id,
        code: exam.code,
        createdAt: new Date(exam.createdAt).toLocaleDateString(),
        raw: exam,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/settings/examcode/edit/${row.id}`);
  };
if (loading) {
  return <Loader />;
}
if (error) {
  return <Errorpage />;
}
  return (
    <div>
      <ReusableTable
        title="Exam Codes"
        titleAdd="Exam Code"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/settings/examcode/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Exam Code"
        description={`Are you sure you want to delete "${selectedRow?.code}" ?`}
      />
    </div>
  );
};

export default Exam;
