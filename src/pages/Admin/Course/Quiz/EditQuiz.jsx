import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import QuestionsTableSelect from "../../../../components/QuestionsTableSelect";

const EditQuiz = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: quizRes, loading, error } = useGet(`/api/admin/quiz/${id}`);
  const { putData, loading: saving } = usePut(`/api/admin/quiz/${id}`);

  const quiz = quizRes?.data?.data;

  const lessonId = quiz?.lessonId;

  const fields = useMemo(
    () => [
      {
        name: "title",
        label: "Quiz Title",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "description",
        label: "Description",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "durationHours",
        label: "Duration (Hours)",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "durationMinutes",
        label: "Duration (Minutes)",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "totalScore",
        label: "Total Score",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "passScore",
        label: "Pass Score",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "quizOrder",
        label: "Quiz Order",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "isActive",
        label: "Active",
        type: "switch",
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
        ),
      },
    ],
    [lessonId]
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
      questionIds: formData.questionIds,
    };

    try {
      await putData(payload, `/api/admin/quiz/${id}`, "Quiz updated successfully");
      navigate(-1);
    } catch (e) {
        throw e
    }
  };

  if (loading || saving) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <AddPage
      title="Edit Quiz"
      fields={fields}
      onSave={onSave}
      onCancel={() =>  navigate(-1)}
      initialData={{
        title: quiz?.title || "",
        description: quiz?.description || "",
        durationHours: quiz?.durationHours || 0,
        durationMinutes: quiz?.durationMinutes || 0,
        totalScore: quiz?.totalScore || 0,
        passScore: quiz?.passScore || 0,
        quizOrder: quiz?.quizOrder || 0,
        isActive: quiz?.isActive || false,
        questionIds:
          quiz?.questions?.map((q) => q.question.id) || [],
      }}
    />
  );
};

export default EditQuiz;