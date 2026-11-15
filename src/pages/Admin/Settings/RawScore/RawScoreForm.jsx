import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { Field, FormPage, FormSection, Preview, SELECT_STYLES, Segmented, inpCls, requiredErrors } from "../settingsKit";

const LIST = "/admin/settings/rawscore";

/** Add / edit raw score rule (design: gifting Yes/No, live preview of gifted vs earned points). */
export default function RawScoreForm({ isNew, initial, courseOptions, onSave }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (val) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const submit = async () => {
    const need = ["name", "courseId", "score", "questionsCount"];
    if (v.is_giftingScore) need.push("giftingScore");
    const errs = requiredErrors(v, need);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave(v);
  };

  const score = Number(v.score) || 0;
  const gift = v.is_giftingScore ? Number(v.giftingScore) || 0 : 0;
  const pct = score > 0 && gift > 0 ? Math.min(100, Math.round((gift / score) * 100)) : 0;
  const courseLabel = courseOptions.find((o) => String(o.value) === String(v.courseId))?.label;

  return (
    <FormPage
      backLabel="Raw Scores"
      onLeave={() => navigate(LIST)}
      dirty={JSON.stringify(v) !== JSON.stringify(initial)}
      title={isNew ? "Add Raw Score" : `Edit ${initial.name || "raw score"}`}
      saveLabel={isNew ? "Add raw score" : "Save changes"}
      onSubmit={submit}
    >
      <FormSection title="General information" sub="Maximum score of the course and the gifted points every student starts with.">
        <Field label="Rule name" required error={errors.name}>
          <input autoFocus value={v.name} onChange={(e) => set("name")(e.target.value)} placeholder="Enter raw score rule name" className={inpCls(errors.name)} />
        </Field>
        <Field label="Course" required error={errors.courseId}>
          <Select
            styles={SELECT_STYLES}
            options={courseOptions}
            value={courseOptions.find((o) => String(o.value) === String(v.courseId)) || null}
            onChange={(o) => set("courseId")(o ? o.value : "")}
            placeholder="Select…"
          />
        </Field>
        <Field label="Max score" required error={errors.score}>
          <input type="number" min={0} value={v.score} onChange={(e) => set("score")(e.target.value)} placeholder="Enter total score (e.g. 100)" className={inpCls(errors.score)} />
        </Field>
        <Field label="Questions count" required error={errors.questionsCount}>
          <input type="number" min={1} value={v.questionsCount} onChange={(e) => set("questionsCount")(e.target.value)} placeholder="Enter number of questions" className={inpCls(errors.questionsCount)} />
        </Field>
        <Field label="Gifting?">
          <Segmented
            value={String(!!v.is_giftingScore)}
            onChange={(val) => set("is_giftingScore")(val === "true")}
            options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
          />
        </Field>
        {v.is_giftingScore && (
          <Field label="Gifting score" required error={errors.giftingScore}>
            <input type="number" min={0} value={v.giftingScore} onChange={(e) => set("giftingScore")(e.target.value)} placeholder="Points every student gets, e.g. 200" className={inpCls(errors.giftingScore)} />
          </Field>
        )}
        <Preview className="md:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{v.name.trim() || "Name"}</p>
              <p className="text-xs text-gray-400 truncate">{courseLabel || "Course"}</p>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{score > 0 ? score.toLocaleString("en-US") : "—"}</p>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden flex mt-3">
            {pct > 0 && <span style={{ width: `${pct}%`, background: "#16a34a" }}></span>}
            <span className="flex-1" style={{ background: "#7d0a0a", opacity: 0.85 }}></span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            {gift > 0 ? `${gift} points gifted · ${Math.max(0, score - gift)} to earn` : "No gifted points — every point is earned"}
            {Number(v.questionsCount) > 0 ? ` · ${v.questionsCount} questions` : ""}
          </p>
        </Preview>
      </FormSection>
    </FormPage>
  );
}
