import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditExam = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // جلب exam code واحد
  const { data: examRes, loading: loadingOne ,error } = useGet(`/api/admin/examCodes/${id}`);
  const { putData, loading: saving } = usePut(`/api/admin/examCodes/${id}`);

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

  const onSave = async (formData) => {
    const payload = {
      code: formData.code?.trim(),
    };

    await putData(payload, `/api/admin/examCodes/${id}`, "Exam code updated successfully");
    navigate("/admin/exams");
  };

  if (loadingOne) {
    return <Loader />;
  }
  if (error) {
    return <Errorpage />;
  }

  const exam = examRes?.data?.data;

  return (
    <AddPage
      title="Edit Exam Code"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/exams")}
       
      initialData={{
        code: exam?.code || "",
      }}
    />
  );
};

export default EditExam;
