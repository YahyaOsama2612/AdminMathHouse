import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { Field, FormPage, FormSection, SELECT_STYLES, inpCls, requiredErrors } from "@/pages/Admin/Settings/settingsKit";

const LIST = "/admin/courses/grade";

/** Add / edit grade (design: category parent → category, English + Arabic names). */
export default function GradeForm({ isNew, initial, categories, onSave }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (val) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const parentOptions = useMemo(
    () => categories.filter((c) => !c.parentCategoryId).map((c) => ({ label: c.name, value: c.id })),
    [categories],
  );
  const categoryOptions = useMemo(
    () => categories.filter((c) => c.parentCategoryId === v.categoryParentId).map((c) => ({ label: c.name, value: c.id })),
    [categories, v.categoryParentId],
  );
  const parentLabel = parentOptions.find((o) => String(o.value) === String(v.categoryParentId))?.label;
  const catLabel = categoryOptions.find((o) => String(o.value) === String(v.categoryId))?.label;

  const submit = async () => {
    const errs = requiredErrors(v, ["categoryParentId", "categoryId", "name", "nameAr"]);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave(v);
  };

  return (
    <FormPage
      backLabel="Grades"
      onLeave={() => navigate(LIST)}
      dirty={JSON.stringify(v) !== JSON.stringify(initial)}
      title={isNew ? "Add Grade" : `Edit ${initial.name || "grade"}`}
      saveLabel={isNew ? "Add grade" : "Save changes"}
      onSubmit={submit}
      maxW="max-w-4xl"
    >
      <FormSection title="General information" sub="Pick the category parent first; the category list follows it.">
        <Field label="Category parent" required error={errors.categoryParentId}>
          <Select
            styles={SELECT_STYLES}
            options={parentOptions}
            value={parentOptions.find((o) => String(o.value) === String(v.categoryParentId)) || null}
            onChange={(o) => {
              setV((p) => ({ ...p, categoryParentId: o ? o.value : "", categoryId: "" }));
              setErrors((p) => ({ ...p, categoryParentId: "" }));
            }}
            placeholder="Select…"
          />
        </Field>
        <Field label="Category" required error={errors.categoryId}>
          <Select
            styles={SELECT_STYLES}
            options={categoryOptions}
            isDisabled={!v.categoryParentId}
            value={categoryOptions.find((o) => String(o.value) === String(v.categoryId)) || null}
            onChange={(o) => set("categoryId")(o ? o.value : "")}
            placeholder={v.categoryParentId ? "Select…" : "Pick a category parent first"}
            noOptionsMessage={() => "No categories under this parent"}
          />
        </Field>
        <Field label="Grade name (EN)" required error={errors.name}>
          <input value={v.name} onChange={(e) => set("name")(e.target.value)} placeholder="Enter grade name, e.g. Grade 10" className={inpCls(errors.name)} />
        </Field>
        <Field label="Grade name (AR)" required error={errors.nameAr}>
          <input value={v.nameAr} onChange={(e) => set("nameAr")(e.target.value)} dir="rtl" lang="ar" placeholder="ادخل اسم الصف" className={inpCls(errors.nameAr)} />
        </Field>
        <p className={`md:col-span-2 text-xs ${parentLabel && catLabel ? "text-green-700 font-semibold" : "text-gray-400"}`}>
          {parentLabel && catLabel ? `Will be saved under ${parentLabel} → ${catLabel}.` : "All fields marked * are required."}
        </p>
      </FormSection>
    </FormPage>
  );
}
