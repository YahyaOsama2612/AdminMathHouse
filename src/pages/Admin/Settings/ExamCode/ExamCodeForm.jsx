import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Field, FormPage, FormSection, Preview, inpCls, requiredErrors } from "../settingsKit";

const LIST = "/admin/settings/examcode";

/** Add / edit exam code page (design: one field, live preview chip). */
export default function ExamCodeForm({ isNew, initial, onSave }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(initial.code || "");
  const [errors, setErrors] = useState({});

  const submit = async () => {
    const errs = requiredErrors({ code }, ["code"]);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave({ code });
  };

  return (
    <FormPage
      backLabel="Exam Codes"
      onLeave={() => navigate(LIST)}
      dirty={code !== (initial.code || "")}
      title={isNew ? "Add Exam Code" : `Edit ${initial.code || "exam code"}`}
      saveLabel={isNew ? "Add exam code" : "Save changes"}
      onSubmit={submit}
    >
      <FormSection title="General information" sub="The code labels exams and questions.">
        <Field label="Exam code" required error={errors.code} hint="e.g. NATIONAL 1, US-D, V4" className="md:col-span-2">
          <input
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errors.code) setErrors({});
            }}
            placeholder="Enter exam code (e.g. NATIONAL 1)"
            className={`${inpCls(errors.code)} font-mono`}
          />
        </Field>
        <Preview className="md:col-span-2">
          <span className="inline-flex font-mono font-bold text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-1 break-all">
            {code.trim() || "CODE"}
          </span>
        </Preview>
      </FormSection>
    </FormPage>
  );
}
