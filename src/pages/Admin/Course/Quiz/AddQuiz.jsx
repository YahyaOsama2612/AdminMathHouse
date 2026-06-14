import React, { useMemo } from "react";
import { useNavigate, useParams ,useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loader";
import QuestionsTableSelect from "../../../../components/QuestionsTableSelect";

const AddQuiz = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/quiz");
 const location = useLocation();
  const lessonId = location.state?.lessonId;
  const fields = useMemo(
    () => [
      {
        name: "title",
        label: "Quiz Title",
        type: "text",
        required: true,
        placeholder: "Enter quiz title",
        section: "General Information",
      },
      {
        name: "description",
        label: "Description",
        type: "text",
        required: true,
        placeholder: "Enter quiz description",
        section: "General Information",
      },
      {
        name: "durationHours",
        label: "Duration (Hours)",
        type: "number",
        required: false,
        placeholder: "0",
        section: "General Information",
      },
      {
        name: "durationMinutes",
        label: "Duration (Minutes)",
        type: "number",
        required: true,
        placeholder: "30",
        section: "General Information",
      },
      {
        name: "totalScore",
        label: "Total Score",
        type: "number",
        required: true,
        placeholder: "100",
        section: "General Information",
      },
      {
        name: "passScore",
        label: "Pass Score",
        type: "number",
        required: true,
        placeholder: "60",
        section: "General Information",
      },
      {
        name: "quizOrder",
        label: "Quiz Order",
        type: "number",
        required: true,
        placeholder: "1",
        section: "General Information",
      },
      {
        name: "isActive",
        label: "Active",
        type: "switch", 
        required: false,
        section: "General Information",
      },
   {
  name: "questionIds",
  label: "Select Questions",
  type: "custom",
  fullWidth: true,
  required: true,
  section: "Questions",
  render: ({ value, onChange, error }) => (
    <QuestionsTableSelect
      name="lesson"
      lessonId={lessonId}
      value={value}
      onChange={onChange}
      error={error}
    />
  )
}
    ],
    []
  );

  const initialFormValues = useMemo(
    () => ({
      title: "",
      description: "",
      durationHours: 0,
      durationMinutes: 0,
      totalScore: 0,
      passScore: 0,
      quizOrder: 0,
      isActive: false,
      questionIds: [],
    }),
    []
  );

  const onSave = async (formData) => {
    const payload = {
      title: formData.title,
      description: formData.description,
      durationHours: Number(formData.durationHours),
      durationMinutes: Number(formData.durationMinutes),
      totalScore: Number(formData.totalScore),
      passScore: Number(formData.passScore),
      quizOrder: Number(formData.quizOrder),
      isActive: formData.isActive,
      lessonId: lessonId,
      questionIds: formData.questionIds
     
    };

    try {
      await postData(payload, "/api/admin/quiz", "Quiz added successfully");
      navigate(`/admin/courses/quiz/${lessonId}`);
    } catch (error) {
      throw error;
    }
  };

  if (saving) return <Loader />;

  return (
    <AddPage
      title="Add Quiz"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(`/admin/courses/quiz/${lessonId}`)}
      initialData={initialFormValues}
    />
  );
};

export default AddQuiz;