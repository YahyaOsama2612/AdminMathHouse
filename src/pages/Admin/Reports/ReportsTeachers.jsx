import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Coins, Gift, Star, Trophy, UserCheck, UserX, Users, Video } from "lucide-react";
import { PageHead, Pill, SkelRows, Tabs } from "@/components/admin/kit";
import {
  Chips, CsvButton, Delta, Drawer, HBars, Kpi, MiniStat, RCard, RTable, RangePicker, ReportNav, ReportState, SearchBox, Th,
  dayStr, downloadCsv, money, presetRange, stars, useReport, useSort,
} from "./parts";
import SessionsTable from "./SessionsTable";

/* Reports → Teachers.
   GET /api/admin/reports/teachers?from&to — sessions, attendance, ratings and the money earned in the period.
   GET /api/admin/reports/teachers/:id — every student across ALL the teacher's sessions: what each paid,
   how many of his sessions were paid with money and how many were free (and why), plus past sessions and ratings.
   Money per session = what the student paid for live packages ÷ sessions he bought; balance admin gave free earns 0. */

const PAY_TONE = { Paid: "green", "Partly free": "amber", Free: "red", "Nothing yet": "gray" };
const k = (v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v);

function StudentsTab({ data, teacher }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("");
  const all = data.students;
  const count = (s) => all.filter((x) => x.payStatus === s).length;
  const ql = q.trim().toLowerCase();
  const list = useMemo(() => all.filter((s) => (!pay || s.payStatus === pay)
    && (!ql || `${s.name} ${s.nickname || ""} ${s.phone || ""}`.toLowerCase().includes(ql))), [all, pay, ql]);
  const s = useSort(list, { key: "revenue", dir: "desc" });

  const exportCsv = () => downloadCsv(`${teacher.name}-students.csv`, [
    ["Student", "Nickname", "Phone", "Sessions booked", "Present", "Absent", "Paid for live (EGP)", "Sessions bought", "Price per session", "Paid sessions with teacher", "Revenue (EGP)", "Free sessions", "Why free", "Status", "Live sessions left"],
    ...s.sorted.map((x) => [x.name, x.nickname, x.phone, x.booked, x.present, x.absent, x.livePaidTotal, x.sessionsBought, x.pricePerSession ?? "", x.paidSessions, x.revenue, x.freeSessions, x.freeWhy.join(" | "), x.payStatus, x.liveBalance]),
  ]);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-3">
        <Chips value={pay} onChange={setPay} options={[["", "All", all.length], ["Paid", "Paid", count("Paid")], ["Partly free", "Partly free", count("Partly free")], ["Free", "Free", count("Free")], ["Nothing yet", "Not attended", count("Nothing yet")]]} />
        <div className="flex gap-2 lg:ml-auto">
          <SearchBox value={q} onChange={setQ} placeholder="Search student…" className="flex-1 lg:w-56" />
          <CsvButton onClick={exportCsv} />
        </div>
      </div>
      <RTable>
        <thead><tr>
          <Th k="name" s={s} first="asc">Student</Th>
          <Th k="present" s={s}>Sessions</Th>
          <Th k="livePaidTotal" s={s}>Paid for live</Th>
          <Th k="revenue" s={s}>Earned here</Th>
          <Th k="freeSessions" s={s}>Free</Th>
          <Th k="payStatus" s={s} first="asc">Status</Th>
        </tr></thead>
        <tbody>
          {s.sorted.map((x) => (
            <tr key={x.id} className="a-tr cursor-pointer bg-white" onClick={() => navigate(`/admin/users/student-information/${x.id}`)} title="Open the student's profile">
              <td className="a-td">
                <p className="font-bold text-gray-800">{x.name}</p>
                <p className="text-[11px] text-gray-400">{[x.nickname, x.phone].filter(Boolean).join(" · ") || "—"}</p>
              </td>
              <td className="a-td whitespace-nowrap">
                <p className="font-bold text-gray-800">{x.present} <span className="font-normal text-gray-400">attended</span></p>
                <p className="text-[11px] text-gray-400">{x.booked} booked{x.absent ? ` · ${x.absent} absent` : ""}</p>
              </td>
              <td className="a-td whitespace-nowrap">
                {x.livePaidTotal ? (
                  <>
                    <p className="font-bold text-gray-800">{money(x.livePaidTotal)}</p>
                    <p className="text-[11px] text-gray-400">{x.sessionsBought} sessions · {money(x.pricePerSession)} each</p>
                  </>
                ) : <span className="text-gray-300 font-bold">0 EGP</span>}
                {x.giftedByPackage > 0 && <p className="text-[11px] text-amber-700">+{x.giftedByPackage} from free packages</p>}
                {x.freeGiven > 0 && <p className="text-[11px] text-amber-700" title={x.freeGivenReasons}>+{x.freeGiven} given free by admin</p>}
              </td>
              <td className="a-td whitespace-nowrap">
                <p className={`font-extrabold ${x.revenue ? "text-green-700" : "text-gray-300"}`}>{money(x.revenue)}</p>
                <p className="text-[11px] text-gray-400">{x.paidSessions} paid session{x.paidSessions === 1 ? "" : "s"}</p>
              </td>
              <td className="a-td min-w-[180px]">
                {x.freeSessions ? (
                  <>
                    <p className="font-bold text-amber-700 flex items-center gap-1"><Gift size={13} /> {x.freeSessions} free</p>
                    {x.freeWhy.map((w) => <p key={w} className="text-[11px] text-gray-500 leading-snug">{w}</p>)}
                  </>
                ) : <span className="text-gray-300">—</span>}
              </td>
              <td className="a-td"><Pill tone={PAY_TONE[x.payStatus]}>{x.payStatus === "Nothing yet" ? "Not attended" : x.payStatus}</Pill></td>
            </tr>
          ))}
          {!s.sorted.length && <tr><td colSpan={6} className="py-10 text-center text-gray-400 bg-white">{all.length ? "No students match." : "No students in this teacher's sessions yet."}</td></tr>}
        </tbody>
      </RTable>
      <p className="text-[11px] text-gray-400 mt-2">
        A student&apos;s sessions are paid from the live packages he bought first (in date order), each worth what he paid ÷ sessions bought.
        Sessions taken after that came from balance admin gave free. Re-Explanations of attended lessons and presence with an empty balance earn nothing.
      </p>
    </>
  );
}

