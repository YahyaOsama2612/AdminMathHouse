import React, { useState, useMemo } from "react";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FaCalendarAlt,
  FaUserGraduate,
  FaUsers,
  FaWallet,
  FaStar,
  FaChalkboardTeacher,
  FaBook,
  FaGlobe,
  FaCheckCircle,
  FaTrophy,
  FaBell,
  FaChevronDown,
} from "react-icons/fa";
import { MdTrendingUp, MdTrendingDown } from "react-icons/md";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const severityConfig = {
  high: {
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700",
    text: "text-red-700",
  },
  medium: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
  },
  low: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-400",
    badge: "bg-blue-100 text-blue-700",
    text: "text-blue-600",
  },
};

const PERIOD_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "This Month", value: "this_month" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconBg, title, value, change, changeType, subLabel, currency }) {
  const isIncrease = changeType === "increase";
  const hasChange = change !== undefined && change !== null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="text-white" size={20} />
        </div>
        {hasChange && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              isIncrease ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {isIncrease ? <MdTrendingUp size={14} /> : <MdTrendingDown size={14} />}
            {change}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">
          {currency ? `${value} ${currency}` : value}
        </p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>
      </div>
      {subLabel && (
        <p className="text-xs text-gray-400 border-t border-gray-50 pt-2">{subLabel}</p>
      )}
    </div>
  );
}

