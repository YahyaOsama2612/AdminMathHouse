import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Users, Wallet } from "lucide-react";
import { PageHead, Pill } from "@/components/admin/kit";
import { CsvButton, Kpi, RCard, ReportState, dayStr, downloadCsv, money, useReport } from "./parts";

/* Reports → Students (design: rep-students). GET /api/admin/reports/students */

const STATUS_TONE = { Active: "green", Low: "amber", Empty: "red", "No live sessions": "gray" };
const PAGE = 25;

export default function ReportsStudents() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useReport("/api/admin/reports/students");
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("");
  const [course, setCourse] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);

  const all = useMemo(() => data?.students || [], [data]);
  const opts = useMemo(() => ({
    grades: [...new Set(all.map((s) => s.grade).filter(Boolean))].sort(),
    courses: [...new Set(all.flatMap((s) => s.courses))].sort(),
    countries: [...new Set(all.map((s) => s.country))].sort(),
  }), [all]);

  const ql = q.trim().toLowerCase();
  const list = all.filter((s) => (!ql || `${s.name} ${s.nickname} ${s.email} ${s.phone}`.toLowerCase().includes(ql))
    && (!grade || s.grade === grade) && (!course || s.courses.includes(course))
    && (!status || s.status === status) && (!country || s.country === country));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  const set = (fn) => (e) => { fn(e.target.value); setPage(1); };

  const live = all.filter((s) => s.status !== "No live sessions");
  const low = all.filter((s) => s.status === "Low" || s.status === "Empty");
  const wallets = all.reduce((a, s) => a + s.wallet, 0);

  const exportCsv = () => downloadCsv("students-report.csv", [
    ["Name", "Nickname", "Email", "Phone", "Country", "Category", "Grade", "Courses", "Live sessions left", "Exam balance", "Question balance", "Wallet (EGP)", "Paid (EGP)", "Attended", "Absent", "Last attended", "Status"],
    ...list.map((s) => [s.name, s.nickname, s.email, s.phone, s.country, s.category, s.grade, s.courses.join(" | "), s.liveBalance, s.examBalance, s.questionBalance, s.wallet, s.paid, s.present, s.absent, s.lastAttended || "", s.status]),
  ]);
  const sel = "a-inp !w-auto !py-2";

  return (
    <div>
      <PageHead title="Students report" sub="Every student with their courses, live sessions left, money and attendance. Click a row for the full profile.">
        {data && <CsvButton onClick={exportCsv} />}
      </PageHead>
      <ReportState loading={loading} error={error} onRetry={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Total students" value={all.length} sub={`${all.filter((s) => s.isVerified).length} verified`} bg="#eff6ff" fg="#1d4ed8" icon={Users} />
          <Kpi label="Active (live)" value={all.filter((s) => s.status === "Active").length} sub={`${live.length} use live sessions`} bg="#f0fdf4" fg="#15803d" icon={CheckCircle2} />
          <Kpi label="Low balance (0–3)" value={low.length} sub="Need follow-up to renew" bg="#fef3c7" fg="#b45309" icon={AlertTriangle} />
          <Kpi label="Wallet balances" value={money(wallets)} sub="Money students hold in their wallets" bg="#fdecec" fg="#7d0a0a" icon={Wallet} />
        </div>

        <RCard title="All students" sub="Search, filter, click a row for the full profile and reports">
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mb-3">
            <input value={q} onChange={set(setQ)} placeholder="Search name, email or phone…" className="a-inp !py-2 col-span-2 md:!w-64" />
            <select value={grade} onChange={set(setGrade)} className={sel}><option value="">All grades</option>{opts.grades.map((g) => <option key={g}>{g}</option>)}</select>
            <select value={course} onChange={set(setCourse)} className={sel}><option value="">All courses</option>{opts.courses.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={country} onChange={set(setCountry)} className={sel}><option value="">All countries</option>{opts.countries.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={status} onChange={set(setStatus)} className={sel}><option value="">All statuses</option>{Object.keys(STATUS_TONE).map((s) => <option key={s}>{s}</option>)}</select>
            <span className="text-xs text-gray-400 self-center md:ml-auto col-span-2">{list.length} of {all.length}</span>
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead><tr>{["Student", "Grade", "Courses", "Country", "Live left", "Wallet", "Paid", "Attended", "Status"].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id} className="a-tr cursor-pointer" onClick={() => navigate(`/admin/users/student-information/${s.id}`)} title="Open profile">
                    <td className="a-td"><p className="font-bold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.email}</p></td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{s.grade || "—"}</td>
                    <td className="a-td text-gray-600 max-w-[220px]"><span className="line-clamp-2">{s.courses.join(", ") || "—"}</span></td>
                    <td className="a-td text-gray-600">{s.country}</td>
                    <td className={`a-td font-extrabold ${s.status === "No live sessions" ? "text-gray-300" : s.liveBalance <= 3 ? "text-red-600" : "text-gray-800"}`}>{s.status === "No live sessions" ? "—" : s.liveBalance}</td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{s.wallet ? money(s.wallet) : "—"}</td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{s.paid ? money(s.paid) : "—"}</td>
                    <td className="a-td text-gray-600 whitespace-nowrap">{s.present}{s.lastAttended && <span className="block text-[11px] text-gray-400">last {dayStr(s.lastAttended)}</span>}</td>
                    <td className="a-td"><Pill tone={STATUS_TONE[s.status]}>{s.status}</Pill></td>
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={9} className="py-10 text-center text-gray-400">No students match.</td></tr>}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-3 text-xs text-gray-500">
              <button className="a-btn !py-1.5 !px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span>Page {Math.min(page, pages)} of {pages}</span>
              <button className="a-btn !py-1.5 !px-3" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </RCard>
      </ReportState>
    </div>
  );
}
