import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditRatingQuestion = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: questionRes, loading: loadingOne, error } = useGet(
    `/api/admin/rating-questions/${id}`
  );

  const { putData, loading: saving } = usePut(`/api/admin/rating-questions/${id}`);

  const fields = useMemo(
    () => [
      {
        name: "title",
        label: "Question Title",
        type: "text",
        required: true,
        placeholder: "e.g. How well was the session content organized?",
        section: "Question Details",
      },
      {
        name: "description",
        label: "Description",
        type: "text",
        required: false,
        placeholder: "e.g. Evaluate the flow and materials provided",
        section: "Question Details",
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        section: "Question Details",
        options: [
          { label: "Academic", value: "academic" },
          { label: "Behavioral", value: "behavioral" },
          { label: "General", value: "general" },
        ],
      },
      {
        name: "order",
        label: "Display Order",
        type: "number",
        required: true,
        placeholder: "e.g. 1",
        section: "Question Details",
        min: 1,
        helperText: "Controls the display order of this question",
      },
      {
        name: "isActive",
        label: "Active",
        type: "select",
        required: true,
        section: "Question Details",
        options: [
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
      },
    ],
    []
  );

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

  if (loadingOne) return <Loader />;
  if (error) return <Errorpage />;

  const question = questionRes?.data?.data || {};

  return (
    <AddPage
      title="Edit Rating Question"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/rating-questions")}
      initialData={{
        title: question?.title || "",
        description: question?.description || "",
        category: question?.category || "",
        order: question?.order || "",
        isActive: question?.isActive ? "true" : "false",
      }}
    />
  );
};

export default EditRatingQuestion;
