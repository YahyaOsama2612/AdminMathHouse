import React, { useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import TipTapMathEditor from "../../../../components/TipTapMathEditor";
import DrivePicker from "@/components/DrivePicker";

// Reusable Drive picker field UI
const DrivePickerField = ({ value, allowedTypes, onOpen, onClear }) => (
  <div className="flex flex-col gap-2 w-full">
    {value ? (
      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <span className="text-lg">
          {allowedTypes[0] === "video"
            ? "🎬"
            : allowedTypes[0] === "pdf"
              ? "📕"
              : "🖼️"}
        </span>
        <span className="flex-1 text-sm text-slate-700 truncate">
          {value.split("/").pop()}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-red-500 hover:text-red-700 font-semibold shrink-0"
        >
          Remove
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl text-slate-500 hover:text-indigo-600 transition-all text-sm font-medium"
      >
        <span>📂</span>
        <span>Select from Drive</span>
      </button>
    )}
  </div>
);

const EditQuestions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { putData } = usePut(`/api/admin/questions/${id}`);

  const { postData: postDataimage } = usePost("/api/admin/questions/ocr");
  const [ocrLoading, setOcrLoading] = useState(false);

  // Drive Picker state
  const [picker, setPicker] = useState({
    open: false,
    field: null,
    allowedTypes: [],
    title: "",
  });
  const pickerSetterRef = useRef(null);

  const openPicker = (field, allowedTypes, title, setFormData) => {
    pickerSetterRef.current = setFormData;
    setPicker({ open: true, field, allowedTypes, title });
  };

  const handlePickerSelect = (file) => {
    if (!pickerSetterRef.current || !picker.field) return;
    const value = file.sourceUrl || file.bunnyGuid || null;
    pickerSetterRef.current((prev) => ({
      ...prev,
      [picker.field]: value,
    }));
  };

  // Fetch current question data
  const {
    data: questionRes,
    loading: loadingQuestion,
    error: errorQuestion,
  } = useGet(`/api/admin/questions/${id}`);

  const {
    data: Lessons,
    loading: loadingLessons,
    error: errorLessons,
  } = useGet("/api/admin/questions/selectionLesson");
  const {
    data: Sections,
    loading: loadingSections,
    error: errorSections,
  } = useGet("/api/admin/sections/selectionSections");
  const {
    data: ExamCode,
    loading: loadingExamCode,
    error: errorExamCode,
  } = useGet("/api/admin/questions/selectionExamCode");

  const LessonsOptions = useMemo(
    () =>
      Lessons?.data?.data?.map((l) => ({ value: l.value, label: l.label })) ||
      [],
    [Lessons],
  );

  const SectionsOptions = useMemo(
    () =>
      Sections?.data?.sections?.map((s) => ({
        value: s.id,
        label: s.sectionName,
      })) || [],
    [Sections],
  );

  const ExamCodeOptions = useMemo(
    () =>
      ExamCode?.data?.data?.map((c) => ({ value: c.id, label: c.code })) || [],
    [ExamCode],
  );

  const years = Array.from(
    { length: new Date().getFullYear() - 2000 + 1 },
    (_, i) => ({
      value: (2000 + i).toString(),
      label: (2000 + i).toString(),
    }),
  );

  const handleOCR = async (imageFile, setFormData) => {
    if (!imageFile) {
      return toast.error("Please upload an image first");
    }
    try {
      setOcrLoading(true);
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await postDataimage(
        formData,
        "/api/admin/questions/ocr",
        "Text extracted successfully",
      );
      const extractedText = res?.data?.data;
      if (extractedText) {
        setFormData((prev) => ({ ...prev, question: extractedText }));
      } else {
        toast.error("No text detected");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOcrLoading(false);
    }
  };

  const fields = useMemo(
    () => [
      {
        name: "image",
        label: "Question Image & OCR",
        type: "fileWithOCR",
        section: "General Information",
        fullWidth: true,
        actionButton: ({ formData, setFormData }) => (
          <button
            type="button"
            onClick={() => handleOCR(formData.image, setFormData)}
            disabled={ocrLoading || !formData.image}
            className="w-full md:w-auto h-full px-8 py-4 bg-one text-white rounded-xl hover:bg-one/80 disabled:opacity-50 flex items-center justify-center gap-2 transition-all font-bold shadow-sm"
          >
            {ocrLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Extracting...</span>
              </>
            ) : (
              <>📄 Extract Text</>
            )}
          </button>
        ),
      },
      {
        name: "question",
        label: "Question Content",
        type: "custom",
        required: true,
        section: "General Information",
        fullWidth: true,
        render: ({ value, onChange }) => (
          <TipTapMathEditor value={value} onChange={onChange} />
        ),
      },
      {
        name: "answerType",
        label: "Answer Type",
        type: "select",
        options: [
          { value: "MCQ", label: "MCQ (Multiple Choice)" },
          { value: "Grid in", label: "Grid in (Open Answer)" },
        ],
        required: true,
        section: "General Information",
      },
      {
        name: "questionType",
        label: "Question Type",
        type: "select",
        options: [
          { value: "Extra", label: "Extra" },
          { value: "Trail", label: "Trail" },
          { value: "Parallel", label: "Parallel" },
        ],
        required: true,
        section: "General Information",
      },
      {
        name: "difficulty",
        label: "Difficulty",
        type: "select",
        options: ["A", "B", "C", "D", "E"].map((d) => ({ value: d, label: d })),
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
        name: "sectionId",
        label: "Section",
        type: "select",
        options: SectionsOptions,
        required: false,
        section: "General Information",
      },
      {
        name: "year",
        label: "Year",
        type: "select",
        options: years,
        required: false,
        section: "General Information",
      },
      {
        name: "month",
        label: "Month",
        type: "select",
        options: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ].map((m) => ({ value: m, label: m })),
        required: false,
        section: "General Information",
      },
      {
        name: "codeId",
        label: "Code",
        type: "select",
        options: ExamCodeOptions,
        required: true,
        section: "General Information",
      },

      // --- MCQ Section ---
      {
        name: "options",
        label: "Multiple Choice Options",
        type: "dynamic-list",
        required: true,
        section: "Answers Configuration",
        hidden: (formData) => formData.answerType === "Grid in",
      },
      {
        name: "correctOption",
        label: "Correct Option",
        type: "custom",
        required: true,
        section: "Answers Configuration",
        hidden: (formData) => formData.answerType === "Grid in",
        render: ({ value, onChange, formData }) => {
          const letters = Array.from(
            { length: formData.options?.length || 4 },
            (_, i) => String.fromCharCode(65 + i),
          );
          return (
            <div className="flex flex-wrap gap-3">
              {letters.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onChange(l)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all border-2
                  ${value === l ? "bg-one text-white border-one shadow-lg scale-110" : "bg-white text-slate-500 border-slate-200"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          );
        },
      },

      // --- Grid In Section ---
      {
        name: "gridInAnswers",
        label: "Accepted Grid-in Answers",
        type: "dynamic-list",
        required: true,
        section: "Answers Configuration",
        hidden: (formData) => formData.answerType === "MCQ",
      },

      // --- Solution Media (Drive Pickers) ---
      {
        name: "answerImage",
        label: "Answer Image",
        type: "custom",
        section: "Solution Media",
        fullWidth: false,
        render: ({ value, onChange, setFormData }) => (
          <DrivePickerField
            value={value}
            allowedTypes={["image"]}
            onOpen={() =>
              openPicker(
                "answerImage",
                ["image"],
                "Select Answer Image from Drive",
                setFormData,
              )
            }
            onClear={() => onChange("")}
          />
        ),
      },
      {
        name: "pdf",
        label: "Answer PDF",
        type: "custom",
        section: "Solution Media",
        fullWidth: false,
        render: ({ value, onChange, setFormData }) => (
          <DrivePickerField
            value={value}
            allowedTypes={["pdf"]}
            onOpen={() =>
              openPicker(
                "pdf",
                ["pdf"],
                "Select Answer PDF from Drive",
                setFormData,
              )
            }
            onClear={() => onChange("")}
          />
        ),
      },
      {
        name: "video",
        label: "Answer Video",
        type: "custom",
        section: "Solution Media",
        fullWidth: false,
        render: ({ value, onChange, setFormData }) => (
          <DrivePickerField
            value={value}
            allowedTypes={["video"]}
            onOpen={() =>
              openPicker(
                "video",
                ["video"],
                "Select Answer Video from Drive",
                setFormData,
              )
            }
            onClear={() => onChange("")}
          />
        ),
      },
      {
        name: "answerText",
        label: "Answer Text",
        type: "text",
        section: "Solution Media",
      },
    ],
    [LessonsOptions, SectionsOptions, ExamCodeOptions, years, ocrLoading],
  );

  // Map API response to form shape
  const initialData = useMemo(() => {
    if (!questionRes?.data?.data) return {};
    const q = questionRes.data.data;

    const isGridIn = q.answerType === "Grid in";
    const options = !isGridIn
      ? q.options?.map((opt) => opt.answer) || ["", "", "", ""]
      : ["", "", "", ""];
    const gridInAnswers = isGridIn
      ? q.options?.map((opt) => opt.answer) || [""]
      : [""];
    const correctOption = !isGridIn
      ? q.options?.find((opt) => opt.isCorrect)?.order || ""
      : "";

    return {
      question: q.question || "",
      image: q.image || "",
      answerType: q.answerType || "MCQ",
      questionType: q.questionType || "",
      month: q.month || "",
      difficulty: q.difficulty || "",
      lessonId: q.lessonId || "",
      sectionId: q.section?.id || "",
      year: q.year?.toString() || "",
      codeId: q.codeId || "",
      options,
      gridInAnswers,
      correctOption,
      pdf: q.pdf || "",
      video: q.video || "",
      answerText: q.answerText || "",
      answerImage: q.answerImage || "",
    };
  }, [questionRes]);

  const onSave = async (formData) => {
    let imageBase64 = formData.image;
    if (formData.image instanceof File) {
      imageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(formData.image);
      });
    }

    let finalOptions = [];
    if (formData.answerType === "MCQ") {
      finalOptions = (formData.options || [])
        .map((ans, index) => ({
          answer: ans?.trim(),
          isCorrect: formData.correctOption === String.fromCharCode(65 + index),
          order: String.fromCharCode(65 + index),
        }))
        .filter((opt) => opt.answer);
    } else {
      finalOptions = (formData.gridInAnswers || [])
        .filter((ans) => ans.trim() !== "")
        .map((ans) => ({
          answer: ans.trim(),
          isCorrect: true,
          order: null,
        }));
    }
    const { pdf, video, gridInAnswers, correctOption, ...rest } = formData;
    const payload = {
      ...rest, // excludes pdf, video, gridInAnswers, correctOption
      year: Number(formData.year),
      image: imageBase64,
      options: finalOptions,
      answerPdf: pdf || null, // ✅ correct key for backend
      answerVideo: video || null, // ✅ correct key for backend
    };

    delete payload.gridInAnswers;
    delete payload.correctOption;

    try {
      await putData(
        payload,
        `/api/admin/questions/${id}`,
        "Question updated successfully",
      );
      navigate(-1);
    } catch (error) {
      console.error(error);
    }
  };

  if (loadingQuestion || loadingLessons || loadingSections || loadingExamCode)
    return <Loader />;
  if (errorQuestion || errorLessons || errorSections || errorExamCode)
    return <Errorpage />;

  return (
    <>
      <DrivePicker
        isOpen={picker.open}
        onClose={() => setPicker((p) => ({ ...p, open: false }))}
        onSelect={handlePickerSelect}
        allowedTypes={picker.allowedTypes}
        title={picker.title}
      />
      <AddPage
        title="Edit Question"
        fields={fields}
        onSave={onSave}
        onCancel={() => navigate(-1)}
        initialData={initialData}
      />
    </>
  );
};

export default EditQuestions;
