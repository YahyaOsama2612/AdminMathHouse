import React, { useMemo, useState } from "react";
import ReusableTable from "@/components/ReusableTable";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
// استيراد أيقونة مناسبة للـ Drive
import { HardDrive } from "lucide-react"; 

const Admin = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/admin");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const columns = [
    { header: "Full Name", key: "name", filterable: true, filterType: 'select' },
    { header: "Email", key: "email", filterable: true, filterType: 'select' },
    { header: "Role", key: "roleName", filterable: true, filterType: 'select' },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        roleName: admin.role?.name || "-",
        raw: admin,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/admin/edit/${row.id}`);
  };

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/admin/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  // دالة للتعامل مع الانتقال للـ Drive الديناميكي في تبويب جديد
  const handleGoToDrive = () => {
    // جلب الـ Base URL الحالي ديناميكياً (مثال: http://localhost:5173 أو الدومين الفعلي للـ Production)
    const baseUrl = window.location.origin; 
    const driveUrl = `${baseUrl}/logindrive`;
    
    // فتح الرابط في تبويب جديد تماماً
    window.open(driveUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <div><Errorpage /></div>;
  }

  return (
    <div className="p-6 space-y-4">
      {/* شريط علوي اختياري يحتوي على أزرار التحكم الإضافية خارج الجدول إن لزم الأمر */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-slate-800">System Storage</h2>
          <p className="text-xs text-slate-400">Access and manage integrated files</p>
        </div>
        
        {/* زر الـ Go to Drive المستهدف */}
        <button
          type="button"
          onClick={handleGoToDrive}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 active:scale-[0.98] transition-all text-sm"
        >
          <HardDrive size={18} />
          <span>Go to Drive</span>
        </button>
      </div>

      {/* جدول البيانات الرئيسي */}
      <ReusableTable
        title="Admin Management"
        titleAdd="Admin"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/admin/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* مودال تأكيد الحذف */}
      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Admin"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Admin;