import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { CheckSquare, Square, ShieldCheck } from "lucide-react";

const AddAdminRoles = () => {
  const navigate = useNavigate();
  const { postData, loading: postLoading } = usePost("/api/admin/roles");

  // جلب الصلاحيات المتاحة من الـ API
  const {
    data: permissionsRes,
    loading: getLoading,
    error,
  } = useGet("/api/admin/roles/available-permissions");

  // تحضير الـ state لحفظ الصلاحيات المختارة
  const [selectedPermissions, setSelectedPermissions] = useState({});

  // ربط المصفوفات بشكل سليم بناءً على الـ JSON
  const { availableModules, availableActions } = useMemo(() => {
    const rawData = permissionsRes?.data || permissionsRes;
    const modules = rawData?.modules || [];
    const actions = rawData?.actions || [];
    return { availableModules: modules, availableActions: actions };
  }, [permissionsRes]);

  const initialFormValues = useMemo(
    () => ({
      name: "",
    }),
    [],
  );

  // دالة التعامل مع تغيير الـ Checkbox الفردي
  const handleCheckboxChange = (moduleName, actionName) => {
    setSelectedPermissions((prev) => {
      const currentActions = prev[moduleName] || [];
      if (currentActions.includes(actionName)) {
        return {
          ...prev,
          [moduleName]: currentActions.filter((a) => a !== actionName),
        };
      } else {
        return {
          ...prev,
          [moduleName]: [...currentActions, actionName],
        };
      }
    });
  };

  // دالة التحكم في اختيار/إلغاء كل الأكشنز لموديول واحد
  const handleSelectAllActionsInModule = (moduleName) => {
    const currentActions = selectedPermissions[moduleName] || [];
    const isAllSelected = currentActions.length === availableActions.length;

    setSelectedPermissions((prev) => ({
      ...prev,
      [moduleName]: isAllSelected ? [] : [...availableActions],
    }));
  };

  // دالة التحكم في اختيار/إلغاء كل الموديولات بالكامل
  const handleSelectAllGlobal = () => {
    const totalSelectedCount = Object.values(selectedPermissions).reduce(
      (acc, curr) => acc + curr.length,
      0,
    );
    const maxPossibleCount = availableModules.length * availableActions.length;
    const isAllGlobalSelected = totalSelectedCount === maxPossibleCount;

    if (isAllGlobalSelected) {
      setSelectedPermissions({});
    } else {
      const allSelected = {};
      availableModules.forEach((mod) => {
        allSelected[mod] = [...availableActions];
      });
      setSelectedPermissions(allSelected);
    }
  };

  const isAllGlobalSelected = useMemo(() => {
    if (availableModules.length === 0) return false;
    const totalSelectedCount = Object.values(selectedPermissions).reduce(
      (acc, curr) => acc + curr.length,
      0,
    );
    return (
      totalSelectedCount === availableModules.length * availableActions.length
    );
  }, [selectedPermissions, availableModules, availableActions]);

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Role Name",
        type: "text",
        required: true,
        placeholder: "e.g. Supervisor, Manager",
        section: "Role Details",
      },
      {
        name: "permissionsMatrix",
        label: "Permissions Matrix",
        type: "custom",
        section: "Access Control",
        render: () => (
          /* الخدعة هنا: نستخدم الحسابات الديناميكية لكسر قيد عرض الحاوية الأب المضغوطة 
             ونجعل المصفوفة تفرش بكامل المساحة المتاحة في الـ Admin Panel لليمين واليسار بشكل فخم جداً.
          */
          <div className="w-[calc(100vw-340px)] max-w-[1400px] lg:w-[calc(100vw-360px)] xl:w-[calc(100vw-400px)] transition-all duration-300 space-y-6 mt-4">
            {/* البانر العلوي لزِر تحديد الكل - مفرود بالكامل ومريح */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-slate-50 border border-slate-200/70 rounded-2xl w-full shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    System Modules & Matrix
                  </h4>
                  <p className="text-xs text-slate-400">
                    Configure administrative privilege thresholds across all
                    platform services
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSelectAllGlobal}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl border transition-all active:scale-[0.98] shadow-sm flex-shrink-0 ${
                  isAllGlobalSelected
                    ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                    : "bg-indigo-600 text-white border-transparent hover:bg-indigo-700"
                }`}
              >
                {isAllGlobalSelected ? (
                  <Square size={14} />
                ) : (
                  <CheckSquare size={14} />
                )}
                <span>
                  {isAllGlobalSelected
                    ? "Deselect All Modules"
                    : "Select All Modules"}
                </span>
              </button>
            </div>

            {/* شبكة عرض الكروت - مفرودة الآن في صفين أو 3 صفوف عريضة جداً حسب اتساع شاشتك الفعلي */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {availableModules.map((moduleName) => {
                const currentModuleActions =
                  selectedPermissions[moduleName] || [];
                const isModuleAllSelected =
                  currentModuleActions.length === availableActions.length;

                return (
                  <div
                    key={moduleName}
                    className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-md"
                  >
                    {/* رأس الكارد */}
                    <div className="flex items-center justify-between bg-slate-50/75 px-5 py-3.5 border-b border-slate-100">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        {moduleName.replace("_", " ")}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleSelectAllActionsInModule(moduleName)
                        }
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          isModuleAllSelected
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {isModuleAllSelected ? "Deselect" : "Select All"}
                      </button>
                    </div>

                    {/* جسم الكارد المرن والموزع بالتساوي */}
                    <div className="p-5 flex flex-wrap gap-2.5 bg-white">
                      {availableActions.map((actionName) => {
                        const isChecked =
                          currentModuleActions.includes(actionName);
                        return (
                          <label
                            key={actionName}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer select-none transition-all text-xs font-medium min-w-[90px] justify-center flex-1 ${
                              isChecked
                                ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 font-bold"
                                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                handleCheckboxChange(moduleName, actionName)
                              }
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                            />
                            <span>{actionName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      },
    ],
    [
      availableModules,
      availableActions,
      selectedPermissions,
      isAllGlobalSelected,
    ],
  );

  const onSave = async (formData) => {
    // التعديل هنا: نقوم بإرسال قائمة الأكشنز كما هي بدون تحويلها لكائنات
    const formattedPermissions = Object.keys(selectedPermissions)
      .map((moduleName) => ({
        module: moduleName,
        actions: selectedPermissions[moduleName], // تم إزالة الـ .map التي تحولها لكائنات
      }))
      .filter((p) => p.actions.length > 0);

    const payload = {
      name: formData.name,
      permissions: formattedPermissions,
    };

    if (payload.permissions.length === 0) {
      alert("Please select at least one permission for this role.");
      return;
    }

    try {
      await postData(payload, "/api/admin/roles", "Role added successfully");
      navigate("/admin/admin-roles");
    } catch (err) {
      throw err;
    }
  };
  if (getLoading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <AddPage
      title="Create New Role"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/admin-roles")}
      loading={postLoading}
      initialData={initialFormValues}
    />
  );
};

export default AddAdminRoles;
