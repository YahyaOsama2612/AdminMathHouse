// Small pieces shared by Adjustments, Refunds, Expenses and Teacher Settlements (design: finTable / finMini / finModalForm).
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/api/api";
import Select from "react-select";
import { SELECT_STYLES } from "./partsA";
import { Modal, SkelRows, errText, refreshWaiting } from "@/components/admin/kit";

/** Run an API call: busy flag, success toast (server message first), error toast, then reload. */
export function useRun(reload, { waiting = false } = {}) {
  const [busy, setBusy] = useState(false);
  const run = async (call, okText, after) => {
    if (busy) return false;
    setBusy(true);
    try {
      const r = await call();
      toast.success(r?.data?.data?.message || okText || "Saved");
      after?.();
      if (waiting) refreshWaiting();
      await reload?.();
      return true;
    } catch (err) {
      toast.error(errText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return [busy, run];
}

/** Loading skeleton / error card with retry around a page body. */
export function LoadState({ loading, error, data, reload, children }) {
  if (error && !data) return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
      <p className="font-bold text-gray-800">{error}</p>
      <button onClick={reload} className="a-btn mt-3">Try again</button>
    </div>
  );
  if (loading && !data) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-24"></div>)}</div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><SkelRows n={5} /></div>
    </div>
  );
  return (
    <>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3 flex flex-wrap items-center gap-2">
          {error} <button onClick={reload} className="font-bold underline">Retry</button>
        </p>
      )}
      {children}
    </>
  );
}

