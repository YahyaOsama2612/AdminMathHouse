import { useMemo, useState } from "react";
import { ClipboardX, Gift, UserX } from "lucide-react";
import { Pill, fmtDay, fmtTime } from "@/components/admin/kit";
import { Chips, CsvButton, RTable, SearchBox, Th, downloadCsv, money, stars, useSort } from "./parts";

/* Every session, one row each: who was booked, who came, what it earned.
   Rows come from GET /api/admin/reports/sessions or the teacher detail (same shape). */

const STATE = { held: ["Held", "green"], today: ["Today", "blue"], upcoming: ["Upcoming", "blue"], cancelled: ["Cancelled", "red"] };

/** present / booked with a small bar */
function Turnout({ s }) {
  if (s.state === "cancelled") return <span className="text-gray-300">—</span>;
  if (s.state === "upcoming") return <span className="text-gray-500">{s.booked} booked</span>;
  if (!s.present && !s.absent) return <span className="text-gray-400">{s.booked} booked · not marked</span>;
  const pct = s.booked ? Math.round((s.present / s.booked) * 100) : 0;
  const c = pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626";
  return (
    <div className="min-w-[110px]">
      <p className="font-bold text-gray-800">{s.present}<span className="font-normal text-gray-400"> / {s.booked}</span></p>
      <span className="block h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: c }}></span></span>
      {(s.absent > 0 || s.notMarked > 0) && (
        <p className="text-[11px] text-gray-400 mt-0.5">{[s.absent && `${s.absent} absent`, s.notMarked && `${s.notMarked} not marked`].filter(Boolean).join(" · ")}</p>
      )}
    </div>
  );
}

export default function SessionsTable({ sessions, showTeacher = false, maxH, fileName = "sessions" }) {
  const [state, setState] = useState("");
  const [q, setQ] = useState("");
  const count = (k) => sessions.filter((s) => (k === "upcoming" ? s.state === "upcoming" || s.state === "today" : s.state === k)).length;
  const ql = q.trim().toLowerCase();
  const list = useMemo(() => sessions.filter((s) => (!state || (state === "upcoming" ? s.state === "upcoming" || s.state === "today" : state === "empty" ? s.state === "held" && !s.present && s.absent > 0 : state === "unmarked" ? s.state === "held" && !s.present && !s.absent : s.state === state))
    && (!ql || `${s.name} ${s.teacherName || ""} ${s.type || ""}`.toLowerCase().includes(ql))), [sessions, state, ql]);
  const srt = useSort(list);
  const empty = sessions.filter((s) => s.state === "held" && !s.present && s.absent > 0).length;
  const unmarked = sessions.filter((s) => s.state === "held" && !s.present && !s.absent).length;

  const exportCsv = () => downloadCsv(`${fileName}.csv`, [
    ["Date", "From", "To", "Session", "Type", ...(showTeacher ? ["Teacher"] : []), "Status", "Booked", "Present", "Absent", "Not marked", "Attendance %", "Paid students", "Free students", "Revenue (EGP)", "Avg rating (/5)"],
    ...srt.sorted.map((s) => [s.day, s.timeFrom, s.timeTo, s.name, s.type || "", ...(showTeacher ? [s.teacherName || ""] : []), STATE[s.state]?.[0] || s.state, s.booked, s.present, s.absent, s.notMarked, s.attendanceRate ?? "", s.paidStudents, s.freeStudents, s.revenue, s.avgRating == null ? "" : (s.avgRating / 2).toFixed(1)]),
  ]);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-3">
        <Chips value={state} onChange={setState} options={[["", "All", sessions.length], ["held", "Held", count("held")], ["upcoming", "Upcoming", count("upcoming")], ["cancelled", "Cancelled", count("cancelled")], ...(empty ? [["empty", "Nobody came", empty]] : []), ...(unmarked ? [["unmarked", "Attendance not taken", unmarked]] : [])]} />
        <div className="flex gap-2 lg:ml-auto">
          <SearchBox value={q} onChange={setQ} placeholder={showTeacher ? "Session or teacher…" : "Search session…"} className="flex-1 lg:w-56" />
          <CsvButton onClick={exportCsv} />
        </div>
      </div>
      <RTable maxH={maxH}>
        <thead><tr>
          <Th k="day" get={(s) => `${s.day} ${s.timeFrom}`} s={srt}>Date</Th>
          <Th k="name" s={srt} first="asc">Session</Th>
          {showTeacher && <Th k="teacherName" s={srt} first="asc">Teacher</Th>}
          <Th k="present" s={srt}>Attended</Th>
          <Th k="paidStudents" s={srt}>Paid / free</Th>
          <Th k="revenue" s={srt}>Revenue</Th>
          <Th k="avgRating" s={srt}>Rating</Th>
          <Th k="state" s={srt} first="asc">Status</Th>
        </tr></thead>
        <tbody>
          {srt.sorted.map((s) => (
            <tr key={s.id} className="a-tr bg-white">
              <td className="a-td whitespace-nowrap"><p className="font-semibold text-gray-700">{fmtDay(s.day)}</p><p className="text-[11px] text-gray-400">{fmtTime(s.timeFrom)} – {fmtTime(s.timeTo)}</p></td>
              <td className="a-td min-w-[170px]"><p className="font-semibold text-gray-800">{s.name}</p><p className="text-[11px] text-gray-400">{s.type || "—"}</p></td>
              {showTeacher && <td className="a-td text-gray-700 whitespace-nowrap">{s.teacherName || "—"}</td>}
              <td className="a-td"><Turnout s={s} /></td>
              <td className="a-td whitespace-nowrap">
                {s.paidStudents || s.freeStudents ? (
                  <>
                    <p className="text-gray-700"><b>{s.paidStudents}</b> paid</p>
                    {s.freeStudents > 0 && <p className="text-[11px] text-amber-700 flex items-center gap-1"><Gift size={11} /> {s.freeStudents} free</p>}
                  </>
                ) : <span className="text-gray-300">—</span>}
              </td>
              <td className="a-td whitespace-nowrap"><span className={`font-extrabold ${s.revenue ? "text-green-700" : "text-gray-300"}`}>{money(s.revenue)}</span></td>
              <td className="a-td whitespace-nowrap text-gray-600">{stars(s.avgRating)}{s.ratings > 0 && <span className="text-[11px] text-gray-400"> ({s.ratings})</span>}</td>
              <td className="a-td">
                <Pill tone={STATE[s.state]?.[1]}>{STATE[s.state]?.[0] || s.state}</Pill>
                {s.state === "held" && !s.present && s.absent > 0 && <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1"><UserX size={11} /> Nobody came</p>}
                {s.state === "held" && !s.present && !s.absent && <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1"><ClipboardX size={11} /> Attendance not taken</p>}
                {s.state === "cancelled" && s.cancelReason && <p className="text-[11px] text-gray-400 mt-1 max-w-[180px] line-clamp-2">{s.cancelReason}</p>}
              </td>
            </tr>
          ))}
          {!srt.sorted.length && <tr><td colSpan={showTeacher ? 8 : 7} className="py-10 text-center text-gray-400 bg-white">{sessions.length ? "No sessions match." : "No sessions in this period."}</td></tr>}
        </tbody>
      </RTable>
      <p className="text-[11px] text-gray-400 mt-2">Revenue = the students who came and paid for that session (their live-package price per session). Free students earn nothing.</p>
    </>
  );
}
