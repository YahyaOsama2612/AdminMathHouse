import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import {
  DateField, Field, FormPage, FormSection, ImagePicker, Preview, Segmented, Switch, fmtDate, inpCls, requiredErrors, useImageSrc,
} from "@/pages/Admin/Settings/settingsKit";

const LIST = "/admin/marketing/popup";
const DESTS = [
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
];

/** Add / edit popup (name, destination, dates, Active switch, image).
    It shows only while Active is on AND today is between the start and end dates. */
export default function PopupForm({ isNew, initial, onSave, imageRequired = false }) {
  const navigate = useNavigate();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k) => (val) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };
  const imgSrc = useImageSrc(v.image);

  const submit = async () => {
    const need = ["name", "destination", "startDate", "endDate"];
    if (imageRequired) need.push("image");
    const errs = requiredErrors(v, need);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave(v);
  };

  const dirty = Object.keys(initial).some((k) => v[k] !== initial[k]);

  return (
    <FormPage
      backLabel="Popups"
      onLeave={() => navigate(LIST)}
      dirty={dirty}
      title={isNew ? "Add Popup" : `Edit ${initial.name || "popup"}`}
      saveLabel={isNew ? "Add popup" : "Save changes"}
      onSubmit={submit}
    >
      <FormSection title="General information" sub="The popup shows to the chosen audience from the start date to the end date.">
        <Field label="Popup name" required error={errors.name}>
          <input autoFocus value={v.name} onChange={(e) => set("name")(e.target.value)} placeholder="Enter popup name" className={inpCls(errors.name)} />
        </Field>
        <Field label="Destination" required error={errors.destination}>
          <Segmented value={v.destination} onChange={set("destination")} options={DESTS} />
        </Field>
        <Field label="Start date" required error={errors.startDate}>
          <DateField value={v.startDate} onChange={set("startDate")} error={errors.startDate} />
        </Field>
        <Field label="End date" required error={errors.endDate}>
          <DateField value={v.endDate} onChange={set("endDate")} error={errors.endDate} />
        </Field>
        <Field label="Status" hint="Switch off to hide the popup without deleting it — even within its dates." className="md:col-span-2">
          <Switch on={!!v.isActive} onChange={set("isActive")} label={v.isActive ? "Active — shows between the start and end dates" : "Inactive — hidden"} />
        </Field>
        <Field
          label="Popup image"
          required={imageRequired}
          error={errors.image}
          hint={imageRequired ? "Upload an image (PNG/JPG)" : "Upload a new image to replace the old one"}
          className="md:col-span-2"
        >
          <ImagePicker value={v.image} onChange={set("image")} error={errors.image} />
        </Field>
        <Preview className="md:col-span-2">
          <div className="flex items-center gap-4">
            {imgSrc ? (
              <img src={imgSrc} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-100 bg-white shrink-0" />
            ) : (
              <span className="w-24 h-24 rounded-xl bg-white border border-dashed border-gray-200 text-gray-300 flex items-center justify-center shrink-0"><ImageIcon size={26} /></span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-gray-900 break-words">{v.name.trim() || "Popup name"}</p>
              <p className="text-xs text-gray-500">
                For {DESTS.find((d) => d.value === v.destination)?.label.toLowerCase() || "…"}s
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {v.startDate ? fmtDate(v.startDate) : "Start"} → {v.endDate ? fmtDate(v.endDate) : "End"}
                <span className={`ml-2 font-bold ${v.isActive ? "text-green-700" : "text-amber-600"}`}>· {v.isActive ? "Active" : "Inactive"}</span>
              </p>
            </div>
          </div>
        </Preview>
      </FormSection>
    </FormPage>
  );
}
