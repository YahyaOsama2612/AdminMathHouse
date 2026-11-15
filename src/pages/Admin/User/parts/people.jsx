import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search, LayoutGrid, List } from "lucide-react";

/* Shared bits for the people lists (students, parents, teachers, admins, roles) in the MathPortal design. */

export const initials = (name) =>
  String(name || "")
    .replace(/\(.*?\)/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/** Initials tile, or the photo when there is one. shape: "rounded-xl" | "rounded-full" … */
export function Avatar({ name, src, size = "w-11 h-11", shape = "rounded-xl", text = "text-sm", solid = false, muted = false }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return <img src={src} alt="" onError={() => setBroken(true)} className={`${size} ${shape} object-cover shrink-0 bg-gray-100 border border-gray-100`} />;
  }
  const tone = muted ? "bg-gray-100 text-gray-500" : solid ? "bg-one text-white" : "text-one bg-[#fdecec]";
  return <span className={`${size} ${shape} ${text} ${tone} flex items-center justify-center font-extrabold shrink-0`}>{initials(name)}</span>;
}

/** "⋯" menu that floats above the page (fixed), so table scrolling never cuts it off. items: [{label, icon, onClick, tone}|"sep"] */
export function ActionMenu({ label = "More actions", items = [] }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const menu = useRef(null);

  const close = () => setPos(null);
  const toggle = (e) => {
    e.stopPropagation();
    if (pos) return close();
    const r = btn.current.getBoundingClientRect();
    const h = 44 * items.length + 16;
    const below = window.innerHeight - r.bottom;
    setPos({
      left: Math.max(8, Math.min(window.innerWidth - 232, r.right - 224)),
      top: below > h + 12 ? r.bottom + 6 : Math.max(8, r.top - h - 6),
    });
  };

  useEffect(() => {
    if (!pos) return undefined;
    const onDoc = (e) => {
      if (!menu.current?.contains(e.target) && !btn.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") { close(); btn.current?.focus(); }
    };
    const onScroll = (e) => { if (!menu.current?.contains(e.target)) close(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    menu.current?.querySelector("[role=menuitem]")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        aria-label={label}
        title="More actions"
        className={`w-9 h-9 rounded-lg border bg-white flex items-center justify-center transition-colors ${pos ? "border-one text-one" : "border-gray-200 text-gray-600 hover:border-one hover:text-one"}`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {pos && (
        <div ref={menu} role="menu" className="fixed z-[95] w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-1" style={{ left: pos.left, top: pos.top }}>
          {items.map((it, i) =>
            it === "sep" ? (
              <div key={`sep-${i}`} className="my-1 border-t border-gray-100" />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => { close(); it.onClick(); }}
                className={`w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-2 ${it.tone || "text-gray-700"}`}
              >
                {it.icon && <it.icon className="w-4 h-4 shrink-0" />}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** Search input with the magnifier inside, sized for the filter bar. */
export const SearchInput = ({ value, onChange, placeholder, label = "Search", className = "" }) => (
  <label className={`relative min-w-0 ${className}`}>
    <span className="sr-only">{label}</span>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="a-inp !pl-9 !h-10" />
  </label>
);

/** Cards ▦ / Table ☰ switch (grey track, white active). */
export const ViewSwitch = ({ value, onChange }) => (
  <div className="inline-flex bg-gray-100 rounded-xl p-1 shrink-0" role="group" aria-label="View">
    {[["cards", "Cards", LayoutGrid], ["table", "Table", List]].map(([v, l, Icon]) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        aria-pressed={value === v}
        className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${value === v ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
      >
        <Icon className="w-3.5 h-3.5" /> {l}
      </button>
    ))}
  </div>
);

/** Remembers a per-viewer choice (e.g. cards/table) in localStorage, safely. */
export function useStoredState(key, initial) {
  const [v, setV] = useState(() => {
    try { return localStorage.getItem(key) || initial; } catch { return initial; }
  });
  const set = (next) => {
    setV(next);
    try { localStorage.setItem(key, next); } catch { /* ignore */ }
  };
  return [v, set];
}

/** Small outline button used inside cards (design PPL_BTN). */
export const CARD_BTN =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap";
export const CARD_BTN_GRAY = `${CARD_BTN} border-gray-200 text-gray-700 bg-white hover:border-one hover:text-one`;
export const CARD_BTN_RED = `${CARD_BTN} border-red-200 text-red-600 bg-white hover:bg-red-50`;

export const SELECT = "a-inp !h-10 !w-full sm:!w-auto min-w-0";

/** A short error card with a retry button. */
export const LoadError = ({ text, onRetry }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 px-4 text-center">
    <p className="font-bold text-gray-700">Couldn’t load this list</p>
    {text && <p className="text-sm text-gray-400 mt-1">{text}</p>}
    {onRetry && <button type="button" onClick={onRetry} className="a-btn mt-4">Try again</button>}
  </div>
);

/** Status pill for "active"/"inactive" rows. */
export const statusTone = (s) => (s === "active" ? "green" : "gray");
export const statusLabel = (s) => (s === "active" ? "Active" : s === "inactive" ? "Inactive" : s || "—");
