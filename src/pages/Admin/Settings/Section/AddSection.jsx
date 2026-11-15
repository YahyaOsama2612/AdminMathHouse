import React from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import SectionForm from "./SectionForm";

const AddSection = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/sections");

  const onSave = async (formData) => {
    const payload = {
      sectionName: formData.sectionName,
      sectionDescription: formData.sectionDescription,
      sectionTime: Number(formData.sectionTime),
    };
    await postData(payload, "/api/admin/sections", "Section added successfully");
    navigate("/admin/settings/section");
  };

  return <SectionForm isNew initial={{ sectionName: "", sectionDescription: "", sectionTime: "" }} onSave={onSave} />;
};

export default AddSection;
