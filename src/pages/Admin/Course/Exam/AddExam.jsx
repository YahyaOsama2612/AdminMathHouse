import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import QuestionsTableSelect from "@/components/QuestionsTableSelect";

const AddExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = location.state?.courseId;
  const { postData, loading: saving } = usePost("/api/admin/exams");

  const { data: optionsRes, loading } = useGet(
    "/api/admin/exams/selection-options",
  );

  const options = optionsRes?.data?.data;
  const startYear = 2000;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => {
    const y = startYear + i;
    return { value: y.toString(), label: y.toString() };
  });

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
        label: "Duration (Minutes / Hours)",
        type: "number",
        required: true,
        placeholder: "e.g., 60 for 1 hour",
        section: "General Information",
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
        required: false, // تم إلغاء الإجبارية هنا
        section: "General Information",
      },
      {
        name: "month",
        label: "Month (Optional)",
        type: "select",
        options: [
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
        required: false, // تم إلغاء الإجبارية هنا
        section: "General Information",
      },
      {
        name: "codeId",
        label: "Exam Code",
        type: "select",
        required: true,
        options:
          options?.examCodes?.map((c) => ({
            label: c.code,
            value: c.id,
          })) || [],
        section: "General Information",
      },
      {
        name: "rawScoreId",
        label: "Raw Score",
        type: "select",
        required: true,
        options:
          options?.rawScores?.map((r) => ({
            label: r.score,
            value: r.id,
          })) || [],
        section: "General Information",
      },
      {
        name: "sections",
        label: "Sections",
        fullWidth: true,
        required: true,
        type: "custom",
        section: "Sections",
        render: ({ value, onChange }) => (
          <div className="bg-white p-6 rounded-2xl shadow border space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Sections</h2>
              <button
                type="button"
                onClick={() =>
                  onChange([
                    ...(value || []),
                    {
                      sectionId: "",
                      sectionOrder: (value?.length || 0) + 1,
                      questionIds: [],
                    },
                  ])
                }
                className="px-4 py-2 bg-one text-white rounded-lg"
              >
                + Add Section
              </button>
            </div>

            {(value || []).map((section, index) => (
              <div
                key={index}
                className="border rounded-xl p-4 space-y-4 bg-slate-50"
              >
                <div className="flex justify-between items-center">
                  <select
                    value={section.sectionId}
                    onChange={(e) => {
                      const newSections = [...value];
                      newSections[index].sectionId = e.target.value;
                      onChange(newSections);
                    }}
                    className="p-2 border rounded-lg"
                  >
                    <option value="">Select Section</option>
                    {options?.sections?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sectionName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const newSections = value.filter((_, i) => i !== index);
                      onChange(newSections);
                    }}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <QuestionsTableSelect
                  value={section.questionIds}
                  name="section"
                  lessonId={section.sectionId}
                  onChange={(ids) => {
                    const newSections = [...value];
                    newSections[index].questionIds = ids;
                    onChange(newSections);
                  }}
                />
              </div>
            ))}
          </div>
        ),
      },
    ],
    [options, years],
  );

  const onSave = async (formData) => {
    const invalidSections = (formData.sections || []).filter(
      (s) => !s.sectionId || s.questionIds.length === 0,
    );

    if (invalidSections.length > 0) {
      toast.error(
        "Please complete all sections and add at least one question in each.",
      );
      return;
    }

    const payload = {
      ...formData,
      duration: Number(formData.duration),
      totalScore: Number(formData.totalScore),
      passScore: Number(formData.passScore),
      // إرسال السنة كـ Number فقط لو تم اختيارها، عدا ذلك نرسلها null أو نتركها فارغة لتجنب الـ NaN
      year: formData.year ? Number(formData.year) : null,
      month: formData.month || null,
      courseId: courseId,
      sections: formData.sections || [],
    };

    try {
      await postData(payload, "/api/admin/exams", "Exam created successfully");
      navigate(`/admin/course/exams/${courseId}`);
    } catch (e) {
      throw e;
    }
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
          duration: "",
          totalScore: "",
          passScore: "",
          year: "",
          month: "",
          codeId: "",
          rawScoreId: "",
          sections: [],
        }}
      />
    </div>
  );
};

export default AddExam;
