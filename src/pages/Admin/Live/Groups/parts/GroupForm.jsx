import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import StudentPicker from "./StudentPicker";

/* Add / Edit group form (design: grForm). The groups API stores only
   name, isActive and the student list — the design's course, teacher, days and
   times have no backend fields, so they are not shown. */

export default function GroupForm({ isNew, initial, knownStudents = [], onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [active, setActive] = useState(initial?.isActive ?? true);
  const [studentIds, setStudentIds] = useState(initial?.studentIds || []);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Enter a group name"); return; }
    setErr("");
    setSaving(true);
    try {
      await onSave({ name, isActive: active, studentIds });
    } catch (ex) {
      console.error(ex);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Groups</p>
          <h1 className="font-bold text-2xl text-gray-900 truncate">{isNew ? "Add group" : `Edit ${initial?.name || "group"}`}</h1>
        </div>
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:text-one hover:border-one shrink-0 flex items-center gap-1.5">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">General information</h3></div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="a-lbl-f">Group name <span className="text-red-500">*</span></span>
            <input value={name} onChange={(e) => { setName(e.target.value); if (err) setErr(""); }} className={`a-inp ${err ? "!border-red-400" : ""}`} placeholder="e.g. DSAT Group B" />
          </label>
          <div>
            <span className="a-lbl-f">Active</span>
            <button type="button" onClick={() => setActive((v) => !v)} className="inline-flex items-center gap-3 mt-1" aria-pressed={active}>
              <span className={`a-switch ${active ? "on" : ""}`}><span></span></span>
              <span className="text-sm font-semibold text-gray-700">{active ? "Active" : "Inactive"}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Select students</h3>
          <p className="text-xs text-gray-400">Tick the students who belong to this group. Search covers every student.</p>
        </div>
        <div className="p-5">
          <StudentPicker value={studentIds} onChange={(ids) => setStudentIds(ids)} known={knownStudents} />
        </div>
      </section>

      {err && <p className="text-sm font-semibold text-red-600 mb-3" role="alert">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={saving} className="a-btn primary">{saving ? "Saving…" : isNew ? "Add group" : "Save changes"}</button>
      </div>
    </form>
  );
}
