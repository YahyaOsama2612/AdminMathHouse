import { useState } from "react";
import { BookOpen, MessageSquare, Star, Trophy } from "lucide-react";
import { PageHead } from "@/components/admin/kit";
import { CsvButton, HBars, Kpi, RCard, ReportNav, ReportState, SearchBox, dayStr, downloadCsv, stars, useReport } from "./parts";

/* Reports → Rates (design: rep-rates). GET /api/admin/reports/rates
   Session ratings are stored 1–10 and shown as stars out of 5. */

export default function ReportsRates() {
  const { data, loading, error, reload } = useReport("/api/admin/reports/rates");
  const [q, setQ] = useState("");
  const t = data?.totals || {};
  const courses = data?.courses || [];
  const teachers = data?.teachers || [];
  const comments = data?.comments || [];
  const dist = data?.distribution || [];
  const maxDist = Math.max(1, ...dist.map((d) => d.count));
  const ql = q.trim().toLowerCase();
  const shown = comments.filter((c) => !ql || [c.comment, c.studentName, c.teacherName, c.sessionName].join(" ").toLowerCase().includes(ql));
  const toStars = (r) => ({ label: r.name, value: Math.round(r.avgRating * 5) / 10 });

  const exportCsv = () => downloadCsv("rates-report.csv", [
    ["Type", "Name", "Avg rating (/5)", "Ratings"],
    ...courses.map((c) => ["Course", c.name, (c.avgRating / 2).toFixed(1), c.ratings]),
    ...teachers.map((x) => ["Teacher", x.name, (x.avgRating / 2).toFixed(1), x.ratings]),
    [],
    ["Date", "Stars (/5)", "Student", "Teacher", "Session", "Comment"],
    ...comments.map((c) => [c.createdAt, (c.rating / 2).toFixed(1), c.studentName, c.teacherName, c.sessionName, c.comment]),
  ]);

  return (
    <div>
      <ReportNav />
      <PageHead title="Rates report" sub="Session ratings by course and by teacher, with the latest comments.">
        {data && <CsvButton onClick={exportCsv} />}
      </PageHead>
      <ReportState loading={loading} error={error} onRetry={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Top course" value={courses[0] ? courses[0].name : "—"} sub={courses[0] ? `${stars(courses[0].avgRating)} · ${courses[0].ratings} ratings` : "No ratings yet"} icon={Trophy} />
          <Kpi label="Top teacher" value={teachers[0] ? teachers[0].name : "—"} sub={teachers[0] ? `${stars(teachers[0].avgRating)} · ${teachers[0].ratings} ratings` : "No ratings yet"} bg="#faf5ff" fg="#7e22ce" icon={Star} />
          <Kpi label="Average rating" value={stars(t.avgRating)} sub={`${t.ratings || 0} ratings in total`} bg="#eff6ff" fg="#1d4ed8" icon={BookOpen} />
          <Kpi label="Comments" value={t.comments || 0} sub="Ratings that include a comment" bg="#f0fdf4" fg="#15803d" icon={MessageSquare} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          <RCard title="Rating spread" sub="How many ratings got each star">
            <div className="space-y-2.5 pt-1">
              {dist.map((d) => (
                <div key={d.stars} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-bold text-gray-700">{d.stars} ★</span>
                  <span className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${(d.count / maxDist) * 100}%` }}></span></span>
                  <span className="w-8 text-right font-bold text-gray-800">{d.count}</span>
                </div>
              ))}
            </div>
          </RCard>
          <RCard title="Courses by rating" sub="Average stars of the sessions that taught the course">
            <HBars rows={courses.map(toStars)} max={5} format={(v) => `${v}★`} empty="No rated sessions yet" />
          </RCard>
          <RCard title="Teachers by rating" sub="Average stars of the teacher's sessions">
            <HBars rows={teachers.map(toStars)} color="#d97706" max={5} format={(v) => `${v}★`} empty="No rated sessions yet" />
          </RCard>
        </div>

        <RCard title="Latest comments" sub={`${comments.length} most recent`}
          right={<SearchBox value={q} onChange={setQ} placeholder="Search comments…" className="w-full sm:w-56" />}>
          {shown.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {shown.map((c) => (
                <div key={c.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-extrabold ${c.rating >= 8 ? "text-green-700" : c.rating >= 5 ? "text-amber-600" : "text-red-600"}`}>{stars(c.rating)}</span>
                    <span className="text-[11px] text-gray-400">{dayStr(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{c.studentName || "Student"} · {c.sessionName}{c.teacherName ? ` with ${c.teacherName}` : ""}</p>
                  <p className="text-sm text-gray-700 mt-2">{c.comment}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 py-6 text-center">{comments.length ? "No comments match." : "No comments yet."}</p>}
        </RCard>
      </ReportState>
    </div>
  );
}
