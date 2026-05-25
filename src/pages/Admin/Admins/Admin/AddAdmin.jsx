import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";

const AddAdmin = () => {
  const navigate = useNavigate();
  const { postData, loading } = usePost("/api/admin/admin");

  // جلب الأدوار (Roles) من الـ API
  const { data: rolesRes } = useGet("/api/admin/roles");

  const roleOptions = useMemo(() => {
    return (
      rolesRes?.data?.roles?.map((role) => ({
        label: role.name,
        value: role.id,
      })) || []
    );
  }, [rolesRes]);
  const initialFormValues = useMemo(
    () => ({
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      roleId: "",
    }),
    [],
  );

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Full Name",
        type: "text",
        required: true,
        placeholder: "Enter full name",
        section: "Personal Information",
      },
      {
        name: "email",
        label: "Email Address",
        type: "email",
        required: true,
        placeholder: "example@company.com",
        section: "Personal Information",
      },
      {
        name: "phoneNumber",
        label: "Phone Number",
        type: "number",
        required: true,
        placeholder: "01xxxxxxxxx",
        section: "Personal Information",
      },
      {
        name: "password",
        label: "Password",
        type: "password",
        required: true,
        placeholder: "Enter password",
        section: "Personal Information",
      },
      {
        name: "roleId",
        label: "Role",
        type: "select",
        required: true,
        options: roleOptions,
        section: "Personal Information",
      },
    ],
    [roleOptions],
  );

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      password: formData.password,
      roleId: formData.roleId,
    };

    try {
      await postData(payload, "/api/admin/admin", "Admin added successfully");
      navigate("/admin/admin");
    } catch (err) {
      throw err;
    }
  };
  return (
    <AddPage
      title="Add Admin"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/admin")}
      loading={loading}
      initialData={initialFormValues}
    />
  );
};

export default AddAdmin;
