import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import useGet from "@/hooks/useGet";
import QuestionsTableSelect from "../../../../components/QuestionsTableSelect";

const AddExam = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost();
  const location = useLocation();
  const courseId = location.state?.courseId;
  const { data: rawScoresRes, loading: loadingRawScores, error: errorRawScores } = useGet("/api/admin/diagnosticExam/selection");

  const rawScoreOptions = useMemo(() => {
    return (
      rawScoresRes?.data?.data?.rawScores?.map((r) => ({
        value: r.id,
        label: r.name,
      })) || []
    );
  }, [rawScoresRes]);
  const questionsOptions = useMemo(() => {
    return (
      rawScoresRes?.data?.data?.questions?.map((r) => ({
        value: r.id,
        label: r.questionText,
      })) || []
    );
  }, [rawScoresRes]);

  const fields = useMemo(() => [
    {
      name: "title",
      label: "Exam Title",
      type: "text",
      required: true,
      placeholder: "Enter exam title",
      section: "General Information",
    },
    {
      name: "description",
      label: "Description (Optional)",
      type: "text",
      placeholder: "Enter description",
      section: "General Information",
    },
    {
      name: "duration",
      label: "Duration (minutes)*",
      type: "number",
      required: true,
      placeholder: "60",
      section: "General Information",
    },
    {
      name: "rawScoreId",
      label: "Raw Score Rule*",
      type: "select",
      required: true,
      options: rawScoreOptions,
      section: "General Information",
    },
    {
      name: "numberOfQuestions",
      label: "Number of Questions*",
      type: "number",
      required: true,
      placeholder: "20",
      section: "General Information",
    },
    {
      name: "passScore",
      label: "Passing Score*",
      type: "number",
      required: true,
      placeholder: "70",
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
      name="course"
      lessonId={courseId}
      value={value}
      onChange={onChange}
      error={error}
    />
  )
}
  ], [rawScoreOptions]);

  const initialFormValues = useMemo(() => ({
    title: "",
    description: "",
    duration: "",
    rawScoreId: "",
    numberOfQuestions: "",
    passScore: "",
    isActive: false,
    questionIds: [],
  }), []);

  const onSave = async (formData) => {
    
    try {
      const payload = {
        title: formData.title,
        description: formData.description || "",
        duration: Number(formData.duration),
        rawScoreId: formData.rawScoreId,
        numberOfQuestions: Number(formData.numberOfQuestions),
        passScore: Number(formData.passScore),
        isActive: formData.isActive,
        questionIds: formData.questionIds ,
        courseId: courseId,
          
      };

      await postData(payload, "/api/admin/diagnosticExam", "Exam added successfully");
      navigate(`/admin/courses/diagnosticexam/${courseId}`);
    } catch (error) {
           throw error;

    }
  };

  if (loadingRawScores) return <Loader />;
  if (errorRawScores) return <Errorpage />;

  return (
    <AddPage
      title="Add Diagnostic Exam"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialFormValues}
    />
  );
};

export default AddExam;