import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const AddSection = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/sections");

  const fields = useMemo(
    () => [
      {
        name: "sectionName",
        label: "Section Name",
        type: "text",
        required: true,
        placeholder: "Enter section name",
        section: "General Information",
      },
      {
        name: "sectionDescription",
        label: "Section Description",
        type: "text",
        required: true,
        placeholder: "Enter section description",
        section: "General Information",
      },
      {
        name: "sectionTime",
        label: "Section Time (Minutes)",
        type: "number",
        required: true,
        placeholder: "Enter time in minutes",
        section: "General Information",
        min: 1,
        helperText: "Enter time in minutes of the section",
      },
    ],
    []
  );

  const initialFormValues = useMemo(
    () => ({
      sectionName: "",
      sectionDescription: "",
      sectionTime: "",
    }),
    []
  );

  const onSave = async (formData) => {
    const payload = {
      sectionName: formData.sectionName,
      sectionDescription: formData.sectionDescription,
      sectionTime: Number(formData.sectionTime),
    };

    try {
      await postData(payload, "/api/admin/sections", "Section added successfully");
      navigate("/admin/settings/section");
    } catch (error) {
      throw error;
    }
  };


  return (
    <AddPage
      title="Add Section"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/section")}
       
      initialData={initialFormValues}
    />
  );
};

export default AddSection;