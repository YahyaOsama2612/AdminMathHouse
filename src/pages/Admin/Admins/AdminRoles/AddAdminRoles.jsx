import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Errorpage from "@/components/Errorpage";
import { SkelRows } from "@/components/admin/kit";
import RolePermissions from "./parts/RolePermissions";

/* Admins → Admin Roles → Create: the shared AddPage form with the MathPortal access-control matrix. */
const AddAdminRoles = () => {
  const navigate = useNavigate();
  const { postData, loading: postLoading } = usePost("/api/admin/roles");

  // Available permissions from the API
  const {
    data: permissionsRes,
    loading: getLoading,
    error,
  } = useGet("/api/admin/roles/available-permissions");

  // Selected permissions: { module: ["View", …] }
  const [selectedPermissions, setSelectedPermissions] = useState({});

  const { availableModules, availableActions, moduleLabels } = useMemo(() => {
    const rawData = permissionsRes?.data || permissionsRes;
    const modules = rawData?.modules || [];
    const actions = rawData?.actions || [];
    const labels = {};
    (rawData?.permissions || []).forEach((p) => { if (p?.label) labels[p.module] = p.label; });
    return { availableModules: modules, availableActions: actions, moduleLabels: labels };
  }, [permissionsRes]);

  const initialFormValues = useMemo(
    () => ({
      name: "",
    }),
    [],
  );

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
        label: "Permissions",
        type: "custom",
        fullWidth: true,
        section: "Access Control",
        render: () => (
          <RolePermissions
            modules={availableModules}
            actions={availableActions}
            labels={moduleLabels}
            value={selectedPermissions}
            onChange={setSelectedPermissions}
          />
        ),
      },
    ],
    [availableModules, availableActions, moduleLabels, selectedPermissions],
  );

  const onSave = async (formData) => {
    // Actions are sent as plain strings
    const formattedPermissions = Object.keys(selectedPermissions)
      .map((moduleName) => ({
        module: moduleName,
        actions: selectedPermissions[moduleName],
      }))
      .filter((p) => p.actions.length > 0);

    const payload = {
      name: formData.name,
      permissions: formattedPermissions,
    };

    if (payload.permissions.length === 0) {
      toast.error("Please select at least one permission for this role.");
      return;
    }

    try {
      await postData(payload, "/api/admin/roles", "Role added successfully");
      navigate("/admin/admin-roles");
    } catch (err) {
      throw err;
    }
  };

  if (getLoading) return <SkelRows n={6} />;
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
