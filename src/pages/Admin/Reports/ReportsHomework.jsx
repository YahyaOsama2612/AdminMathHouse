import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHead, Stat, Tabs } from "@/components/admin/kit";
import { CsvButton, PctBar, ReportState, dayStr, downloadCsv, pct, useReport } from "./parts";

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
  const th = "a-th";

  const exportCsv = () => downloadCsv(`extra-homework-report-${view}.csv`, view === "sets"
    ? [["Homework", "Given to", "Due", "Assigned", "Submitted", "Late", "Graded", "Avg score %"],
      ...sets.map((s) => [s.title, `${TARGET[s.targetType] || s.targetType}${s.targetName ? `: ${s.targetName}` : ""}`, s.dueDate || "", s.assigned, s.submitted, s.late, s.graded, s.avgScore ?? ""])]
    : [["Student", "Nickname", "Assigned", "Submitted", "Missed", "Late", "Graded", "Avg score %"],
      ...students.map((s) => [s.name, s.nickname, s.assigned, s.submitted, s.missed, s.late, s.graded, s.avgScore ?? ""])]);

  return (
    <div>
      <PageHead title="Extra H.W report" sub="Submission and grades for every extra homework set and every student.">
        <div className="flex flex-wrap gap-2">
          {data && <CsvButton onClick={exportCsv} />}
          <button onClick={() => navigate("/admin/extra-homework")} className="a-btn primary">Open Extra Homework</button>
        </div>
      </PageHead>
      <ReportState loading={loading} error={error} onRetry={reload}>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          <Stat label="Homework sets" value={sets.length} sub={`${sets.filter((s) => s.dueDate && new Date(String(s.dueDate).replace(" ", "T")).getTime() >= now).length} still open`} />
          <Stat label="Assigned" value={sum("assigned")} sub="student × set" />
          <Stat label="Submission rate" value={sum("assigned") ? `${pct(sum("submitted"), sum("assigned"))}%` : "—"} sub={`${sum("submitted")} submitted`} color="#15803d" />
          <Stat label="Late" value={sum("late")} sub="submitted after the due time" color={sum("late") ? "#b45309" : undefined} />
          <Stat label="Average score" value={avgScore == null ? "—" : `${Math.round(avgScore)}%`} sub={`${sum("graded")} graded`} color="#7d0a0a" />
        </div>

        <Tabs value={view} onChange={setView} tabs={[{ key: "sets", label: "By homework", count: 0 }, { key: "students", label: "By student", count: 0 }]} />

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {view === "sets" ? (
                <>
                  <thead><tr>{["Homework", "Due", "Submitted", "Late", "Graded", "Avg score"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {sets.map((s) => (
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
                  <thead><tr>{["Student", "Submitted", "Missed", "Late", "Graded", "Avg score"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {students.map((s) => (
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
            </table>
          </div>
        </div>
      </ReportState>
    </div>
  );
}
