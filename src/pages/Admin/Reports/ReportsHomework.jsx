import { useState } from "react";
import { AlarmClock, BookCheck, ClipboardList, Percent, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHead, Tabs } from "@/components/admin/kit";
import { CsvButton, Kpi, PctBar, RTable, ReportNav, ReportState, Th, dayStr, downloadCsv, pct, useReport, useSort } from "./parts";

/* Reports → Extra H.W (design: rep-homework). GET /api/admin/reports/homework
   Scores are 0–100, so the average score reads as a %. */

const TARGET = { all: "All students", category: "Category", grade: "Grade", group: "Group", individual: "Chosen students" };

export default function ReportsHomework() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useReport("/api/admin/reports/homework");
  const [view, setView] = useState("sets");
  const sets = data?.sets || [];
  const students = data?.students || [];
  const now = Date.now();
  const sum = (k) => sets.reduce((a, s) => a + s[k], 0);
  const graded = sets.filter((s) => s.avgScore != null);
  const avgScore = sum("graded") ? graded.reduce((a, s) => a + s.avgScore * s.graded, 0) / sum("graded") : null;
  const scoreCls = (v) => (v == null ? "text-gray-300" : v >= 70 ? "text-green-700" : "text-red-600");
  const setSort = useSort(sets);
  const stuSort = useSort(students);

  const exportCsv = () => downloadCsv(`extra-homework-report-${view}.csv`, view === "sets"
    ? [["Homework", "Given to", "Due", "Assigned", "Submitted", "Late", "Graded", "Avg score %"],
      ...sets.map((s) => [s.title, `${TARGET[s.targetType] || s.targetType}${s.targetName ? `: ${s.targetName}` : ""}`, s.dueDate || "", s.assigned, s.submitted, s.late, s.graded, s.avgScore ?? ""])]
    : [["Student", "Nickname", "Assigned", "Submitted", "Missed", "Late", "Graded", "Avg score %"],
      ...students.map((s) => [s.name, s.nickname, s.assigned, s.submitted, s.missed, s.late, s.graded, s.avgScore ?? ""])]);

  return (
    <div>
      <ReportNav />
      <PageHead title="Extra H.W report" sub="Submission and grades for every extra homework set and every student.">
        <div className="flex flex-wrap gap-2">
          {data && <CsvButton onClick={exportCsv} />}
          <button onClick={() => navigate("/admin/extra-homework")} className="a-btn primary">Open Extra Homework</button>
        </div>
      </PageHead>
      <ReportState loading={loading} error={error} onRetry={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
          <Kpi label="Homework sets" value={sets.length} sub={`${sets.filter((s) => s.dueDate && new Date(String(s.dueDate).replace(" ", "T")).getTime() >= now).length} still open`} bg="#eff6ff" fg="#1d4ed8" icon={ClipboardList} />
          <Kpi label="Assigned" value={sum("assigned")} sub="student × set" bg="#faf5ff" fg="#7e22ce" icon={Send} />
          <Kpi label="Submission rate" value={sum("assigned") ? `${pct(sum("submitted"), sum("assigned"))}%` : "—"} sub={`${sum("submitted")} submitted`} bg="#f0fdf4" fg="#15803d" icon={BookCheck} />
          <Kpi label="Late" value={sum("late")} sub="after the due time" bg="#fef3c7" fg="#b45309" icon={AlarmClock} />
          <Kpi label="Average score" value={avgScore == null ? "—" : `${Math.round(avgScore)}%`} sub={`${sum("graded")} graded`} icon={Percent} />
        </div>

        <Tabs value={view} onChange={setView} tabs={[{ key: "sets", label: "By homework", count: 0 }, { key: "students", label: "By student", count: 0 }]} />

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
          <RTable>
              {view === "sets" ? (
                <>
                  <thead><tr>
                    <Th k="title" s={setSort} first="asc">Homework</Th><Th k="dueDate" s={setSort}>Due</Th>
                    <Th k="sub" get={(x) => pct(x.submitted, x.assigned)} s={setSort}>Submitted</Th><Th k="late" s={setSort}>Late</Th>
                    <Th k="graded" s={setSort}>Graded</Th><Th k="avgScore" s={setSort}>Avg score</Th>
                  </tr></thead>
                  <tbody>
                    {setSort.sorted.map((s) => (
                      <tr key={s.id} className="a-tr">
                        <td className="a-td"><p className="font-semibold text-gray-800">{s.title}</p><p className="text-[11px] text-gray-400">{TARGET[s.targetType] || s.targetType}{s.targetName ? `: ${s.targetName}` : ""}</p></td>
                        <td className="a-td text-xs text-gray-600 whitespace-nowrap">{dayStr(s.dueDate)}</td>
                        <td className="a-td"><PctBar value={pct(s.submitted, s.assigned)} /><p className="text-[11px] text-gray-400 mt-0.5">{s.submitted}/{s.assigned}</p></td>
                        <td className={`a-td font-bold ${s.late ? "text-amber-700" : "text-gray-300"}`}>{s.late}</td>
                        <td className="a-td text-gray-600">{s.graded}</td>
                        <td className={`a-td font-extrabold ${scoreCls(s.avgScore)}`}>{s.avgScore == null ? "—" : `${Math.round(s.avgScore)}%`}</td>
                      </tr>
                    ))}
                    {!sets.length && <tr><td colSpan={6} className="py-10 text-center text-gray-400">No extra homework yet.</td></tr>}
                  </tbody>
                </>
              ) : (
                <>
                  <thead><tr>
                    <Th k="name" s={stuSort} first="asc">Student</Th><Th k="sub" get={(x) => pct(x.submitted, x.assigned)} s={stuSort}>Submitted</Th>
                    <Th k="missed" s={stuSort}>Missed</Th><Th k="late" s={stuSort}>Late</Th><Th k="graded" s={stuSort}>Graded</Th><Th k="avgScore" s={stuSort}>Avg score</Th>
                  </tr></thead>
                  <tbody>
                    {stuSort.sorted.map((s) => (
                      <tr key={s.id} className="a-tr cursor-pointer" onClick={() => navigate(`/admin/users/student-information/${s.id}`)}>
                        <td className="a-td"><p className="font-semibold text-gray-800">{s.name}</p>{s.nickname && <p className="text-[11px] font-bold text-one truncate max-w-[240px]">{s.nickname}</p>}</td>
                        <td className="a-td"><PctBar value={pct(s.submitted, s.assigned)} /><p className="text-[11px] text-gray-400 mt-0.5">{s.submitted}/{s.assigned}</p></td>
                        <td className={`a-td font-bold ${s.missed ? "text-red-600" : "text-gray-300"}`}>{s.missed}</td>
                        <td className={`a-td font-bold ${s.late ? "text-amber-700" : "text-gray-300"}`}>{s.late}</td>
                        <td className="a-td text-gray-600">{s.graded}</td>
                        <td className={`a-td font-extrabold ${scoreCls(s.avgScore)}`}>{s.avgScore == null ? "—" : `${Math.round(s.avgScore)}%`}</td>
                      </tr>
                    ))}
                    {!students.length && <tr><td colSpan={6} className="py-10 text-center text-gray-400">No students have homework yet.</td></tr>}
                  </tbody>
                </>
              )}
          </RTable>
        </div>
      </ReportState>
    </div>
  );
}
