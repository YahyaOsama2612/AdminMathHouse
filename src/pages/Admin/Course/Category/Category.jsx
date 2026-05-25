import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import NavChild from "../../../../components/NavChild";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
const Category = () => {
  const navigate = useNavigate();

  const { data, loading, refetch ,error } = useGet("/api/admin/category");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/category/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };
  const columns = [
    {
      header: "Image",
      key: "image",
      render: (value) => (
        <img
          src={value || "/placeholder.png"}
          alt="category"
          className="w-12 h-12 object-cover rounded-md border bg-gray-100"
        />
      ),
    },
    { header: "Name", key: "name" },
    { header: "Description", key: "description" },
    { header: "Parent", key: "parentName",filterable: true, filterType: 'select' },
    // { header: "Level", key: "level" ,filterable: true, filterType: 'select'},
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        parentName:
          cat.ancestors?.length > 0
            ? cat.ancestors[cat.ancestors.length - 1]?.name
            : "—",
        level: cat.ancestors?.length || 0,
        image: cat.image,
        raw: cat,
        isLeaf: cat.isLeaf,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/courses/categories/edit/${row.id}`);
  };
if (loading ) {
  return <Loader />;
}
if (error) {
  return <Errorpage />;
}
  return (
    <div>
      <ReusableTable
        title="Categories"
        titleAdd="Category"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/courses/categories/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        extraActions={(row) => (
          row.isLeaf &&( <NavChild route={`/admin/courses/courses/${row.id}`}/>)
      
        )}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Category"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Category;