function SessionsTab({ data, teacher }) {
  return <SessionsTable sessions={data.sessions} fileName={`${teacher.name}-sessions`} />;
}

function RatingsTab({ data }) {
  if (!data.reviews.length) return <p className="text-sm text-gray-400 py-10 text-center bg-white rounded-xl border border-gray-100">No ratings yet.</p>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {data.reviews.map((r) => (
        <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-amber-600">{stars(r.rating)}</span>
            <span className="text-[11px] text-gray-400">{dayStr(r.createdAt)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{r.studentName || "Student"} · {r.sessionName}</p>
          {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
        </div>
      ))}
    </div>
  );
}

function TeacherDetail({ teacher, onClose }) {
  const { data, loading, error, reload } = useReport(`/api/admin/reports/teachers/${teacher.id}`);
  const [tab, setTab] = useState("students");
  const sm = data?.summary;
  return (
    <Drawer title={teacher.name} onClose={onClose}
      sub={<>{teacher.email} · {teacher.courses.join(", ") || "No courses assigned"} · {stars(teacher.avgRating)} ({teacher.ratings} ratings)</>}>
      {loading ? <SkelRows n={6} /> : error ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center"><p className="font-bold text-gray-800">{error}</p><button className="a-btn mt-3" onClick={reload}>Try again</button></div>
      ) : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">All sessions, all time</p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
            <MiniStat label="Students" value={sm.students} sub={`${sm.attended} attended at least once`} />
            <MiniStat label="Sessions held" value={sm.heldSessions} sub={`${sm.upcomingSessions} upcoming · ${sm.cancelledSessions} cancelled`} tone="blue" />
            <MiniStat label="Revenue" value={money(sm.revenue)} sub="From sessions students paid for" tone="green" />
            <MiniStat label="Paid sessions" value={sm.paidSessions} sub="student × session, paid with money" />
            <MiniStat label="Free sessions" value={sm.freeSessions} sub="student × session, earned 0" tone={sm.freeSessions ? "amber" : "gray"} />
            <MiniStat label="Free students" value={sm.freeStudents} sub="Got some or all sessions free" tone={sm.freeStudents ? "red" : "gray"} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 -mt-2">
            <MiniStat label="Attendances" value={sm.attendances} sub="students present, all held sessions" />
            <MiniStat label="Avg per session" value={sm.avgPerSession ?? "—"} sub="students present" tone="blue" />
            <MiniStat label="Revenue / session" value={sm.revenuePerSession == null ? "—" : money(sm.revenuePerSession)} sub="held sessions" tone="green" />
            <MiniStat label="Revenue / student" value={sm.revenuePerStudent == null ? "—" : money(sm.revenuePerStudent)} sub="students who attended" tone="green" />
          </div>
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: "students", label: `Students (${data.students.length})` },
            { key: "sessions", label: `Sessions (${data.sessions.length})` },
            { key: "ratings", label: `Ratings (${data.reviews.length})` },
          ]} />
          {tab === "students" ? <StudentsTab data={data} teacher={teacher} /> : tab === "sessions" ? <SessionsTab data={data} teacher={teacher} /> : <RatingsTab data={data} />}
        </>
      )}
    </Drawer>
  );
}