function SectionCard({ title, children, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-[#7D0A0A]/10 flex items-center justify-center">
            <Icon className="text-[#7D0A0A]" size={14} />
          </div>
        )}
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function BarListItem({ label, value, total, rank }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rank !== undefined && (
            <span className="text-xs font-bold text-gray-400 w-4">#{rank + 1}</span>
          )}
          <span className="text-sm text-gray-700 font-medium truncate max-w-[160px]">{label}</span>
        </div>
        <span className="text-sm font-bold text-gray-800">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-[#7D0A0A] to-[#BF3131] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AttentionItem({ item }) {
  const cfg = severityConfig[item.severity] || severityConfig.low;
  const hasItems = item.count > 0;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${
        hasItems ? `${cfg.bg} ${cfg.border}` : "bg-gray-50 border-gray-100"
      } transition-all duration-200`}
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasItems ? cfg.dot : "bg-gray-300"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${hasItems ? "text-gray-800" : "text-gray-400"}`}>
          {item.label}
        </p>
        <p className="text-xs text-gray-400 truncate">{item.description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-lg font-bold ${hasItems ? cfg.text : "text-gray-300"}`}>
          {item.count}
        </span>
        {hasItems && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {item.severity}
          </span>
        )}
        {!hasItems && <FaCheckCircle className="text-emerald-400" size={14} />}
      </div>
    </div>
  );
}

function TopTeacherRow({ teacher }) {
  const stars = Math.min(5, Math.round(teacher.avgRating / 2));
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="relative flex-shrink-0">
        {teacher.rank === 1 && (
          <span className="absolute -top-1 -right-1 text-amber-500 text-xs">
            <FaTrophy />
          </span>
        )}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7D0A0A] to-[#BF3131] flex items-center justify-center text-white font-bold text-sm">
          {teacher.initials}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{teacher.teacherName}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <FaStar key={i} size={10} className={i < stars ? "text-amber-400" : "text-gray-200"} />
          ))}
          <span className="text-xs text-gray-400 ml-1">{teacher.avgRating}/10</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-800">{teacher.sessionCount}</p>
        <p className="text-xs text-gray-400">sessions</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-bold text-gray-800">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const Home = () => {
  const [period, setPeriod] = useState("last_7_days");
  const [periodOpen, setPeriodOpen] = useState(false);

  const url = `/api/admin/dashboard?filter=${period}`;
  const { data: rawData, loading, error } = useGet(url);

  const d = rawData?.data;
  const kpis = d?.kpis;
  const chart = d?.chart;
  const sessionsPerTeacher = d?.sessionsPerTeacher || [];
  const studentsPerCourse = d?.studentsPerCourse || [];
  const studentsPerCountry = d?.studentsPerCountry || [];
  const topTeachers = d?.topTeachers || [];
  const needsAttention = d?.needsAttention;

  const totalStudentsByCourse = useMemo(
    () => studentsPerCourse.reduce((s, c) => s + c.studentCount, 0),
    [studentsPerCourse]
  );
  const totalStudentsByCountry = useMemo(
    () => studentsPerCountry.reduce((s, c) => s + c.studentCount, 0),
    [studentsPerCountry]
  );
  const totalSessionsByTeacher = useMemo(
    () => sessionsPerTeacher.reduce((s, t) => s + t.sessionCount, 0),
    [sessionsPerTeacher]
  );

  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((o) => o.value === period)?.label || "Last 7 Days";

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {d?.period && (
            <p className="text-sm text-gray-500 mt-0.5">{d.period.rangeLabel}</p>
          )}
        </div>

        {/* Period picker */}
        <div className="relative">
          <button
            id="dashboard-period-picker"
            onClick={() => setPeriodOpen((v) => !v)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:border-[#7D0A0A]/40 hover:text-[#7D0A0A] transition-all"
          >
            <FaCalendarAlt size={13} className="text-[#7D0A0A]" />
            {selectedPeriodLabel}
            <FaChevronDown
              size={11}
              className={`text-gray-400 transition-transform ${periodOpen ? "rotate-180" : ""}`}
            />
          </button>

          {periodOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPeriod(opt.value); setPeriodOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[#7D0A0A]/5 transition-colors ${
                    period === opt.value ? "text-[#7D0A0A] bg-[#7D0A0A]/5" : "text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            icon={FaCalendarAlt}
            iconBg="bg-[#7D0A0A]"
            title="Sessions"
            value={kpis.sessions?.value ?? 0}
            change={kpis.sessions?.change}
            changeType={kpis.sessions?.changeType}
            subLabel={kpis.sessions?.subLabel}
          />
          <KpiCard
            icon={FaUserGraduate}
            iconBg="bg-blue-500"
            title="Students Attended"
            value={kpis.studentsAttended?.value ?? 0}
            change={kpis.studentsAttended?.change}
            changeType={kpis.studentsAttended?.changeType}
            subLabel={kpis.studentsAttended?.subLabel}
          />
          <KpiCard
            icon={FaUsers}
            iconBg="bg-violet-500"
            title="Avg / Session"
            value={kpis.avgPerSession?.value ?? 0}
            change={kpis.avgPerSession?.change}
            changeType={kpis.avgPerSession?.changeType}
            subLabel={kpis.avgPerSession?.subLabel}
          />
          <KpiCard
            icon={FaWallet}
            iconBg="bg-emerald-500"
            title="Collected"
            value={kpis.collected?.value ?? 0}
            currency={kpis.collected?.currency}
            subLabel={kpis.collected?.subLabel}
          />
          <KpiCard
            icon={FaStar}
            iconBg="bg-amber-500"
            title="Teacher Rating"
            value={kpis.teacherRating?.value ?? 0}
            subLabel={kpis.teacherRating?.subLabel}
          />
        </div>
      )}

      {/* ── Chart + Needs Attention ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                {chart?.title || "Sessions & Attendance"}
              </h3>
              {chart?.subLabel && (
                <p className="text-xs text-gray-400 mt-0.5">{chart.subLabel}</p>
              )}
            </div>
          </div>
          <div className="p-5" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chart?.data || []}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar
                  dataKey="sessions"
                  name="Sessions"
                  fill="#7D0A0A"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  type="monotone"
                  dataKey="students"
                  name="Students"
                  stroke="#EAD196"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#EAD196", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <FaBell className="text-red-500" size={13} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">Needs Attention</h3>
              {needsAttention?.summaryLabel && (
                <p className="text-xs text-gray-400">{needsAttention.summaryLabel}</p>
              )}
            </div>
            {needsAttention?.totalCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {needsAttention.totalCount}
              </span>
            )}
          </div>
          <div className="p-4 flex flex-col gap-2 overflow-y-auto flex-1">
            {needsAttention?.items?.map((item) => (
              <AttentionItem key={item.key} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Sessions per Teacher */}
        <SectionCard title="Sessions per Teacher" icon={FaChalkboardTeacher}>
          <div className="flex flex-col gap-4">
            {sessionsPerTeacher.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data</p>
            ) : (
              sessionsPerTeacher.map((t, i) => (
                <BarListItem
                  key={t.teacherId}
                  label={t.teacherName}
                  value={t.sessionCount}
                  total={totalSessionsByTeacher}
                  rank={i}
                />
              ))
            )}
          </div>
        </SectionCard>

        {/* Students per Course */}
        <SectionCard title="Students per Course" icon={FaBook}>
          <div className="flex flex-col gap-4">
            {studentsPerCourse.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data</p>
            ) : (
              studentsPerCourse.map((c, i) => (
                <BarListItem
                  key={c.courseId}
                  label={c.courseName}
                  value={c.studentCount}
                  total={totalStudentsByCourse}
                  rank={i}
                />
              ))
            )}
          </div>
        </SectionCard>

        {/* Students per Country */}
        <SectionCard title="Students per Country" icon={FaGlobe}>
          <div className="flex flex-col gap-4">
            {studentsPerCountry.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data</p>
            ) : (
              studentsPerCountry.map((c, i) => (
                <BarListItem
                  key={c.country}
                  label={c.country}
                  value={c.studentCount}
                  total={totalStudentsByCountry}
                  rank={i}
                />
              ))
            )}
          </div>
        </SectionCard>

        {/* Top Teachers */}
        <SectionCard title="Top Teachers" icon={FaTrophy}>
          <div className="flex flex-col gap-1">
            {topTeachers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data</p>
            ) : (
              topTeachers.map((t) => (
                <TopTeacherRow key={t.teacherId} teacher={t} />
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default Home;