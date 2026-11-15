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
import { AddMethodButton, DrivePickerField, LetterPicker, MethodCard, OcrButton } from "./parts/qb";
import DrivePicker from "../../../../components/Drivepicker";


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
        type: "custom",
        required: false,
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
        required: false,
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
        hidden: (formData) => formData.answerType === "MCQ",
      },

      // --- Solution Media (Drive Pickers) ---
      // كل عنصر في answers بيمثل "طريقة حل" مستقلة (صورة/بي دي إف/فيديو/نص خاص بيها)
      {
        name: "answers",
        label: "Solution Methods",
        type: "custom",
        section: "Solution Media",
        fullWidth: true,
        render: ({ value, onChange, setFormData }) => {
          const methods =
            value && value.length
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
                      value={method.answerImage}
                      allowedTypes={["image"]}
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
                      value={method.answerPdf}
                      allowedTypes={["pdf"]}
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
                      value={method.answerVideo}
                      allowedTypes={["video"]}
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
    [LessonsOptions, SectionsOptions, ExamCodeOptions, years, ocrLoading],
  );

  // Map API response to form shape
  const initialData = useMemo(() => {
    if (!questionRes?.data?.data) return {};
    const q = questionRes.data.data;

    const isGridIn = q.answerType === "Grid in";
    let options = ["", "", "", ""];
    if (!isGridIn) {
      if (q.options && q.options.length > 0) {
        options = q.options.map((opt) => opt.answer);
        while (options.length < 4) {
          options.push("");
        }
      }
    }
    const gridInAnswers = isGridIn
      ? q.options?.map((opt) => opt.answer) || [""]
      : [""];
    const correctOption = !isGridIn
      ? q.options?.find((opt) => opt.isCorrect)?.order || ""
      : "";

    // الأسئلة القديمة كانت بتخزن answerImage/pdf/video/answerText كحقول مفردة،
    // فلو answers مش موجودة أو فاضية بنبني method واحدة منهم عشان التوافق مع البيانات القديمة
    const answers =
      q.answers && q.answers.length
        ? q.answers.map((a) => ({
            answerImage: a.answerImage || "",
            answerPdf: a.answerPdf || "",
            answerVideo: a.answerVideo || "",
            answerText: a.answerText || "",
          }))
        : [
            {
              answerImage: q.answerImage || "",
              answerPdf: q.answerPdf || q.pdf || "",
              answerVideo: q.answerVideo || q.video || "",
              answerText: q.answerText || "",
            },
          ];

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
      answers,
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
    const { gridInAnswers, correctOption, answers, ...rest } = formData;

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
      year: Number(formData.year),
      image: imageBase64,
      options: finalOptions,
      answers: finalAnswers,
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
