import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import toast from "react-hot-toast";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const AddParallel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { originalQuestionId, lessonId } = location.state || {}; // pass original question ID

  const { postData } = usePost("/api/admin/questions/parallel");




  const answerOrders = ["A", "B", "C", "D"];

  const fields = useMemo(() => [
    {
      name: "question",
      label: "Question",
      type: "text",
      required: true,
      placeholder: "Enter the parallel question",
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
        const currentOptionsCount = formData.options?.length || 4;
        const availableLetters = Array.from({ length: currentOptionsCount }, (_, i) => String.fromCharCode(65 + i));

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
  ], []);

  const initialFormValues = {
    question: "",
    answerType: "",
    difficulty: "",
    options: ["", ""], 
    correctOption: "",
  };

  const onSave = async (formData) => {
    // تجهيز الـ Options
    const options = (formData.options || [])
      .map((answer, index) => ({
        answer: answer?.trim(),
        isCorrect: formData.correctOption === String.fromCharCode(65 + index),
        order: String.fromCharCode(65 + index),
      }))
      .filter(opt => opt.answer);

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
      origianlQuestionId: originalQuestionId,
      question: formData.question,
      answerType: formData.answerType,
      difficulty: formData.difficulty,
      lessonId: lessonId,
      options,
    };

    try {
      await postData(payload, "/api/admin/questions/parallel", "Parallel question added successfully");
      navigate(-1);
    } catch (error) {
           throw error;

    }
  };


  return (
    <AddPage
      title="Add Parallel Question"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialFormValues}
    />
  );
};

export default AddParallel;