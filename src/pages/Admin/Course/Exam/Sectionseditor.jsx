import React, { useEffect } from "react";
import QuestionsTableSelect from "@/components/QuestionsTableSelect";

/**
 * SectionsEditor
 * Component حقيقي (مش render function) عشان:
 *  - الـ hooks تبقى قانونية (Rules of Hooks)
 *  - الـ component identity تفضل ثابتة، فالـ inputs ماتتعملهاش remount
 *    وماتفقدش الـ focus أو الأرقام اللي بتتكتب
 *
 * Props:
 *  - value: sections[]
 *  - onChange: (sections[]) => void
 *  - setFieldValue / formData: من AddPage (لمزامنة الـ duration)
 *  - sectionOptions: options.sections
 */

// تحويل آمن لأي قيمة لرقم (يمنع الـ string concatenation و NaN)
const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// قيمة الـ input: بتعرض الـ 0 عادي بدل ما تختفي (0 || "" كانت بتمسحها)
const inputValue = (v) => (v === null || v === undefined ? "" : v);

// قراءة قيمة الـ input كرقم أو null لو فاضي
const parseInput = (raw) => (raw === "" ? null : Number(raw));

export const sumDurations = (sections = []) =>
    sections.reduce((sum, s) => sum + toNumber(s.duration), 0);

const SectionsEditor = ({
    value,
    onChange,
    formData,
    setFieldValue,
    sectionOptions = [],
}) => {
    const sections = value || [];
    const totalDuration = sumDurations(sections);

    // مزامنة الـ Total Duration في الـ General Information
    useEffect(() => {
        if (setFieldValue) {
            setFieldValue("duration", totalDuration);
        } else if (formData) {
            formData.duration = totalDuration;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalDuration]);

    // Immutable update: نسخة جديدة من الـ section بدل ما نعدّل الـ object القديم
    const updateSection = (index, patch) => {
        onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    };

    const addSection = () => {
        onChange([
            ...sections,
            {
                sectionId: "",
                sectionOrder: sections.length + 1,
                duration: null,
                breakLimited: false,
                maxBreakDuration: null,
                questionIds: [],
            },
        ]);
    };

    const removeSection = (index) => {
        onChange(
            sections
                .filter((_, i) => i !== index)
                // إعادة ترقيم الـ sectionOrder بعد الحذف
                .map((s, i) => ({ ...s, sectionOrder: i + 1 })),
        );
    };

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
                    onClick={addSection}
                    className="px-4 py-2 bg-one text-white rounded-lg"
                >
                    + Add Section
                </button>
            </div>

            {sections.map((section, index) => (
                <div
                    key={index}
                    className="border rounded-xl p-4 space-y-4 bg-slate-50"
                >
                    <div className="flex justify-between items-center mb-4">
                        <select
                            value={section.sectionId}
                            onChange={(e) =>
                                updateSection(index, { sectionId: e.target.value })
                            }
                            className="flex-1 p-2 border rounded-lg"
                        >
                            <option value="">Select Section</option>
                            {sectionOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.sectionName}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => removeSection(index)}
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
                                min={0}
                                value={inputValue(section.duration)}
                                onChange={(e) =>
                                    updateSection(index, {
                                        duration: parseInput(e.target.value),
                                    })
                                }
                                placeholder="e.g., 30"
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>

                        {/* Break Limited Checkbox */}
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!section.breakLimited}
                                    onChange={(e) =>
                                        updateSection(index, {
                                            breakLimited: e.target.checked,
                                            ...(e.target.checked ? {} : { maxBreakDuration: null }),
                                        })
                                    }
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">
                                    Limit Break Duration
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Max Break Duration */}
                    {section.breakLimited && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Break Duration (Minutes)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={inputValue(section.maxBreakDuration)}
                                onChange={(e) =>
                                    updateSection(index, {
                                        maxBreakDuration: parseInput(e.target.value),
                                    })
                                }
                                placeholder="e.g., 10"
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                    )}

                    <QuestionsTableSelect
                        value={section.questionIds}
                        name="section"
                        lessonId={section.sectionId}
                        onChange={(ids) => updateSection(index, { questionIds: ids })}
                    />
                </div>
            ))}
        </div>
    );
};

export default SectionsEditor;