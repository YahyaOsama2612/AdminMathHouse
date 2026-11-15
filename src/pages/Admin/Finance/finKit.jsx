// Shared bits of the Finance pages (Payment → reconciliation, unmatched, adjustments, refunds,
// expenses, teacher settlements, month-end). API: Math_house-main/docs/admin-finance-api.md
import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Printer, X } from "lucide-react";
import api from "@/api/api";
import { errText } from "@/components/admin/kit";

/** Whole EGP, e.g. "15,000 EGP" (negative shown with a minus). */
export const egp = (n) => `${Math.round(Number(n) || 0).toLocaleString("en-US")} EGP`;
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const thisMonth = () => todayIso().slice(0, 7);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (p) => (p ? `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : "");
export const shortDate = (v) => {
  if (!v) return "—";
  const s = String(v).slice(0, 10), [y, m, d] = s.split("-").map(Number);
  return y ? `${MON[m - 1]} ${d}, ${y}` : "—";
};
export const daysSince = (v) => (v ? Math.floor((Date.now() - new Date(`${String(v).slice(0, 10)}T00:00:00`).getTime()) / 864e5) : null);

/** GET a finance endpoint: { data, loading, error, reload }. `path` is relative to /api/admin/finance. */
export function useFin(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return api.get(`/api/admin/finance${path}`)
      .then((r) => setState({ data: r.data?.data ?? null, loading: false, error: null }))
      .catch((e) => setState((s) => ({ data: s.data, loading: false, error: errText(e, "Could not load") })));
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** Page header with the guide reference chip, a one-line rule and actions (design: finHead). */
export function FinHead({ title, refLabel, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-bold text-xl text-gray-800">{title}</h1>
          {refLabel && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-gray-100 text-gray-500">{refLabel}</span>}
        </div>
        {sub && <p className="text-xs text-gray-400 max-w-3xl">{sub}</p>}
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        {children}
        <button onClick={() => window.print()} className="a-btn"><Printer size={15} /> Print</button>
      </div>
    </div>
  );
}

/** "Records only" note shown on approval pages. */
export const RecordOnlyNote = ({ children }) => (
  <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-4">
    {children || "This is a record. Approving here does not change any balance or payment — apply the change by hand in the student's account."}
  </p>
);

/** Pick a PDF or image and return it as a base64 data URL (≤ 10 MB). value: data URL | https URL | null. */
export function DocInput({ value, onChange, label = "Document" }) {
  const ref = useRef(null);
  const [err, setErr] = useState("");
  const pick = (f) => {
    setErr("");
    if (!f) return;
    if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(f.type)) { setErr("Use a PDF or a PNG / JPG / WEBP image"); return; }
    if (f.size > 10 * 1024 * 1024) { setErr("The file is bigger than 10 MB"); return; }
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  const name = !value ? "" : value.startsWith("data:") ? (value.startsWith("data:application/pdf") ? "PDF ready to upload" : "Image ready to upload") : decodeURIComponent(value.split("/").pop());
  return (
    <div>
      <span className="a-lbl-f">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <button type="button" onClick={() => ref.current?.click()} className="a-btn !py-2"><Paperclip size={14} /> {value ? "Replace" : "Attach file"}</button>
        {value && (
          <>
            {value.startsWith("http") ? <a href={value} target="_blank" rel="noreferrer" className="text-xs font-bold text-one hover:underline truncate">{name}</a> : <span className="text-xs text-gray-600 truncate">{name}</span>}
            <button type="button" onClick={() => onChange(null)} className="a-act" aria-label="Remove file"><X size={14} /></button>
          </>
        )}
        <input ref={ref} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  );
}

/** Audit trail list: [{ at, by, text }]. */
export const LogList = ({ log }) => (
  <ol className="space-y-1.5">
    {(log || []).map((l, i) => (
      <li key={i} className="text-xs text-gray-600"><span className="text-gray-400">{shortDate(l.at)} · {l.by} — </span>{l.text}</li>
    ))}
    {!(log || []).length && <li className="text-xs text-gray-400">No history yet.</li>}
  </ol>
);

/** Small labelled field wrapper for forms in modals. */
export const Field = ({ label, req, hint, span, children }) => (
  <label className={`block min-w-0 ${span ? "sm:col-span-2" : ""}`}>
    <span className="a-lbl-f">{label}{req && <span className="text-red-500"> *</span>}</span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
  </label>
);
