import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast"; // ✅ كان ناقص
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import SectionsEditor, { sumDurations } from "./Sectionseditor";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
].map((m) => ({ value: m, label: m }));

const AddExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = location.state?.courseId;
  const { postData, loading: saving } = usePost("/api/admin/exams");

  const { data: optionsRes, loading } = useGet(
    "/api/admin/exams/selection-options",
  );

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
      duration: sumDurations(sections),
      totalScore: Number(formData.totalScore),
      passScore: Number(formData.passScore),
      year: formData.year ? Number(formData.year) : null,
      month: formData.month || null,
      courseId,
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

    await postData(payload, "/api/admin/exams", "Exam created successfully");
    navigate(`/admin/course/exams/${courseId}`);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      <AddPage
        title="Add Exam"
        fields={fields}
        onSave={onSave}
        onCancel={() => navigate(`/admin/course/exams/${courseId}`)}
        initialData={{
          examType: "",
          title: "",
          description: "",
          duration: 0,
          totalScore: "",
          passScore: "",
          year: "",
          month: "",
          codeId: "",
          rawScoreId: "",
          calculators: [],
          sections: [],
        }}
      />
    </div>
  );
};

export default AddExam;