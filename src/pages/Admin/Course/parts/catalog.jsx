// Building blocks for the course catalog pages (Categories → Courses → Semesters → Chapters → Lessons),
// in the MathPortal "Categories" workspace design. Presentation only: no API calls live here.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import AddPage from "@/components/AddPage";
import { Modal } from "@/components/admin/kit";

/* ---------- thumbnails ---------- */
const HUES = ["#7d0a0a", "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#475569"];

export function Thumb({ src, name = "", size = 44 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const box = { width: size, height: size };
  if (src && !broken) {
    return <img src={src} alt="" onError={() => setBroken(true)} className="rounded-xl object-cover shrink-0 border border-gray-100 bg-gray-50" style={box} />;
  }
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const w = String(name).replace(/[^A-Za-z0-9؀-ۿ ]/g, " ").trim().split(/\s+/);
  const ini = (((w[0] || "?")[0] || "?") + ((w[1] || "")[0] || (w[0] || "")[1] || "")).toUpperCase();
  return (
    <span className="rounded-xl flex items-center justify-center text-white font-extrabold shrink-0 select-none" style={{ ...box, background: HUES[h % HUES.length], fontSize: Math.round(size * 0.34) }} aria-hidden="true">
      {ini}
    </span>
  );
}

const initials = (n = "") => String(n).trim().split(/\s+/).slice(0, 2).map((x) => x[0] || "").join("").toUpperCase() || "?";

/** Overlapping teacher avatars (photo when there is one, else initials). */
export function Avatars({ people = [], max = 3 }) {
  if (!people.length) return null;
  return (
    <span className="flex -space-x-2">
      {people.slice(0, max).map((p, i) =>
        p.avatar ? (
          <img key={i} src={p.avatar} alt="" title={p.name} className="w-7 h-7 rounded-full border-2 border-white object-cover bg-gray-100" />
        ) : (
          <span key={i} title={p.name} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-extrabold text-white bg-one">
            {initials(p.name)}
          </span>
        ),
      )}
      {people.length > max && (
        <span className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-extrabold text-gray-600 bg-gray-100">+{people.length - max}</span>
      )}
    </span>
  );
}

/* ---------- small pieces ---------- */
const CHIP_TONES = {
  gray: "bg-gray-100 text-gray-600",
  faint: "bg-gray-50 text-gray-400",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-800",
  green: "bg-green-50 text-green-700",
  brand: "bg-red-50 text-one",
  purple: "bg-purple-50 text-purple-700",
};
export const Chip = ({ tone = "gray", title, children }) => (
  <span title={title} className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${CHIP_TONES[tone] || CHIP_TONES.gray}`}>{children}</span>
);

/** Row action icon button (kit `a-act`); stops the click from opening the card behind it. */
export const IconBtn = ({ title, onClick, danger = false, disabled = false, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
    onKeyDown={(e) => e.stopPropagation()}
    className={`a-act shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${danger ? "del" : ""}`}
  >
    {children}
  </button>
);

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;

export const FieldLabel = ({ children }) => (
  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{children}</span>
);

export const SEL = "a-inp h-10 py-0";

export const MiniStat = ({ label, value, color }) => (
  <div className="rounded-xl bg-gray-50/80 border border-gray-100 px-3 py-2 min-w-0">
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 truncate">{label}</p>
    <p className="text-lg font-extrabold tabular-nums truncate" style={{ color: color || "#111827" }}>{value}</p>
  </div>
);

/** Progress bar like the design's "both PDFs ready" meter. */
export const Bar = ({ done, all }) => (
  <span className="flex items-center gap-2 min-w-[110px]">
    <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <span className="block h-full rounded-full" style={{ width: `${all ? Math.round((done / all) * 100) : 0}%`, background: done === all && all ? "#15803d" : "#d97706" }} />
    </span>
    <span className="text-[11px] font-bold text-gray-500 tabular-nums">{done}/{all}</span>
  </span>
);

export const EmptyBox = ({ title, text, children }) => (
  <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center px-4">
    <p className="font-bold text-gray-700">{title}</p>
    {text && <p className="text-sm text-gray-400">{text}</p>}
    {children}
  </div>
);

/* ---------- breadcrumbs ---------- */
/** items: [{ label, to?, state? }] — the last item is the current page. */
export function Crumbs({ items = [] }) {
  const list = items.filter((x) => x && x.label);
  return (
    <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-gray-400" aria-label="Breadcrumb">
      {list.map((c, i) => {
        const last = i === list.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {last || !c.to ? (
              <span className={`truncate max-w-[220px] ${last ? "text-gray-700" : ""}`} aria-current={last ? "page" : undefined}>{c.label}</span>
            ) : (
              <Link to={c.to} state={c.state} className="truncate max-w-[220px] hover:text-one hover:underline">{c.label}</Link>
            )}
            {!last && <span aria-hidden="true" className="text-gray-300">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

/** Header card of a drill-down page: crumbs, thumbnail, kicker, title, chips, actions and mini stats. */
export function HeroCard({ crumbs, thumb, kicker, title, desc, chips, actions, stats }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-4">
      {crumbs && <Crumbs items={crumbs} />}
      <div className="flex flex-wrap items-start gap-4 mt-3">
        {thumb}
        <div className="min-w-0 flex-1 basis-64">
          {kicker && <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">{kicker}</p>}
          <h1 className="font-bold text-2xl text-gray-900 leading-tight break-words">{title}</h1>
          {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
          {chips && <div className="flex flex-wrap items-center gap-1.5 mt-2">{chips}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
          {stats.map((s) => <MiniStat key={s.label} {...s} />)}
        </div>
      )}
    </div>
  );
}

export function PageSkeleton({ cards = 4 }) {
  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="skel h-3 w-48 mb-4" />
        <div className="flex gap-4">
          <div className="skel w-14 h-14 rounded-xl" />
          <div className="flex-1 space-y-2"><div className="skel h-3 w-24" /><div className="skel h-6 w-64 max-w-full" /><div className="skel h-3 w-80 max-w-full" /></div>
        </div>
      </div>
      <div className="space-y-3">{Array.from({ length: cards }).map((_, i) => <div key={i} className="skel h-20 rounded-2xl" />)}</div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div>
      <div className="skel h-3 w-56 mb-4" />
      <div className="skel h-7 w-64 max-w-full mb-4" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-2"><div className="skel h-3 w-24" /><div className="skel h-10" /></div>)}
      </div>
    </div>
  );
}

/** Add/edit form: breadcrumbs above the shared AddPage form. */
export function CatalogForm({ crumbs, ...props }) {
  return (
    <div className="max-w-6xl">
      {crumbs && <div className="mb-3"><Crumbs items={crumbs} /></div>}
      <AddPage {...props} />
    </div>
  );
}

/* ---------- price plans (read-only view of row.prices) ---------- */
const money = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("en-US"));

export function PlansModal({ open, row, onClose }) {
  if (!open) return null;
  const plans = row?.prices || [];
  return (
    <Modal title="Price plans" onClose={onClose} wide actions={<button type="button" onClick={onClose} className="a-btn primary">Close</button>}>
      {row?.name && <p className="text-xs text-gray-400 -mt-1 mb-3">{row.name}</p>}
      {plans.length ? (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70">
                <th className="a-th">Plan</th>
                <th className="a-th">Days</th>
                <th className="a-th">EGP</th>
                <th className="a-th">USD</th>
                <th className="a-th">Discount</th>
                <th className="a-th">Total EGP</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p, i) => (
                <tr key={p.id || i} className="a-tr">
                  <td className="a-td">
                    <span className="font-semibold text-gray-800">{p.durationLabel || "Plan"}</span>
                    {p.isDefault && <span className="ml-2"><Chip tone="green">Default</Chip></span>}
                  </td>
                  <td className="a-td tabular-nums">{p.durationDays ?? "—"}</td>
                  <td className="a-td tabular-nums">{money(p.priceEgp)}</td>
                  <td className="a-td tabular-nums">{money(p.priceUsd)}</td>
                  <td className="a-td tabular-nums">{p.hasDiscount ? <span className="text-green-700 font-semibold">{money(p.discountEgp)} EGP / {money(p.discountUsd)} USD</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="a-td tabular-nums font-bold text-gray-900">{money(p.totalPriceEgp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-400 py-8">No price plans available</p>
      )}
    </Modal>
  );
}

/* ---------- ordering ----------
   The backend only swaps the order of two items (PATCH …/swap-order). Moving an item to another place is
   done as a chain of swaps with each neighbour on the way, which lands it exactly where it was dropped. */
export async function moveBySwaps(ids, fromId, toId, swap) {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return false;
  const step = to > from ? 1 : -1;
  for (let i = from + step; step > 0 ? i <= to : i >= to; i += step) {
    await swap(fromId, ids[i]);
  }
  return true;
}

/** Drag-and-drop state. Rows only become draggable while the ⋮⋮ handle is held. */
export function useDragRows(onMove) {
  const [armed, setArmed] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  useEffect(() => {
    const up = () => setArmed(null);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);
  const handle = (id) => ({
    onMouseDown: () => setArmed(id),
    onClick: (e) => e.stopPropagation(),
  });
  const row = (id, enabled = true) =>
    !enabled
      ? {}
      : {
          draggable: armed === id,
          onDragStart: (e) => {
            setDrag(id);
            e.dataTransfer.effectAllowed = "move";
            try { e.dataTransfer.setData("text/plain", String(id)); } catch { /* ignore */ }
          },
          onDragEnd: () => { setDrag(null); setOver(null); setArmed(null); },
          onDragOver: (e) => {
            if (!drag || drag === id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (over !== id) setOver(id);
          },
          onDragLeave: (e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOver((o) => (o === id ? null : o));
          },
          onDrop: (e) => {
            e.preventDefault();
            const from = drag;
            setDrag(null); setOver(null); setArmed(null);
            if (from && from !== id) onMove(from, id);
          },
        };
  return { drag, over, handle, row };
}

/** Order number box: type another item's order number to swap places with it (Enter or leave the box). */
export function OrderInput({ row, rows, onSwap, disabled }) {
  const [val, setVal] = useState(row.order);
  useEffect(() => setVal(row.order), [row.order]);

  const commit = async () => {
    const n = parseInt(val, 10);
    if (Number.isNaN(n) || n === row.order) {
      if (String(val) !== String(row.order)) toast.error("Please enter a valid order number different from the current one.");
      setVal(row.order);
      return;
    }
    const target = rows.find((r) => r.id !== row.id && Number(r.order) === n);
    if (!target) {
      toast.error("Order number out of range. Please enter a valid order.");
      setVal(row.order);
      return;
    }
    try {
      await onSwap(row, target);
    } catch {
      setVal(row.order);
    }
  };

  return (
    <input
      type="number"
      value={val ?? ""}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); }}
      disabled={disabled}
      title="Order — type another number to swap places"
      aria-label={`Order of ${row.name}`}
      className="w-12 h-8 text-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600 tabular-nums focus:outline-none focus:border-one focus:ring-2 focus:ring-[#7d0a0a]/10 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}
