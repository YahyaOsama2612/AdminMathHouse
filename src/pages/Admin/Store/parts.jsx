// Shared pieces of the Store pages (Store → Courses / Packages, Settings → Store prices).
// Prices are per item (course / chapter / lesson) and students pay the EGP total; USD is stored alongside.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Plus, RotateCcw, Trash2 } from "lucide-react";
import api from "@/api/api";
import { errText } from "@/components/admin/kit";

// ── loading ─────────────────────────────────────────────────
/** GET `url` (null = nothing to load). Keeps the old data while reloading the same url. */
export function useLoad(url) {
  const [state, setState] = useState({ data: null, loading: Boolean(url), error: null });
  const [tick, setTick] = useState(0);
  const lastUrl = useRef(url);
  useEffect(() => {
    if (!url) { setState({ data: null, loading: false, error: null }); return undefined; }
    let alive = true;
    const same = lastUrl.current === url;
    lastUrl.current = url;
    setState((s) => ({ data: same ? s.data : null, loading: true, error: null }));
    api.get(url)
      .then((r) => alive && setState({ data: r.data?.data ?? null, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: errText(e, "Could not load this page") }));
    return () => { alive = false; };
  }, [url, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export const ErrorCard = ({ text, onRetry }) => (
  <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 text-center">
    <p className="font-bold text-gray-800">Couldn’t load this</p>
    <p className="text-sm text-gray-500 mt-1">{text}</p>
    {onRetry && <button onClick={onRetry} className="a-btn mt-4"><RotateCcw size={15} /> Try again</button>}
  </div>
);

// ── money ───────────────────────────────────────────────────
const num = (v) => Number(v || 0);
export const fmtNum = (v, digits = 2) => num(v).toLocaleString("en-US", { maximumFractionDigits: digits });
export const egp = (v) => `${fmtNum(v)} EGP`;
export const usd = (v) => `$${fmtNum(v)}`;
export const planSummary = (plans) => (plans || []).map((p) => `${p.label} ${egp(p.totalEgp)}`).join(" · ");
export const PLAN_KEY = (p) => `${String(p.label).trim()}|${Number(p.days)}`;

// ── small controls ──────────────────────────────────────────
export const INP = "w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:border-[#7d0a0a] min-w-0";

export const Switch = ({ on, onChange, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`a-switch ${on ? "on" : ""}`}><span /></button>
);

/** Course chip in the design style (filled brand chip when on), with a small hint line. */
export const CourseChip = ({ on, onClick, name, hint, warn }) => (
  <button onClick={onClick} className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors text-left max-w-full ${on ? "text-white border-transparent shadow-sm bg-one" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800"}`}>
    <span className="flex items-center gap-1.5 min-w-0">
      {warn && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${on ? "bg-amber-300" : "bg-amber-500"}`} />}
      <span className="truncate">{name}</span>
    </span>
    {hint && <span className={`block text-[10px] font-semibold mt-0.5 ${on ? "text-white/75" : "text-gray-400"}`}>{hint}</span>}
  </button>
);

export const Note = ({ tone = "amber", children }) => {
  const t = tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : tone === "red" ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-600";
  return <div className={`flex gap-2 items-start rounded-xl border px-3 py-2.5 text-xs font-semibold ${t}`}><AlertTriangle size={15} className="shrink-0 mt-px" /><div className="min-w-0">{children}</div></div>;
};

// ── plan drafts ─────────────────────────────────────────────
let seq = 0;
const key = () => `n${++seq}`;
const str = (v) => (v == null ? "" : String(Number(v)));

/** API plans → editable rows (strings for the inputs). `keepIds` false for bulk "same plans". */
export const toDraft = (plans, keepIds = true) => (plans || []).map((p) => ({
  key: key(), id: keepIds ? p.id : undefined, label: p.label || "", days: str(p.days),
  priceEgp: str(p.priceEgp), priceUsd: str(p.priceUsd), hasDiscount: Boolean(p.hasDiscount),
  discountEgp: p.hasDiscount ? str(p.discountEgp) : "", discountUsd: p.hasDiscount ? str(p.discountUsd) : "",
  enrolments: keepIds ? num(p.enrolments) : 0,
}));

export const blankRow = (last) => ({
  key: key(), id: undefined, label: last ? "New plan" : "1 Month", days: last ? String(num(last.days) * 2 || 30) : "30",
  priceEgp: last && last.priceEgp !== "" ? String(Math.round(num(last.priceEgp) * 1.2)) : "",
  priceUsd: last && last.priceUsd !== "" ? String(Math.round(num(last.priceUsd) * 1.2)) : "",
  hasDiscount: false, discountEgp: "", discountUsd: "", enrolments: 0,
});

const toN = (v) => (v === "" || v == null ? NaN : Number(v));
/** Rows → API body plans. */
export const toPayload = (rows, withIds = true) => rows.map((r) => ({
  ...(withIds && r.id ? { id: r.id } : {}),
  label: r.label.trim(), days: toN(r.days), priceEgp: toN(r.priceEgp), priceUsd: toN(r.priceUsd), hasDiscount: r.hasDiscount,
  ...(r.hasDiscount ? { discountEgp: toN(r.discountEgp || 0), discountUsd: toN(r.discountUsd || 0) } : {}),
}));

export const sameRows = (a, b) => JSON.stringify(toPayload(a)) === JSON.stringify(toPayload(b));

/** The first problem in the rows, or null. Mirrors the backend rules. */
export function checkRows(rows) {
  if (!rows.length) return "Keep at least one plan — without one the item can't be bought";
  if (rows.length > 12) return "At most 12 plans";
  for (const r of rows) {
    const name = r.label.trim() || "A plan";
    if (!r.label.trim()) return "Give every plan a name";
    const d = toN(r.days);
    if (!Number.isInteger(d) || d < 1 || d > 3650) return `${name}: days must be a whole number from 1 to 3650`;
    const pe = toN(r.priceEgp), pu = toN(r.priceUsd);
    if (!(pe >= 0)) return `${name}: enter the EGP price (0 or more)`;
    if (!(pu >= 0)) return `${name}: enter the USD price (0 or more)`;
    if (r.hasDiscount) {
      const de = toN(r.discountEgp || 0), du = toN(r.discountUsd || 0);
      if (!(de >= 0) || !(du >= 0)) return `${name}: a discount can't be negative`;
      if (de > pe || du > pu) return `${name}: a discount can't be more than the price`;
    }
  }
  const keys = rows.map((r) => `${r.label.trim()}|${toN(r.days)}`);
  if (new Set(keys).size !== keys.length) return "Two plans have the same name and days";
  return null;
}

export const rowTotal = (r, cur = "Egp") => {
  const p = num(r[`price${cur}`]), d = r.hasDiscount ? num(r[`discount${cur}`]) : 0;
  return Math.max(0, p - Math.min(d, p));
};

/** Enrolments that lose the link to their plan if `rows` replace `orig` (single item: match by id, then label + days). */
export function lostEnrolments(orig, rows, matchIds = true) {
  const ids = new Set(matchIds ? rows.map((r) => r.id).filter(Boolean) : []);
  const keys = new Set(rows.map((r) => `${r.label.trim()}|${toN(r.days)}`));
  return (orig || []).filter((p) => p.enrolments > 0 && !ids.has(p.id) && !keys.has(PLAN_KEY(p)))
    .reduce((a, p) => a + p.enrolments, 0);
}

// ── plan table editor ───────────────────────────────────────
/** Editable plan table: name, days, EGP, USD, discount, student pays, enrolments, delete. */
export function PlanEditor({ rows, onChange, showEnrolments = true, emptyText = "No plans — students can’t buy this until you add one." }) {
  const set = (k, field, value) => onChange(rows.map((r) => (r.key === k ? { ...r, [field]: value } : r)));
  const del = (k) => onChange(rows.filter((r) => r.key !== k));
  const add = () => onChange([...rows, blankRow(rows[rows.length - 1])]);
  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr>
              <th className="a-th !px-2.5">Plan name</th>
              <th className="a-th !px-2.5 w-24">Days</th>
              <th className="a-th !px-2.5 w-32">Price EGP</th>
              <th className="a-th !px-2.5 w-28">Price USD</th>
              <th className="a-th !px-2.5 w-36">Discount</th>
              <th className="a-th !px-2.5">Student pays</th>
              {showEnrolments && <th className="a-th !px-2.5 text-center">Enrolments</th>}
              <th className="a-th !px-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const total = rowTotal(r), discounted = r.hasDiscount && num(r.discountEgp) > 0;
              return (
                <tr key={r.key} className="align-top">
                  <td className="a-td !px-2.5">
                    <input value={r.label} onChange={(e) => set(r.key, "label", e.target.value)} placeholder="e.g. 3 Months" className={`${INP} font-semibold min-w-[130px]`} aria-label="Plan name" />
                    {i === 0 && <p className="text-[10px] text-gray-400 mt-1 font-semibold">Default plan</p>}
                  </td>
                  <td className="a-td !px-2.5"><input type="number" min="1" max="3650" step="1" value={r.days} onChange={(e) => set(r.key, "days", e.target.value)} className={INP} aria-label="Days" /></td>
                  <td className="a-td !px-2.5"><input type="number" min="0" step="any" value={r.priceEgp} onChange={(e) => set(r.key, "priceEgp", e.target.value)} className={INP} aria-label="Price EGP" /></td>
                  <td className="a-td !px-2.5"><input type="number" min="0" step="any" value={r.priceUsd} onChange={(e) => set(r.key, "priceUsd", e.target.value)} className={INP} aria-label="Price USD" /></td>
                  <td className="a-td !px-2.5">
                    <Switch on={r.hasDiscount} onChange={(v) => set(r.key, "hasDiscount", v)} label="Discount" />
                    {r.hasDiscount && (
                      <div className="mt-2 space-y-1.5">
                        <input type="number" min="0" step="any" value={r.discountEgp} onChange={(e) => set(r.key, "discountEgp", e.target.value)} placeholder="− EGP" className={INP} aria-label="Discount EGP" />
                        <input type="number" min="0" step="any" value={r.discountUsd} onChange={(e) => set(r.key, "discountUsd", e.target.value)} placeholder="− USD" className={INP} aria-label="Discount USD" />
                      </div>
                    )}
                  </td>
                  <td className="a-td !px-2.5 whitespace-nowrap">
                    <p className="font-extrabold text-gray-900">{egp(total)}</p>
                    {discounted && <p className="text-[11px] text-gray-400 line-through">{egp(r.priceEgp)}</p>}
                    <p className="text-[11px] text-gray-400">{usd(rowTotal(r, "Usd"))} reference</p>
                  </td>
                  {showEnrolments && (
                    <td className="a-td !px-2.5 text-center tabular-nums">
                      {r.id ? <span className={r.enrolments ? "font-bold text-gray-800" : "text-gray-400"}>{fmtNum(r.enrolments, 0)}</span> : <span className="text-[11px] text-gray-400">new</span>}
                    </td>
                  )}
                  <td className="a-td !px-2.5 text-right">
                    <button type="button" onClick={() => del(r.key)} className="a-act del" aria-label="Delete plan" title={r.enrolments ? `${r.enrolments} enrolments keep access but lose the link to this plan` : "Delete plan"}><Trash2 size={15} /></button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={showEnrolments ? 8 : 7} className="py-8 text-center text-sm text-gray-400">{emptyText}</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} disabled={rows.length >= 12} className="a-btn mt-3 !py-2 !text-xs"><Plus size={14} /> Add plan</button>
    </div>
  );
}

// ── "What the student sees" card ────────────────────────────
export const PlanCard = ({ label, days, totalEgp, priceEgp, discounted, highlight }) => (
  <div className={`rounded-2xl border p-4 ${highlight ? "border-[#7d0a0a] ring-2 ring-[#7d0a0a]/15" : "border-gray-200"}`}>
    <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 truncate">{label || "—"}</p>
    <p className="text-2xl font-extrabold text-gray-900 mt-1">{egp(totalEgp)}</p>
    <p className="text-xs text-gray-500">
      {discounted && <span className="line-through text-gray-400 mr-1.5">{egp(priceEgp)}</span>}
      {fmtNum(days, 0)} days of access
    </p>
  </div>
);
