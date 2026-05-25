import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditParent = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: parentRes, loading ,error } = useGet(`/api/admin/parent/${id}`);
  const { putData, loading: saving } = usePut(`/api/admin/parent/${id}`);

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Parent Name",
        type: "text",
        required: true,
        placeholder: "Enter parent name",
        section: "Contact Information",
        
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "example@email.com",
        section: "Contact Information",
      },
      {
        name: "phoneNumber",
        label: "Phone Number",
        type: "number",
        required: true,
        placeholder: "010xxxxxxxx",
        section: "Contact Information",
      },
      {
        name: "password",
        label: "Password",
        type: "text",
        placeholder: "Leave empty to keep current password",
                section: "Contact Information",

      },
    ],
    []
  );

  const onSave = async (formData) => {
    

    const payload = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
    };
    if (formData.password?.trim()) {
      payload.password = formData.password;
    }

    try {
      await putData(payload, `/api/admin/parent/${id}`, "Parent updated successfully");
      navigate("/admin/users/parents");
    } catch (e) {
        throw e
    }
  };

  if (loading) {
    return <Loader />;
  }
  if(error){
    return <Errorpage />;
  }

  const parent = parentRes?.data?.data;

  return (
    <AddPage
      title="Edit Parent"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/users/parents")}
       
      initialData={{
        name: parent?.name || "",
        email: parent?.email || "",
        phoneNumber: parent?.phoneNumber || "",
        password: "", 
      }}
    />
  );
};

export default EditParent;
