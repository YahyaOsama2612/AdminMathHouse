// Shared pieces of the Reports pages (MathPortal admin design: rptKpi / rptCard / bar charts).
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import api from "@/api/api";
import { errText } from "@/components/admin/kit";

/** GET a report; returns { data, loading, error, reload }. */
export function useReport(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
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
export const Kpi = ({ label, value, sub, bg = "#fdecec", fg = "#7d0a0a", icon: Icon }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 min-w-0">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}>
      {Icon && <Icon size={22} />}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`${String(value).length > 11 ? "text-lg" : "text-[24px]"} font-extrabold text-gray-800 leading-tight truncate`} title={String(value)}>{value}</div>
      {sub && <div className="text-xs text-gray-400 truncate">{sub}</div>}
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
