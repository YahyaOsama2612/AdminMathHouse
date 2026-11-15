// Small shared pieces for the session pages (MathPortal admin design).
import { AlertCircle } from "lucide-react";

/** react-select look that matches `a-inp` (rounded-xl, gray-200 border, brand focus ring). */
export const SELECT_STYLES = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    backgroundColor: state.isDisabled ? "#f9fafb" : "#fff",
    borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#7d0a0a" : "#e5e7eb",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(125,10,10,.1)" : "none",
    fontSize: "0.875rem",
    "&:hover": { borderColor: state.isFocused ? "#7d0a0a" : "#d1d5db" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected ? "#7d0a0a" : state.isFocused ? "#fdf2f2" : "#fff",
    color: state.isSelected ? "#fff" : "#1f2937",
  }),
  menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", zIndex: 60 }),
  multiValue: (base) => ({ ...base, backgroundColor: "#fdf2f2", borderRadius: "0.5rem" }),
  multiValueLabel: (base) => ({ ...base, color: "#7d0a0a", fontWeight: 600 }),
  multiValueRemove: (base) => ({ ...base, color: "#7d0a0a", ":hover": { backgroundColor: "#7d0a0a", color: "#fff" } }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
};

/** Session-type colours from the design's master schedule. */
export const TYPE_TONE = {
  Explanation: ["#1d4ed8", "#eff6ff"],
  "Re-Explanation": ["#c2410c", "#fff7ed"],
  Mistakes: ["#7d0a0a", "#fdecec"],
  Exam: ["#7c3aed", "#f5f3ff"],
};

export const TypeBadge = ({ type }) => {
  const [c, bg] = TYPE_TONE[type] || ["#475569", "#f1f5f9"];
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded uppercase whitespace-nowrap" style={{ color: c, background: bg }}>
      {type || "—"}
    </span>
  );
};

/** Numbered form section card, as in the design's "Add session" screen. */
export const Section = ({ n, title, sub, right, children }) => (
  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
    <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-7 h-7 rounded-full text-xs font-extrabold text-white flex items-center justify-center shrink-0 bg-one">{n}</span>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-800">{title}</h3>
          {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

export const Req = () => <span className="text-red-500">*</span>;

export const FieldError = ({ msg }) =>
  msg ? (
    <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-1" data-field-error>
      <AlertCircle size={13} /> {typeof msg === "object" ? msg.message || JSON.stringify(msg) : String(msg)}
    </p>
  ) : null;

/** Small uppercase group label used inside sections. */
export const MiniLabel = ({ children }) => (
  <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">{children}</p>
);

/** Choice card (border-2, brand when on) — used for single/multi option pickers. */
export const ChoiceCard = ({ on, onClick, title, sub, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`text-left rounded-xl border-2 px-4 py-3 transition-colors ${on ? "border-one bg-red-50/50" : "border-gray-200 bg-white hover:border-gray-300"} ${className}`}
  >
    <p className={`text-sm font-bold ${on ? "text-one" : "text-gray-800"}`}>{title}</p>
    {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
  </button>
);

// ── Timezone-safe date helpers (avoid toISOString(), which shifts the day in UTC+ zones) ──
export const toLocalDateString = (date) => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const parseLocalDate = (str) => {
  if (!str) return null;
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Times are sent exactly as the admin picked them (no UTC conversion).
export const formatTimeToHMS = (dateObj) => {
  if (!dateObj) return "";
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}:00`;
};

export const parseHMSToDate = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":");
  const d = new Date();
  d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return d;
};

/** Scroll the first inline error into view after a failed save. */
export const scrollToFirstError = () =>
  requestAnimationFrame(() => document.querySelector("[data-field-error]")?.scrollIntoView({ behavior: "smooth", block: "center" }));

/** Loading placeholder for the add / edit form. */
export const FormSkeleton = () => (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
    <div className="xl:col-span-2 space-y-4">
      <div className="skel h-48"></div>
      <div className="skel h-32"></div>
      <div className="skel h-56"></div>
    </div>
    <div className="skel h-72"></div>
  </div>
);
