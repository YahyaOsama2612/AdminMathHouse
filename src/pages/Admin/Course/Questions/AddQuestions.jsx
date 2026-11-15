
import React, { useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import toast from "react-hot-toast";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import TipTapMathEditor from "../../../../components/TipTapMathEditor";
import { AddMethodButton, DrivePickerField, LetterPicker, MethodCard, OcrButton } from "./parts/qb";
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
          <OcrButton
            onClick={() => handleOCR(formData.image, setFormData)}
            disabled={ocrLoading || !formData.image}
            loading={ocrLoading}
          />
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
        required: false,
        type: "custom",
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
        required: false,
        section: "Answers Configuration",
        hidden: (formData) => formData.answerType === "Grid in",
        helperText:
          "Optional: leave empty to send letters (A, B, C, D) without text.",
      },
      {
        name: "correctOption",
        label: "Mark Correct Letter",
        type: "custom",
        required: true,
        section: "Answers Configuration",
        hidden: (formData) => formData.answerType === "Grid in",
        render: ({ value, onChange, formData }) => {
          const count = Math.max(formData.options?.length || 0, 4);
          const letters = Array.from({ length: count }, (_, i) =>
            String.fromCharCode(65 + i),
          );
          return <LetterPicker letters={letters} value={value} onChange={onChange} />;
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
      // كل عنصر في answers بيمثل "طريقة حل" مستقلة، وكل طريقة ليها صورة/بي دي إف/فيديو/نص خاص بيها
      {
        name: "answers",
        label: "Solution Methods",
        type: "custom",
        section: "Solution Media",
        fullWidth: true,
        render: ({ value, onChange, setFormData }) => {
          const methods =
            Array.isArray(value) && value.length > 0
              ? value
              : [
                  {
                    answerImage: "",
                    answerPdf: "",
                    answerVideo: "",
                    answerText: "",
                  },
                ];

          const updateMethod = (index, patch) => {
            onChange(
              methods.map((m, i) => (i === index ? { ...m, ...patch } : m)),
            );
          };

          const addMethod = () => {
            onChange([
              ...methods,
              {
                answerImage: "",
                answerPdf: "",
                answerVideo: "",
                answerText: "",
              },
            ]);
          };

          const removeMethod = (index) => {
            if (methods.length === 1) return; // لازم يفضل طريقة واحدة على الأقل
            onChange(methods.filter((_, i) => i !== index));
          };

          // pseudo setFormData بيدي الـ DrivePicker شكل الـ setState العادي،
          // بس بيطبق التحديث على عنصر الـ answers بتاع الطريقة دي بس
          const makeMethodSetter = (index) => (updater) => {
            setFormData((prevForm) => {
              const prevAnswers =
                prevForm.answers && prevForm.answers.length
                  ? prevForm.answers
                  : methods;
              const prevItem = prevAnswers[index] || {};
              const nextItem =
                typeof updater === "function" ? updater(prevItem) : updater;
              return {
                ...prevForm,
                answers: prevAnswers.map((m, i) =>
                  i === index ? nextItem : m,
                ),
              };
            });
          };

          return (
            <div className="flex flex-col gap-3 w-full">
              {methods.map((method, index) => (
                <MethodCard
                  key={index}
                  index={index}
                  canRemove={methods.length > 1}
                  onRemove={() => removeMethod(index)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <DrivePickerField
                      label="Answer image"
                      value={method.answerImage}
                      allowedTypes={["image"]}
                      pickerTitle="Select Image"
                      onOpen={() =>
                        openPicker(
                          "answerImage",
                          ["image"],
                          "Select Image",
                          makeMethodSetter(index),
                        )
                      }
                      onClear={() => updateMethod(index, { answerImage: "" })}
                    />
                    <DrivePickerField
                      label="Answer PDF"
                      value={method.answerPdf}
                      allowedTypes={["pdf"]}
                      pickerTitle="Select PDF"
                      onOpen={() =>
                        openPicker(
                          "answerPdf",
                          ["pdf"],
                          "Select PDF",
                          makeMethodSetter(index),
                        )
                      }
                      onClear={() => updateMethod(index, { answerPdf: "" })}
                    />
                    <DrivePickerField
                      label="Answer video"
                      value={method.answerVideo}
                      allowedTypes={["video"]}
                      pickerTitle="Select Video"
                      onOpen={() =>
                        openPicker(
                          "answerVideo",
                          ["video"],
                          "Select Video",
                          makeMethodSetter(index),
                        )
                      }
                      onClear={() => updateMethod(index, { answerVideo: "" })}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                      Explanation
                    </label>
                    <TipTapMathEditor
                      value={method.answerText}
                      onChange={(val) =>
                        updateMethod(index, { answerText: val })
                      }
                    />
                  </div>
                </MethodCard>
              ))}

              <AddMethodButton onClick={addMethod} />
            </div>
          );
        },
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
    answers: [
      { answerImage: "", answerPdf: "", answerVideo: "", answerText: "" },
    ],
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
      if (!formData.correctOption) {
        toast.error("Please mark the correct letter");
        return;
      }
      const count = Math.max(formData.options?.length || 0, 4);
      finalOptions = Array.from({ length: count }, (_, index) => {
        const letter = String.fromCharCode(65 + index);
        const ansText = formData.options?.[index]?.trim();
        return {
          answer: ansText || "",
          order: letter,
          isCorrect: formData.correctOption === letter,
        };
      });
    } else {
      finalOptions = (formData.gridInAnswers || [])
        .filter((ans) => ans.trim() !== "")
        .map((ans) => ({
          answer: ans.trim(),
          isCorrect: true,
          order: null,
        }));

      if (formData.answerType === "Grid in" && finalOptions.length === 0) {
        toast.error("Please add at least one accepted answer for Grid-in");
        return;
      }
    }

    const {
      year,
      month,
      sectionId,
      questionNumber,
      gridInAnswers,
      correctOption,
      options,
      answers,

      ...rest
    } = formData;

    // كل "طريقة حل" تحتوي على media (image/pdf/video) و/أو نص
    const finalAnswers = (answers || [])
      .map((a) => ({
        answerText: a.answerText || null,
        answerImage: a.answerImage || null,
        answerPdf: a.answerPdf || null,
        answerVideo: a.answerVideo || null,
      }))
      .filter(
        (a) => a.answerText || a.answerImage || a.answerPdf || a.answerVideo,
      );

    const payload = {
      ...rest,
      lessonId: lessonId || null,
      options: finalOptions,
      image: imageBase64 || formData.image || null,
      answers: finalAnswers,
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
