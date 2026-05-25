import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import React, { useMemo, useState } from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import PricePlansModal from "@/components/PricePlansModal";
import { MdAttachMoney } from "react-icons/md";

const AllLessons = () => {
  const navigate = useNavigate();
const [pricePopup, setPricePopup] = useState({
  open: false,
  row: null,
});
  const { data, loading, error } = useGet("/api/admin/lessons");
  const { deleteData, loading: deleteLoading } = useDelete();
 const [selectedRow, setSelectedRow] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/lessons/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };
const handleEdit = (row) => {
    navigate(`/admin/courses/lessons/edit/${row.id}`);
  };
  const columns = [
    {
      header: "Lesson",
      key: "lessonName",
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
    },
    {
      header: "Semester",
      key: "semester",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Chapter",
      key: "chapter",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Teacher",
      key: "teacher",
      filterable: true,
      filterType: "select",
    },
    
    {
      header: "Ideas",
      key: "ideasCount",
    },
  ];

const tableData = useMemo(() => {
  if (!data?.data?.chapters) return [];

  return data.data.chapters.flatMap((chapterItem) =>
    chapterItem.lessons.map((lesson) => ({
      id: lesson.id,
      lessonName: lesson.name,
      chapter: chapterItem.chapter?.name || "—",
      course: lesson.course?.name || "—",
      category: lesson.category?.name || "—",
      teacher: lesson.teacher?.name || "—",
      semester: lesson.semester?.name || "—",

      // 👇 مهم
      prices: lesson.prices || [],

      ideasCount: lesson.ideas?.length || 0,
      raw: lesson,
    }))
  );
}, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="All Lessons"
        columns={columns}
        data={tableData}
        loading={loading||deleteLoading}
       onEdit={handleEdit}
        onDelete={handleDelete}
         rowsPerPage={5}
           extraActions={(row) => (
    <button onClick={() => setPricePopup({ open: true, row })}>
      <MdAttachMoney className="text-2xl text-green-600" />
    </button>
  )}
      />
     
<PricePlansModal
  open={pricePopup.open}
  row={pricePopup.row}
  onClose={() => setPricePopup({ open: false, row: null })}
/>
       <ConfirmDeleteModal
              open={openDeleteModal}
              onClose={() => setOpenDeleteModal(false)}
              onConfirm={confirmDelete}
              title="Delete Lesson"
              description={`Are you sure you want to delete "${selectedRow?.lessonName}" ?`}
            />
            
    </div>
  );
};

export default AllLessons;