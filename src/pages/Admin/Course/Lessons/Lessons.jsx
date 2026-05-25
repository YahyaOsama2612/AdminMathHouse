import { useNavigate, useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState, useEffect } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import usePatch from "@/hooks/usePatch";
import LessonIdeasModal from "@/components/LessonIdeasModal";
import Loader from "@/components/Loader"; 
import NavChild from "@/components/NavChild";
import Errorpage from "@/components/Errorpage";
import { AiFillProduct } from "react-icons/ai";
import PricePlansModal from "@/components/PricePlansModal";
import { MdAttachMoney } from "react-icons/md";

import { 
MdGridView  ,MdLayers
} from "react-icons/md";
import { 
 FaBook ,FaPlayCircle
} from "react-icons/fa";
import IconButton from "@/components/IconButton";
// --- مكون إدخال الترتيب (Order Input) الخاص بالدروس ---
const OrderInputCell = ({ row, tableData, patchData, refetch, loading }) => {
  const [orderVal, setOrderVal] = useState(row.order);

  // تحديث القيمة تلقائياً لو اتغيرت من الـ API بعد الـ refetch
  useEffect(() => {
    setOrderVal(row.order);
  }, [row.order]);

  const handleUpdate = async () => {
    const newOrder = parseInt(orderVal, 10);

    // 1. لو القيمة فاضية أو نفس الرقم الحالي، نرجع للرقم الأصلي ومفيش أكشن
    if (isNaN(newOrder) || newOrder === row.order) {
      setOrderVal(row.order);
            toast.error("Please enter a valid order number different from the current one.");

      return;
    }

    // 2. ندور على العنصر اللي واخد الرقم الجديد ده في الداتا المتاحة
    const targetRow = tableData.find((r) => r.order === newOrder);

    // 3. لو الرقم مش موجود أصلاً، نرجع للرقم الأصلي ومفيش أكشن
    if (!targetRow) {
        toast.error("Order number out of range. Please enter a valid order.");
      setOrderVal(row.order);
      return;
    }

    // 4. لو الرقم موجود، نعمل التبديل عن طريق API
    try {
      await patchData(
        { lessonIdA: row.id, lessonIdB: targetRow.id }, // لاحظ استخدام lessonIdA و lessonIdB
        null,
        "Order updated successfully!"
      );
      refetch(); // تحديث الداتا بعد النجاح
    } catch (err) {
      console.error(err);
      setOrderVal(row.order); // لو حصل error نرجع للقديم
    }
  };

  return (
    <input
      type="number"
      value={orderVal}
      onChange={(e) => setOrderVal(e.target.value)}
      onBlur={handleUpdate} // يعمل التبديل لما تضغط كليك بره
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.target.blur(); // يفعل الـ onBlur تلقائيًا لما تضغط Enter
        }
      }}
      disabled={loading}
      className="w-16 p-1.5 text-center border border-one/30 rounded-md bg-card focus:ring-1 focus:ring-one outline-none text-sm font-bold shadow-[0_0_5px_rgba(0,255,255,0.2)] transition-all disabled:opacity-50"
    />
  );
};

