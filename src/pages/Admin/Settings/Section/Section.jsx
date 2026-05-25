import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const Section = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/sections");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/sections/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const columns = [
    { header: "Name", key: "sectionName" },
    { header: "Description", key: "sectionDescription" },
    { header: "Time (min)", key: "sectionTime" ,filterable: true, filterType: 'select'},
   
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.sections?.map((s) => ({
        id: s.id,
        sectionName: s.sectionName,
        sectionDescription: s.sectionDescription,
        sectionTime: s.sectionTime,
        createdAt: s.createdAt,
        raw: s,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/settings/section/edit/${row.id}`);
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Sections"
        titleAdd="Section"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/settings/section/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Section"
        description={`Are you sure you want to delete "${selectedRow?.sectionName}" ?`}
      />
    </div>
  );
};

export default Section;