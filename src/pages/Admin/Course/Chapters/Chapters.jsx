import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import usePatch from "@/hooks/usePatch";
import NavChild from "@/components/NavChild";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import toast from "react-hot-toast";
import { 
MdGridView  
} from "react-icons/md";
import { 
 FaBook
} from "react-icons/fa";
import IconButton from "@/components/IconButton";
import { AiFillProduct } from "react-icons/ai";
import PricePlansModal from "@/components/PricePlansModal";
import { MdAttachMoney } from "react-icons/md";

// --- مكون إدخال الترتيب (Order Input) ---
const OrderInputCell = ({ row, tableData, patchData, refetch, loading }) => {
  const [orderVal, setOrderVal] = useState(row.order);
 // ✅ NEW: prices popup
  

  // تحديث القيمة تلقائياً لو اتغيرت من الـ API بعد الـ refetch
  useEffect(() => {
    setOrderVal(row.order);
  }, [row.order]);

  const handleUpdate = async () => {
    const newOrder = parseInt(orderVal, 10);

    // 1. لو القيمة فاضية أو نفس الرقم الحالي، نرجع للرقم الأصلي ومفيش أكشن
    if (isNaN(newOrder) || newOrder === row.order) {
      toast.error("Please enter a valid order number different from the current one.");
      setOrderVal(row.order);
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
        { chapterIdA: row.id, chapterIdB: targetRow.id },
        null,
        "Order updated successfully!"
      );
     await refetch();// تحديث الداتا بعد النجاح
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
const Chapters = () => {
  const { patchData, loading: loadingPatch } = usePatch("/api/admin/chapters/swap-order");
  const { courseId } = useParams();
  const location = useLocation(); 
  const navigate = useNavigate();
  const semesterId = location.state;
  const { data, loading, refetch, error } = useGet(`/api/admin/chapters/course/${courseId}`);
  const { deleteData, loading: deleteLoading } = useDelete();
  const {
      data: courseRes,
      loading: loadingOne,
      error: errorOne,
    } = useGet(`/api/admin/courses/${courseId}`);
  const [pricePopup, setPricePopup] = useState({
    open: false,
    row: null,
  });
    const course = courseRes?.data || {};
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

  // --- 1. تجهيز الداتا أولاً ---
  const tableData = useMemo(() => {
    const list = data?.data?.chapters || [];

    return list.map((item, index) => ({
      id: item.chapter.id,
      name: item.chapter.name,
      image: item.chapter.image,
      price: item.chapter.price,
      discount: item.chapter.discount,
      totalPrice: item.chapter.totalPrice,
      order: item.chapter.order,
      courseName: item.course?.name || "—",
      categoryName: item.category?.name || "—",
      teacherName: item.teacher?.name || "—",
      prevId: list[index - 1]?.chapter.id || null, 
      nextId: list[index + 1]?.chapter.id || null, 
      isFirst: index === 0,
              prices: item.prices || [],
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
          alt="chapter"
          className="w-12 h-12 object-cover rounded-md border bg-gray-100"
        />
      ),
    },
    { header: "Name", key: "name" },
    // { header: "Course", key: "courseName" },
    // { header: "Category", key: "categoryName" },
    { header: "Teacher", key: "teacherName", filterable: true, filterType: 'select' },
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

  if (loading ||  loadingOne) {
    return <Loader />;
  }
  
  if (error ||  errorOne) {
    return <Errorpage />;
  }

  return (
    <div>
      <ReusableTable
        title={`Chapters | ${course.name}`}
        titleAdd="Chapter"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || loadingPatch}
        onAddClick={() =>
          navigate(`/admin/courses/chapters/add`, { 
            state: { 
              courseId: courseId, 
              semesterId: semesterId 
            }
          })
        }
        extraActions={(row) => (
          <>
            <NavChild route={`/admin/courses/lessons/${row.id}`} />
<button
                        onClick={() =>
                          setPricePopup({ open: true, row })
                        }
                        className="px-2 py-1  rounded"
                      >
                        <MdAttachMoney className="text-3xl text-green-600" /> 
                      </button>  
          </>

        )}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
{course.semesters && course.semesters.length > 0 && (
  <IconButton
    icon={AiFillProduct}
    color="bg-one"
    navigateTo={`/admin/courses/semester/${course.id}`}
    name="Semesters"
  />
)}
              
              
</div>
      </ReusableTable>

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
      <PricePlansModal
  open={pricePopup.open}
  row={pricePopup.row}
  onClose={() => setPricePopup({ open: false, row: null })}
/>
    </div>
  );
};

export default Chapters;