import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { FormSkeleton, LoadError } from "../settingsKit";
import RatingQuestionForm from "./RatingQuestionForm";

const EditRatingQuestion = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: questionRes, loading: loadingOne, error, refetch } = useGet(`/api/admin/rating-questions/${id}`);
  const { putData } = usePut(`/api/admin/rating-questions/${id}`);

  const onSave = async (formData) => {
    const payload = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      order: Number(formData.order),
      isActive: formData.isActive === "true",
    };
    await putData(payload, `/api/admin/rating-questions/${id}`, "Rating question updated successfully");
    navigate("/admin/settings/rating-questions");
  };

  if (loadingOne || (!questionRes && !error)) return <FormSkeleton />;
  if (error) return <LoadError text="Could not load this question." onRetry={refetch} />;

  const question = questionRes?.data?.data || {};

  return (
    <RatingQuestionForm
      key={question?.id || id}
      initial={{
        title: question?.title || "",
        description: question?.description || "",
        category: question?.category || "",
        order: question?.order || "",
        isActive: question?.isActive ? "true" : "false",
      }}
      onSave={onSave}
    />
  );
};

export default EditRatingQuestion;
