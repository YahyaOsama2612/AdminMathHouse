import React, { useMemo, useState } from "react";
import ReusableTable from "@/components/ReusableTable";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { ShieldAlert } from "lucide-react";

const AdminRoles = () => {
  const navigate = useNavigate();

  // جلب البيانات الأساسية من الـ API الخاص بالـ Roles
  const { data, loading, refetch, error } = useGet("/api/admin/roles");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const columns = [
    {
      header: "Role Name",
      key: "name",
      filterable: true,
      filterType: "select",
    },
  /*   { header: "Permissions Overview", key: "permissions", filterable: false }, */
  ];

  // تجهيز البيانات وربط المسارات بناءً على الـ JSON الفعلي المرتجع من الـ API
  const tableData = useMemo(() => {
    // الـ JSON يرسل البيانات في: data.data.roles
    const rolesList = data?.data?.roles || data?.roles || [];

    return (
      rolesList.map((role) => ({
        id: role.id,
        name: role.name,
        // رندر الصلاحيات بشكل أنيق ومرن لمنع أي تداخل
        permissions: (
          <div className="flex flex-wrap gap-2 py-1 max-w-2xl">
            {role.permissions && role.permissions.length > 0 ? (
              role.permissions.map((p) => (
                <div
                  key={p.module}
                  className="flex flex-col gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl p-2 min-w-[150px]"
                >
                  <span className="font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200/50 pb-0.5 mb-0.5">
                    {p.module.replace("_", " ")}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.actions?.map((a) => (
                      <span
                        key={a.id || a.action}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {a.action}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                Full System Access (Super Admin)
              </span>
            )}
          </div>
        ),
        raw: role,
      })) || []
    );
  }, [data]);

 /*  const handleEdit = (row) => {
    navigate(`/admin/admin-roles/edit/${row.id}`);
  }; */

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/roles/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div>
        <Errorpage />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* الشريط العلوي المنسق للمشروع */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-slate-800">
            Security & Permissions
          </h2>
          <p className="text-xs text-slate-400">
            Define administrative roles and control system access levels
          </p>
        </div>

        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
          <ShieldAlert size={20} />
        </div>
      </div>

      {/* الجدول الرئيسي الموحد */}
      <ReusableTable
        title="Roles Management"
        titleAdd="Role"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/admin-roles/add")} // تم تعديل مسار الإضافة ليتناسب مع هيكل الـ Router الفعلي لديك
      /*   onEdit={handleEdit} */
        onDelete={handleDelete}
      />

      {/* مودال الحذف */}
      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${selectedRow?.name}"? This might affect admins assigned to it.`}
      />
    </div>
  );
};

export default AdminRoles;
