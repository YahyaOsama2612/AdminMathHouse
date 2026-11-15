// Shared pieces for the Settings / Grade / Marketing list + form pages (MathPortal admin design).
// Used by: Settings/ExamCode, Settings/RawScore, Settings/Section, Settings/RatingQuestions,
//          Course/Grade, Marketing/Popup, Marketing/PromoCodes.
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Search, Trash2, Upload } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Modal } from "@/components/admin/kit";

/* react-select in the design (white field, grey border, maroon focus and chips) */
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
  menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", zIndex: 40 }),
  multiValue: (base) => ({ ...base, backgroundColor: "#fdf2f2", borderRadius: "0.5rem" }),
  multiValueLabel: (base) => ({ ...base, color: "#7d0a0a", fontWeight: 600 }),
  multiValueRemove: (base) => ({ ...base, color: "#7d0a0a", ":hover": { backgroundColor: "#7d0a0a", color: "#fff" } }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
};

/* ── formatting ───────────────────────────────────────────── */
export const fmtDate = (v) => {
  if (!v) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v)); // date-only → local day, not UTC midnight
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* Same rule the old AddPage used for required fields */
export const isBlank = (v) =>
  v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");

/** Returns { field: "This field is required" } for each blank required field. */
export const requiredErrors = (values, names) =>
  names.reduce((acc, n) => (isBlank(values[n]) ? { ...acc, [n]: "This field is required" } : acc), {});

/* ── list pieces ──────────────────────────────────────────── */
export const AddButton = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="a-btn primary">
    <span className="text-base leading-none">+</span> {children}
  </button>
);

export const SearchInput = ({ value, onChange, placeholder, className = "" }) => (
  <div className={`relative ${className}`}>
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="a-inp pl-9" />
  </div>
);

