import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ExternalLink, FileText, Pencil, Plus, Trash2, Users } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Empty, PageHead, SkelRows, Stat } from "@/components/admin/kit";
import { whenText } from "./parts/HomeworkForm";
import Submissions from "./parts/Submissions";

/* Extra Homework (design: RepPages['extra-homework']): KPI row, filter bar, one card per set,
   and a Submissions view per set with grading.
   The list endpoint pages (default 10); we ask for a large page so the KPIs cover every set. */

const TYPES = { individual: ["Individual students", "bg-blue-50 text-blue-700"], group: ["Group", "bg-purple-50 text-purple-700"] };
const DAY = 86400000;

function dueBadge(due) {
  if (!due) return ["No due date", "bg-gray-100 text-gray-500"];
  const d = new Date(due), ms = d - Date.now();
  if (ms < 0) return ["Past due", "bg-gray-100 text-gray-500"];
  const today = new Date().toDateString() === d.toDateString();
  if (today) return ["Due today", "bg-amber-50 text-amber-700"];
  const days = Math.ceil(ms / DAY);
  if (days <= 1) return ["Due tomorrow", "bg-amber-50 text-amber-700"];
  return [`${days} days left`, "bg-green-50 text-green-700"];
}

const ExtraHomework = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/extra-homework?page=1&limit=1000");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [selectedRow, setSelectedRow] = useState(null);
  const [view, setView] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [st, setSt] = useState("all");

  const all = useMemo(() => {
    const list = data?.data?.data?.homework;
    return Array.isArray(list) ? list : [];
  }, [data]);
  const total = data?.data?.data?.pagination?.total ?? all.length;

  const now = Date.now();
  const isOpen = (h) => !h.dueDate || new Date(h.dueDate).getTime() >= now;
  const ql = q.trim().toLowerCase();
  const list = all
    .filter((h) => (type === "all" || h.targetType === type) && (st === "all" || (st === "open" ? isOpen(h) : !isOpen(h)))
      && (!ql || [h.title, h.description, h.groupName].join(" ").toLowerCase().includes(ql)))
    .sort((a, b) => (isOpen(a) ? 0 : 1) - (isOpen(b) ? 0 : 1) || String(a.dueDate || "9").localeCompare(String(b.dueDate || "9")));

  const tot = all.reduce((a, h) => ({ as: a.as + (h.stats?.totalAssigned || 0), sb: a.sb + (h.stats?.submittedCount || 0), tg: a.tg + Math.max(0, (h.stats?.submittedCount || 0) - (h.stats?.gradedCount || 0)) }), { as: 0, sb: 0, tg: 0 });
  const open = all.filter(isOpen).length;
  const week = all.filter((h) => h.dueDate && new Date(h.dueDate).getTime() >= now && new Date(h.dueDate).getTime() - now < 7 * DAY).length;

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/extra-homework/${selectedRow.id}`);
      setSelectedRow(null);
      refetch();
    } catch {
      /* useDelete already shows the error */
    }
  };

  if (view) {
    return <Submissions id={view} onBack={() => { setView(null); refetch(); }} onEdit={() => navigate(`/admin/extra-homework/edit/${view}`)} />;
  }

  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-0";
  const ds = selectedRow?.stats?.submittedCount || 0;

  return (
    <div>
      <PageHead title="Extra Homework" sub="Send extra work to chosen students or a group, then follow who submitted and grade it.">
        <button onClick={() => navigate("/admin/extra-homework/add")} className="a-btn primary"><Plus size={16} /> Add homework</button>
      </PageHead>

      {loading && !data ? <SkelRows n={6} /> : error ? <Empty title="Could not load extra homework" text={String(error)} /> : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <Stat label="Open" value={open} sub={`${all.length - open} past due`} />
            <Stat label="Due this week" value={week} sub="next 7 days" color={week ? "#b45309" : undefined} />
            <Stat label="Submission rate" value={tot.as ? `${Math.round((tot.sb / tot.as) * 100)}%` : "—"} sub={`${tot.sb} of ${tot.as} submissions`} color="#15803d" />
            <Stat label="To grade" value={tot.tg} sub={tot.tg ? "submitted, not graded" : "all graded"} color={tot.tg ? "#7d0a0a" : undefined} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, description or group…" className={`${sel} col-span-2 md:flex-1 md:min-w-[240px]`} />
            <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
              <option value="all">All targets</option>
              {Object.entries(TYPES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select value={st} onChange={(e) => setSt(e.target.value)} className={sel}>
              <option value="all">Open &amp; past due</option>
              <option value="open">Open</option>
              <option value="past">Past due</option>
            </select>
            <span className="text-xs text-gray-400 col-span-2 md:ml-auto">{list.length} of {total}</span>
          </div>

          {list.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              {list.map((h) => {
                const s = h.stats || {};
                const assigned = s.totalAssigned || 0, submitted = s.submittedCount || 0, graded = s.gradedCount || 0;
                const rate = Math.round(Number(s.submissionRate) || 0); // already a percentage (0–100)
                const toGrade = Math.max(0, submitted - graded);
                const [left, tone] = dueBadge(h.dueDate);
                const [tl, tc] = TYPES[h.targetType] || [h.targetType, "bg-gray-100 text-gray-600"];
                const who = h.targetType === "group" ? (h.groupName || "Group") : `${assigned} student${assigned === 1 ? "" : "s"}`;
                return (
                  <article key={h.id} className="rs-card flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${tc}`}>{tl}</span>
                      <span className={`text-[11px] font-extrabold px-2 py-1 rounded-md ${tone}`}>{left}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mt-2.5 leading-snug">{h.title}</h3>
                    {h.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{h.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {whenText(h.dueDate)}</span>
                      <span className="inline-flex items-center gap-1"><Users size={13} /> {who}</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-gray-400 uppercase tracking-wider">Submitted</span>
                        <b className="text-gray-800">{submitted} of {assigned} · {rate}%</b>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, rate)}%`, background: rate >= 80 ? "#16a34a" : rate >= 40 ? "#f59e0b" : "#dc2626" }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[["Pending", s.pendingCount || 0, "#b45309"], ["To grade", toGrade, "#7d0a0a"], ["Graded", graded, "#15803d"]].map(([l, v, c]) => (
                        <div key={l} className="bg-gray-50 rounded-lg px-2.5 py-2 min-w-0">
                          <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{l}</p>
                          <p className="text-base font-extrabold" style={{ color: v ? c : "#9ca3af" }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    {(h.pdfUrl || h.link) && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {h.pdfUrl && <a href={h.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-red-50 text-one hover:underline"><FileText size={12} /> Worksheet PDF</a>}
                        {h.link && <a href={h.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-700 max-w-full truncate hover:underline"><ExternalLink size={12} /> {h.link.replace(/^https?:\/\//, "")}</a>}
                      </div>
                    )}
                    <div className="mt-auto pt-4 grid grid-cols-3 gap-1.5">
                      <button onClick={() => setView(h.id)} className="a-btn primary !px-2 !py-2 col-span-3 sm:col-span-1">Submissions</button>
                      <button onClick={() => navigate(`/admin/extra-homework/edit/${h.id}`)} className="a-btn !px-2 !py-2"><Pencil size={14} /> Edit</button>
                      <button onClick={() => setSelectedRow(h)} disabled={deleteLoading} className="a-btn !px-2 !py-2 !text-red-600 !border-red-200 hover:!bg-red-50"><Trash2 size={14} /> Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center">
              <p className="font-bold text-gray-700">{all.length ? "Nothing matches" : "No extra homework yet"}</p>
              <p className="text-sm text-gray-400 mb-4">{all.length ? "Try another search or filter." : "Send your first set to students."}</p>
              {!all.length && <button onClick={() => navigate("/admin/extra-homework/add")} className="a-btn primary"><Plus size={16} /> Add homework</button>}
            </div>
          )}
        </>
      )}

      <ConfirmDeleteModal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        onConfirm={confirmDelete}
        title="Delete homework?"
        description={`Delete "${selectedRow?.title}"? ${ds ? `It has ${ds} submission${ds === 1 ? "" : "s"}.` : "Nobody has submitted it yet."} This can’t be undone.`}
      />
    </div>
  );
};

export default ExtraHomework;
