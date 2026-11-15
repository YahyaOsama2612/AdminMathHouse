// Shared bits of Reconciliation / Unmatched / MonthEnd (not used by the other finance pages).
import { useEffect, useRef, useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { RotateCw } from "lucide-react";
import api from "@/api/api";
import { errText } from "@/components/admin/kit";

/** Plain number with thousands separators ("—" for null). */
export const num = (n) => (n == null || n === "" ? "—" : Math.round(Number(n) || 0).toLocaleString("en-US"));
/** Signed number: +1,200 / −300 / "—" for 0. */
export const signed = (n) => (!n ? "—" : `${n > 0 ? "+" : "−"}${Math.abs(Math.round(n)).toLocaleString("en-US")}`);

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Today ± n days as YYYY-MM-DD (local time). */
export const dayOffset = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
/** Previous month as YYYY-MM. */
export const prevMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return ymd(d).slice(0, 7); };

/** Parse a whole-number input; NaN when empty or not a whole number. */
export const toInt = (s) => {
  if (s === "" || s == null) return NaN;
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
};

/** Run an API call with a success toast, error toast and busy flag. Returns true on success. */
export function useAct() {
  const [busy, setBusy] = useState(null);
  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) toast.success(typeof ok === "function" ? ok(r) : ok);
      return true;
    } catch (err) {
      toast.error(errText(err));
      return false;
    } finally {
      setBusy(null);
    }
  };
  return [busy, run];
}

/** Load error with a retry button (shown when nothing could be loaded). */
export const LoadError = ({ error, onRetry }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
    <p className="font-bold text-gray-800">{error}</p>
    <button onClick={onRetry} className="a-btn mt-3"><RotateCw size={14} /> Try again</button>
  </div>
);

/** Small red line when a reload failed but older data is still on screen. */
export const ReloadError = ({ error, onRetry }) => (error ? (
  <p className="text-xs text-red-600 mb-3">{error} — <button onClick={onRetry} className="font-bold underline">try again</button></p>
) : null);

/** On / off switch (design: a-switch). */
export const Switch = ({ on, onChange, disabled, title, label }) => (
  <button type="button" role="switch" aria-checked={!!on} aria-label={label} title={title} disabled={disabled}
    onClick={() => !disabled && onChange(!on)}
    className={`a-switch ${on ? "on" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}><span></span></button>
);

/** Table shell: header cells + rows, scrolls sideways inside its card. */
export const Table = ({ heads, children, empty, minW = 900 }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm" style={{ minWidth: minW }}>
      <thead><tr>{heads.map((h, i) => <th key={i} className="a-th whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody>
        {children}
        {empty && <tr><td colSpan={heads.length} className="a-td text-center text-gray-400 !py-10">{empty}</td></tr>}
      </tbody>
    </table>
  </div>
);

export const SELECT_STYLES = {
  control: (base, state) => ({
    ...base, minHeight: 42, backgroundColor: "#fff", borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#7d0a0a" : "#e5e7eb",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(125,10,10,.1)" : "none", fontSize: "0.875rem",
    "&:hover": { borderColor: state.isFocused ? "#7d0a0a" : "#d1d5db" },
  }),
  option: (base, state) => ({
    ...base, fontSize: "0.875rem",
    backgroundColor: state.isSelected ? "#7d0a0a" : state.isFocused ? "#fdf2f2" : "#fff",
    color: state.isSelected ? "#fff" : "#1f2937",
  }),
  menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", zIndex: 60 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

/** Searchable student picker (GET /api/admin/session/select/students?search=). value: { value, label } | null. */
export function StudentPicker({ value, onChange }) {
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
      api.get("/api/admin/session/select/students", { params: { search: q } })
        .then((r) => { if (my === seq.current) setOpts((r.data?.data?.students || []).slice(0, 50).map((s) => ({ value: s.id, label: s.name }))); })
        .catch(() => { if (my === seq.current) { setOpts([]); setFailed(true); } })
        .finally(() => { if (my === seq.current) setLoading(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [input]);
  return (
    <div>
      {/* Clear the typed text once a student is picked (or the menu closes) so the chosen name shows instead of it */}
      <Select value={value} onChange={(v) => { setInput(""); onChange(v); }} options={opts} inputValue={input}
        onInputChange={(v, m) => { if (m.action === "input-change") setInput(v); else if (m.action === "set-value" || m.action === "input-blur" || m.action === "menu-close") setInput(""); }}
        filterOption={null} isClearable isLoading={loading} placeholder="Type 2+ letters of the name, email or phone"
        noOptionsMessage={() => (input.trim().length < 2 ? "Type to search students" : "No student found")}
        styles={SELECT_STYLES} menuPortalTarget={typeof document !== "undefined" ? document.body : null} />
      {failed && <span className="block text-[11px] text-amber-600 mt-1">Could not search students — write the name in the resolution instead.</span>}
    </div>
  );
}
