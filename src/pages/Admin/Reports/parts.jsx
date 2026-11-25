// Shared pieces of the Reports pages (MathPortal admin design: rptKpi / rptCard / bar charts).
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen, ClipboardCheck, Coins, Download, GraduationCap, Search, Star, Users, X } from "lucide-react";
import api from "@/api/api";
import { errText } from "@/components/admin/kit";

// ── report switcher (top of every report page) ─────────────────
const REPORTS = [
  ["students", "Students", Users], ["courses", "Courses", BookOpen], ["teachers", "Teachers", GraduationCap],
  ["payments", "Payments", Coins], ["rates", "Rates", Star], ["extra-homework", "Extra H.W", ClipboardCheck],
];
export function ReportNav() {
  return (
    <nav aria-label="Reports" className="-mx-1 px-1 mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-1 bg-white border border-gray-100 shadow-sm rounded-xl p-1 w-max min-w-full sm:min-w-0">
        {REPORTS.map(([path, label, Icon]) => (
          <NavLink key={path} to={`/admin/reports/${path}`}
            className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${isActive ? "bg-one text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// ── sortable tables ───────────────────────────────────────────
/** Sort rows by a key (or a function). Click the same header again to flip the order. */
export function useSort(list, initial = null) {
  const [sort, setSort] = useState(initial); // { key, dir: "asc" | "desc", get? }
  const sorted = useMemo(() => {
    if (!sort) return list;
    const get = sort.get || ((r) => r[sort.key]);
    const d = sort.dir === "desc" ? -1 : 1;
    return [...list].sort((a, b) => {
      const x = get(a), y = get(b);
      // empty values (no rating yet, no price…) always go to the bottom
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return d * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)));
    });
  }, [list, sort]);
  const toggle = (key, get, firstDir = "desc") => setSort((s) => (s?.key === key ? { key, get, dir: s.dir === "desc" ? "asc" : "desc" } : { key, get, dir: firstDir }));
  return { sorted, sort, toggle };
}

/** Header cell. With `k` it sorts; without, it is a plain header. */
export function Th({ children, k, get, s, first = "desc", className = "" }) {
  if (!k || !s) return <th className={`a-th ${className}`}>{children}</th>;
  const on = s.sort?.key === k;
  const Icon = !on ? ArrowUpDown : s.sort.dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <th className={`a-th ${className}`} aria-sort={on ? (s.sort.dir === "desc" ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => s.toggle(k, get, first)} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-800 ${on ? "text-gray-800" : ""}`}>
        {children} <Icon size={12} className={on ? "text-one" : "opacity-40"} />
      </button>
    </th>
  );
}

/** Table frame: rounded border, sticky header, horizontal scroll on small screens. */
export const RTable = ({ children, maxH, className = "" }) => (
  <div className={`overflow-x-auto rounded-xl border border-gray-100 ${maxH ? "overflow-y-auto" : ""} ${className}`} style={maxH ? { maxHeight: maxH } : undefined}>
    <table className="w-full text-sm [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-[1] [&_thead]:bg-gray-50">{children}</table>
  </div>
);

export const SearchBox = ({ value, onChange, placeholder = "Search…", className = "" }) => (
  <label className={`relative block ${className}`}>
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="a-inp !py-2 !pl-9" />
  </label>
);

/** Filter chips: [[value, label, count?]] */
export const Chips = ({ value, onChange, options }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(([v, label, n]) => (
      <button key={v} type="button" onClick={() => onChange(v)} className={`a-chip ${value === v ? "on" : ""}`}>
        {label}{n != null && <span className="ml-1 opacity-70">{n}</span>}
      </button>
    ))}
  </div>
);

/** Large panel sliding in from the right — for details that need room (tables, tabs). */
export function Drawer({ title, sub, onClose, actions, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end bg-gray-900/40 backdrop-blur-[2px] whitespace-normal text-left" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="h-full w-full max-w-5xl bg-gray-50 shadow-2xl flex flex-col animate-[rep-slide_.18s_ease-out]" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Details"}>
        <style>{"@keyframes rep-slide{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}"}</style>
        <header className="bg-white border-b border-gray-100 px-5 sm:px-6 py-4 flex items-start gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-gray-900 truncate">{title}</h2>
            {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
          </div>
          {actions}
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0" aria-label="Close"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** "▲ 12% vs previous period" — green up / red down; nothing when there is no base to compare. */
export function Delta({ now, before, label = "vs previous period", invert = false }) {
  if (before == null || now == null) return null;
  if (!before) return now ? <span className="text-[11px] font-bold text-green-700">New this period</span> : <span className="text-[11px] text-gray-400">No change {label}</span>;
  const p = Math.round(((now - before) / before) * 100);
  const good = invert ? p < 0 : p > 0;
  return (
    <span className={`text-[11px] font-bold ${p === 0 ? "text-gray-400" : good ? "text-green-700" : "text-red-600"}`} title={`${before.toLocaleString()} ${label}`}>
      {p > 0 ? "▲" : p < 0 ? "▼" : "•"} {Math.abs(p)}% <span className="font-normal text-gray-400">{label}</span>
    </span>
  );
}

/** Small number tile used inside detail panels. */
export const MiniStat = ({ label, value, sub, tone = "gray" }) => {
  const t = { gray: "text-gray-900", green: "text-green-700", red: "text-one", amber: "text-amber-700", blue: "text-blue-700" }[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">{label}</p>
      <p className={`text-xl font-extrabold leading-tight mt-0.5 truncate ${t}`} title={String(value)}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 truncate" title={String(sub)}>{sub}</p>}
    </div>
  );
};

/** GET a report; returns { data, loading, error, reload }. */
export function useReport(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return undefined; // nothing to load (e.g. a view that is not open)
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(url)
      .then((r) => alive && setState({ data: r.data?.data ?? null, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: errText(e, "Could not load the report") }));
    return () => { alive = false; };
  }, [url, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

/** KPI card with a coloured glyph tile (design: rptKpi). */
export const Kpi = ({ label, value, sub, bg = "#fdecec", fg = "#7d0a0a", icon: Icon, delta }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 min-w-0">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}>
      {Icon && <Icon size={22} />}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`${String(value).length > 11 ? "text-lg" : "text-[24px]"} font-extrabold text-gray-800 leading-tight truncate`} title={String(value)}>{value}</div>
      {sub && <div className="text-xs text-gray-400 truncate" title={typeof sub === "string" ? sub : undefined}>{sub}</div>}
      {delta && <div className="truncate">{delta}</div>}
    </div>
  </div>
);

/** White card with a title + subtitle (design: rptCard). */
export const RCard = ({ title, sub, right, children, className = "" }) => (
  <section className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 min-w-0 ${className}`}>
    {(title || right) && (
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          {title && <h3 className="font-bold text-gray-800 text-[15px]">{title}</h3>}
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        {right}
      </div>
    )}
    {children}
  </section>
);

/** Horizontal bar chart (design: Chart.js indexAxis 'y'). */
export function HBars({ rows, color = "#7d0a0a", max, format = (v) => v, height, empty = "Nothing to show yet" }) {
  if (!rows.length) return <p className="text-sm text-gray-400 py-10 text-center">{empty}</p>;
  const h = height || Math.max(160, rows.length * 34 + 30);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" domain={[0, max ?? "auto"]} allowDecimals={false} tickFormatter={format} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false}
            tickFormatter={(v) => (String(v).length > 20 ? `${String(v).slice(0, 19)}…` : v)} />
          <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v) => [format(v), ""]} separator=""
            contentStyle={{ background: "#0f172a", border: 0, borderRadius: 8, color: "#fff", fontSize: 12 }} labelStyle={{ color: "#fff", fontWeight: 700 }} itemStyle={{ color: "#fff" }} />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Small progress bar with the % (design: homework report `bar`). */
export const PctBar = ({ value }) => {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const c = v >= 80 ? "#16a34a" : v >= 50 ? "#f59e0b" : "#dc2626";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${v}%`, background: c }}></span></span>
      <b className="text-xs text-gray-700 w-9 text-right">{v}%</b>
    </div>
  );
};

/** 1–10 score → "4.5 ★" (stars out of 5). */
export const stars = (score10) => (score10 == null ? "—" : `${(Number(score10) / 2).toFixed(1)} ★`);
export const money = (n) => `${Math.round(Number(n) || 0).toLocaleString("en-US")} EGP`;
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const dayStr = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Download rows as a CSV file (Excel opens it). */
export function downloadCsv(name, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const CsvButton = ({ onClick }) => (
  <button onClick={onClick} className="a-btn"><Download size={15} /> Export CSV</button>
);

// ── date range (Teachers + Payments) ─────────────────────────
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function presetRange(key) {
  const now = new Date();
  if (key === "last_month") return { from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (key === "last_30") { const f = new Date(now); f.setDate(f.getDate() - 29); return { from: ymd(f), to: ymd(now) }; }
  if (key === "year") return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}
const PRESETS = [["this_month", "This month"], ["last_month", "Last month"], ["last_30", "Last 30 days"], ["year", "This year"]];

/** Preset chips + two date inputs. value = { key, from, to }. */
export function RangePicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(([k, l]) => (
        <button key={k} onClick={() => onChange({ key: k, ...presetRange(k) })} className={`a-chip ${value.key === k ? "on" : ""}`}>{l}</button>
      ))}
      <input type="date" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, key: "custom", from: e.target.value })} className="a-inp !w-auto !py-1.5 text-xs" aria-label="From" />
      <span className="text-xs text-gray-400">to</span>
      <input type="date" value={value.to} min={value.from} onChange={(e) => e.target.value && onChange({ ...value, key: "custom", to: e.target.value })} className="a-inp !w-auto !py-1.5 text-xs" aria-label="To" />
    </div>
  );
}

/** Loading / error wrapper for a whole report page. */
export function ReportState({ loading, error, onRetry, children }) {
  if (error) return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
      <p className="font-bold text-gray-800">{error}</p>
      <button onClick={onRetry} className="a-btn mt-3">Try again</button>
    </div>
  );
  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-24"></div>)}</div>
      <div className="skel h-72"></div>
    </div>
  );
  return children;
}
