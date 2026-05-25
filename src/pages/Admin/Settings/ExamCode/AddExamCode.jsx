import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";

const AddExam = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/examCodes");

  const fields = useMemo(
    () => [
      {
        name: "code",
        label: "Exam Code",
        type: "text",
        required: true,
        placeholder: "Enter exam code (e.g. NATIONAL 1)",
        section: "General Information",
      },
    ],
    []
  );

  const initialFormValues = useMemo(
    () => ({
      code: "",
    }),
    []
  );

  const onSave = async (formData) => {
    const payload = {
      code: formData.code,
    };

    try {
      await postData(payload, "/api/admin/examCodes", "Exam code added successfully");
      navigate("/admin/settings/examcode");
    } catch (error) {
      throw error;
    }
  };

  return (
    <AddPage
      title="Add Exam Code"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/examcode")}
       
      initialData={initialFormValues}
    />
  );
};

export default AddExam;