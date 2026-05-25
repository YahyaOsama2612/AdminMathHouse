import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const AllSemesters = () => {
  const navigate = useNavigate();
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const { data, loading, error } = useGet("/api/admin/semester");
  const { deleteData, loading: deleteLoading } = useDelete();
const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/semester/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };
  const handleEdit = (row) => {
    navigate(`/admin/courses/semester/edit/${row.id}`, 
      { state: row.courseId });
  };
  const columns = [
    {
      header: "Semester Name",
      key: "name",
    },
       {
      header: "Category",
      key: "category",
      filterable: true,
      filterType: "select",
    },
    
    {
      header: "Course",
      key: "course",
      filterable: true,
      filterType: "select",
    }
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((sem) => ({
        id: sem.id,
        name: sem.name,
        course: sem.course?.name || "—",
        category: sem.category?.name || "—",
        raw: sem,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="All Semesters"
        columns={columns}
        data={tableData}
        loading={loading||deleteLoading}
         onEdit={handleEdit}
        onDelete={handleDelete}
                rowsPerPage={5}

      />

        <ConfirmDeleteModal
              open={openDeleteModal}
              onClose={() => setOpenDeleteModal(false)}
              onConfirm={confirmDelete}
              title="Delete Semester"
              description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
            />
    </div>
  );
};

export default AllSemesters;    