// --- المكون الرئيسي للصفحة ---
const Lessons = () => {
  const navigate = useNavigate();
  const { chapterId } = useParams();
const [pricePopup, setPricePopup] = useState({
  open: false,
  row: null,
});
  const { patchData, loading: loadingPatch } = usePatch(
    "/api/admin/lessons/swap-order"
  );

  const { data, loading, refetch , error } = useGet(
    `/api/admin/lessons/chapter/${chapterId}`
  );

 const {
    data: chapterRes,
    loading: loadingChapter,
    error : chapterError,
  } = useGet(`/api/admin/chapters/${chapterId}`);

  const chapter = chapterRes?.data || {};

  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openIdeasModal, setOpenIdeasModal] = useState(false);

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

  // --- 1. تجهيز الداتا أولاً ---
  const tableData = useMemo(() => {
    const list = data?.data?.lessons || [];

    return list.map((item, index) => ({
      id: item.lesson.id,
      name: item.lesson.name,
      image: item.lesson.image,
    
      order: item.lesson.order,

      chapterName: item.chapter?.name || "—",
      courseName: item.course?.name || "—",
      categoryName: item.category?.name || "—",
      teacherName: item.teacher?.name || "—",
      prices: item.prices || [],

      prevId: list[index - 1]?.lesson.id || null,
      nextId: list[index + 1]?.lesson.id || null,
      isFirst: index === 0,
      isLast: index === list.length - 1,

      raw: item,
    }));
  }, [data]);

  // --- 2. تعريف الأعمدة تحت الداتا عشان نقدر نمرر tableData للمكون ---
  const columns = [
    {
      header: "Image",
      key: "image",
      render: (value) => (
        <img
          src={value || "/placeholder.png"}
          alt="lesson"
          className="w-12 h-12 object-cover rounded-md border bg-gray-100"
        />
      ),
    },
    { header: "Name", key: "name" },
    // { header: "Chapter", key: "chapterName" },
    // { header: "Course", key: "courseName" },
    // { header: "Category", key: "categoryName" },
    { header: "Teacher", key: "teacherName", filterable: true, filterType: 'select' },
    { header: "Total Price", key: "totalPrice", filterable: true, filterType: 'select' },
    {
      header: "Ideas",
      key: "Ideas",
      render: (value, row) => (
        <button
          onClick={() => {
            setSelectedRow(row);
            setOpenIdeasModal(true);
          }}
          className="
            px-1 py-1 rounded-xl text-one font-semibold
            bg-white/10 backdrop-blur-md border border-one
            shadow-lg shadow-indigo-500/50
            hover:bg-white/20 hover:shadow-indigo-400/70
            transition-all duration-300
            relative overflow-hidden
            before:absolute before:inset-0 before:rounded-xl
            before:opacity-30 before:blur-xl before:animate-pulse
            z-10
          "
        >
          Ideas
        </button>
      ),
    },
    // --------- التعديل هنا ---------
    {
      header: "Order",
      key: "order",
      render: (value, row) => (
        <OrderInputCell
          row={row}
          tableData={tableData} // تمرير الداتا عشان الـ Component يبحث فيها
          patchData={patchData}
          refetch={refetch}
          loading={loading || loadingPatch}
        />
      ),
    },
  ];

  if (loading  && loadingChapter) {
    return <Loader />;
  }

  if (error && loadingChapter) {
    return <Errorpage />;
  }

  return (
    <div>
      <ReusableTable
        title={`Lessons | ${chapter?.chapter?.name}`}
        titleAdd="Lesson"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || loadingPatch}
        onAddClick={() =>
          navigate(`/admin/courses/lessons/add`, { state: { chapterId } })
        }
        extraActions={(row) => (
          <>
            <NavChild route={`/admin/courses/questions/${row.id}`} />
            <button
              onClick={() => navigate(`/admin/courses/quiz/${row.id}`)}
              className="px-3 py-1 bg-white/80 text-one rounded hover:bg-one/10 hover:text-white transition duration-300"
            >
              Quiz
            </button>
                <button onClick={() => setPricePopup({ open: true, row })}>
                  <MdAttachMoney className="text-2xl text-green-600" />
                </button>
          </>
        )}
        onEdit={handleEdit}
        onDelete={handleDelete}
  >
<PricePlansModal
  open={pricePopup.open}
  row={pricePopup.row}
  onClose={() => setPricePopup({ open: false, row: null })}
/>
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
  navigateTo={`/admin/courses/courses/${chapter?.category?.id}`}
  name="courses"
/>
{chapter?.semester?.id && (
  <IconButton
    icon={AiFillProduct}
    color="bg-one"
    navigateTo={`/admin/courses/semester/${chapter?.course?.id}`}
    name={ "Semester"}
  />
)}
          <IconButton
  icon={MdLayers}
  color="bg-one"
  navigateTo={`/admin/courses/chapters/${chapter?.course?.id}`}
  name="chapters"
/>         
              
</div>
      </ReusableTable>
      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Lesson"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
      
      <LessonIdeasModal
        open={openIdeasModal}
        lessonId={selectedRow?.id}
        onClose={() => setOpenIdeasModal(false)}
      />
    </div>
  );
};

export default Lessons;