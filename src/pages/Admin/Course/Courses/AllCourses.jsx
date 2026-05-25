import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
  import React, { useMemo, useState } from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
  import useDelete from "@/hooks/useDelete";
  import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const AllCourses = () => {
  const navigate = useNavigate();

  const { data, loading, error } = useGet("/api/admin/courses");
    const { deleteData, loading: deleteLoading } = useDelete();
 
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const confirmDelete = async () => {
      try {
        await deleteData(`/api/admin/courses/${selectedRow.id}`);
        setOpenDeleteModal(false);
        setSelectedRow(null);
        refetch();
      } catch (e) {
          throw e
      }
    };
  const columns = [
    {
      header: "Course Name",
      key: "name",
    },
    {
      header: "Category",
      key: "category",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Number Of Chapters",
      key: "numberOfChapters",
    },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.courses?.map((course) => ({
        id: course.id,
        name: course.name,
        category: course.category,
        numberOfChapters: course.numberOfChapters,
      })) || []
    );
  }, [data]);
  const handleDelete = (row) => {
      setSelectedRow(row);
      setOpenDeleteModal(true);
    };
const handleEdit = (row) => {
      navigate(`/admin/courses/courses/edit/${row.id}`);
    };
  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="All Courses"
        columns={columns}
        data={tableData}
        onEdit={handleEdit}
          onDelete={handleDelete||deleteLoading}
        loading={loading}
                rowsPerPage={5}

      />
       <ConfirmDeleteModal
                open={openDeleteModal}
                onClose={() => setOpenDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Course"
                description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
              />
    </div>
  );
};

export default AllCourses;