/** Table shell: a-th header cells, scrolls sideways inside its card. */
export const FTable = ({ heads, children, empty, count }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead><tr>{heads.map((h, i) => <th key={i} className="a-th whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody>
        {count === 0 ? <tr><td colSpan={heads.length} className="a-td py-10 text-center text-gray-400">{empty || "Nothing here."}</td></tr> : children}
      </tbody>
    </table>
  </div>
);

/** Small row button (design: finMini). tone: primary | green | danger | plain */
export const Mini = ({ tone = "plain", children, ...p }) => {
  const s = {
    primary: "text-white bg-one hover:opacity-90",
    green: "text-white bg-[#15803d] hover:opacity-90",
    danger: "text-red-600 border border-red-200 bg-white hover:bg-red-50",
    plain: "text-gray-600 border border-gray-200 bg-white hover:border-one hover:text-one",
  }[tone];
  return <button type="button" {...p} className={`text-[11px] font-extrabold px-3 py-1.5 rounded-lg whitespace-nowrap disabled:opacity-50 ${s}`}>{children}</button>;
};

/** Filter chips: opts = [[key, label, count?]] */
export const Chips = ({ opts, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {opts.map(([k, l, c]) => (
      <button key={k} type="button" onClick={() => onChange(k)} className={`a-chip ${value === k ? "on" : ""}`}>
        {l}{c != null && <span className="opacity-70"> · {c}</span>}
      </button>
    ))}
  </div>
);

/** Modal with a 2-column form grid and Cancel / Save (design: finModalForm). */
export function FormModal({ title, onClose, onSave, busy, saveLabel = "Save", wide = true, intro, children }) {
  return (
    <Modal title={title} onClose={onClose} wide={wide} actions={(
      <>
        <button type="button" onClick={onClose} className="a-btn">Cancel</button>
        <button type="button" onClick={onSave} disabled={busy} className="a-btn primary">{busy ? "Saving…" : saveLabel}</button>
      </>
    )}>
      {intro && <div className="mb-3">{intro}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </Modal>
  );
}

/** Two-line cell text. */
export const Two = ({ a, b, strong }) => (
  <>
    <p className={strong ? "font-semibold text-gray-800" : "text-gray-700"}>{a || "—"}</p>
    {b && <p className="text-xs text-gray-400">{b}</p>}
  </>
);

/** Student name with an optional search of existing students (GET /api/admin/student?search=).
 *  value = { studentId, studentName }. Free text is kept when no student is picked. */
/** Select one of your students (search by name, nickname, email or phone). Free text isn't accepted:
    value/onChange use { studentId, studentName }. An old record with only a typed name still shows that name. */
export function StudentPicker({ value, onChange, placeholder = "Search and choose a student" }) {
  const [input, setInput] = useState("");
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) { setOpts([]); return undefined; }
    const my = ++seq.current;
    const t = setTimeout(() => {
      setLoading(true);
      setFailed(false);
      api.get("/api/admin/session/select/students", { params: { search: q } })
        .then((r) => { if (my === seq.current) setOpts((r.data?.data?.students || []).slice(0, 50).map((s) => ({ value: s.id, label: String(s.name || "").trim() || "Student" }))); })
        .catch(() => { if (my === seq.current) { setOpts([]); setFailed(true); } })
        .finally(() => { if (my === seq.current) setLoading(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [input]);
  const selected = value.studentId
    ? { value: value.studentId, label: value.studentName || "Student" }
    : value.studentName ? { value: "__legacy", label: `${value.studentName} (not linked — choose the student)` } : null;
  return (
    <div>
      <Select value={selected} options={opts} inputValue={input} filterOption={null} isClearable isLoading={loading}
        onChange={(o) => { setInput(""); onChange(o && o.value !== "__legacy" ? { studentId: o.value, studentName: o.label } : { studentId: null, studentName: "" }); }}
        onInputChange={(v, m) => { if (m.action === "input-change") setInput(v); else if (m.action === "set-value" || m.action === "input-blur" || m.action === "menu-close") setInput(""); }}
        placeholder={placeholder}
        noOptionsMessage={() => (input.trim().length < 2 ? "Type 2+ letters of the name, nickname, email or phone" : "No student found")}
        styles={SELECT_STYLES} menuPortalTarget={typeof document !== "undefined" ? document.body : null} />
      {value.studentId
        ? <span className="block text-[11px] text-green-700 mt-1">Linked to the student's account</span>
        : failed && <span className="block text-[11px] text-amber-600 mt-1">Could not search students — try again.</span>}
    </div>
  );
}

/** Select one of your packages (Store → Packages). value/onChange = the package's label text, which is what
    the finance records keep. Falls back to typing if the packages can't be loaded (e.g. no "packages" permission). */
const PKG_TYPE = { live: "live sessions", exam: "exams", question: "questions" };
export function PackageSelect({ value, onChange }) {
  const [list, setList] = useState(null); // null = loading, [] = none, "error"
  useEffect(() => {
    let alive = true;
    api.get("/api/admin/packages", { params: { limit: 1000 } })
      .then((r) => { if (alive) setList(Array.isArray(r.data?.data) ? r.data.data : []); })
      .catch(() => { if (alive) setList("error"); });
    return () => { alive = false; };
  }, []);
  if (list === "error") {
    return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. DSAT · 20 live sessions" className="a-inp" />;
  }
  const label = (p) => `${p.courseName || p.categoryName || "General"} · ${p.name}${p.number ? ` · ${p.number} ${PKG_TYPE[p.type] || p.type || ""}` : ""}`.trim();
  const groups = {};
  (list || []).forEach((p) => { const g = p.courseName || p.categoryName || "General"; (groups[g] = groups[g] || []).push({ value: label(p), label: label(p) }); });
  const options = Object.keys(groups).sort().map((g) => ({ label: g, options: groups[g] }));
  const selected = value ? { value, label: value } : null;
  return (
    <Select value={selected} options={options} isClearable isSearchable isLoading={list === null}
      onChange={(o) => onChange(o ? o.value : "")} placeholder={list === null ? "Loading packages…" : "Search and choose a package"}
      noOptionsMessage={() => "No package found"} styles={SELECT_STYLES} menuPortalTarget={typeof document !== "undefined" ? document.body : null} />
  );
}

/** Trash button + its confirmation window. `onDelete` runs the API call (usually through useRun). */
export function DeleteButton({ title, what, description, warning, note, confirmLabel, onDelete, busy, label }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {label ? (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-md px-2 py-1 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          {label}
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="a-act del" title={`Delete ${what}`} aria-label={`Delete ${what}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></svg>
        </button>
      )}
      {open && (
        <Modal onClose={() => !busy && setOpen(false)}>
          <div className="flex items-start gap-4">
            <span className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900 leading-snug">{title || `Delete ${what}?`}</h3>
              <p className="text-sm text-gray-500 mt-1">{description || "This can't be undone."}</p>
            </div>
          </div>
          {warning && (
            <div className="flex items-start gap-2 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
              <span>{warning}</span>
            </div>
          )}
          {note !== null && <p className="text-xs text-gray-400 mt-3">{note ?? "Anything dated in a closed month can't be deleted — fix it with a correcting entry in an open month."}</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="a-btn justify-center">Cancel</button>
            <button type="button" disabled={busy} className="a-btn danger justify-center"
              onClick={async () => { if (await onDelete()) setOpen(false); }}>{busy ? "Deleting…" : confirmLabel || "Delete"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Toast for a missing required field. */
export const toastNeed = (what) => toast.error(`${what} ${/ and /.test(what) ? "are" : "is"} required`);

/** Lower-case "contains" search over several fields. */
export const matches = (q, ...fields) => !q.trim() || fields.join(" ").toLowerCase().includes(q.trim().toLowerCase());

/** Last day of a YYYY-MM month as YYYY-MM-DD. */
export const monthEnd = (p) => {
  const [y, m] = p.split("-").map(Number);
  return `${p}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
