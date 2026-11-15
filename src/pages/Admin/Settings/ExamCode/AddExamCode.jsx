import React from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import ExamCodeForm from "./ExamCodeForm";

const AddExam = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/examCodes");

  const onSave = async (formData) => {
    const payload = {
      code: formData.code,
    };
    await postData(payload, "/api/admin/examCodes", "Exam code added successfully");
    navigate("/admin/settings/examcode");
  };

  return <ExamCodeForm isNew initial={{ code: "" }} onSave={onSave} />;
};

export default AddExam;
