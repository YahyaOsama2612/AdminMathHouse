import { useNavigate, useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import NavChild from "@/components/NavChild";
import { MdGridView } from "react-icons/md";
import { FaBook } from "react-icons/fa";
import IconButton from "@/components/IconButton";
const Semester = () => {
  const navigate = useNavigate();
  const { coursesId } = useParams();
  const {
    data: courseRes,
    loading: loadingOne,
    error: errorOne,
  } = useGet(`/api/admin/courses/${coursesId}`);

  const course = courseRes?.data || {};

  const { data, loading, refetch, error } = useGet(
    `/api/admin/semester/course/${coursesId}`,
  );
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

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

  const columns = [
    { header: "Name", key: "name" },
    // { header: "Course", key: "course" },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((sem) => ({
        id: sem.id,
        name: sem.name,
        course: sem.course?.name || "—",
        raw: sem,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/courses/semester/edit/${row.id}`,
       { state: coursesId });
  };

  if (loading && loadingOne) {
    return <Loader />;
  }
  if (error && errorOne) {
    return <Errorpage />;
  }

  return (
    <div>
      <ReusableTable
        title={`Semesters | ${course.name}`}
        titleAdd="Semester"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() =>
          navigate("/admin/courses/semester/add", { state: coursesId })
        }
        onEdit={handleEdit}
        onDelete={handleDelete}
        extraActions={(row) => (
          <div className="flex gap-2">
            <NavChild
              route={`/admin/courses/chapters/${coursesId}`}
              state={row.id}
            />
          </div>
        )}
      >
        <div className="flex gap-2">
          <IconButton
            icon={MdGridView}
            color="bg-one"
            navigateTo={`/admin/courses/categories`}
            name="Categories"
          />
          <IconButton
            icon={FaBook}
            color="bg-one"
            navigateTo={`/admin/courses/courses/${course.categoryId}`}
            name="courses"
          />
        </div>
      </ReusableTable>
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

export default Semester;
