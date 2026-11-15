import React from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import RatingQuestionForm from "./RatingQuestionForm";

const AddRatingQuestion = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/rating-questions");

  const onSave = async (formData) => {
    const payload = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      order: Number(formData.order),
      isActive: formData.isActive === "true",
    };
    await postData(payload, "/api/admin/rating-questions", "Rating question added successfully");
    navigate("/admin/settings/rating-questions");
  };

  return (
    <RatingQuestionForm
      isNew
      initial={{ title: "", description: "", category: "", order: "", isActive: "true" }}
      onSave={onSave}
    />
  );
};

export default AddRatingQuestion;
