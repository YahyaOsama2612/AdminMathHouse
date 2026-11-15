import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { FormSkeleton, LoadError } from "../settingsKit";
import SectionForm from "./SectionForm";

const EditSection = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: sectionRes, loading: loadingOne, error, refetch } = useGet(`/api/admin/sections/${id}`);
  const { putData } = usePut(`/api/admin/sections/${id}`);

  const onSave = async (formData) => {
    const payload = {
      sectionName: formData.sectionName,
      sectionDescription: formData.sectionDescription,
      sectionTime: Number(formData.sectionTime),
    };
    await putData(payload, `/api/admin/sections/${id}`, "Section updated successfully");
    navigate("/admin/settings/section");
  };

  if (loadingOne || (!sectionRes && !error)) return <FormSkeleton />;
  if (error) return <LoadError text="Could not load this section." onRetry={refetch} />;

  const section = sectionRes?.data?.section || {};

  return (
    <SectionForm
      key={section?.id || id}
      initial={{
        sectionName: section?.sectionName || "",
        sectionDescription: section?.sectionDescription || "",
        sectionTime: section?.sectionTime || "",
      }}
      onSave={onSave}
    />
  );
};

export default EditSection;
