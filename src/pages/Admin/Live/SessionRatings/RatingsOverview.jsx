import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ClipboardCheck, MessageSquare, AlertTriangle, Download, ChevronRight } from "lucide-react";
import useGet from "@/hooks/useGet";
import { SkelRows, fmtDay, fmtTime } from "@/components/admin/kit";

/* Live → Session Ratings (MathPortal design "session-ratings"): every held session with its rating summary.
   GET /api/admin/session-ratings/overview. A row opens /admin/live/sessions/:id/ratings. Scores 1–10 → stars ÷ 2. */

const TYPE = { Explanation: ["#1d4ed8", "#eff6ff"], "Re-Explanation": ["#c2410c", "#fff7ed"], Mistakes: ["#7d0a0a", "#fdecec"], Exam: ["#7c3aed", "#f5f3ff"] };
const stars = (v10) => (v10 == null ? null : Math.round(v10 * 5) / 10);
const initials = (n) => String(n || "?").replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const SEL = "a-inp !h-9 !py-0 text-sm !w-auto";

function Kpi({ icon: Icon, label, value, sub, bg, fg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 min-w-0">
      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}><Icon size={20} /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-extrabold text-gray-800 leading-tight">{value}</p>
        <p className="text-[11px] text-gray-400 truncate">{sub}</p>
      </div>
    </div>
  );
}

function StarRow({ v }) {
  if (v == null) return <span className="text-xs text-gray-300">No ratings</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <b className="text-sm text-gray-800">{v.toFixed(1)}</b>
      <span className="text-amber-500 text-xs tracking-tight">{"★★★★★".slice(0, Math.round(v))}<span className="text-gray-200">{"★★★★★".slice(Math.round(v))}</span></span>
    </span>
  );
}

export default function RatingsOverview() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet("/api/admin/session-ratings/overview");
  const [teacher, setTeacher] = useState("");
  const [range, setRange] = useState("");
  const [rating, setRating] = useState("");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");

  const d = data?.data;
  const all = useMemo(() => d?.sessions || [], [d]);
  const teachers = useMemo(() => [...new Set(all.map((s) => s.teacherName).filter(Boolean))].sort(), [all]);
  const since = range ? new Date(Date.now() - Number(range) * 864e5).toISOString().slice(0, 10) : "";
  const ql = q.trim().toLowerCase();
  let list = all.filter((s) => (!teacher || s.teacherName === teacher) && (!since || s.day >= since)
    && (!rating || (rating === "none" ? s.rated === 0 : rating === "low" ? s.rated > 0 && stars(s.avgRating) <= 3.5 : stars(s.avgRating) >= Number(rating)))
    && (!ql || `${s.name} ${s.teacherName} ${s.type}`.toLowerCase().includes(ql)));
  if (sort === "oldest") list = [...list].reverse();
  if (sort === "lowest") list = [...list].sort((a, b) => (a.avgRating ?? 99) - (b.avgRating ?? 99));
  if (sort === "highest") list = [...list].sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1));
  const t = d?.totals || {};

  const exportCsv = () => {
    const rows = [["Date", "Time", "Session", "Type", "Teacher", "Stars (/5)", "Students rated", "Students", "Comments"],
      ...list.map((s) => [s.day, s.timeFrom, s.name, s.type, s.teacherName, stars(s.avgRating) ?? "", s.rated, s.students, s.comments])];
    const esc = (v) => (/[",\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" }));
    a.download = "session-ratings.csv"; a.click();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-bold text-xl text-gray-800">Session Ratings</h1>
          <p className="text-xs text-gray-400">Every finished session with its date, teacher and each student’s rating and comment. Click a session to see the details.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="a-btn"><Download size={15} /> Export CSV</button>
          <button onClick={() => window.print()} className="a-btn">Print</button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Star} label="Average score" value={t.avgRating != null ? `${stars(t.avgRating).toFixed(2)} ★` : "—"} sub={`${t.studentsRated || 0} student ratings`} bg="#fef3c7" fg="#b45309" />
        <Kpi icon={ClipboardCheck} label="Sessions" value={t.sessionsRated ?? 0} sub={`${t.sessions || 0} held · ${(t.sessions || 0) - (t.sessionsRated || 0)} without ratings`} bg="#eff6ff" fg="#1d4ed8" />
        <Kpi icon={MessageSquare} label="Comments" value={t.comments ?? 0} sub="Written by teachers" bg="#f0fdf4" fg="#15803d" />
        <Kpi icon={AlertTriangle} label="Need follow-up" value={t.followUp ?? 0} sub="Sessions at 3.5★ or less" bg="#fdecec" fg="#7d0a0a" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className={SEL}><option value="">All teachers</option>{teachers.map((n) => <option key={n}>{n}</option>)}</select>
        <select value={range} onChange={(e) => setRange(e.target.value)} className={SEL}><option value="">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
        <select value={rating} onChange={(e) => setRating(e.target.value)} className={SEL}><option value="">Any rating</option><option value="4.5">4.5★ and up</option><option value="4">4★ and up</option><option value="low">3.5★ or less</option><option value="none">Not rated yet</option></select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={SEL}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search session, teacher, type…" className="a-inp !h-9 flex-1 min-w-[200px]" />
        <span className="text-xs text-gray-400">{list.length} of {all.length}</span>
      </div>

      {loading && !data ? <SkelRows n={6} /> : error && !data ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center"><p className="font-bold text-gray-700">Couldn’t load ratings</p><button onClick={refetch} className="a-btn mt-3">Try again</button></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 820 }}>
              <thead><tr>{["Date & time", "Session", "Teacher", "Rating", "Students", ""].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
              <tbody>
                {list.map((s) => {
                  const [c, bg] = TYPE[s.type] || ["#475569", "#f1f5f9"];
                  return (
                    <tr key={s.id} className="a-tr cursor-pointer" onClick={() => navigate(`/admin/live/sessions/${s.id}/ratings`)}>
                      <td className="a-td whitespace-nowrap"><p className="font-bold text-gray-800">{fmtDay(s.day)}</p><p className="text-[11px] text-gray-400">{fmtTime(s.timeFrom)} – {fmtTime(s.timeTo)}</p></td>
                      <td className="a-td max-w-[280px]"><p className="font-semibold text-gray-800 truncate">{s.name}</p><span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ color: c, background: bg }}>{s.type}</span></td>
                      <td className="a-td"><span className="inline-flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-one text-white text-[9px] font-extrabold flex items-center justify-center">{initials(s.teacherName)}</span><span className="text-gray-700 whitespace-nowrap">{s.teacherName || "—"}</span></span></td>
                      <td className="a-td"><StarRow v={stars(s.avgRating)} /></td>
                      <td className="a-td text-gray-600 whitespace-nowrap">{s.rated ? `${s.rated} rated` : "Not rated"}<span className="text-gray-400"> · of {s.students}</span>{s.comments > 0 && <span className="block text-[11px] text-gray-400">{s.comments} comment{s.comments === 1 ? "" : "s"}</span>}</td>
                      <td className="a-td text-right text-gray-300"><ChevronRight size={16} /></td>
                    </tr>
                  );
                })}
                {!list.length && <tr><td colSpan={6} className="py-10 text-center text-gray-400">{all.length ? "No sessions match." : "No held sessions yet."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
