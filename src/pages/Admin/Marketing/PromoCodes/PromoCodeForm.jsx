import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "@/components/HierarchicalLessonSelector";
import {
  DateField, Field, FormPage, FormSection, Preview, SELECT_STYLES, Segmented, fmtDate, inpCls, requiredErrors,
} from "@/pages/Admin/Settings/settingsKit";

const LIST = "/admin/marketing/promocodes";
const TYPE_OPTIONS = [
  { value: "generic", label: "Generic" },
  { value: "restricted", label: "Restricted" },
];

/** Add / edit promo code (general info, eligible students when restricted, applicable scope). */
export default function PromoCodeForm({ isNew, initial, packageOptions, currencyOptions, initialLessons, onSave }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (val) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const submit = async () => {
    const need = ["promoName", "code", "discountAmount", "numberOfUsages", "startDate", "endDate", "type"];
    const errs = requiredErrors(v, need);
    if (v.type === "restricted" && (!v.studentIds || v.studentIds.length === 0)) errs.studentIds = "Please select at least one student";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave(v);
  };

  const multiValue = (opts, vals) => opts.filter((o) => (vals || []).includes(o.value));
  const lessonsN = v.lessonSelector?.lessonIds?.length || 0;
  const scopeBits = [
    v.packageIds?.length ? `${v.packageIds.length} package${v.packageIds.length === 1 ? "" : "s"}` : "",
    lessonsN ? `${lessonsN} lesson${lessonsN === 1 ? "" : "s"}` : "",
    v.currencyIds?.length ? `${v.currencyIds.length} currenc${v.currencyIds.length === 1 ? "y" : "ies"}` : "",
  ].filter(Boolean);

  return (
    <FormPage
      backLabel="Promo codes"
      onLeave={() => navigate(LIST)}
      dirty={JSON.stringify(v) !== JSON.stringify(initial)}
      title={isNew ? "Add Promo Code" : `Edit ${initial.promoName || "promo code"}`}
      saveLabel={isNew ? "Add promo code" : "Save changes"}
      onSubmit={submit}
      maxW="max-w-5xl"
    >
      <FormSection title="General information" sub="Name, code, discount and the dates it can be used." cols="md:grid-cols-2 lg:grid-cols-3">
        <Field label="Promo name" required error={errors.promoName}>
          <input autoFocus value={v.promoName} onChange={(e) => set("promoName")(e.target.value)} placeholder="e.g. Back to school" className={inpCls(errors.promoName)} />
        </Field>
        <Field label="Promo code" required error={errors.code} hint="Must be unique">
          <input value={v.code} onChange={(e) => set("code")(e.target.value)} placeholder="e.g. SCHOOL25" className={`${inpCls(errors.code)} font-mono`} />
        </Field>
        <Field label="Discount (%)" required error={errors.discountAmount}>
          <input type="number" min={0} value={v.discountAmount} onChange={(e) => set("discountAmount")(e.target.value)} placeholder="e.g. 25" className={inpCls(errors.discountAmount)} />
        </Field>
        <Field label="Uses per student" required error={errors.numberOfUsages} hint="How many times each student can use the code">
          <input type="number" min={0} value={v.numberOfUsages} onChange={(e) => set("numberOfUsages")(e.target.value)} placeholder="e.g. 1" className={inpCls(errors.numberOfUsages)} />
        </Field>
        <Field label="Start date" required error={errors.startDate}>
          <DateField value={v.startDate} onChange={set("startDate")} error={errors.startDate} />
        </Field>
        <Field label="End date" required error={errors.endDate}>
          <DateField value={v.endDate} onChange={set("endDate")} error={errors.endDate} />
        </Field>
        <Field label="Promo type" required error={errors.type} hint={v.type === "restricted" ? "Only the students you pick can use it" : "Any student can use it"}>
          <Segmented value={v.type} onChange={set("type")} options={TYPE_OPTIONS} />
        </Field>
        <Preview className="md:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex font-mono font-bold text-sm text-gray-800 bg-white border border-dashed border-gray-300 rounded-lg px-3 py-1.5 break-all">{v.code.trim() || "CODE"}</span>
            <span className="text-2xl font-extrabold text-one">{Number(v.discountAmount) > 0 ? `${v.discountAmount}% off` : "—% off"}</span>
            <div className="min-w-0 text-xs text-gray-500">
              <p className="font-semibold text-gray-800">{v.promoName.trim() || "Promo name"}</p>
              <p>
                {v.startDate ? fmtDate(v.startDate) : "Start"} → {v.endDate ? fmtDate(v.endDate) : "End"}
                {Number(v.numberOfUsages) > 0 ? ` · ${v.numberOfUsages}× per student` : ""}
                {v.type === "restricted" ? ` · ${v.studentIds?.length || 0} student${v.studentIds?.length === 1 ? "" : "s"}` : " · all students"}
              </p>
              {scopeBits.length > 0 && <p className="text-gray-400">Applies to {scopeBits.join(", ")}</p>}
            </div>
          </div>
        </Preview>
      </FormSection>

      {v.type === "restricted" && (
        <FormSection title="Eligible students" sub="Only these students can use a restricted code." cols="">
          <Field label="Eligible students" required error={errors.studentIds}>
            <SearchStudents value={v.studentIds || []} onChange={set("studentIds")} error={errors.studentIds} />
          </Field>
        </FormSection>
      )}

      <FormSection title="Applicable scope" sub="Packages, currencies and chapters / lessons the code works on." cols="md:grid-cols-2">
        <Field label="Packages">
          <Select
            isMulti
            styles={SELECT_STYLES}
            options={packageOptions}
            value={multiValue(packageOptions, v.packageIds)}
            onChange={(sel) => set("packageIds")(sel ? sel.map((o) => o.value) : [])}
            placeholder="Select…"
          />
        </Field>
        <Field label="Currencies">
          <Select
            isMulti
            styles={SELECT_STYLES}
            options={currencyOptions}
            value={multiValue(currencyOptions, v.currencyIds)}
            onChange={(sel) => set("currencyIds")(sel ? sel.map((o) => o.value) : [])}
            placeholder="Select…"
          />
        </Field>
        <Field label="Chapters & lessons" className="md:col-span-2">
          <HierarchicalLessonSelector
            value={v.lessonSelector?.lessonIds}
            initialLessons={initialLessons}
            onChange={(lessonIds, rowDetails) =>
              set("lessonSelector")({
                lessonIds,
                chapterIds: Array.from(new Set((rowDetails || []).flatMap((r) => r.chapterIds || []))),
                // Course scope is derived from the courses the selected chapters/lessons belong to.
                courseIds: Array.from(new Set((rowDetails || []).map((r) => r.courseId).filter(Boolean))),
              })
            }
          />
        </Field>
      </FormSection>
    </FormPage>
  );
}
