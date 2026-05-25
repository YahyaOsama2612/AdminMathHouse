import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditSection = () => {
  const navigate = useNavigate();
  const { id } = useParams();


  const { data: sectionRes, loading: loadingOne, error } = useGet(
    `/api/admin/sections/${id}`
  );

  const { putData, loading: saving } = usePut(`/api/admin/sections/${id}`);

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
        helperText: "Enter time in minutes only",
      },
    ],
    []
  );

  const onSave = async (formData) => {
    const payload = {
      sectionName: formData.sectionName,
      sectionDescription: formData.sectionDescription,
      sectionTime: Number(formData.sectionTime),
    };

    await putData(payload, `/api/admin/sections/${id}`, "Section updated successfully");
    navigate("/admin/settings/section");
  };

  if (loadingOne) return <Loader />;
  if (error) return <Errorpage />;

  const section = sectionRes?.data?.section || {};

  return (
    <AddPage
      title="Edit Section"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/section")}
       
      initialData={{
        sectionName: section?.sectionName || "",
        sectionDescription: section?.sectionDescription || "",
        sectionTime: section?.sectionTime || "",
      }}
    />
  );
};

export default EditSection;