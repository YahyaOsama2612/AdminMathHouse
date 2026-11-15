import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Link2, Search, Type } from "lucide-react";

/* Notification composer (design: RepPages['notifications'] → Compose).
   What the notifications API supports, and so what is shown here:
   - audience: everyone (sendToAll) or specific parents / students / teachers (parentIds, studentIds, teacherIds)
   - content: the message text (always required) plus an optional link (materialLink)
   - the date & time it is dated (dateTime, required)
   The design's Title field, "all teachers / all students / all parents" shortcuts and PDF / photo
   types are not here: there is no title column, and the existing JSON body has no file upload. */

const GROUPS = [
  { key: "students", label: "Students", field: "studentIds" },
  { key: "parents", label: "Parents", field: "parentIds" },
  { key: "teachers", label: "Teachers", field: "teacherIds" },
];
const SHOW_MAX = 300;

export const toLocalInput = (v) => {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function Composer({ options, initial, onSubmit, submitLabel = "Send notification", resetAfter = false, onCancel, compact = false }) {
  const blank = useMemo(() => ({
    notification: "", materialLink: "", dateTime: toLocalInput(), sendToAll: false, parentIds: [], studentIds: [], teacherIds: [],
  }), []);
  const start = initial || blank;
  const [f, setF] = useState(start);
  const [type, setType] = useState(start.materialLink ? "link" : "text");
  // Editing: open on the first group that already has recipients (a teacher-only notification opens on Teachers)
  const [group, setGroup] = useState(() => (GROUPS.find((x) => (start[x.field] || []).length) || GROUPS[0]).key);
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const g = GROUPS.find((x) => x.key === group);
  const dir = options?.[group] || [];
  const ql = q.trim().toLowerCase();
  const picked = f[g.field];
  // people who were already chosen when the form opened come first (fixed, so the list doesn't jump while ticking)
  const startPicked = start[g.field] || [];
  const shown = dir
    .filter((o) => !ql || String(o.label || "").toLowerCase().includes(ql) || String(o.phone || "").includes(ql))
    .sort((a, b) => Number(startPicked.includes(b.value)) - Number(startPicked.includes(a.value)));
  // every chosen recipient, across the three groups, with their names (for the "Sending to" list)
  const chosen = GROUPS.flatMap((x) => {
    const byId = new Map((options?.[x.key] || []).map((o) => [o.value, o.label]));
    return f[x.field].map((id) => ({ id, field: x.field, group: x.label.slice(0, -1), name: byId.get(id) || "Unknown (no longer in the list)" }));
  });
  const allShownOn = shown.length > 0 && shown.every((o) => picked.includes(o.value));
  const total = f.parentIds.length + f.studentIds.length + f.teacherIds.length;

  const toggle = (id) => set(g.field, picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const toggleShown = () => {
    const ids = shown.map((o) => o.value);
    set(g.field, allShownOn ? picked.filter((id) => !ids.includes(id)) : [...new Set([...picked, ...ids])]);
  };

  const send = async () => {
    if (!f.notification?.trim()) { toast.error("Notification text is required"); return; }
    if (!f.dateTime) { toast.error("Please select date & time"); return; }
    if (type === "link" && !f.materialLink.trim()) { toast.error("Add the link URL first"); return; }
    if (!f.sendToAll && !total) { toast.error("Select at least one recipient or send to everyone"); return; }
    const payload = {
      materialLink: (type === "link" && f.materialLink.trim()) || null,
      dateTime: f.dateTime.length === 16 ? `${f.dateTime}:00` : f.dateTime,
      notification: f.notification,
      sendToAll: f.sendToAll,
      parentIds: f.sendToAll ? [] : f.parentIds,
      studentIds: f.sendToAll ? [] : f.studentIds,
      teacherIds: f.sendToAll ? [] : f.teacherIds,
    };
    setSending(true);
    try {
      await onSubmit(payload);
      if (resetAfter) { setF({ ...blank, dateTime: toLocalInput() }); setType("text"); setQ(""); }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const pill = (on) => `px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1.5 ${on ? "text-white border-one bg-one shadow-lg" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`;
  const cap = "text-[11px] font-bold text-gray-400 uppercase";

  return (
    <div>
      <label className={cap}>Send to</label>
      <div className="flex flex-wrap gap-2 mt-1 mb-3">
        <button type="button" onClick={() => set("sendToAll", true)} className={pill(f.sendToAll)}>Everyone</button>
        <button type="button" onClick={() => set("sendToAll", false)} className={pill(!f.sendToAll)}>Specific…{!f.sendToAll && total > 0 ? ` · ${total}` : ""}</button>
      </div>
      {f.sendToAll && <p className="text-xs text-gray-400 -mt-1 mb-3">Every parent, student and teacher gets it.</p>}

      {!f.sendToAll && (
        <div className="mb-3">
          {/* Who it goes to — always visible, whichever tab is open */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 mb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-gray-700">Sending to {chosen.length ? `· ${chosen.length}` : ""}</p>
              {chosen.length > 0 && (
                <button type="button" onClick={() => setF((p) => ({ ...p, parentIds: [], studentIds: [], teacherIds: [] }))} className="text-[11px] font-bold text-gray-400 hover:text-red-600">Clear all</button>
              )}
            </div>
            {chosen.length ? (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {chosen.map((c) => (
                  <span key={`${c.field}-${c.id}`} className="inline-flex items-center gap-1 max-w-full rounded-lg border border-red-100 bg-white pl-2 pr-1 py-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-gray-400">{c.group}</span>
                    <span className="font-semibold text-gray-800 truncate">{c.name}</span>
                    <button type="button" onClick={() => set(c.field, f[c.field].filter((x) => x !== c.id))} className="rounded p-0.5 text-gray-400 hover:bg-one hover:text-white" aria-label={`Remove ${c.name}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Nobody yet — tick students, parents or teachers below.</p>}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {GROUPS.map((x) => (
              <button key={x.key} type="button" onClick={() => { setGroup(x.key); setQ(""); }} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${group === x.key ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200"}`}>
                {x.label} ({(options?.[x.key] || []).length}){f[x.field].length ? ` · ${f[x.field].length} ✓` : ""}
              </button>
            ))}
          </div>
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${group}…`} className="a-inp !pl-9" />
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={allShownOn} onChange={toggleShown} disabled={!shown.length} className="w-4 h-4 accent-[#7d0a0a]" /> Select all {shown.length} shown
              </label>
              {picked.length > 0 && <button type="button" onClick={() => set(g.field, [])} className="text-xs font-bold text-gray-400 hover:text-red-600">Clear</button>}
            </div>
            <div className={`p-2 grid grid-cols-1 sm:grid-cols-2 gap-0.5 overflow-y-auto ${compact ? "max-h-44" : "max-h-64"}`}>
              {shown.slice(0, SHOW_MAX).map((o) => (
                <label key={o.value} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer min-w-0 ${picked.includes(o.value) ? "bg-red-50/50 text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={picked.includes(o.value)} onChange={() => toggle(o.value)} className="w-4 h-4 accent-[#7d0a0a] shrink-0" />
                  <span className="truncate">{o.label}</span>
                </label>
              ))}
              {!shown.length && <p className="col-span-full text-center text-sm text-gray-400 py-6">No {group} match.</p>}
            </div>
            {shown.length > SHOW_MAX && <p className="text-[11px] text-gray-400 px-3 py-2 border-t border-gray-100">Showing the first {SHOW_MAX} of {shown.length} — search to narrow down. “Select all” takes all {shown.length}.</p>}
          </div>
          <p className="text-xs text-gray-400 mt-1">{f.studentIds.length} students · {f.parentIds.length} parents · {f.teacherIds.length} teachers selected</p>
        </div>
      )}

      <label className={cap}>Type</label>
      <div className="flex flex-wrap gap-2 mt-1 mb-3">
        <button type="button" onClick={() => setType("text")} className={pill(type === "text")}><Type size={13} /> Text</button>
        <button type="button" onClick={() => setType("link")} className={pill(type === "link")}><Link2 size={13} /> Link</button>
      </div>

      <label className={cap} htmlFor="ntif-body">Message text <span className="text-red-500">*</span></label>
      <textarea id="ntif-body" rows={4} value={f.notification} onChange={(e) => set("notification", e.target.value)} placeholder="Write the message they will see…" className="a-inp mt-1 mb-3 resize-y" />

      {type === "link" && (
        <>
          <label className={cap} htmlFor="ntif-url">Link URL <span className="text-red-500">*</span></label>
          <input id="ntif-url" value={f.materialLink} onChange={(e) => set("materialLink", e.target.value)} placeholder="https://…" className="a-inp mt-1 mb-3" />
        </>
      )}

      <label className={cap} htmlFor="ntif-date">Date &amp; time <span className="text-red-500">*</span></label>
      <input id="ntif-date" type="datetime-local" value={f.dateTime} onChange={(e) => set("dateTime", e.target.value)} className="a-inp mt-1" />

      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" onClick={send} disabled={sending} className="a-btn primary">{sending ? "Sending…" : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>}
      </div>
    </div>
  );
}
