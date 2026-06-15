import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import usePost from "@/hooks/usePost"; // 👈 ضفنا الـ usePost عشان الـ OCR
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import TipTapMathEditor from "../../../../components/TipTapMathEditor";

const EditQuestions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { putData, loading: saving } = usePut(`/api/admin/questions/${id}`);
  
  // 👈 ضفنا الـ API وحالة التحميل الخاصة بالـ OCR
  const { postData: postDataimage } = usePost("/api/admin/questions/ocr");
  const [ocrLoading, setOcrLoading] = useState(false);

  // جلب بيانات السؤال الحالي
  const {
    data: questionRes,
    loading: loadingQuestion,
    error: errorQuestion,
  } = useGet(`/api/admin/questions/${id}`);

  // جلب بيانات الاختيارات (الدروس، الأقسام، الأكواد)
  const { data: Lessons, loading: loadingLessons  ,error : errorLessons} = useGet("/api/admin/questions/selectionLesson");
  const { data: Sections, loading: loadingSections ,error : errorSections} = useGet("/api/admin/sections/selectionSections");
  const { data: ExamCode, loading: loadingExamCode ,error : errorExamCode} = useGet("/api/admin/questions/selectionExamCode");

  // --- تجهيز الخيارات (Options) ---
  const LessonsOptions = useMemo(() => 
    Lessons?.data?.data?.map(l => ({ value: l.value, label: l.label })) || [], [Lessons]
  );

  const SectionsOptions = useMemo(() => 
    Sections?.data?.sections?.map(s => ({ value: s.id, label: s.sectionName })) || [], [Sections]
  );

  const ExamCodeOptions = useMemo(() => 
    ExamCode?.data?.data?.map(c => ({ value: c.id, label: c.code })) || [], [ExamCode]
  );

  const years = Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => ({
    value: (2000 + i).toString(),
    label: (2000 + i).toString(),
  }));

  // 👈 ضفنا دالة handleOCR
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
        "Text extracted successfully"
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

  // --- تعريف الحقول (Fields) بنفس منطق صفحة الإضافة ---
  const fields = useMemo(() => [
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
      options: [{ value: "Extra", label: "Extra" }, { value: "Trail", label: "Trail" }, { value: "Parallel", label: "Parallel" }],
      required: true,
      section: "General Information",
    },
    {
      name: "difficulty",
      label: "Difficulty",
      type: "select",
      options: ["A", "B", "C", "D", "E"].map(d => ({ value: d, label: d })),
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
      required: true,
      section: "General Information",
    },
    {
      name: "year",
      label: "Year",
      type: "select",
      options: years,
      required: true,
      section: "General Information",
    },
    {
      name: "month",
      label: "Month",
      type: "select",
      options: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => ({ value: m, label: m })),
      required: true,
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
        const letters = Array.from({ length: formData.options?.length || 4 }, (_, i) => String.fromCharCode(65 + i));
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

    {
      name: "answerPdf",
      label: "Answer PDF URL",
      type: "text",
      section: "Solution Media",
    },
    {
      name: "answerVideo",
      label: "Answer Video URL",
      type: "text",
      section: "Solution Media",
    },
    
    // 👈 غيرنا الحقل للنوع الجديد fileWithOCR
  
  // 👈 متنساش إن ocrLoading متضافة هنا
  ], [LessonsOptions, SectionsOptions, ExamCodeOptions, years, ocrLoading]);

  // --- تحويل البيانات القادمة من API لشكل الفورم ---
  const initialData = useMemo(() => {
    if (!questionRes?.data?.data) return {};
    const q = questionRes.data.data;
    
    // تقسيم الإجابات بناءً على النوع
    const isGridIn = q.answerType === "Grid in";
    const options = !isGridIn ? q.options?.map((opt) => opt.answer) || ["", "", "", ""] : ["", "", "", ""];
    const gridInAnswers = isGridIn ? q.options?.map((opt) => opt.answer) || [""] : [""];
    const correctOption = !isGridIn ? q.options?.find((opt) => opt.isCorrect)?.order || "" : "";

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
      answerPdf: q.pdf || "",
      answerVideo: q.video || "",
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

    // تجهيز الـ Options بناءً على النوع
    let finalOptions = [];
    if (formData.answerType === "MCQ") {
      finalOptions = (formData.options || []).map((ans, index) => ({
        answer: ans?.trim(),
        isCorrect: formData.correctOption === String.fromCharCode(65 + index),
        order: String.fromCharCode(65 + index),
      })).filter(opt => opt.answer);
    } else {
      finalOptions = (formData.gridInAnswers || []).filter(ans => ans.trim() !== "").map(ans => ({
        answer: ans.trim(),
        isCorrect: true,
        order: null
      }));
    }

    const payload = {
      ...formData,
      year: Number(formData.year),
      image: imageBase64,
      options: finalOptions,
    };

    // تنظيف الـ payload من الحقول المؤقتة
    delete payload.gridInAnswers;
    delete payload.correctOption;

    try {
      await putData(payload, `/api/admin/questions/${id}`, "Question updated successfully");
      navigate(-1);
    } catch (error) {
      console.error(error);
    }
  };

  if (loadingQuestion || loadingLessons || loadingSections || loadingExamCode) return <Loader />;
  if (errorQuestion || errorLessons || errorSections || errorExamCode) return <Errorpage />;

  return (
    <AddPage
      title="Edit Question"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialData}
    />
  );
};

export default EditQuestions;