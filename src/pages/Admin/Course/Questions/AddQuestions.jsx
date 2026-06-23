// Reusable field UI for drive picker
const DrivePickerField = ({
  label,
  value,
  allowedTypes,
  pickerTitle,
  onOpen,
  onClear,
}) => (
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

import React, { useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import toast from "react-hot-toast";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import TipTapMathEditor from "../../../../components/TipTapMathEditor";
import DrivePicker from "../../../../components/Drivepicker";

const AddQuestions = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/questions");
  const { postData: postDataimage } = usePost("/api/admin/questions/ocr");
  const location = useLocation();
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
    pickerSetterRef.current = setFormData; // ✅ no React trap
    setPicker({ open: true, field, allowedTypes, title });
  };

  const handlePickerSelect = (file) => {
    if (!pickerSetterRef.current || !picker.field) return;

    const value = file.sourceUrl || file.bunnyGuid || null; // ✅ fallback to bunnyGuid

    pickerSetterRef.current((prev) => ({
      ...prev,
      [picker.field]: value,
    }));
  };

  // استلام معرف الدرس لو موجود في الـ state
  const { lessonId } = location.state || {};

  // جلب بيانات الاختيارات من الـ API
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

  // --- تجهيز الخيارات (Options) مع إضافة خيار فارغ لإلغاء الاختيار ---
  const LessonsOptions = useMemo(() => {
    const base = [{ value: "", label: "-- Select Lesson --" }];
    const apiData =
      Lessons?.data?.data?.map((lesson) => ({
        value: lesson.value,
        label: lesson.label,
      })) || [];
    return [...base, ...apiData];
  }, [Lessons]);

  const SectionsOptions = useMemo(() => {
    const base = [{ value: "", label: "-- Select Section --" }];
    const apiData =
      Sections?.data?.sections?.map((s) => ({
        value: s.id,
        label: s.sectionName,
      })) || [];
    return [...base, ...apiData];
  }, [Sections]);

  const ExamCodeOptions = useMemo(() => {
    const base = [{ value: "", label: "-- Select Exam Code --" }];
    const apiData =
      ExamCode?.data?.data?.map((code) => ({
        value: code.id,
        label: code.code,
      })) || [];
    return [...base, ...apiData];
  }, [ExamCode]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const base = [{ value: "", label: "-- Select Year --" }];
    const list = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => {
      const y = 2000 + i;
      return { value: y.toString(), label: y.toString() };
    });
    return [...base, ...list];
  }, [currentYear]);

  const months = useMemo(
    () => [
      { value: "", label: "-- Select Month --" },
      { value: "Jan", label: "Jan" },
      { value: "Feb", label: "Feb" },
      { value: "Mar", label: "Mar" },
      { value: "Apr", label: "Apr" },
      { value: "May", label: "May" },
      { value: "Jun", label: "Jun" },
      { value: "Jul", label: "Jul" },
      { value: "Aug", label: "Aug" },
      { value: "Sep", label: "Sep" },
      { value: "Oct", label: "Oct" },
      { value: "Nov", label: "Nov" },
      { value: "Dec", label: "Dec" },
    ],
    [],
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
        setFormData((prev) => ({
          ...prev,
          question: extractedText,
        }));
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
        name: "questionNumber", // حقل رقم السؤال الجديد
        label: "Question Number",
        type: "number",
        required: false,
        section: "General Information",
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
        label: "Difficulty Level",
        type: "select",
        options: [
          { value: "A", label: "A (Easy)" },
          { value: "B", label: "B" },
          { value: "C", label: "C (Medium)" },
          { value: "D", label: "D" },
          { value: "E", label: "E (Hard)" },
        ],
        required: true,
        section: "General Information",
      },
      {
        name: "sectionId",
        label: "Section",
        type: "select",
        options: SectionsOptions, // الآن يحتوي على خيار الإلغاء الفارغ
        required: false,
        section: "General Information",
      },
      {
        name: "year",
        label: "Year",
        type: "select",
        options: years, // الآن يحتوي على خيار الإلغاء الفارغ
        required: false,
        section: "General Information",
      },
      {
        name: "month",
        label: "Month",
        type: "select",
        options: months, // الآن يحتوي على خيار الإلغاء الفارغ
        required: false,
        section: "General Information",
      },
      {
        name: "codeId",
        label: "Exam Code",
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
        helperText: "Enter the text for options A, B, C, D...",
      },
      {
        name: "correctOption",
        label: "Mark Correct Letter",
        type: "custom",
        required: true,
        section: "Answers Configuration",
        hidden: (formData) => formData.answerType === "Grid in",
        render: ({ value, onChange, formData }) => {
          const count = formData.options?.length || 4;
          const letters = Array.from({ length: count }, (_, i) =>
            String.fromCharCode(65 + i),
          );
          return (
            <div className="flex flex-col gap-3">
              {letters.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onChange(l)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all border-2 
                  ${value === l ? "bg-one text-white border-one shadow-md scale-110" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"}`}
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
        hidden: (formData) =>
          formData.answerType === "MCQ" || !formData.answerType,
        helperText: "Add all possible correct formats (e.g., 0.5, .5, 1/2)",
      },

      // --- Media Section ---
      {
        name: "answerImage",
        label: "Answer Image",
        type: "custom",
        section: "Solution Media",
        fullWidth: false,
        render: ({ value, onChange, formData, setFormData }) => (
          <DrivePickerField
            label="Answer Image"
            value={value}
            fieldName="answer_image"
            allowedTypes={["image"]}
            pickerTitle="Select Answer Image from Drive"
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
        render: ({ value, onChange, formData, setFormData }) => (
          <DrivePickerField
            label="Answer PDF"
            value={value}
            fieldName="pdf"
            allowedTypes={["pdf"]}
            pickerTitle="Select Answer PDF from Drive"
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
        render: ({ value, onChange, formData, setFormData }) => (
          <DrivePickerField
            label="Answer Video"
            value={value}
            fieldName="answerVideo"
            allowedTypes={["video"]}
            pickerTitle="Select Answer Video from Drive"
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
    [SectionsOptions, ExamCodeOptions, years, months, ocrLoading],
  );

  const initialFormValues = {
    questionNumber: "", // القيمة الابتدائية لرقم السؤال
    question: "",
    answerType: "",
    difficulty: "",
    options: ["", "", "", ""],
    gridInAnswers: [""],
    correctOption: "",
    year: "",
    month: "",
    sectionId: "",
    answerImage: "",
    pdf: "",
    video: "",
    answerText: "",
  };

  const onSave = async (formData) => {
    let imageBase64 = null;
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

    const {
      year,
      month,
      sectionId,
      questionNumber,
      gridInAnswers,
      correctOption,
      options,
      
      ...rest
    } = formData;

    const payload = {
      ...rest,
      lessonId: lessonId || null,
      options: finalOptions,
      image: imageBase64 || formData.image || null,
      answerPdf: rest.pdf, // 👈 if backend expects "answerPdf"
      answerVideo: rest.video, // 👈 if backend expects "answerVideo"
    };

    if (year) payload.year = Number(year);
    if (month) payload.month = month;
    if (sectionId) payload.sectionId = sectionId;
    if (questionNumber) payload.questionNumber = Number(questionNumber);

    try {
      await postData(
        payload,
        "/api/admin/questions",
        "Question added successfully",
      );
      navigate(-1);
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingLessons || loadingExamCode || loadingSections) return <Loader />;
  if (errorLessons || errorExamCode || errorSections) return <Errorpage />;

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
        title="Add New Question"
        fields={fields}
        onSave={onSave}
        onCancel={() => navigate(-1)}
        initialData={initialFormValues}
      />
    </>
  );
};

export default AddQuestions;
