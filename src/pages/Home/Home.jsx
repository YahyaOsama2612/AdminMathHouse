import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import Errorpage from "@/components/Errorpage";

/* Home dashboard (MathPortal admin design). Data: GET /api/admin/dashboard?filter=… */

// The map (ECharts + world outline) only loads on Home.
const StudentsMap = lazy(() => import("./StudentsMap"));

/* Periods as in the design: last 7 days, this month, or a custom range of months / weeks.
   The backend understands filter=last_7_days | this_month | custom&startDate&endDate. */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const thisMonthStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
function isoWeekStr(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${pad(w)}`;
}
/** "2026-W45" -> Monday of that ISO week. */
function weekStart(str) {
  const [y, w] = str.split("-W").map(Number);
  const jan4 = new Date(y, 0, 4), mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
  return mon;
}
function customRange(cf) {
  if (!cf.f || !cf.t) return null;
  if (cf.type === "month") {
    const [fy, fm] = cf.f.split("-").map(Number), [ty, tm] = cf.t.split("-").map(Number);
    const from = new Date(fy, fm - 1, 1), to = new Date(ty, tm, 0);
    return from <= to ? { from: ymd(from), to: ymd(to) } : null;
  }
  const from = weekStart(cf.f), to = weekStart(cf.t);
  to.setDate(to.getDate() + 6);
  return from <= to ? { from: ymd(from), to: ymd(to) } : null;
}
/** Where each "needs attention" item opens. */
const ATTENTION_ROUTE = {
  pending_receipts: "/admin/payment/paymentrecharge",
  free_times: "/admin/live/availability-plans",
  low_sessions: "/admin/users/students",
  overdue_installments: "/admin/payment/paymentpackage",
  teacher_requests: "/admin/live/teacher?tab=requests",
  cancel_requests: "/admin/live/cancellation",
};
const TONE = { high: "#dc2626", medium: "#f59e0b", low: "#94a3b8" };
// Same colours as the map dots (StudentsMap.jsx)
const COUNTRY_COLORS = { Egypt: "#166534", "Saudi Arabia": "#65a30d", UAE: "#1d4ed8", Qatar: "#0d9488", Kuwait: "#a16207", UK: "#7c3aed", USA: "#94a3b8" };
const toFive = (v) => (Number(v) > 5 ? Number(v) / 2 : Number(v)); // ratings are stored 1–10

function Kpi({ label, icon, value, change, changeType, sub }) {
  const flat = change == null || Math.abs(Number(change)) < 0.5;
  const up = changeType === "increase";
  return (
    <div className="hm-kpi">
      <div className="flex items-center justify-between"><span className="hm-kpi-label">{label}</span><span className="hm-kpi-icon">{icon}</span></div>
      <div className="hm-kpi-value">{value}</div>
      <div className="flex items-center gap-2 text-xs min-w-0">
        {change != null && (flat
          ? <span className="text-gray-400 font-semibold whitespace-nowrap">— same</span>
          : <span className={`font-bold whitespace-nowrap ${up ? "text-green-700" : "text-red-600"}`}>{up ? "▲" : "▼"} {Math.abs(Number(change)).toFixed(0)}%</span>)}
        <span className="text-gray-400 truncate">{sub}</span>
      </div>
    </div>
  );
}

const HmCard = ({ title, sub, right, children, className = "" }) => (
  <div className={`hm-card ${className}`}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div><h3 className="hm-title">{title}</h3>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
      {right}
    </div>
    {children}
  </div>
);

/** Horizontal bar chart like the design: the top `highlight` bars in brand red, the rest tinted. */
function HBars({ rows, empty, highlight = 1 }) {
  if (!rows.length) return <p className="text-sm text-gray-400 py-8 text-center" style={{ height: 240 }}>{empty}</p>;
  const data = rows.slice(0, 8);
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => (String(v).length > 16 ? `${String(v).slice(0, 15)}…` : v)} />
          <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v) => [v, ""]} separator=""
            contentStyle={{ background: "#0f172a", border: 0, borderRadius: 8, color: "#fff", fontSize: 12 }} labelStyle={{ color: "#fff", fontWeight: 700 }} itemStyle={{ color: "#fff" }} />
          <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={16}>
            {data.map((r, i) => <Cell key={`${r.label}-${i}`} fill={i < highlight ? "#7d0a0a" : "#e9cfcf"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("last_7_days");
  // Custom range: months or ISO weeks, applied with the Apply button (design).
  const [cf, setCf] = useState(() => ({ type: "month", f: thisMonthStr(), t: thisMonthStr() }));
  const [applied, setApplied] = useState(null);
  const query = period === "custom" && applied
    ? `filter=custom&startDate=${applied.from}&endDate=${applied.to}`
    : `filter=${period === "custom" ? "last_7_days" : period}`;
  const { data, loading, error } = useGet(`/api/admin/dashboard?${query}`);
  const setCustomType = (type) => setCf(type === "month"
    ? { type, f: thisMonthStr(), t: thisMonthStr() }
    : { type, f: isoWeekStr(new Date(Date.now() - 21 * 864e5)), t: isoWeekStr(new Date()) });
  const applyCustom = () => setApplied(customRange(cf));
  const [extra, setExtra] = useState([]);

  // Teacher and student requests also wait for an admin
  useEffect(() => {
    Promise.all([
      api.get("/api/admin/teacher-requests?status=pending").then((r) => r.data?.data?.count ?? 0).catch(() => 0),
      api.get("/api/admin/student-cancel-requests?status=pending").then((r) => r.data?.data?.count ?? 0).catch(() => 0),
    ]).then(([t, c]) => setExtra([
      { key: "teacher_requests", label: "Teacher requests", description: "Cover and cancel requests to answer", count: t, severity: "medium" },
      { key: "cancel_requests", label: "Student cancel requests", description: "Answer before the session starts", count: c, severity: "high" },
    ]));
  }, []);

  if (error && !data) return <Errorpage error={error} />;
  const d = data?.data;
  const k = d?.kpis || {};
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const todo = [...(d?.needsAttention?.items || []), ...extra].filter((i) => i.count > 0);
  const todoN = todo.reduce((a, i) => a + i.count, 0);
  // Up to 2 weeks: one bar per day. Longer ranges: one bar per 7 days (design's bucketize).
  const days = d?.chart?.data || [];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mdy = (s) => { const [, m, dd] = String(s).split("-").map(Number); return `${MON[m - 1]} ${dd}`; };
  const chart = days.length <= 14
    ? days.map((r) => ({ label: r.label, Sessions: r.sessions, Students: r.students }))
    : Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => {
        const wk = days.slice(i * 7, i * 7 + 7);
        const a = mdy(wk[0].date), b = mdy(wk[wk.length - 1].date);
        return {
          label: a.split(" ")[0] === b.split(" ")[0] ? `${a}–${b.split(" ")[1]}` : `${a}–${b}`,
          Sessions: wk.reduce((x, r) => x + r.sessions, 0),
          Students: wk.reduce((x, r) => x + r.students, 0),
        };
      });
  const rating = k.teacherRating?.value != null ? toFive(k.teacherRating.value) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-gray-400">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          <h1 className="font-bold text-2xl text-gray-800 tracking-tight">{greet}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[["last_7_days", "Last 7 days"], ["this_month", "This month"], ["custom", "Custom"]].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${period === v ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>{l}</button>
            ))}
          </div>
          {period === "custom" && (
            <>
              <span className="flex items-center gap-1">
                {[["month", "Months"], ["week", "Weeks"]].map(([v, l]) => (
                  <button key={v} onClick={() => setCustomType(v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${cf.type === v ? "border-one text-one bg-red-50" : "border-gray-200 text-gray-500 bg-white"}`}>{l}</button>
                ))}
              </span>
              <input type={cf.type} value={cf.f} onChange={(e) => setCf({ ...cf, f: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" aria-label="From" />
              <span className="text-gray-400 text-xs">to</span>
              <input type={cf.type} value={cf.t} onChange={(e) => setCf({ ...cf, t: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" aria-label="To" />
              <button onClick={applyCustom} disabled={!customRange(cf)} className="bg-one text-white text-xs font-bold px-3.5 py-2 rounded-lg disabled:opacity-40">Apply</button>
            </>
          )}
        </div>
      </div>

      {!d ? (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skel h-28"></div>)}</div>
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
            <Kpi label="Sessions" icon="▦" value={(k.sessions?.value ?? 0).toLocaleString()} change={k.sessions?.change} changeType={k.sessions?.changeType} sub={k.sessions?.subLabel} />
            <Kpi label="Students attended" icon="👥" value={(k.studentsAttended?.value ?? 0).toLocaleString()} change={k.studentsAttended?.change} changeType={k.studentsAttended?.changeType} sub={k.studentsAttended?.subLabel} />
            <Kpi label="Avg per session" icon="◎" value={Number(k.avgPerSession?.value ?? 0).toFixed(1)} change={k.avgPerSession?.change} changeType={k.avgPerSession?.changeType} sub={k.avgPerSession?.subLabel} />
            <Kpi label="Collected" icon="£" value={<>{Number(k.collected?.value ?? 0).toLocaleString()} <span className="text-base font-bold text-gray-400">{k.collected?.currency || "LE"}</span></>} sub={k.collected?.subLabel} />
            <Kpi label="Teacher rating" icon="★" value={rating != null ? <>{rating.toFixed(1)} <span className="text-base text-amber-500">★</span></> : "—"} sub={k.teacherRating?.subLabel} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
            <HmCard title={d.chart?.title || "Sessions & attendance"} sub={d.chart?.subLabel} className="xl:col-span-2">
              <div style={{ height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {/* Design (Chart.js): brand bars = sessions on the left axis; a smooth slate line with a soft
                      area = students on the right axis; legend top-right with round markers; dark tooltip. */}
                  <ComposedChart data={chart} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} barCategoryGap="22%">
                    <defs>
                      <linearGradient id="hm-students-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#334155" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#334155" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                    <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip cursor={{ fill: "rgba(125,10,10,0.04)" }}
                      contentStyle={{ background: "#0f172a", border: 0, borderRadius: 8, color: "#fff", fontSize: 12, padding: "8px 10px" }}
                      labelStyle={{ color: "#fff", fontWeight: 700, marginBottom: 2 }} itemStyle={{ color: "#fff", padding: 0 }} />
                    <Legend verticalAlign="top" align="right" height={26}
                      content={() => (
                        <div className="flex justify-end gap-4 text-[11px] text-gray-600 pr-1">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-slate-700 bg-white"></span>Students</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#7d0a0a" }}></span>Sessions</span>
                        </div>
                      )} />
                    <Bar yAxisId="l" dataKey="Sessions" fill="#7d0a0a" radius={[6, 6, 0, 0]} maxBarSize={28} activeBar={{ fill: "#5a0707" }} />
                    <Area yAxisId="r" type="monotone" dataKey="Students" stroke="#334155" strokeWidth={2} fill="url(#hm-students-fill)"
                      dot={{ r: 3, fill: "#fff", stroke: "#334155", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#fff", stroke: "#334155", strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </HmCard>
            <div className="hm-card flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div><h3 className="hm-title">Needs attention</h3><p className="text-xs text-gray-400">{todoN ? `${todoN} items across ${todo.length} areas` : "Everything is up to date"}</p></div>
                {todoN > 0 && <span className="text-xs font-extrabold text-white rounded-full px-2.5 py-1" style={{ background: "#7d0a0a" }}>{todoN}</span>}
              </div>
              {todo.length ? (
                <div className="flex flex-col -mx-2 overflow-y-auto" style={{ maxHeight: 270 }}>
                  {todo.map((t) => (
                    <button key={t.key} onClick={() => ATTENTION_ROUTE[t.key] && navigate(ATTENTION_ROUTE[t.key])} className="hm-todo">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TONE[t.severity] || TONE.low }}></span>
                      <span className="flex-1 min-w-0 text-left"><span className="block text-sm font-semibold text-gray-800 truncate">{t.label}</span><span className="block text-[11px] text-gray-400 truncate">{t.description}</span></span>
                      <span className="text-sm font-extrabold text-gray-800">{t.count}</span><span className="text-gray-300">›</span>
                    </button>
                  ))}
                </div>
              ) : <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-10">✓ Nothing waiting</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
            <HmCard title="Sessions per teacher" sub="Selected period">
              <HBars highlight={1} rows={(d.sessionsPerTeacher || []).map((t) => ({ label: t.teacherName, value: t.sessionCount }))} empty="No sessions in this period" />
            </HmCard>
            <HmCard title="Students per course" sub="Enrolled right now">
              <HBars highlight={3} rows={(d.studentsPerCourse || []).map((c) => ({ label: c.courseName, value: c.studentCount }))} empty="No enrolments yet" />
            </HmCard>
            <HmCard title="Students per country" sub="Enrolled right now">
              <HBars highlight={3} rows={(d.studentsPerCountry || []).map((c) => ({ label: c.country || "Unknown", value: c.studentCount }))} empty="No data yet" />
            </HmCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          <div className="hm-card xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div><h3 className="hm-title">Where students join from</h3><p className="text-xs text-gray-400">Each dot is a student · drag to move, scroll to zoom</p></div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {(d.studentsPerCountry || []).slice(0, 5).map((c) => (
                  <span key={c.country} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: COUNTRY_COLORS[c.country] || "#94a3b8" }}></span>
                    {c.country} <b className="text-gray-700">{c.studentCount}</b>
                  </span>
                ))}
              </div>
            </div>
            <Suspense fallback={<div className="skel" style={{ height: 320 }}></div>}>
              <StudentsMap rows={d.studentsPerCountry || []} />
            </Suspense>
          </div>
          <HmCard title="Top teachers" sub="By student rating · selected period" right={<button onClick={() => navigate("/admin/live/session-ratings")} className="text-xs font-bold text-one hover:underline">All session ratings →</button>}>
            {(d.topTeachers || []).length ? (d.topTeachers || []).map((t, i, arr) => (
              <div key={t.teacherId} className={`flex items-center gap-3 py-2.5 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                <span className="text-xs font-extrabold text-gray-300 w-4">{i + 1}</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${i === 0 ? "text-white" : "text-gray-600 bg-gray-100"}`} style={i === 0 ? { background: "#7d0a0a" } : undefined}>{t.initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-800 text-sm">{t.teacherName}</div>
                  <div className="text-xs text-gray-400">{t.sessionCount} sessions · {t.studentCount} students</div>
                  <div className="h-1 rounded-full bg-gray-100 mt-1.5 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${(toFive(t.avgRating) / 5) * 100}%`, background: i === 0 ? "#7d0a0a" : "#d4a5a5" }}></span></div>
                </div>
                <div className="font-extrabold text-sm text-gray-800 whitespace-nowrap">{toFive(t.avgRating).toFixed(1)} <span className="text-amber-500">★</span></div>
              </div>
            )) : <p className="text-sm text-gray-400 py-6 text-center">No ratings in this period yet.</p>}
          </HmCard>
          </div>
        </div>
      )}
    </div>
  );
}
