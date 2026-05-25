import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditParallel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { putData } = usePut(`/api/admin/questions/parallel/${id}`);

  // Fetch parallel question
  const { data: questionRes, loading: loadingQuestion, error: errorQuestion } =
    useGet(`/api/admin/questions/parallel/${id}`);

  // Fetch lessons for selection
  const { data: Lessons, loading: loadingLessons, error: errorLessons } =
    useGet("/api/admin/questions/selectionLesson");

  const LessonsOptions = useMemo(
    () =>
      Lessons?.data?.data?.map((lesson) => ({
        value: lesson.value,
        label: lesson.label,
      })) || [],
    [Lessons]
  );

  const fields = useMemo(() => [
    {
      name: "question",
      label: "Question",
      type: "text",
      required: true,
      placeholder: "Edit parallel question",
      section: "General Information",
    },
    {
      name: "answerType",
      label: "Answer Type",
      type: "select",
      options: [
        { value: "MCQ", label: "MCQ" },
        { value: "Grid in", label: "Grid in" },
      ],
      required: true,
      section: "General Information",
    },
    {
      name: "difficulty",
      label: "Difficulty",
      type: "select",
      options: [
        { value: "A", label: "A" },
        { value: "B", label: "B" },
        { value: "C", label: "C" },
        { value: "D", label: "D" },
        { value: "E", label: "E" },
      ],
      required: true,
      section: "General Information",
    },
    {
      name: "lessonId",
      label: "Lesson",
      type: "select",
      options: LessonsOptions,
      required: true,
      section: "General Information",
    },
    {
      name: "options",
      label: "Answer Options",
      type: "dynamic-list",
      required: true,
      section: "Options",
      helperText: "Add as many options as you need.",
      fullWidth: true,
    },
    {
      name: "correctOption",
      label: "Correct Option",
      type: "custom",
      required: true,
      section: "Options",
      render: ({ value, onChange, formData, error }) => {
        const currentOptionsCount = formData.options?.length || 2;
        const availableLetters = Array.from(
          { length: currentOptionsCount },
          (_, i) => String.fromCharCode(65 + i)
        );

        return (
          <div className="flex flex-wrap flex-col gap-3">
            {availableLetters.map((letter) => {
              const isSelected = value === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => onChange(letter)}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-200 border-2
                    ${isSelected
                      ? "bg-one text-white border-one shadow-lg scale-110"
                      : "bg-white text-slate-500 border-slate-200 hover:border-one/50 hover:bg-slate-50"
                    }
                    ${error ? "border-red-500" : ""}
                  `}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        );
      },
    },
  ], [LessonsOptions]);

 const initialData = useMemo(() => {
  const rows = questionRes?.data?.data;
  if (!rows || rows.length === 0) return {};

  const first = rows[0];

  const options = rows.map((row) => row.options?.answer || "");

  const correctOption =
    rows.find((row) => row.options?.isCorrect)?.options?.order || "";

  return {
    question: first.question || "",
    answerType: first.answerType || "",
    difficulty: first.difficulty || "",
    lessonId: first.lessonId || "",
    options,
    correctOption,
  };
}, [questionRes]);

  const onSave = async (formData) => {
    // تجهيز الـ Options
    const options = (formData.options || []).map((answer, index) => ({
      answer: answer?.trim(),
      isCorrect: formData.correctOption === String.fromCharCode(65 + index),
      order: String.fromCharCode(65 + index),
    })).filter(opt => opt.answer);

    if (options.length < 2) {
      toast.error("Please add at least two answer options");
      return;
    }

    if (!formData.correctOption) {
      toast.error("Please select the correct answer");
      return;
    }

    const hasCorrect = options.some(opt => opt.isCorrect);
    if (!hasCorrect) {
      toast.error("The correct answer must be one of the provided options");
      return;
    }

    const payload = {
      question: formData.question,
      answerType: formData.answerType,
      difficulty: formData.difficulty,
      lessonId: formData.lessonId,
      options,
    };

    try {
      await putData(payload, `/api/admin/questions/parallel/${id}`, "Parallel question updated successfully");
      navigate(-1);
    } catch (error) {
     throw error; }

  };

  if (loadingQuestion || loadingLessons) return <Loader />;
  if (errorQuestion || errorLessons) return <Errorpage />;

  return (
    <AddPage
      title="Edit Parallel Question"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialData}
    />
  );
};

export default EditParallel;