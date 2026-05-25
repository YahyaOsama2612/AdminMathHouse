import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import React, { useMemo ,useState} from "react";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { MdAttachMoney } from "react-icons/md";
import PricePlansModal from "@/components/PricePlansModal";
const AllChapters = () => {
  const navigate = useNavigate();
const [pricePopup, setPricePopup] = useState({
  open: false,
  row: null,
});
  const { data, loading, error } = useGet("/api/admin/chapters");
  const { deleteData, loading: deleteLoading } = useDelete();
 const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/chapters/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };
  const handleEdit = (row) => {
    navigate(`/admin/courses/chapters/edit/${row.id}`);
  };

  const columns = [
    {
      header: "Chapter",
      key: "chapterName",
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
      header: "Teacher",
      key: "teacher",
      filterable: true,
      filterType: "select",
    },
   
   
  ];
const tableData = useMemo(() => {
  return (
    data?.data?.chapters?.map((item) => ({
      id: item.chapter.id,
      chapterName: item.chapter.name,
      course: item.course?.name || "—",
      category: item.category?.name || "—",
      teacher: item.teacher?.name || "—",
      semester: item.semester?.name || "—",

      // 👇 مهم
      prices: item.prices || [],

      raw: item,
    })) || []
  );
}, [data]); 

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="All Chapters"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
         onEdit={handleEdit}
          extraActions={(row) => (
  <button
    onClick={() => setPricePopup({ open: true, row })}
  >
    <MdAttachMoney className="text-2xl text-green-600" />
  </button>
)}
        
        onDelete={handleDelete}
        rowsPerPage={5}
      />
       <ConfirmDeleteModal
              open={openDeleteModal}
              onClose={() => setOpenDeleteModal(false)}
              onConfirm={confirmDelete}
              title="Delete Chapter"
              description={`Are you sure you want to delete "${selectedRow?.chapterName}" ?`}
            />
            <PricePlansModal
  open={pricePopup.open}
  row={pricePopup.row}
  onClose={() => setPricePopup({ open: false, row: null })}
/>
    </div>
  );
};

export default AllChapters;