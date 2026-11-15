import { useState } from "react";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import StudentPicker from "@/pages/Admin/Live/Groups/parts/StudentPicker";

/* Add / Edit extra homework (design: ehForm).
   Targets offered = the ones the old form had: individual students or one group.
   Left out (no backend field): "Graded out of" (scores are 0–100), whole-course target.
   The API stores PDFs only (other file types were rejected / ignored), so the picker takes PDFs. */

const MAX_MB = 20;
const splitDue = (v) => ({ date: v ? String(v).slice(0, 10) : "", time: v ? String(v).slice(11, 16) : "" });
export const whenText = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

export default function HomeworkForm({
  isNew, initial = {}, knownStudents = [], groupOptions = [], groupsLoading, existingPdfUrl, requireStudents = false, onSave, onCancel,
}) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [due, setDue] = useState(splitDue(initial.dueDate));
  const [targetType, setTargetType] = useState(initial.targetType || "individual");
  const [studentIds, setStudentIds] = useState(initial.studentIds || []);
  const [targetGroupId, setTargetGroupId] = useState(initial.targetGroupId || "");
  const [link, setLink] = useState(initial.link || "");
  const [pdfFile, setPdfFile] = useState(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [gq, setGq] = useState("");

  const dueDate = due.date && due.time ? `${due.date}T${due.time}` : "";
  const group = groupOptions.find((g) => g.value === targetGroupId);
  const gql = gq.trim().toLowerCase();
  const groupsShown = groupOptions.filter((g) => !gql || String(g.label).toLowerCase().includes(gql));

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1048576) { setErr(`That file is over ${MAX_MB} MB`); return; }
    setErr("");
    setPdfFile(file);
  };

  const submit = async () => {
    if (!title.trim()) return setErr("Enter a title");
    if (!description.trim()) return setErr("Enter a description");
    if (!dueDate) return setErr("Pick the due date and time");
    if (targetType === "group" && !targetGroupId) return setErr("Choose a group");
    if (targetType === "individual" && requireStudents && !studentIds.length) return setErr("Choose at least one student");
    setErr("");
    setSaving(true);
    try {
      await onSave({ title, description, dueDate, targetType, studentIds, targetGroupId, link }, { pdfFile, removePdf });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const card = (t, sub, body, right) => (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-bold text-gray-800">{t}</h3>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        {right}
      </div>
      <div className="p-5">{body}</div>
    </section>
  );
  const seg = (k, l, sub) => (
    <button type="button" onClick={() => setTargetType(k)} className={`flex-1 min-w-[150px] text-left rounded-xl border-2 px-4 py-3 transition-colors ${targetType === k ? "border-one bg-red-50/50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
      <p className={`text-sm font-bold ${targetType === k ? "text-one" : "text-gray-800"}`}>{l}</p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </button>
  );
  const req = <span className="text-red-500">*</span>;
  const fileLabel = pdfFile ? pdfFile.name : existingPdfUrl && !removePdf ? "Current file" : "—";
  const studentsText = targetType === "group" ? (group ? `Everyone in ${group.label}` : "—") : String(studentIds.length);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Extra Homework</p>
          <h1 className="font-bold text-2xl text-gray-900 truncate">{isNew ? "Add homework" : "Edit homework"}</h1>
        </div>
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:text-one hover:border-one shrink-0 flex items-center gap-1.5"><ArrowLeft size={16} /> Back</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 min-w-0">
          {card("General information", "What the students should do.", (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label htmlFor="eh-title" className="a-lbl-f">Title {req}</label>
                <input id="eh-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Math revision assignment" className="a-inp" /></div>
              <div className="md:col-span-2"><label htmlFor="eh-desc" className="a-lbl-f">Description {req}</label>
                <textarea id="eh-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What to do, how to submit, anything to watch out for…" className="a-inp resize-y" /></div>
              <div><label htmlFor="eh-date" className="a-lbl-f">Due date {req}</label>
                <input id="eh-date" type="date" value={due.date} onChange={(e) => setDue((d) => ({ ...d, date: e.target.value }))} className="a-inp" /></div>
              <div><label htmlFor="eh-time" className="a-lbl-f">Due time {req}</label>
                <input id="eh-time" type="time" value={due.time} onChange={(e) => setDue((d) => ({ ...d, time: e.target.value }))} className="a-inp" /></div>
            </div>
          ))}

          {card("Who gets it", "Pick students one by one, or a whole group.", (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {seg("individual", "Individual students", "Pick from the list")}
                {seg("group", "A group", "Everyone in one group")}
              </div>
              {targetType === "individual" ? (
                <>
                  <StudentPicker value={studentIds} onChange={(ids) => setStudentIds(ids)} known={knownStudents} limit={50} />
                  {!isNew && <p className="text-[11px] text-gray-400 mt-2">Saving adds newly ticked students. Students who already have this homework keep it.</p>}
                </>
              ) : groupsLoading ? <div className="skel h-20" /> : groupOptions.length ? (
                <>
                  {groupOptions.length > 9 && <input value={gq} onChange={(e) => setGq(e.target.value)} placeholder="Search groups…" className="a-inp !bg-gray-50 mb-3" />}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                    {groupsShown.map((g) => (
                      <button key={g.value} type="button" onClick={() => setTargetGroupId(g.value)} className={`text-left rounded-xl border-2 px-4 py-3 ${targetGroupId === g.value ? "border-one bg-red-50/50" : "border-gray-200 hover:border-gray-300"}`}>
                        <p className={`text-sm font-bold ${targetGroupId === g.value ? "text-one" : "text-gray-800"}`}>{g.label}</p>
                      </button>
                    ))}
                    {!groupsShown.length && <p className="text-sm text-gray-400 col-span-full">No groups match.</p>}
                  </div>
                </>
              ) : <p className="text-sm text-gray-500">No groups yet — create one in Live → Groups.</p>}
            </>
          ), <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-one">{targetType === "group" ? (group ? group.label : "No group") : `${studentIds.length} student${studentIds.length === 1 ? "" : "s"}`}</span>)}

          {card("Resources", "Optional — a worksheet and/or a link.", (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="a-lbl-f">File (PDF)</span>
                {existingPdfUrl && !removePdf && !pdfFile && (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 mb-2">
                    <span className="w-9 h-9 rounded-lg bg-red-50 text-one flex items-center justify-center shrink-0"><FileText size={16} /></span>
                    <a href={existingPdfUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 text-sm font-semibold text-gray-800 truncate hover:text-one">Current file</a>
                    <button type="button" onClick={() => setRemovePdf(true)} className="text-xs font-bold text-gray-400 hover:text-red-600 px-2 py-1">Remove</button>
                  </div>
                )}
                {removePdf && !pdfFile && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 mb-2">
                    <span className="text-sm font-semibold text-red-700">The current file will be removed</span>
                    <button type="button" onClick={() => setRemovePdf(false)} className="text-xs font-bold text-red-600 hover:underline">Undo</button>
                  </div>
                )}
                {pdfFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
                    <span className="w-9 h-9 rounded-lg bg-red-50 text-one flex items-center justify-center shrink-0"><FileText size={16} /></span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-800 truncate">{pdfFile.name}</p><p className="text-[11px] text-gray-400">{pdfFile.size > 1048576 ? `${(pdfFile.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(pdfFile.size / 1024))} KB`}</p></div>
                    <button type="button" onClick={() => setPdfFile(null)} className="text-xs font-bold text-gray-400 hover:text-red-600 px-2 py-1">Remove</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center cursor-pointer hover:border-one hover:bg-red-50/30">
                    <Upload size={18} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{existingPdfUrl && !removePdf ? "Replace the file" : "Choose a file"}</span>
                    <span className="text-[11px] text-gray-400">PDF · up to {MAX_MB} MB</span>
                    <input type="file" accept=".pdf,application/pdf" className="sr-only" onChange={pickFile} />
                  </label>
                )}
              </div>
              <div>
                <label htmlFor="eh-link" className="a-lbl-f">Link</label>
                <input id="eh-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com/homework" className="a-inp" />
                <span className="block text-[11px] text-gray-400 mt-1">Opens in a new tab for the student.</span>
              </div>
            </div>
          ))}
        </div>

        <aside className="xl:sticky xl:top-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">Summary</p>
          <p className="font-bold text-gray-900 break-words">{title || "Untitled homework"}</p>
          <dl className="mt-3 space-y-2 text-sm">
            {[["Due", dueDate ? whenText(dueDate) : "—"], ["Target", targetType === "group" ? "A group" : "Individual students"], ["Students", studentsText], ["File", fileLabel], ["Link", link ? "Yes" : "—"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-gray-400">{k}</dt><dd className="font-semibold text-gray-800 text-right truncate">{v}</dd></div>
            ))}
          </dl>
          {err && <p className="text-sm font-semibold text-red-600 mt-4" role="alert">{err}</p>}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <button type="button" onClick={onCancel} className="h-10 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={submit} disabled={saving} className="h-10 rounded-xl text-sm font-bold text-white shadow-lg bg-one hover:opacity-90 disabled:opacity-50">{saving ? "Saving…" : isNew ? "Send homework" : "Save changes"}</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
