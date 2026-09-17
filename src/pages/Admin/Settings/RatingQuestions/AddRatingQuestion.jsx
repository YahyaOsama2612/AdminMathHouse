import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";

const AddRatingQuestion = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/rating-questions");

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

  const initialFormValues = useMemo(
    () => ({
      title: "",
      description: "",
      category: "",
      order: "",
      isActive: "true",
    }),
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

    try {
      await postData(payload, "/api/admin/rating-questions", "Rating question added successfully");
      navigate("/admin/settings/rating-questions");
    } catch (error) {
      throw error;
    }
  };

  return (
    <AddPage
      title="Add Rating Question"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/rating-questions")}
      initialData={initialFormValues}
    />
  );
};

export default AddRatingQuestion;
