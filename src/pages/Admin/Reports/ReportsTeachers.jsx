import { useState } from "react";
import { GraduationCap, Star, Trophy, Video } from "lucide-react";
import { Modal, PageHead, Pill, SkelRows, fmtDay, fmtTime } from "@/components/admin/kit";
import { CsvButton, HBars, Kpi, RCard, RangePicker, ReportState, dayStr, downloadCsv, presetRange, stars, useReport } from "./parts";

/* Reports → Teachers (design: rep-teachers).
   GET /api/admin/reports/teachers?from&to and GET /api/admin/reports/teachers/:id (row click). */

function TeacherDetail({ teacher, onClose }) {
  const { data, loading, error } = useReport(`/api/admin/reports/teachers/${teacher.id}`);
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (
    <Modal wide title={teacher.name} onClose={onClose} actions={<button className="a-btn" onClick={onClose}>Close</button>}>
      <p className="text-xs text-gray-400 -mt-1 mb-4">
        {teacher.courses.join(", ") || "No courses assigned"} · {stars(teacher.avgRating)} ({teacher.ratings} ratings) · {teacher.allSessions} sessions in total
      </p>
      {loading ? <SkelRows n={4} /> : error ? <p className="text-red-600">{error}</p> : (
        <>
          <h4 className="font-bold text-sm text-gray-700 mb-2">Past sessions</h4>
          <div className="overflow-x-auto mb-5 border border-gray-100 rounded-xl">
            <table className="w-full text-sm">
              <thead><tr>{["Date", "Session", "Type", "Present", "Rating", "Status"].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id} className="a-tr">
                    <td className="a-td whitespace-nowrap"><p className="font-semibold text-gray-700">{fmtDay(s.day)}</p><p className="text-[11px] text-gray-400">{fmtTime(s.timeFrom)}</p></td>
                    <td className="a-td text-gray-700">{s.name}</td>
                    <td className="a-td text-gray-500">{s.type || "—"}</td>
                    <td className="a-td text-gray-600">{s.marked ? `${s.present}/${s.marked}` : "—"}</td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{stars(s.avgRating)}</td>
                    <td className="a-td">{s.status === "cancelled" ? <Pill tone="red">Cancelled</Pill> : String(s.day).slice(0, 10) >= today ? <Pill tone="blue">Today</Pill> : <Pill tone="green">Held</Pill>}</td>
                  </tr>
                ))}
                {!data.sessions.length && <tr><td colSpan={6} className="py-6 text-center text-gray-400">No past sessions.</td></tr>}
              </tbody>
            </table>
          </div>
          <h4 className="font-bold text-sm text-gray-700 mb-2">Ratings with comments</h4>
          {data.reviews.length ? data.reviews.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-3 mb-2">
              <p className="text-sm font-bold text-gray-800">{stars(r.rating)} <span className="font-normal text-gray-400">· {r.studentName || "Student"} · {r.sessionName} · {dayStr(r.createdAt)}</span></p>
              {r.comment && <p className="text-sm text-gray-600 mt-0.5">{r.comment}</p>}
            </div>
          )) : <p className="text-sm text-gray-400">No ratings yet.</p>}
        </>
      )}
    </Modal>
  );
}

export default function ReportsTeachers() {
  const [range, setRange] = useState({ key: "this_month", ...presetRange("this_month") });
  const { data, loading, error, reload } = useReport(`/api/admin/reports/teachers?from=${range.from}&to=${range.to}`);
  const [open, setOpen] = useState(null);

  const list = data?.teachers || [];
  const rated = list.filter((t) => t.avgRating != null);
  const byRating = [...rated].sort((a, b) => b.avgRating - a.avgRating);
  const totalSessions = list.reduce((a, t) => a + t.sessions, 0);
  const avg = rated.length ? rated.reduce((a, t) => a + t.avgRating * t.ratings, 0) / rated.reduce((a, t) => a + t.ratings, 0) : null;
  const top = byRating[0];

  const exportCsv = () => downloadCsv(`teachers-report-${range.from}-to-${range.to}.csv`, [
    ["Teacher", "Email", "Courses", "Sessions held", "Cancelled", "Students attended", "Attendance %", "All-time sessions", "Avg rating (/5)", "Ratings"],
    ...list.map((t) => [t.name, t.email, t.courses.join(" | "), t.sessions, t.cancelled, t.students, t.attendanceRate ?? "", t.allSessions, t.avgRating == null ? "" : (t.avgRating / 2).toFixed(1), t.ratings]),
  ]);

  return (
    <div>
      <PageHead title="Teachers report" sub="Sessions, attendance and ratings per teacher. Click a row for past sessions and comments.">
        {data && <CsvButton onClick={exportCsv} />}
      </PageHead>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4"><RangePicker value={range} onChange={setRange} /></div>
      <ReportState loading={loading && !data} error={error} onRetry={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Teachers" value={list.length} sub={`${list.filter((t) => t.sessions).length} taught in this period`} icon={GraduationCap} />
          <Kpi label="Avg rating" value={avg == null ? "—" : stars(avg)} sub="All session ratings" bg="#faf5ff" fg="#7e22ce" icon={Star} />
          <Kpi label="Sessions" value={totalSessions} sub={`${dayStr(range.from)} – ${dayStr(range.to)}`} bg="#eff6ff" fg="#1d4ed8" icon={Video} />
          <Kpi label="Top rated" value={top ? top.name : "—"} sub={top ? `${stars(top.avgRating)} · ${top.ratings} ratings` : "No ratings yet"} bg="#f0fdf4" fg="#15803d" icon={Trophy} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <RCard title="Sessions per teacher" sub="Held sessions in this period (cancelled not counted)">
            <HBars rows={list.filter((t) => t.sessions).map((t) => ({ label: t.name, value: t.sessions }))} empty="No sessions in this period" />
          </RCard>
          <RCard title="Rating per teacher" sub="Average of all session ratings, out of 5">
            <HBars rows={byRating.map((t) => ({ label: t.name, value: Math.round(t.avgRating * 5) / 10 }))} color="#d97706" max={5} format={(v) => `${v}★`} empty="No ratings yet" />
          </RCard>
        </div>

        <RCard title="All teachers" sub="Click a row for past sessions and ratings with comments">
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead><tr>{["Teacher", "Courses", "Sessions", "Cancelled", "Students", "Attendance", "Rating", "Ratings"].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
              <tbody>
                {list.map((t, i) => (
                  <tr key={t.id} className="a-tr cursor-pointer" onClick={() => setOpen(t)}>
                    <td className="a-td"><p className="font-bold text-gray-800">{i === 0 && t.sessions > 0 && <Trophy size={13} className="inline text-amber-500 mr-1 -mt-0.5" />}{t.name}</p><p className="text-[11px] text-gray-400">{t.email}</p></td>
                    <td className="a-td text-gray-600 max-w-[220px]"><span className="line-clamp-2">{t.courses.join(", ") || "—"}</span></td>
                    <td className="a-td font-extrabold text-gray-800">{t.sessions}</td>
                    <td className={`a-td font-bold ${t.cancelled ? "text-red-600" : "text-gray-300"}`}>{t.cancelled}</td>
                    <td className="a-td text-gray-600">{t.students}</td>
                    <td className="a-td text-gray-600">{t.attendanceRate == null ? "—" : `${t.attendanceRate}%`}</td>
                    <td className="a-td font-bold text-one whitespace-nowrap">{stars(t.avgRating)}</td>
                    <td className="a-td text-gray-600">{t.ratings}</td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No teachers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </RCard>
      </ReportState>
      {open && <TeacherDetail teacher={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
