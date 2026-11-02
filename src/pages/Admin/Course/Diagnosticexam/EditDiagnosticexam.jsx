import React, { useMemo, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import QuestionsTableSelect from "../../../../components/QuestionsTableSelect";

const EditDiagnosticexam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: examRes,
    loading: loadingExam,
    error,
  } = useGet(`/api/admin/diagnosticExam/${id}`);
  const { data: selectionRes } = useGet("/api/admin/diagnosticExam/selection");
  const { putData, loading: saving } = usePut(
    `/api/admin/diagnosticExam/${id}`,
  );

  const courseId =
    examRes?.data?.data?.course?.id ||
    examRes?.data?.data?.courseId ||
    location.state?.courseId;

  const {
    data: lessonsRes,
    loading: loadingLessons,
  } = useGet(
    courseId ? `/api/admin/session/course/${courseId}/lessons` : null,
  );

  const lessonOptions = useMemo(() => {
    const rawList =
      (Array.isArray(lessonsRes?.data) ? lessonsRes.data : null) ||
      (Array.isArray(lessonsRes?.data?.data) ? lessonsRes.data.data : null) ||
      lessonsRes?.data?.data?.lessons ||
      lessonsRes?.data?.lessons ||
      [];

    const list = Array.isArray(rawList) ? rawList : [];

    return list.map((item) => {
      const lessonObj = item?.lesson || item;
      return {
        value: item?.value ?? lessonObj?.id ?? lessonObj?._id ?? item?.lessonId ?? item?.id,
        label:
          item?.label ??
          lessonObj?.name ??
          lessonObj?.title ??
          item?.name ??
          item?.title ??
          `Lesson ${item?.value ?? lessonObj?.id ?? item?.id}`,
      };
    });
  }, [lessonsRes]);

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
      lessonId:
        examData?.lesson?.id ||
        examData?.lessonId ||
        examData?.lessons?.[0]?.id ||
        "",
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
        render: ({ value, onChange, error, formData, setFormData }) => (
          <QuestionsTableSelect
            name="lesson"
            lessonId={formData?.lessonId || initialData.lessonId}
            value={value || []} // تأمين ألا تكون القيمة null أو undefined
            onChange={onChange}
            error={error}
            maxQuestions={
              Number(formData?.numberOfQuestions) ||
              Number(initialData?.numberOfQuestions) ||
              0
            }
            lessons={lessonOptions}
            onLessonChange={(newLessonId) => {
              if (setFormData) {
                setFormData((prev) => ({ ...prev, lessonId: newLessonId }));
              }
            }}
          />
        ),
      },
    ],
    [rawScoreOptions, lessonOptions, loadingLessons, initialData],
  );

  const onSave = async (formData) => {
    try {
      if (!formData.lessonId) {
        toast.error("Please select a lesson");
        return;
      }
      if (!formData.questionIds || formData.questionIds.length === 0) {
        toast.error("Please select at least one question");
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description || "",
        duration: Number(formData.duration),
        rawScoreId: formData.rawScoreId,
        numberOfQuestions: Number(formData.numberOfQuestions),
        passScore: Number(formData.passScore),
        isActive: formData.isActive,
        questionIds: formData.questionIds,
        courseId: initialData.courseId || courseId,
        calculators: formData.calculators,
        lessonId: formData.lessonId,
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

  if (loadingExam || (courseId && loadingLessons) || saving) return <Loader />;
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
