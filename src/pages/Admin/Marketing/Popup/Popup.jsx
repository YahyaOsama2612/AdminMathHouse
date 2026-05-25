import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";

const Popups = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/popup");
  const { deleteData, loading: deleteLoading } = useDelete();
  const { putData, loading: putLoading } = usePut();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/popup/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

 

  const handleEdit = (row) => {
    navigate(`/admin/marketing/popup/edit/${row.id}`);
  };

  const handleAdd = () => {
    navigate("/admin/marketing/popup/add");
  };

  const columns = [
    { header: "Image", key: "image", 
      render: (value) => (
        <img
          src={value || "/placeholder.png"}
          alt="teacher"
          className="w-12 h-12 object-cover rounded-full border bg-gray-100"
        />
      )
     },
    { header: "Name", key: "name" },
    { header: "Destination", key: "destination" },
    { header: "Start Date", key: "startDate",filterable: true, filterType: 'select'},
    { header: "End Date", key: "endDate",filterable: true, filterType: 'select'},
    { header: "Status", key: "isActive",filterable: true, filterType: 'select'},
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.popups?.map((popup) => ({
        id: popup.id,
        image: popup.image,
        name: popup.name,
        destination: popup.destination,
        startDate: new Date(popup.startDate).toLocaleDateString(),
        endDate: new Date(popup.endDate).toLocaleDateString(),
        isActive: popup.isActive,
        raw: popup,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Popups"
        titleAdd="Popup"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || putLoading}
        onAddClick={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Popup"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Popups;