import { useMemo, useState } from "react";
import { BookOpen, Coins, Layers, Users } from "lucide-react";
import { PageHead } from "@/components/admin/kit";
import { CsvButton, HBars, Kpi, RCard, RTable, ReportNav, ReportState, SearchBox, Th, downloadCsv, money, stars, useReport, useSort } from "./parts";

/* Reports → Courses (design: rep-courses). GET /api/admin/reports/courses
   Revenue = completed payments tied to the course (content bought in it + its packages). */

export default function ReportsCourses() {
  const { data, loading, error, reload } = useReport("/api/admin/reports/courses");
  const list = useMemo(() => data?.courses || [], [data]);
  const byStudents = [...list].sort((a, b) => b.activeStudents - a.activeStudents);
  const byRevenue = [...list].sort((a, b) => b.revenue - a.revenue);
  const top3 = new Set(byRevenue.filter((c) => c.revenue > 0).slice(0, 3).map((c) => c.id));
  const sum = (k) => list.reduce((a, c) => a + c[k], 0);
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const filtered = useMemo(() => byStudents.filter((c) => !ql || `${c.name} ${c.category || ""}`.toLowerCase().includes(ql)), [byStudents, ql]);
  const srt = useSort(filtered);

  const exportCsv = () => downloadCsv("courses-report.csv", [
    ["Course", "Category", "Chapters", "Lessons", "Teachers", "Active students", "All-time students", "From price (EGP)", "Revenue (EGP)", "Paid orders", "Avg rating (/5)", "Ratings"],
    ...byStudents.map((c) => [c.name, c.category, c.chapters, c.lessons, c.teachers, c.activeStudents, c.allStudents, c.fromPrice ?? "", c.revenue, c.payments, c.avgRating == null ? "" : (c.avgRating / 2).toFixed(1), c.ratings]),
  ]);

  return (
    <div>
      <ReportNav />
      <PageHead title="Courses report" sub="Students, content and money per course.">
        {data && <CsvButton onClick={exportCsv} />}
      </PageHead>
      <ReportState loading={loading} error={error} onRetry={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Courses" value={list.length} sub={`${list.filter((c) => c.activeStudents).length} with active students`} icon={BookOpen} />
          <Kpi label="Active enrolments" value={sum("activeStudents").toLocaleString()} sub="Students per course, added up" bg="#eff6ff" fg="#1d4ed8" icon={Users} />
          <Kpi label="Revenue" value={money(sum("revenue"))} sub="Completed payments, all time" bg="#f0fdf4" fg="#15803d" icon={Coins} />
          <Kpi label="Chapters / Lessons" value={`${sum("chapters")} / ${sum("lessons")}`} sub="Content volume" bg="#faf5ff" fg="#7e22ce" icon={Layers} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <RCard title="Active students per course" sub="High to low">
            <HBars rows={byStudents.filter((c) => c.activeStudents).map((c) => ({ label: c.name, value: c.activeStudents }))} empty="No active enrolments yet" />
          </RCard>
          <RCard title="Revenue per course" sub="Top sellers first">
            <HBars rows={byRevenue.filter((c) => c.revenue).map((c) => ({ label: c.name, value: c.revenue }))} color="#15803d"
              format={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} empty="No paid orders yet" />
          </RCard>
        </div>

        <RCard title="Course breakdown" sub="★ marks the top 3 sellers. From price = the cheapest course price."
          right={<SearchBox value={q} onChange={setQ} placeholder="Search course…" className="w-full sm:w-60" />}>
          <RTable>
              <thead><tr>
                <Th k="name" s={srt} first="asc">Course</Th><Th k="chapters" s={srt}>Chapters</Th><Th k="lessons" s={srt}>Lessons</Th>
                <Th k="teachers" s={srt}>Teachers</Th><Th k="activeStudents" s={srt}>Active students</Th><Th k="allStudents" s={srt}>All-time</Th>
                <Th k="fromPrice" s={srt}>From price</Th><Th k="revenue" s={srt}>Revenue</Th><Th k="perStudent" get={(c) => (c.activeStudents ? c.revenue / c.activeStudents : null)} s={srt}>Per student</Th><Th k="avgRating" s={srt}>Rating</Th>
              </tr></thead>
              <tbody>
                {srt.sorted.map((c) => (
                  <tr key={c.id} className="a-tr">
                    <td className="a-td"><p className="font-bold text-gray-800">{top3.has(c.id) && <span className="text-amber-500">★ </span>}{c.name}</p><p className="text-[11px] text-gray-400">{c.category || "—"}</p></td>
                    <td className="a-td text-gray-600">{c.chapters}</td>
                    <td className="a-td text-gray-600">{c.lessons}</td>
                    <td className="a-td text-gray-600">{c.teachers}</td>
                    <td className="a-td font-extrabold text-gray-800">{c.activeStudents}</td>
                    <td className="a-td text-gray-600">{c.allStudents}</td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{c.fromPrice == null ? "—" : money(c.fromPrice)}</td>
                    <td className="a-td font-bold text-one whitespace-nowrap">{c.revenue ? money(c.revenue) : "—"}</td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{c.revenue && c.activeStudents ? money(c.revenue / c.activeStudents) : "—"}</td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{stars(c.avgRating)}{c.ratings > 0 && <span className="text-[11px] text-gray-400"> ({c.ratings})</span>}</td>
                  </tr>
                ))}
                {!srt.sorted.length && <tr><td colSpan={10} className="py-10 text-center text-gray-400">{list.length ? "No courses match." : "No courses yet."}</td></tr>}
              </tbody>
          </RTable>
        </RCard>
      </ReportState>
    </div>
  );
}
