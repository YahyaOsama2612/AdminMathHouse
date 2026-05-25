import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const Grade = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/grade");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/grade/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  // ✅ الأعمدة
  const columns = [
    { header: "Name (EN)", key: "name" },
    { header: "Name (AR)", key: "nameAr" },
    { header: "Category", key: "categoryName",filterable: true, filterType: 'select' },
  ];

  // ✅ تجهيز الداتا
  const tableData = useMemo(() => {
    return (
      data?.data?.grades?.map((grade) => ({
        id: grade.id,
        name: grade.name,
        nameAr: grade.nameAr,
        categoryName: grade.categoryName,
        createdAt: new Date(grade.createdAt).toLocaleDateString(),
        raw: grade,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/courses/grade/edit/${row.id}`);
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Grades"
        titleAdd="Grade"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/courses/grade/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Grade"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Grade;