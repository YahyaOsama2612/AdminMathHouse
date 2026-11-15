import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Field, FormPage, FormSection, Preview, Switch, inpCls, requiredErrors } from "../settingsKit";

const LIST = "/admin/settings/rating-questions";
const CATEGORIES = [
  { value: "academic", label: "Academic", hint: "Content, explanation, materials" },
  { value: "behavioral", label: "Behavioral", hint: "Teacher conduct, interaction" },
  { value: "general", label: "General", hint: "Anything else about the session" },
];

/** Add / edit rating question (values: title, description, category, order, isActive "true"/"false"). */
export default function RatingQuestionForm({ isNew, initial, onSave }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (val) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const submit = async () => {
    const errs = requiredErrors(v, ["title", "category", "order", "isActive"]);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave(v);
  };

  return (
    <FormPage
      backLabel="Rating questions"
      onLeave={() => navigate(LIST)}
      dirty={JSON.stringify(v) !== JSON.stringify(initial)}
      title={isNew ? "Add Rating Question" : "Edit Rating Question"}
      saveLabel={isNew ? "Add question" : "Save changes"}
      onSubmit={submit}
    >
      <FormSection title="Question details" sub="Active questions are asked when a student rates a session, in display order.">
        <Field label="Question title" required error={errors.title} className="md:col-span-2">
          <input autoFocus value={v.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. How well was the session content organized?" className={inpCls(errors.title)} />
        </Field>
        <Field label="Description" optional className="md:col-span-2">
          <input value={v.description} onChange={(e) => set("description")(e.target.value)} placeholder="e.g. Evaluate the flow and materials provided" className="a-inp" />
        </Field>
        <Field label="Category" required error={errors.category} className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup">
            {CATEGORIES.map((c) => {
              const on = v.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("category")(c.value)}
                  className={`text-left rounded-xl border-2 px-3 py-2.5 ${on ? "border-one bg-red-50/50" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <span className={`block text-sm font-bold ${on ? "text-one" : "text-gray-700"}`}>{c.label}</span>
                  <span className="block text-[11px] text-gray-400">{c.hint}</span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Display order" required error={errors.order} hint="Controls the display order of this question">
          <input type="number" min={1} value={v.order} onChange={(e) => set("order")(e.target.value)} placeholder="e.g. 1" className={inpCls(errors.order)} />
        </Field>
        <Field label="Active">
          <Switch on={v.isActive === "true"} onChange={(on) => set("isActive")(on ? "true" : "false")} label={v.isActive === "true" ? "Yes — asked to students" : "No — hidden"} />
        </Field>
        <Preview className="md:col-span-2">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-red-50 text-one flex items-center justify-center font-extrabold text-sm shrink-0">{v.order || "#"}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 break-words">{v.title.trim() || "Question title"}</p>
              {v.description.trim() && <p className="text-xs text-gray-500 break-words">{v.description}</p>}
              <p className="text-[11px] text-gray-400 mt-1">
                {CATEGORIES.find((c) => c.value === v.category)?.label || "No category"} · {v.isActive === "true" ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </Preview>
      </FormSection>
    </FormPage>
  );
}
