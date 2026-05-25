import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const Groups = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/groups");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/groups/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/live/groups/edit/${row.id}`);
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "Teacher", key: "teacherName" },
    { header: "Days", key: "days",filterable: true, filterType: 'select' },
    { header: "From", key: "timeFrom" },
    { header: "To", key: "timeTo" },
    { header: "Students", key: "studentsCount" ,filterable: true, filterType: 'select'},
    { header: "Status", key: "isActive" ,filterable: true, filterType: 'select'},
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.map((group) => ({
        id: group.id,
        name: group.name,
        teacherName: group.teacherName,
        days: group.days?.join(", "),
        timeFrom: group.timeFrom,
        timeTo: group.timeTo,
        studentsCount: group.students?.length || 0,
        isActive: group.isActive ? "Active" : "Inactive",
        createdAt: new Date(group.createdAt).toLocaleDateString(),
        raw: group,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Groups"
        titleAdd="Group"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/live/groups/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Group"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Groups;