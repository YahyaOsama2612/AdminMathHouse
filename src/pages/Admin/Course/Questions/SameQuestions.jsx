import React, { useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import toast from "react-hot-toast";
import TipTapMathEditor from "../../../../components/TipTapMathEditor";

const SameQuestions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const lessonId = location.state?.lessonId;

  const { postData } = usePost("/api/admin/questions");
  
  // 👈 ضفنا الـ API وحالة التحميل الخاصة بالـ OCR
  const { postData: postDataimage } = usePost("/api/admin/questions/ocr");
  const [ocrLoading, setOcrLoading] = useState(false);

  // جلب بيانات السؤال المراد نسخه
  const {
    data: questionRes,
    loading: loadingQuestion,
    error: errorQuestion,
  } = useGet(`/api/admin/questions/${id}`);

  // جلب خيارات القوائم
  const { data: Sections, loading: loadingSections ,error : errorSections } = useGet("/api/admin/sections/selectionSections");
  const { data: ExamCode, loading: loadingExamCode  ,error : errorExamCode} = useGet("/api/admin/questions/selectionExamCode");

  const SectionsOptions = useMemo(() => 
    Sections?.data?.sections?.map((s) => ({ value: s.id, label: s.sectionName })) || [], [Sections]
  );

  const ExamCodeOptions = useMemo(() => 
    ExamCode?.data?.data?.map((code) => ({ value: code.id, label: code.code })) || [], [ExamCode]
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
        { value: "MCQ", label: "MCQ" },
        { value: "Grid in", label: "Grid in" },
      ],
      required: true,
      section: "General Information",
    },
    {
      name: "questionType",
      label: "Question Type",
      type: "select",
      options: [{ value: "Extra", label: "Extra" }, { value: "Trail", label: "Trail" }],
      required: true,
      section: "General Information",
    },
    {
      name: "month",
      label: "Month",
      type: "select",
      options: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => ({ value: m, label: m })),
      required: true,
      section: "General Information",
    },
    {
      name: "difficulty",
      label: "Difficulty",
      type: "select",
      options: ["A","B","C","D","E"].map(d => ({ value: d, label: d })),
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
      name: "codeId",
      label: "Code",
      type: "select",
      options: ExamCodeOptions,
      required: true,
      section: "General Information",
    },

    // --- MCQ Logic ---
    {
      name: "options",
      label: "MCQ Options",
      type: "dynamic-list",
      required: true,
      section: "Answers",
      hidden: (formData) => formData.answerType === "Grid in",
      fullWidth: true,
    },
    {
      name: "correctOption",
      label: "Correct Option Letter",
      type: "custom",
      required: true,
      section: "Answers",
      hidden: (formData) => formData.answerType === "Grid in",
      render: ({ value, onChange, formData }) => {
        const count = formData.options?.length || 4;
        const letters = Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
        return (
          <div className="flex gap-3 flex-wrap">
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onChange(l)}
                className={`w-12 h-12 rounded-xl border-2 font-bold transition-all
                  ${value === l ? "bg-one text-white border-one shadow-md" : "bg-white text-slate-500 border-slate-200"}`}
              >
                {l}
              </button>
            ))}
          </div>
        );
      },
    },

    // --- Grid in Logic ---
    {
      name: "gridInAnswers",
      label: "Accepted Grid-in Answers",
      type: "dynamic-list",
      required: true,
      section: "Answers",
      hidden: (formData) => formData.answerType === "MCQ",
      fullWidth: true,
    },

    {
      name: "answerPdf",
      label: "Answer PDF URL",
      type: "text",
      section: "Resources",
    },
    {
      name: "answerVideo",
      label: "Answer Video URL",
      type: "text",
      section: "Resources",
    },
    
    // 👈 التعديل هنا لدمج الصورة مع زرار الـ OCR
   
  // 👈 متنساش ocrLoading في مصفوفة الاعتمادات هنا
  ], [SectionsOptions, ExamCodeOptions, years, ocrLoading]);

  // تجهيز البيانات الافتراضية من السؤال الأصلي
  const initialData = useMemo(() => {
    if (!questionRes?.data?.data) return {};
    const q = questionRes.data.data;

    const isGridIn = q.answerType === "Grid in";
    const options = !isGridIn ? q.options?.map((o) => o.answer) || ["", "", "", ""] : ["", "", "", ""];
    const gridInAnswers = isGridIn ? q.options?.map((o) => o.answer) || [""] : [""];
    const correctOption = !isGridIn ? q.options?.find((o) => o.isCorrect)?.order || "" : "";

    return {
      question: q.question || "",
      image:  "",
      answerType: q.answerType || "MCQ",
      questionType: q.questionType || "",
      month: q.month || "",
      difficulty: q.difficulty || "",
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

    let finalOptions = [];
    if (formData.answerType === "MCQ") {
      finalOptions = (formData.options || []).map((ans, index) => ({
        answer: ans?.trim(),
        isCorrect: formData.correctOption === String.fromCharCode(65 + index),
        order: String.fromCharCode(65 + index),
      })).filter(o => o.answer);
      
      if (finalOptions.length < 2 || !formData.correctOption) {
        return toast.error("Please complete MCQ options and select the correct answer");
      }
    } else {
      finalOptions = (formData.gridInAnswers || []).filter(ans => ans.trim() !== "").map(ans => ({
        answer: ans.trim(),
        isCorrect: true,
        order: null
      }));

      if (finalOptions.length === 0) {
        return toast.error("Please add at least one accepted answer for Grid-in");
      }
    }

    const payload = {
      ...formData,
      lessonId: lessonId,
      year: Number(formData.year),
      options: finalOptions,
      image: imageBase64,
    };

    delete payload.gridInAnswers;
    delete payload.correctOption;

    try {
      await postData(payload, "/api/admin/questions", "Question duplicated successfully");
      navigate(-1);
    } catch (error) {
      console.error(error);
    }
  };

  if (loadingQuestion || loadingSections || loadingExamCode) return <Loader />;
  if (errorQuestion || errorSections || errorExamCode) return <Errorpage />;

  return (
    <AddPage
      title="Duplicate Question"
      fields={fields}
      initialData={initialData}
      onSave={onSave}
      onCancel={() => navigate(-1)}
    />
  );
};

export default SameQuestions;