import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const Packages = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/package");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/package/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/packages/packages/edit/${row.id}`);
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "Type", key: "type" ,filterable: true, filterType: 'select'},
    { header: "Category", key: "categoryName" ,filterable: true, filterType: 'select'},
    { header: "Course", key: "courseName" ,filterable: true, filterType: 'select'},
    { header: "Lessons", key: "number" ,filterable: true, filterType: 'select'},
    { header: "Price", key: "price",filterable: true, filterType: 'select'},
    { header: "Duration (days)", key: "duration",filterable: true, filterType: 'select'}, 
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        type: pkg.type,
        categoryName: pkg.categoryName,
        courseName: pkg.courseName,
        number: pkg.number,
        price: pkg.price,
        duration: pkg.duration,
        raw: pkg,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Packages"
        titleAdd="Package"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/packages/packages/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Package"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Packages;