export const FilterLabel = ({ label, children, className = "" }) => (
  <label className={`block min-w-0 ${className}`}>
    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

/** Edit / delete icons on a card (ec-act look, visible on hover; always visible on touch). */
export const CardActions = ({ name, onEdit, onDelete, show = false }) => (
  <div className={`ec-actions ${show ? "show" : ""}`}>
    <button type="button" onClick={onEdit} className="ec-act edit inline-flex items-center justify-center" title={`Edit ${name}`} aria-label={`Edit ${name}`}>
      <Pencil size={14} />
    </button>
    <button type="button" onClick={onDelete} className="ec-act del inline-flex items-center justify-center" title={`Delete ${name}`} aria-label={`Delete ${name}`}>
      <Trash2 size={14} />
    </button>
  </div>
);

/** Edit / delete buttons in a table row (a-act). */
export const RowButtons = ({ name, onEdit, onDelete, children }) => (
  <div className="flex items-center justify-end gap-1.5">
    {children}
    <button type="button" onClick={onEdit} className="a-act" title={`Edit ${name}`} aria-label={`Edit ${name}`}><Pencil size={15} /></button>
    <button type="button" onClick={onDelete} className="a-act del" title={`Delete ${name}`} aria-label={`Delete ${name}`}><Trash2 size={15} /></button>
  </div>
);

export const NoResults = ({ title, text, onClear }) => (
  <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 px-4 text-center">
    <p className="font-bold text-gray-700">{title}</p>
    {text && <p className="text-sm text-gray-400 mb-3">{text}</p>}
    {onClear && (
      <button type="button" onClick={onClear} className="text-xs font-bold text-one hover:underline">Clear filters</button>
    )}
  </div>
);

export const LoadError = ({ text = "Could not load this page.", onRetry }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 px-4 text-center">
    <p className="font-bold text-gray-700">{text}</p>
    <p className="text-sm text-gray-400 mb-3">Check your connection and try again.</p>
    {onRetry && <button type="button" onClick={onRetry} className="a-btn">Try again</button>}
  </div>
);

export const CardGridSkeleton = ({ n = 8, h = "h-32", cols = "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" }) => (
  <div className={`grid ${cols} gap-3`}>
    {Array.from({ length: n }).map((_, i) => <div key={i} className={`skel ${h}`}></div>)}
  </div>
);

export const HeadSkeleton = () => (
  <div className="flex items-end justify-between gap-3 mb-4">
    <div className="space-y-2"><div className="skel h-6 w-40"></div><div className="skel h-3 w-64"></div></div>
    <div className="skel h-10 w-36"></div>
  </div>
);

/* ── form pieces ──────────────────────────────────────────── */
export const Field = ({ label, required, optional, hint, error, className = "", children }) => (
  <div className={`min-w-0 ${className}`}>
    {label && (
      <span className="a-lbl-f">
        {label}
        {required && <span className="text-red-500"> *</span>}
        {optional && <span className="text-gray-400 font-normal"> (optional)</span>}
      </span>
    )}
    {children}
    {error ? (
      <p className="text-xs mt-1 text-red-600 font-semibold">{error}</p>
    ) : hint ? (
      <p className="text-xs mt-1 text-gray-400">{hint}</p>
    ) : null}
  </div>
);

export const inpCls = (error) => `a-inp ${error ? "border-red-400" : ""}`;

export const FormSection = ({ title, sub, cols = "md:grid-cols-2", children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    <div className="px-5 py-4 border-b border-gray-100">
      <h3 className="font-bold text-gray-800">{title}</h3>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
    <div className={`p-5 grid grid-cols-1 ${cols} gap-4`}>{children}</div>
  </div>
);

export const Preview = ({ children, className = "" }) => (
  <div className={`rounded-xl bg-gray-50 border border-gray-100 p-4 ${className}`}>
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Preview</p>
    {children}
  </div>
);

/** Segmented choice (grey track, white active option). */
export const Segmented = ({ value, onChange, options }) => (
  <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit max-w-full" role="radiogroup">
    {options.map((o) => {
      const on = String(value) === String(o.value);
      return (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold ${on ? "bg-white shadow-sm text-one" : "text-gray-500 hover:text-gray-800"}`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

export const Switch = ({ on, onChange, label }) => (
  <button type="button" onClick={() => onChange(!on)} className="flex items-center gap-3 py-1.5" aria-pressed={on}>
    <span className={`a-switch ${on ? "on" : ""}`}><span></span></span>
    <span className="text-sm font-semibold text-gray-600">{label ?? (on ? "Active" : "Inactive")}</span>
  </button>
);

/** Date field with the same value format the old AddPage "datemin" field produced (ISO string, today or later). */
export const DateField = ({ value, onChange, error, placeholder = "Select a date" }) => (
  <DatePicker
    selected={value ? new Date(value) : null}
    onChange={(date) => onChange(date ? date.toISOString() : "")}
    dateFormat="yyyy-MM-dd"
    minDate={new Date()}
    placeholderText={placeholder}
    wrapperClassName="w-full"
    className={inpCls(error)}
  />
);

/** URL to show for a File (object URL, released on change) or an existing image URL. */
export function useImageSrc(value) {
  const isFile = value instanceof File;
  const objectUrl = useMemo(() => (isFile ? URL.createObjectURL(value) : ""), [isFile, value]);
  useEffect(() => () => objectUrl && URL.revokeObjectURL(objectUrl), [objectUrl]);
  return isFile ? objectUrl : typeof value === "string" && value ? value : "";
}

/** Image picker with preview (value: File or an existing image URL). */
export const ImagePicker = ({ value, onChange, error }) => {
  const src = useImageSrc(value);
  return (
    <div className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${error ? "border-red-300" : src ? "border-one/40 bg-red-50/30" : "border-gray-200 hover:border-one/50"}`}>
      <input
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        aria-label="Choose image"
      />
      <div className="flex items-center gap-4">
        {src ? (
          <img src={src} alt="" className="w-16 h-16 rounded-lg object-cover ring-2 ring-white shadow" />
        ) : (
          <span className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><Upload size={22} /></span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-700">{src ? "Click to replace the image" : "Click to upload an image"}</p>
          <p className="text-xs text-gray-400">{value instanceof File ? value.name : "PNG, JPG or WEBP"}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * A form on its own page: "← back" link, title, the cards (children), then Cancel / Save.
 * Leaving with unsaved changes asks first.
 */
export function FormPage({ backLabel, onLeave, dirty, title, onSubmit, saveLabel = "Save changes", maxW = "max-w-3xl", children }) {
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const leave = () => (dirty ? setAsking(true) : onLeave());

  return (
    <div className={`${maxW} text-left`} dir="ltr">
      <button type="button" onClick={leave} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-one mb-1">
        <ArrowLeft size={14} /> {backLabel}
      </button>
      <h1 className="font-bold text-xl text-gray-800 mb-4 break-words">{title}</h1>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          try {
            setBusy(true);
            await onSubmit();
          } catch (err) {
            console.error(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={leave} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="a-btn primary">
            {busy ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving…
              </>
            ) : (
              saveLabel
            )}
          </button>
        </div>
      </form>
      {asking && (
        <Modal
          title="Discard changes?"
          onClose={() => setAsking(false)}
          actions={
            <>
              <button type="button" onClick={() => setAsking(false)} className="a-btn">Keep editing</button>
              <button type="button" onClick={onLeave} className="a-btn danger">Discard</button>
            </>
          }
        >
          You have unsaved changes. Leave this page without saving?
        </Modal>
      )}
    </div>
  );
}

export const FormSkeleton = () => (
  <div className="max-w-3xl space-y-3">
    <div className="skel h-4 w-24"></div>
    <div className="skel h-7 w-56"></div>
    <div className="skel h-64"></div>
  </div>
);
