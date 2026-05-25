import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";

const EditAdmin = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: adminRes, loading: loadingAdmin } = useGet(`/api/admin/admin/${id}`);
  
  
  const { data: rolesRes, loading: loadingRoles } = useGet("/api/admin/roles");
  
  const { putData, loading: saving } = usePut(`/api/admin/admin/${id}`);


  const roleOptions = useMemo(() => {
    return (
      rolesRes?.data?.roles?.map((role) => ({
        label: role.name,
        value: role.id,
      })) || []
    );
  }, [rolesRes]);

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
        label: "New Password",
        type: "password",
        required: false, 
        placeholder: "Leave blank to keep current password",
        helperText: "Only fill this if you want to change the password.",
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
    [roleOptions]
  );

  const onSave = async (formData) => {
    
    const payload = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      roleId: formData.roleId,
    };

    if (formData.password && formData.password.trim() !== "") {
      payload.password = formData.password;
    }

    try {
      await putData(payload, `/api/admin/admin/${id}`, "Admin updated successfully");
      navigate("/admin/admin");
    } catch (err) {
      throw err;
    }
  };

  // تأكد من أن بنية الاستجابة الخاصة بالـ API مطابقة (مثال: adminRes.data.data)
  const adminData = adminRes?.data?.data || adminRes?.data;

  // 👈 استخدام useMemo لحماية الداتا من إعادة التصيير الخاطئ
  const initialFormValues = useMemo(() => {
    if (!adminData) return null;
    return {
      name: adminData?.name || "",
      email: adminData?.email || "",
      phoneNumber: adminData?.phoneNumber || "",
      password: "",
      roleId: adminData?.role?.id || "",
    };
  }, [adminData]);

  if (loadingAdmin || loadingRoles || !initialFormValues) {
    return <div className="flex justify-center items-center h-screen"><Loader /></div>;
  }

  return (
    <AddPage
      title="Edit Admin"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/admin")}
        
      initialData={initialFormValues}
    />
  );
};

export default EditAdmin;