import React, { useEffect } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import QuestionsTableSelect from "@/components/QuestionsTableSelect";

/**
 * SectionsEditor — the exam's sections inside the Add / Edit Exam form (MathPortal "Sections" look:
 * exam timeline bar on top, then one numbered card per section).
 * A real component (not a render function) so hooks stay legal and inputs keep focus while typing.
 *
 * Props:
 *  - value: sections[]
 *  - onChange: (sections[]) => void
 *  - setFieldValue / setFormData / formData: from AddPage (keeps "duration" in sync)
 *  - sectionOptions: options.sections
 *  - lessonOptions: lessons for the question picker
 */

const SEC_COLORS = ["#7d0a0a", "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#475569"];

// Safe number conversion (no string concatenation / NaN)
const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// Input value: shows 0 instead of hiding it
const inputValue = (v) => (v === null || v === undefined ? "" : v);

// Read an input as a number, or null when empty
const parseInput = (raw) => (raw === "" ? null : Number(raw));

const fmtDur = (m) => {
    const h = Math.floor(m / 60), r = Math.round(m % 60);
    return h ? `${h} h${r ? ` ${r} min` : ""}` : `${r} min`;
};

export const sumDurations = (sections = []) =>
    sections.reduce((sum, s) => sum + toNumber(s.duration), 0);

const SectionsEditor = ({
    value,
    onChange,
    formData,
    setFieldValue,
    setFormData,
    sectionOptions = [],
    lessonOptions = [],
    courseId,
}) => {
    const sections = value || [];
    const totalDuration = sumDurations(sections);

    // Keep duration synchronized in parent form immediately
    const syncDuration = (dur) => {
        if (setFormData) {
            setFormData((prev) =>
                prev.duration === dur ? prev : { ...prev, duration: dur }
            );
        } else if (setFieldValue) {
            setFieldValue("duration", dur);
        } else if (formData) {
            formData.duration = dur;
        }
    };

    // Sync the total into General Information
    useEffect(() => {
        syncDuration(totalDuration);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalDuration]);

    // Immutable update of one section
    const updateSection = (index, patch) => {
        const nextSections = sections.map((s, i) =>
            i === index ? { ...s, ...patch } : s
        );
        const newTotal = sumDurations(nextSections);
        onChange(nextSections);
        syncDuration(newTotal);
    };

    const addSection = () => {
        const nextSections = [
            ...sections,
            {
                sectionId: "",
                sectionOrder: sections.length + 1,
                duration: null,
                lessonId: "",
                breakLimited: false,
                maxBreakDuration: null,
                questionIds: [],
            },
        ];
        const newTotal = sumDurations(nextSections);
        onChange(nextSections);
        syncDuration(newTotal);
    };

    const removeSection = (index) => {
        const nextSections = sections
            .filter((_, i) => i !== index)
            // Renumber sectionOrder after removing
            .map((s, i) => ({ ...s, sectionOrder: i + 1 }));
        const newTotal = sumDurations(nextSections);
        onChange(nextSections);
        syncDuration(newTotal);
    };

    const nameOf = (s, i) =>
        sectionOptions.find((o) => String(o.id) === String(s.sectionId))?.sectionName || `Section ${i + 1}`;
    const timed = sections.map((s, i) => ({ s, i, min: toNumber(s.duration) })).filter((x) => x.min > 0);

    return (
        <div className="space-y-4 min-w-0">
            {/* Exam timeline */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Exam timeline</p>
                        <p className="text-2xl font-extrabold text-gray-900">
                            {fmtDur(totalDuration)}{" "}
                            <span className="text-sm font-semibold text-gray-400">
                                · {sections.length} section{sections.length === 1 ? "" : "s"}
                            </span>
                        </p>
                    </div>
                    <button type="button" onClick={addSection} className="a-btn primary">
                        <Plus size={16} /> Add Section
                    </button>
                </div>
                {timed.length ? (
                    <div className="flex h-11 rounded-xl overflow-hidden gap-0.5">
                        {timed.map(({ s, i, min }) => (
                            <div
                                key={i}
                                className="sec-seg"
                                style={{ flex: min, background: SEC_COLORS[i % SEC_COLORS.length] }}
                                title={`${nameOf(s, i)} · ${min} min`}
                            >
                                <span className="truncate max-w-full">{nameOf(s, i)}</span>
                                <span className="opacity-80">{min}m</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">
                        {sections.length ? "Give each section a duration to see the timeline." : "No sections yet — add the first one."}
                    </p>
                )}
            </div>

            {sections.map((section, index) => (
                <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 space-y-4 min-w-0">
                    <div className="flex items-center gap-3">
                        <span
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
                            style={{ background: SEC_COLORS[index % SEC_COLORS.length] }}
                        >
                            {index + 1}
                        </span>
                        <select
                            value={section.sectionId}
                            onChange={(e) =>
                                updateSection(index, { sectionId: e.target.value })
                            }
                            className="a-inp flex-1 min-w-0"
                            aria-label={`Section ${index + 1}`}
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
                            className="a-act del shrink-0"
                            title="Remove section"
                            aria-label={`Remove section ${index + 1}`}
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Section Duration */}
                        <div>
                            <label className="a-lbl-f">Section duration (minutes)</label>
                            <div className="relative">
                                <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                                    className="a-inp !pl-9"
                                />
                            </div>
                        </div>

                        {/* Break Limited */}
                        <div className="flex items-end">
                            <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-gray-200 px-3 py-2.5 w-full">
                                <input
                                    type="checkbox"
                                    checked={!!section.breakLimited}
                                    onChange={(e) =>
                                        updateSection(index, {
                                            breakLimited: e.target.checked,
                                            ...(e.target.checked ? {} : { maxBreakDuration: null }),
                                        })
                                    }
                                    className="w-4 h-4 accent-[#7d0a0a]"
                                />
                                <span className="text-sm font-semibold text-gray-700">Limit break duration</span>
                            </label>
                        </div>

                        {/* Max Break Duration */}
                        {section.breakLimited && (
                            <div>
                                <label className="a-lbl-f">Max break duration (minutes)</label>
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
                                    className="a-inp"
                                />
                            </div>
                        )}
                    </div>

                    <QuestionsTableSelect
                        value={section.questionIds}
                        name={lessonOptions && lessonOptions.length > 0 ? "lesson" : "section"}
                        // the section id is not a lesson id: with lessons available, no lesson = the whole course
                        lessonId={lessonOptions && lessonOptions.length > 0 ? section.lessonId || "" : section.sectionId}
                        courseId={lessonOptions && lessonOptions.length > 0 ? courseId : undefined}
                        lessons={lessonOptions}
                        onLessonChange={(newLessonId) =>
                            updateSection(index, { lessonId: newLessonId })
                        }
                        onChange={(ids) => updateSection(index, { questionIds: ids })}
                    />
                </div>
            ))}

            {sections.length > 0 && (
                <button
                    type="button"
                    onClick={addSection}
                    className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm font-bold text-gray-500 hover:border-one hover:text-one flex items-center justify-center gap-1.5"
                >
                    <Plus size={16} /> Add another section
                </button>
            )}
        </div>
    );
};

export default SectionsEditor;
