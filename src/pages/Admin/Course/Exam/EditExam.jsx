import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SectionsEditor, { sumDurations } from "./Sectionseditor";
import PdfUploadField, {
  pdfUploadPayload,
} from "@/components/PdfUploadField";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
].map((m) => ({ value: m, label: m }));

const EditExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { putData, loading: saving } = usePut(`/api/admin/exams/${id}`);

  const {
    data: examRes,
    loading: loadingExam,
    error: errorExam,
  } = useGet(`/api/admin/exams/${id}`);

  const {
    data: optionsRes,
    loading: loadingOptions,
    error: errorOptions,
  } = useGet(`/api/admin/exams/selection-options`);

  const options = optionsRes?.data?.data;

  // ✅ memoized: قبل كده كانت بتتعمل من جديد كل render فالـ fields كلها تتعمل من جديد
  const years = useMemo(() => {
    const startYear = 2000;
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - startYear + 1 }, (_, i) => {
      const y = (startYear + i).toString();
      return { value: y, label: y };
    });
  }, []);

  const fields = useMemo(
    () => [
      {
        name: "examType",
        label: "Exam Type",
        type: "select",
        required: true,
        options: [
          { label: "Static", value: "static" },
          { label: "Adaptive", value: "adaptive" },
          { label: "Extra", value: "extra" },
          { label: "Trail", value: "trail" },
        ],
        section: "General Information",
      },
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "description",
        label: "Description",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "duration",
        label: "Total Duration (Minutes)",
        type: "number",
        required: true,
        disabled: true,
        readOnly: true,
        section: "General Information",
        help: "Automatically calculated from the sum of all section durations",
      },
      {
        name: "totalScore",
        label: "Total Score",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "passScore",
        label: "Pass Score",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "year",
        label: "Year (Optional)",
        type: "select",
        options: years,
        required: false,
        section: "General Information",
      },
      {
        name: "month",
        label: "Month (Optional)",
        type: "select",
        options: MONTHS,
        required: false,
        section: "General Information",
      },
      {
        name: "codeId",
        label: "Exam Code",
        type: "select",
        required: true,
        options:
          options?.examCodes?.map((c) => ({ label: c.code, value: c.id })) ||
          [],
        section: "General Information",
      },
      {
        name: "rawScoreId",
        label: "Raw Score",
        type: "select",
        required: true,
        options:
          options?.rawScores?.map((r) => ({ label: r.score, value: r.id })) ||
          [],
        section: "General Information",
      },
      {
        name: "calculators",
        label: "Calculator Types",
        type: "multipleSelect",
        required: true,
        options:
          options?.calculatorTypes?.map((c) => ({ label: c, value: c })) || [],
        section: "General Information",
      },
      {
        name: "session_pdf",
        label: "Session PDF",
        type: "custom",
        fullWidth: true,
        render: ({ value, onChange }) => (
          <PdfUploadField value={value} onChange={onChange} />
        ),
      },
      {
        name: "session_answers_pdf",
        label: "Session Answers PDF",
        type: "custom",
        fullWidth: true,
        render: ({ value, onChange }) => (
          <PdfUploadField value={value} onChange={onChange} />
        ),
      },
      {
        name: "sections",
        label: "Sections",
        fullWidth: true,
        required: true,
        type: "custom",
        section: "Sections",
        // ✅ بنرجّع component ثابت بدل ما نكتب hooks جوه الـ render function
        render: (props) => (
          <SectionsEditor {...props} sectionOptions={options?.sections || []} />
        ),
      },
    ],
    [options, years],
  );

  const initialData = useMemo(() => {
    if (!examRes?.data?.data) return {};
    const exam = examRes.data.data;

    let parsedCalculators = [];
    try {
      if (typeof exam.calculators === "string") {
        parsedCalculators = JSON.parse(exam.calculators);
      } else if (Array.isArray(exam.calculators)) {
        parsedCalculators = exam.calculators;
      }
    } catch (e) {
      console.error("Error parsing calculators:", e);
    }

    const sections =
      exam.sections?.map((s) => {
        const rawDuration =
          s.duration ?? s.durationOverride ?? s.effectiveDuration ?? null;
        return {
          sectionId: s.sectionId,
          sectionOrder: s.sectionOrder,
          // ✅ تحويل لرقم عشان لو الـ API رجّعها string مايحصلش concatenation
          duration: rawDuration === null ? null : Number(rawDuration),
          breakLimited: !!s.breakLimited,
          maxBreakDuration:
            s.maxBreakDuration == null ? null : Number(s.maxBreakDuration),
          questionIds: (s.questions || []).map((q) => q.questionId || q.id),
        };
      }) || [];

    return {
      examType: exam.examType || "",
      title: exam.title || "",
      description: exam.description || "",
      duration: sumDurations(sections),
      totalScore: exam.totalScore ?? "",
      passScore: exam.passScore ?? "",
      year: exam.year ? exam.year.toString() : "",
      month: exam.Month || exam.month || "",
      codeId: exam.codeId || "",
      rawScoreId: exam.rawScoreId || "",
      calculators: parsedCalculators,
      session_pdf: exam.session_pdf ? { url: exam.session_pdf } : null,
      session_answers_pdf: exam.session_answers_pdf
        ? { url: exam.session_answers_pdf }
        : null,
      sections,
    };
  }, [examRes]);

  const onSave = async (formData) => {
    const sections = formData.sections || [];

    const invalidSections = sections.filter(
      (s) =>
        !s.sectionId ||
        (s.questionIds || []).length === 0 ||
        !(Number(s.duration) > 0),
    );

    if (invalidSections.length > 0) {
      toast.error(
        "Please complete all sections, add a duration to each, and at least one question in each.",
      );
      return;
    }

    const invalidBreaks = sections.filter(
      (s) => s.breakLimited && !(Number(s.maxBreakDuration) > 0),
    );

    if (invalidBreaks.length > 0) {
      toast.error(
        "Please provide a max break duration for sections with break limits enabled.",
      );
      return;
    }

    const payload = {
      ...formData,
      session_pdf: pdfUploadPayload(formData.session_pdf),
      session_answers_pdf: pdfUploadPayload(formData.session_answers_pdf),
      duration: sumDurations(sections),
      totalScore: Number(formData.totalScore),
      passScore: Number(formData.passScore),
      year: formData.year ? Number(formData.year) : null,
      month: formData.month || null,
      calculators: formData.calculators,
      sections: sections.map((s, i) => ({
        sectionId: s.sectionId,
        sectionOrder: i + 1,
        duration: Number(s.duration),
        breakLimited: !!s.breakLimited,
        maxBreakDuration: s.breakLimited ? Number(s.maxBreakDuration) : null,
        questionIds: s.questionIds || [],
      })),
    };

    await putData(payload, `/api/admin/exams/${id}`, "Exam updated successfully");
    navigate(-1);
  };

  if (loadingExam || loadingOptions) return <Loader />;
  if (errorExam || errorOptions) return <Errorpage />;

  return (
    <AddPage
      key={examRes?.data?.data?.id || "loading"}
      title="Edit Exam"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialData}
    />
  );
};

export default EditExam;