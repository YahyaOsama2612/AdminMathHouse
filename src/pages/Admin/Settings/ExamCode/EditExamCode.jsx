import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { FormSkeleton, LoadError } from "../settingsKit";
import ExamCodeForm from "./ExamCodeForm";

const EditExam = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: examRes, loading: loadingOne, error, refetch } = useGet(`/api/admin/examCodes/${id}`);
  const { putData } = usePut(`/api/admin/examCodes/${id}`);

  const onSave = async (formData) => {
    const payload = {
      code: formData.code?.trim(),
    };
    await putData(payload, `/api/admin/examCodes/${id}`, "Exam code updated successfully");
    navigate("/admin/settings/examcode");
  };

  if (loadingOne || (!examRes && !error)) return <FormSkeleton />;
  if (error) return <LoadError text="Could not load this exam code." onRetry={refetch} />;

  const exam = examRes?.data?.data;

  return <ExamCodeForm key={exam?.id || id} initial={{ code: exam?.code || "" }} onSave={onSave} />;
};

export default EditExam;
