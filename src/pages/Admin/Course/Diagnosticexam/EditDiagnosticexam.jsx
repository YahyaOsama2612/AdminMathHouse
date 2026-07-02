import React, { useMemo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import QuestionsTableSelect from "../../../../components/QuestionsTableSelect";

const EditDiagnosticexam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: examRes,
    loading: loadingExam,
    error,
  } = useGet(`/api/admin/diagnosticExam/${id}`);
  const { data: selectionRes } = useGet("/api/admin/diagnosticExam/selection");
  const { putData, loading: saving } = usePut(
    `/api/admin/diagnosticExam/${id}`,
  );

  const rawScoreOptions = useMemo(() => {
    return (
      selectionRes?.data?.data?.rawScores?.map((r) => ({
        value: r.id,
        label: r.name,
      })) || []
    );
  }, [selectionRes]);

  // تعيين القيم الأولية أولاً لتجنب مشاكل الترتيب في useMemo
  const initialData = useMemo(() => {
    const examData = examRes?.data?.data;
    // التأكد من استخراج الـ IDs بشكل صحيح سواء كانت q.id أو q.questionId
    const selectedQuestions =
      examData?.questions?.map((q) => q.questionId || q.id || q.question?.id) ||
      [];
    let parsedCalculators = [];
    try {
      parsedCalculators =
        typeof examData.calculators === "string"
          ? JSON.parse(examData.calculators)
          : examData.calculators || [];
    } catch (e) {
      parsedCalculators = [];
    }

    return {
      title: examData?.title || "",
      description: examData?.description || "",
      duration: examData?.duration || "",
      rawScoreId: examData?.rawScore?.id || examData?.rawScoreId || "",
      numberOfQuestions: examData?.numberOfQuestions || "",
      passScore: examData?.passScore || "",
      isActive: examData?.isActive || false,
      questionIds: selectedQuestions,
      courseId: examData?.course?.id || examData?.courseId || "",
      calculators: parsedCalculators,
    };
  }, [examRes]);

  // الحقول للفورم - أضفنا initialData في الـ dependencies
  const fields = useMemo(
    () => [
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
        name: "calculators",
        label: "Calculator Types",
        type: "multipleSelect",
        required: true,
       
        options: [
          { label: "3D", value: "3D" },
          { label: "four function", value: "four function" },
          { label: "geometry", value: "geometry" },
          { label: "graph", value: "graph" },
          { label: "matrix", value: "matrix" },
          { label: "scientific", value: "scientific" },
        ],
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
            value={value || []} // تأمين ألا تكون القيمة null أو undefined
            onChange={onChange}
            error={error}
          />
        ),
      },
    ],
    [rawScoreOptions, initialData],
  );

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
        courseId: initialData.courseId,
        calculators: formData.calculators,
      };

      await putData(
        payload,
        `/api/admin/diagnosticExam/${id}`,
        "Exam updated successfully",
      );
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