function EverySession({ sess, teachers, teacherId, setTeacherId, range }) {
  const t = sess.data?.totals;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="a-inp !w-auto !py-2 text-sm" aria-label="Teacher">
          <option value="">All teachers</option>
          {[...teachers].sort((a, b) => a.name.localeCompare(b.name)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <span className="text-xs text-gray-400">{dayStr(range.from)} – {dayStr(range.to)}</span>
      </div>
      <ReportState loading={sess.loading && !sess.data} error={sess.error} onRetry={sess.reload}>
        {t && (
          <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 transition-opacity ${sess.loading ? "opacity-60" : ""}`}>
              <Kpi label="Sessions held" value={t.held} sub={`${t.upcoming} upcoming · ${t.cancelled} cancelled`} bg="#eff6ff" fg="#1d4ed8" icon={CalendarCheck} />
              <Kpi label="Avg attendance" value={t.avgPerSession == null ? "—" : `${t.avgPerSession} / session`} sub={`${t.present} of ${t.booked} booked came`} bg="#f0fdf4" fg="#15803d" icon={UserCheck} />
              <Kpi label="Revenue / session" value={t.revenuePerSession == null ? "—" : money(t.revenuePerSession)} sub={`${money(t.revenue)} in total · ${t.freeStudents} free seats`} icon={Coins} />
              <Kpi label="Attendance not taken" value={t.unmarkedSessions} sub={`${t.emptySessions} with nobody present · of ${t.held} held`} bg="#fef3c7" fg="#b45309" icon={t.unmarkedSessions || t.emptySessions ? UserX : Users} />
            </div>
            <RCard title="Every session" sub="One row per session: students booked, how many came, paid vs free, and what it earned">
              <SessionsTable sessions={sess.data.sessions} showTeacher={!teacherId} maxH={640} fileName={`sessions-${range.from}-to-${range.to}`} />
            </RCard>
          </>
        )}
      </ReportState>
    </>
  );
}

export default function ReportsTeachers() {
  const [range, setRange] = useState({ key: "this_month", ...presetRange("this_month") });
  const { data, loading, error, reload } = useReport(`/api/admin/reports/teachers?from=${range.from}&to=${range.to}`);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState("teachers"); // teachers | sessions
  const [teacherId, setTeacherId] = useState("");
  const sess = useReport(view === "sessions" ? `/api/admin/reports/sessions?from=${range.from}&to=${range.to}${teacherId ? `&teacherId=${teacherId}` : ""}` : null);

  const list = useMemo(() => data?.teachers || [], [data]);
  const ql = q.trim().toLowerCase();
  const filtered = useMemo(() => list.filter((t) => !ql || `${t.name} ${t.email} ${t.courses.join(" ")}`.toLowerCase().includes(ql)), [list, ql]);
  const s = useSort(filtered, { key: "sessions", dir: "desc" });
  const rated = list.filter((t) => t.avgRating != null);
  const byRating = [...rated].sort((a, b) => b.avgRating - a.avgRating);
  const sum = (key) => list.reduce((a, t) => a + (t[key] || 0), 0);
  const avg = rated.length ? rated.reduce((a, t) => a + t.avgRating * t.ratings, 0) / rated.reduce((a, t) => a + t.ratings, 0) : null;
  const topEarner = [...list].sort((a, b) => b.revenue - a.revenue)[0];

  const exportCsv = () => downloadCsv(`teachers-report-${range.from}-to-${range.to}.csv`, [
    ["Teacher", "Email", "Courses", "Sessions held", "Cancelled", "Students attended", "Attendance %", "Revenue (EGP)", "Paid student-sessions", "Free student-sessions", "All-time sessions", "Avg rating (/5)", "Ratings"],
    ...s.sorted.map((t) => [t.name, t.email, t.courses.join(" | "), t.sessions, t.cancelled, t.students, t.attendanceRate ?? "", t.revenue, t.paidSessions, t.freeSessions, t.allSessions, t.avgRating == null ? "" : (t.avgRating / 2).toFixed(1), t.ratings]),
  ]);

  return (
    <div>
      <ReportNav />
      <PageHead title="Teachers report" sub="Sessions, students, money and ratings per teacher. Click a teacher for every student, what they paid and who got sessions free.">
        {data && <CsvButton onClick={exportCsv} />}
      </PageHead>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4"><RangePicker value={range} onChange={setRange} /></div>
      <Tabs value={view} onChange={setView} tabs={[{ key: "teachers", label: "Teachers" }, { key: "sessions", label: "Every session" }]} />
      {view === "sessions" ? <EverySession sess={sess} teachers={list} teacherId={teacherId} setTeacherId={setTeacherId} range={range} /> : (
      <ReportState loading={loading && !data} error={error} onRetry={reload}>
        <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <Kpi label="Sessions" value={sum("sessions")} sub={`${list.filter((t) => t.sessions).length} of ${list.length} teachers taught`} bg="#eff6ff" fg="#1d4ed8" icon={Video}
            delta={<Delta now={sum("sessions")} before={data?.previous?.sessions} />} />
          <Kpi label="Revenue" value={money(sum("revenue"))} sub={`${sum("paidSessions")} paid · ${sum("freeSessions")} free student-sessions`} bg="#f0fdf4" fg="#15803d" icon={Coins}
            delta={<Delta now={sum("revenue")} before={data?.previous?.revenue} />} />
          <Kpi label="Top earner" value={topEarner?.revenue ? topEarner.name : "—"} sub={topEarner?.revenue ? money(topEarner.revenue) : "No paid sessions in this period"} icon={Trophy} />
          <Kpi label="Avg rating" value={avg == null ? "—" : stars(avg)} sub={byRating[0] ? `Best: ${byRating[0].name}` : "No ratings yet"} bg="#faf5ff" fg="#7e22ce" icon={Star} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
          <RCard title="Sessions per teacher" sub="Held in this period (cancelled not counted)">
            <HBars rows={list.filter((t) => t.sessions).sort((a, b) => b.sessions - a.sessions).map((t) => ({ label: t.name, value: t.sessions }))} empty="No sessions in this period" />
          </RCard>
          <RCard title="Revenue per teacher" sub="Sessions students paid for, in this period">
            <HBars rows={list.filter((t) => t.revenue).sort((a, b) => b.revenue - a.revenue).map((t) => ({ label: t.name, value: t.revenue }))} color="#15803d" format={k} empty="No paid sessions in this period" />
          </RCard>
          <RCard title="Rating per teacher" sub="Average of all session ratings, out of 5" className="lg:col-span-2 2xl:col-span-1">
            <HBars rows={byRating.map((t) => ({ label: t.name, value: Math.round(t.avgRating * 5) / 10 }))} color="#d97706" max={5} format={(v) => `${v}★`} empty="No ratings yet" />
          </RCard>
        </div>

        <RCard title="All teachers" sub="Click a teacher for students, money and ratings"
          right={<SearchBox value={q} onChange={setQ} placeholder="Search teacher or course…" className="w-full sm:w-64" />}>
          <RTable>
            <thead><tr>
              <Th k="name" s={s} first="asc">Teacher</Th>
              <Th>Courses</Th>
              <Th k="sessions" s={s}>Sessions</Th>
              <Th k="students" s={s}>Students</Th>
              <Th k="attendanceRate" s={s}>Attendance</Th>
              <Th k="revenue" s={s}>Revenue</Th>
              <Th k="freeSessions" s={s}>Free</Th>
              <Th k="avgRating" s={s}>Rating</Th>
            </tr></thead>
            <tbody>
              {s.sorted.map((t) => (
                <tr key={t.id} className="a-tr cursor-pointer" onClick={() => setOpen(t)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(t)}>
                  <td className="a-td"><p className="font-bold text-gray-800">{t.id === topEarner?.id && t.revenue > 0 && <Trophy size={13} className="inline text-amber-500 mr-1 -mt-0.5" />}{t.name}</p><p className="text-[11px] text-gray-400">{t.email}</p></td>
                  <td className="a-td text-gray-600 max-w-[220px]"><span className="line-clamp-2">{t.courses.join(", ") || "—"}</span></td>
                  <td className="a-td whitespace-nowrap"><p className="font-extrabold text-gray-800">{t.sessions}</p>{t.cancelled > 0 && <p className="text-[11px] text-red-600">{t.cancelled} cancelled</p>}</td>
                  <td className="a-td text-gray-600">{t.students}</td>
                  <td className="a-td text-gray-600">{t.attendanceRate == null ? "—" : `${t.attendanceRate}%`}</td>
                  <td className="a-td whitespace-nowrap"><p className={`font-extrabold ${t.revenue ? "text-green-700" : "text-gray-300"}`}>{money(t.revenue)}</p>{t.paidSessions > 0 && <p className="text-[11px] text-gray-400">{t.paidSessions} paid</p>}</td>
                  <td className={`a-td font-bold ${t.freeSessions ? "text-amber-700" : "text-gray-300"}`}>{t.freeSessions}</td>
                  <td className="a-td whitespace-nowrap"><p className="font-bold text-one">{stars(t.avgRating)}</p>{t.ratings > 0 && <p className="text-[11px] text-gray-400">{t.ratings} ratings</p>}</td>
                </tr>
              ))}
              {!s.sorted.length && <tr><td colSpan={8} className="py-10 text-center text-gray-400">{list.length ? "No teachers match." : "No teachers yet."}</td></tr>}
            </tbody>
          </RTable>
        </RCard>
      </ReportState>
      )}
      {open && <TeacherDetail teacher={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
