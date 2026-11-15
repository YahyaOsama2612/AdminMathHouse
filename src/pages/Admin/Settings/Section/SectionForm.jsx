import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Field, FormPage, FormSection, inpCls, requiredErrors } from "../settingsKit";

const LIST = "/admin/settings/section";
const QUICK = [30, 45, 60, 90];

/** Add / edit section (design: name, time with quick picks, description). */
export default function SectionForm({ isNew, initial, onSave }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (val) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const submit = async () => {
    const errs = requiredErrors(v, ["sectionName", "sectionDescription", "sectionTime"]);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave(v);
  };

  return (
    <FormPage
      backLabel="Sections"
      onLeave={() => navigate(LIST)}
      dirty={JSON.stringify(v) !== JSON.stringify(initial)}
      title={isNew ? "Add Section" : `Edit ${initial.sectionName || "section"}`}
      saveLabel={isNew ? "Add section" : "Save changes"}
      onSubmit={submit}
    >
      <FormSection title="General information" sub="A section is a timed part of an exam.">
        <Field label="Section name" required error={errors.sectionName}>
          <input autoFocus value={v.sectionName} onChange={(e) => set("sectionName")(e.target.value)} placeholder="Enter section name" className={inpCls(errors.sectionName)} />
        </Field>
        <Field label="Section time (minutes)" required error={errors.sectionTime} hint="Time in minutes for the whole section">
          <input type="number" min={1} value={v.sectionTime} onChange={(e) => set("sectionTime")(e.target.value)} placeholder="Enter time in minutes" className={inpCls(errors.sectionTime)} />
          <span className="flex flex-wrap gap-1.5 mt-2">
            {QUICK.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("sectionTime")(String(m))}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${String(v.sectionTime) === String(m) ? "border-one text-one bg-red-50/50" : "border-gray-200 text-gray-600 hover:border-one hover:text-one"}`}
              >
                {m}
              </button>
            ))}
          </span>
        </Field>
        <Field label="Section description" required error={errors.sectionDescription} className="md:col-span-2">
          <input value={v.sectionDescription} onChange={(e) => set("sectionDescription")(e.target.value)} placeholder="Enter section description, e.g. Math Section 1" className={inpCls(errors.sectionDescription)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
