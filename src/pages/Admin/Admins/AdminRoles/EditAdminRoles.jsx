import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { Card, SkelRows } from "@/components/admin/kit";
import RolePermissions, { countSelected } from "./parts/RolePermissions";

/* Admins → Admin Roles → Edit (MathPortal role form): role details card, access-control matrix,
   sticky footer with the selection count and Save. Works as a routed page (/admin-roles/edit/:id)
   or embedded with the roleId / onSaveSuccess / onCancel props. */
const EditAdminRoles = ({ roleId: roleIdProp, onSaveSuccess, onCancel }) => {
  const navigate = useNavigate();
  const params = useParams();
  const roleId = roleIdProp || params.id;

  // 1. All permissions available in the system
  const { data: schemaRes, loading: loadingSchema } = useGet("/api/admin/roles/available-permissions");

  // 2. The role being edited
  const { data: roleRes, loading: loadingRole, error: roleError } = useGet(roleId ? `/api/admin/roles/${roleId}` : null);

  // 3. PUT hook
  const { putData, loading: saving } = usePut(roleId ? `/api/admin/roles/${roleId}` : null);

  // The schema is { modules, actions, permissions:[{ module, label, actions:[{ action }] }] };
  // an array of { module, actions:[{ action }] } is also accepted.
  const { modules, actions, labels } = useMemo(() => {
    const raw = schemaRes?.data ?? schemaRes;
    const perms = Array.isArray(raw) ? raw : raw?.permissions || [];
    const mods = raw?.modules || perms.map((p) => p.module);
    const acts = raw?.actions || [...new Set(perms.flatMap((p) => (p.actions || []).map((a) => (typeof a === "string" ? a : a.action))))];
    const lbl = {};
    perms.forEach((p) => { if (p.label) lbl[p.module] = p.label; });
    return { modules: mods || [], actions: acts || [], labels: lbl };
  }, [schemaRes]);

  const roleData = roleRes?.data?.role || roleRes?.data;

  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (roleData) {
      setRoleName(roleData.name || "");
      const initialSelections = {};
      (roleData.permissions || []).forEach((p) => {
        initialSelections[p.module] = (p.actions || []).map((a) => (typeof a === "string" ? a : a.action));
      });
      setSelectedPermissions(initialSelections);
    }
  }, [roleData]);

  const goBack = onCancel || (() => navigate("/admin/admin-roles"));
  const n = countSelected(selectedPermissions);
  const moduleCount = Object.values(selectedPermissions).filter((l) => l?.length).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) { setFormError("Enter a role name"); return; }
    setFormError("");

    // The API expects actions as plain strings ("View", "Add", …), same as Create role.
    const formattedPermissions = Object.keys(selectedPermissions)
      .map((moduleName) => ({
        module: moduleName,
        actions: selectedPermissions[moduleName],
      }))
      .filter((p) => p.actions.length > 0);

    const payload = {
      name: roleName,
      permissions: formattedPermissions,
    };

    try {
      await putData(payload, `/api/admin/roles/${roleId}`, "Role configuration updated successfully");
      if (onSaveSuccess) onSaveSuccess();
      else navigate("/admin/admin-roles");
    } catch (err) {
      console.error(err);
    }
  };

  const head = (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Admin Roles</p>
        <h1 className="font-bold text-2xl text-gray-900">{roleData?.name ? `Edit ${roleData.name}` : "Edit role"}</h1>
      </div>
      <button type="button" onClick={goBack} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:text-one hover:border-one shrink-0 flex items-center gap-1.5">
        <ArrowLeft size={16} /> Back
      </button>
    </div>
  );

  if (!roleId || roleError) {
    return (
      <div>
        {head}
        <Card>
          <p className="font-bold text-gray-800">This role could not be loaded</p>
          <p className="text-sm text-gray-500">{roleError ? String(roleError) : "No role was chosen."}</p>
        </Card>
      </div>
    );
  }

  if (loadingSchema || loadingRole || !roleData) {
    return (
      <div>
        {head}
        <div className="skel h-28 mb-4"></div>
        <SkelRows n={6} />
      </div>
    );
  }

  return (
    <div>
      {head}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card title="Role details" sub="A clear name helps when you pick a role for an admin.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="role-name" className="a-lbl-f">Role name <span className="text-red-500">*</span></label>
              <input
                id="role-name"
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="a-inp"
                placeholder="e.g. Supervisor, Manager"
                required
              />
            </div>
          </div>
        </Card>

        <Card title="Access control" sub="Turn on what this role may do in each part of the panel.">
          <RolePermissions
            modules={modules}
            actions={actions}
            labels={labels}
            value={selectedPermissions}
            onChange={setSelectedPermissions}
          />
        </Card>

        {formError && <p className="text-sm font-semibold text-red-600" role="alert">{formError}</p>}

        <div className="sticky bottom-0 z-10 -mx-1 px-1 py-3 bg-[#f8fafc]/95 backdrop-blur flex flex-wrap items-center justify-end gap-2 border-t border-gray-100">
          <span className="hidden sm:inline text-xs text-gray-400 mr-auto">
            {n} permission{n === 1 ? "" : "s"} across {moduleCount} module{moduleCount === 1 ? "" : "s"}
          </span>
          <button type="button" onClick={goBack} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={saving} className="a-btn primary">{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
};

export default EditAdminRoles;
