import React, { useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import QuestionsTableSelect from "@/components/QuestionsTableSelect";

const EditExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { putData, loading: saving } = usePut(`/api/admin/exams/${id}`);

  // Fetch exam
  const {
    data: examRes,
    loading: loadingExam,
    error: errorExam,
  } = useGet(`/api/admin/exams/${id}`);

  // Fetch selection options
  const {
    data: optionsRes,
    loading: loadingOptions,
    error: errorOptions,
  } = useGet(`/api/admin/exams/selection-options`);

  const options = optionsRes?.data?.data;

  const currentYear = new Date().getFullYear();
  const startYear = 2000;
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
        required: false, // إلغاء الإجبارية هنا
        section: "General Information",
      },
      {
        name: "month",
        label: "Month (Optional)",
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
        required: false, // إلغاء الإجبارية هنا
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
          options?.calculatorTypes?.map((c) => ({
            label: c,
            value: c,
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
        render: ({ value, onChange, formData, setFieldValue }) => {
          // Calculate total duration
          const totalDuration = (value || []).reduce((sum, s) => {
            return sum + (Number(s.duration) || 0);
          }, 0);

          // Sync duration field whenever sections change
          useEffect(() => {
            if (setFieldValue) {
              // Use setFieldValue if provided by AddPage
              setFieldValue("duration", totalDuration);
            } else if (formData) {
              // Fallback: update formData directly
              formData.duration = totalDuration;
            }
          }, [totalDuration, setFieldValue, formData]);

          return (
            <div className="bg-white p-6 rounded-2xl shadow border space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Sections</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Total Duration: {totalDuration} minutes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange([
                      ...(value || []),
                      {
                        sectionId: "",
                        sectionOrder: (value?.length || 0) + 1,
                        duration: null,
                        breakLimited: false,
                        maxBreakDuration: null,
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
                  <div className="flex justify-between items-center mb-4">
                    <select
                      value={section.sectionId}
                      onChange={(e) => {
                        const newSections = [...value];
                        newSections[index].sectionId = e.target.value;
                        onChange(newSections);
                      }}
                      className="flex-1 p-2 border rounded-lg"
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
                      className="text-red-500 text-sm ml-2"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Section Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        value={section.duration || ""}
                        onChange={(e) => {
                          const newSections = [...value];
                          newSections[index].duration = e.target.value
                            ? Number(e.target.value)
                            : null;
                          onChange(newSections);
                        }}
                        placeholder="e.g., 30"
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    {/* Break Limited Checkbox */}
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={section.breakLimited || false}
                          onChange={(e) => {
                            const newSections = [...value];
                            newSections[index].breakLimited = e.target.checked;
                            // If unchecked, clear maxBreakDuration
                            if (!e.target.checked) {
                              newSections[index].maxBreakDuration = null;
                            }
                            onChange(newSections);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">
                          Limit Break Duration
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Max Break Duration - only shown if breakLimited = true */}
                  {section.breakLimited && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Break Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        value={section.maxBreakDuration || ""}
                        onChange={(e) => {
                          const newSections = [...value];
                          newSections[index].maxBreakDuration = e.target.value
                            ? Number(e.target.value)
                            : null;
                          onChange(newSections);
                        }}
                        placeholder="e.g., 10"
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  )}

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
          );
        },
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
      parsedCalculators = [];
    }
    return {
      examType: exam.examType || "",
      title: exam.title || "",
      description: exam.description || "",
      duration: exam.duration || "",
      totalScore: exam.totalScore || "",
      passScore: exam.passScore || "",
      year: exam.year ? exam.year.toString() : "",
      month: exam.Month || exam.month || "",
      codeId: exam.codeId || "",
      rawScoreId: exam.rawScoreId || "",
      calculators: parsedCalculators,
      sections:
        exam.sections?.map((s) => ({
          sectionId: s.sectionId,
          sectionOrder: s.sectionOrder,
          // Use duration if available, fallback to durationOverride, then effectiveDuration
          duration:
            s.duration || s.durationOverride || s.effectiveDuration || null,
          breakLimited: s.breakLimited || false,
          maxBreakDuration: s.maxBreakDuration || null,
          // Extract question IDs from questions array
          questionIds:
            (s.questions || []).map((q) => q.questionId || q.id) || [],
        })) || [],
    };
  }, [examRes]);

  const onSave = async (formData) => {
    const invalidSections = (formData.sections || []).filter(
      (s) => !s.sectionId || s.questionIds.length === 0 || !s.duration,
    );

    if (invalidSections.length > 0) {
      toast.error(
        "Please complete all sections, add a duration to each, and at least one question in each.",
      );
      return;
    }

    // Check if maxBreakDuration is provided when breakLimited = true
    const invalidBreaks = (formData.sections || []).filter(
      (s) => s.breakLimited && !s.maxBreakDuration,
    );

    if (invalidBreaks.length > 0) {
      toast.error(
        "Please provide a max break duration for sections with break limits enabled.",
      );
      return;
    }

    // Calculate total duration from sections
    const totalDuration = (formData.sections || []).reduce((sum, s) => {
      return sum + (Number(s.duration) || 0);
    }, 0);

    const payload = {
      ...formData,
      duration: totalDuration,
      totalScore: Number(formData.totalScore),
      passScore: Number(formData.passScore),
      year: formData.year ? Number(formData.year) : null,
      month: formData.month || null,
      calculators: formData.calculators,
      sections: (formData.sections || []).map((s) => ({
        sectionId: s.sectionId,
        sectionOrder: s.sectionOrder,
        duration: s.duration ? Number(s.duration) : null,
        breakLimited: s.breakLimited || false,
        maxBreakDuration: s.breakLimited
          ? s.maxBreakDuration
            ? Number(s.maxBreakDuration)
            : null
          : null,
        questionIds: s.questionIds || [],
      })),
    };

    try {
      await putData(
        payload,
        `/api/admin/exams/${id}`,
        "Exam updated successfully",
      );
      navigate(-1);
    } catch (e) {
      throw e;
    }
  };

  if (loadingExam || loadingOptions) return <Loader />;
  if (errorExam || errorOptions) return <Errorpage />;

  return (
    <AddPage
      title="Edit Exam"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialData}
    />
  );
};

export default EditExam;
