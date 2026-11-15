// Small building blocks of the MathPortal admin design, for hand-built pages.
import { useEffect } from "react";
import { createPortal } from "react-dom";

export const PageHead = ({ title, sub, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h1 className="font-bold text-xl text-gray-800">{title}</h1>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
    {children}
  </div>
);

export const Stat = ({ label, value, sub, color, children }) => (
  <div className="rs-stat">
    <p className="rs-stat-label">{label}</p>
    <p className="rs-stat-value" style={color ? { color } : undefined}>{value}</p>
    {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    {children}
  </div>
);

export const Card = ({ title, sub, right, children, className = "", bodyClass = "p-5" }) => (
  <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    {(title || right) && (
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {title && <h3 className="font-bold text-gray-800">{title}</h3>}
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        {right}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

/** Segmented tabs (grey track, white active tab), with optional amber counts. */
export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit max-w-full">
    {tabs.map((t) => (
      <button key={t.key} onClick={() => onChange(t.key)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${t.key === value ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
        {t.label}
        {t.count > 0 && <span className="ml-1.5 text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center bg-amber-400 text-gray-900">{t.count}</span>}
      </button>
    ))}
  </div>
);

export const Pill = ({ tone = "gray", children }) => {
  const tones = {
    gray: "bg-gray-100 text-gray-600", green: "bg-green-100 text-green-700", amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700", blue: "bg-blue-100 text-blue-700", purple: "bg-purple-100 text-purple-700",
  };
  return <span className={`a-pill ${tones[tone] || tones.gray}`}>{children}</span>;
};

export function Modal({ title, onClose, children, actions, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Rendered on <body> so a window opened from inside a table cell doesn't inherit the table's
  // nowrap / overflow styles (it used to come out squashed with text cut off).
  return createPortal(
    <div className="a-modal-bg whitespace-normal text-left" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} p-6 max-h-[88vh] overflow-y-auto`} role="dialog" aria-modal="true">
        {title && <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>}
        <div className="text-sm text-gray-600">{children}</div>
        {actions && <div className="flex flex-wrap justify-end gap-2 mt-5">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

export const Empty = ({ title, text }) => (
  <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center">
    <p className="font-bold text-gray-700">{title}</p>
    {text && <p className="text-sm text-gray-400">{text}</p>}
  </div>
);

export const SkelRows = ({ n = 4 }) => <div className="space-y-2">{Array.from({ length: n }).map((_, i) => <div key={i} className="skel h-12"></div>)}</div>;

// ── formatting ─────────────────────────────────────────────
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const fmtDay = (v) => {
  if (!v) return "—";
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y) return "—";
  const dt = new Date(y, m - 1, d);
  return `${WD[dt.getDay()]}, ${MON[dt.getMonth()]} ${dt.getDate()}`;
};
export const fmtTime = (t) => {
  if (!t) return "";
  let [h, m] = String(t).split(":").map(Number);
  const ap = h >= 12 && h < 24 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${ap}`;
};
export const fmtStamp = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${MON[d.getMonth()]} ${d.getDate()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const errText = (err, fallback = "Something went wrong") => {
  const e = err?.response?.data?.error;
  // Validation errors carry the field messages in `details`; show the first one instead of "Validation failed".
  if (Array.isArray(e?.details) && e.details[0]?.message) return e.details[0].message;
  return e?.message || err?.response?.data?.message || err?.message || fallback;
};

/** Ask the layout to re-count what is waiting (sidebar badges + bell) right now. */
export const WAITING_EVENT = "admin:waiting-refresh";
export const refreshWaiting = () => window.dispatchEvent(new Event(WAITING_EVENT));
