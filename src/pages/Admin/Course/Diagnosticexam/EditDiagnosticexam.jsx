import React, { useMemo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import QuestionsTableSelect from "../../../../components/QuestionsTableSelect";

const EditDiagnosticexam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // جلب بيانات الامتحان الحالي
  const { data: examRes, loading: loadingExam, error } = useGet(`/api/admin/diagnosticExam/${id}`);

  // جلب خيارات RawScores و Questions
  const { data: selectionRes } = useGet("/api/admin/diagnosticExam/selection");

  const { putData, loading: saving } = usePut(`/api/admin/diagnosticExam/${id}`);

  // خيارات Raw Scores
  const rawScoreOptions = useMemo(() => {
    return selectionRes?.data?.data?.rawScores?.map((r) => ({
      value: r.id,
      label: r.name,
    })) || [];
  }, [selectionRes]);

  // خيارات الأسئلة
  const questionsOptions = useMemo(() => {
    return selectionRes?.data?.data?.questions?.map((r) => ({
      value: r.id,
      label: r.questionText,
    })) || [];
  }, [selectionRes]);

  // الحقول للفورم
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
      lessonId={initialData.courseId}
      value={value}
      onChange={onChange}
      error={error}
    />
  )
}
  ], [rawScoreOptions, questionsOptions]);

  // تعيين القيم الأولية بعد جلب البيانات
  const initialData = useMemo(() => ({
    title: examRes?.data?.data?.title || "",
    description: examRes?.data?.data?.description || "",
    duration: examRes?.data?.data?.duration || "",
    rawScoreId: examRes?.data?.data?.rawScore?.id || "",
    numberOfQuestions: examRes?.data?.data?.numberOfQuestions || "",
    passScore: examRes?.data?.data?.passScore || "",
    isActive: examRes?.data?.data?.isActive || false,
    questionIds: examRes?.data?.data?.questions?.map(q => q.questionId) || [],
    courseId: examRes?.data?.data?.course?.id || "",
  }), [examRes]);

  // حفظ التعديل
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
        questionIds: formData.questionIds,
        courseId: initialData.courseId
      };

      await putData(payload, `/api/admin/diagnosticExam/${id}`, "Exam updated successfully");
      navigate(-1);
    } catch (error) {
            throw error;

    }
  };

  if (loadingExam || saving) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <AddPage
      title="Edit Diagnostic Exam"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialData}
      loading={saving}
    />
  );
};

export default EditDiagnosticexam;