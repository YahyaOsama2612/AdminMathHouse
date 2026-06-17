import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";

const EditAdminRoles = ({ roleId, onSaveSuccess, onCancel }) => {
  const navigate = useNavigate();

  // 1. جلب الهيكل العام لجميع الصلاحيات المتاحة في النظام
  const { data: schemaRes, loading: loadingSchema } = useGet(
    "/api/admin/roles/available-permissions",
  );

  // 2. جلب بيانات الدور الحالي المراد تعديله
  const { data: roleRes, loading: loadingRole } = useGet(
    roleId ? `/api/admin/roles/${roleId}` : null,
  );

  // 3. تجهيز الـ Hook الخاص بالتعديل (PUT)
  const { putData, loading: saving } = usePut(
    roleId ? `/api/admin/roles/${roleId}` : null,
  );

  const availablePermissions = schemaRes?.data || [];
  const roleData = roleRes?.data;

  // state محلي لإدارة اسم الدور والـ permissions المحددة أثناء التعديل
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({});

  // شحن البيانات داخل الـ state بمجرد اكتمال التحميل من الـ API (تماماً كـ initialFormValues)
  useEffect(() => {
    if (roleData) {
      setRoleName(roleData.name || "");

      const initialSelections = {};
      roleData.permissions?.forEach((p) => {
        initialSelections[p.module] = p.actions.map((a) => a.action);
      });
      setSelectedPermissions(initialSelections);
    }
  }, [roleData]);

  // دالة التعامل مع تغيير الـ Checkbox واختيار الصلاحيات
  const handleCheckboxChange = (moduleName, actionName) => {
    setSelectedPermissions((prev) => {
      const currentActions = prev[moduleName] || [];
      if (currentActions.includes(actionName)) {
        return {
          ...prev,
          [moduleName]: currentActions.filter((a) => a !== actionName),
        };
      } else {
        return { ...prev, [moduleName]: [...currentActions, actionName] };
      }
    });
  };

  // دالة الحفظ التي تحول البيانات للشكل المطلوب وترسلها عبر usePut
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formattedPermissions = Object.keys(selectedPermissions)
      .map((moduleName) => ({
        module: moduleName,
        actions: selectedPermissions[moduleName].map((act) => ({
          action: act,
        })),
      }))
      .filter((p) => p.actions.length > 0);

    const payload = {
      name: roleName,
      permissions: formattedPermissions,
    };

    try {
      // استخدام الـ putData الموحدة في مشروعك مع رسالة النجاح
      await putData(
        payload,
        `/api/admin/roles/${roleId}`,
        "Role configuration updated successfully",
      );

      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        navigate("/admin/roles");
      }
    } catch (err) {
      // الـ Hook يتعامل مع الخطأ أو يمكنك عمل throw له هنا
      console.error(err);
    }
  };

  // حالة التحميل الموحدة التي تعرض الـ Loader الخاص بالنظام
  if (loadingSchema || loadingRole || !roleData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Edit Admin Role</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* حقل اسم الـ Role */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Role Name
          </label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="w-full max-w-md p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Enter role name"
            required
          />
        </div>

        {/* مصفوفة الصلاحيات Permissions Matrix */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
            Permissions Matrix
          </h3>
          <div className="space-y-4">
            {availablePermissions.map((item) => (
              <div
                key={item.module}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
              >
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                  {item.module}
                </span>
                <div className="flex flex-wrap gap-6">
                  {item.actions.map((actObj) => {
                    const isChecked =
                      selectedPermissions[item.module]?.includes(
                        actObj.action,
                      ) || false;
                    return (
                      <label
                        key={actObj.action}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            handleCheckboxChange(item.module, actObj.action)
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {actObj.action}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* أزرار التحكم والـ Actions المتناسقة مع الـ EditAdmin */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Changes"}
          </button>
          <button
            type="button"
            onClick={onCancel || (() => navigate("/admin/roles"))}
            className="px-5 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAdminRoles;
