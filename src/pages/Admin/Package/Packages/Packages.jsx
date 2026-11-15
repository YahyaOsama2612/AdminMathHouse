import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Card, Empty, PageHead, Pill, SkelRows, Stat } from "@/components/admin/kit";

/* Packages (classic list) in the MathPortal list style.
   GET /api/admin/package pages 10 rows by default and returns no total, so we ask for a large page
   and filter / page on the client. */

const TYPE_TONE = { live: "blue", exam: "amber", question: "purple" };
const PER_PAGE = 25;

const Packages = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/package?limit=1000");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [cat, setCat] = useState("all");
  const [course, setCourse] = useState("all");
  const [page, setPage] = useState(1);

  const all = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);
  const cats = [...new Set(all.map((p) => p.categoryName).filter(Boolean))].sort();
  const courses = [...new Set(all.map((p) => p.courseName).filter(Boolean))].sort();
  const ql = q.trim().toLowerCase();
  const list = all.filter((p) => (type === "all" || p.type === type) && (cat === "all" || p.categoryName === cat) && (course === "all" || p.courseName === course)
    && (!ql || [p.name, p.categoryName, p.courseName].join(" ").toLowerCase().includes(ql)));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const rows = list.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const count = (t) => all.filter((p) => p.type === t).length;
  const upd = (fn) => (e) => { fn(e.target.value); setPage(1); };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/package/${selectedRow.id}`);
      setSelectedRow(null);
      refetch();
    } catch {
      /* useDelete already shows the error */
    }
  };

  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-0";

  return (
    <div>
      <PageHead title="Packages" sub="Live, exam and question packages students can buy.">
        <button onClick={() => navigate("/admin/packages/packages/add")} className="a-btn primary"><Plus size={16} /> Add Package</button>
      </PageHead>

      {loading && !data ? <SkelRows n={6} /> : error ? <Empty title="Could not load packages" text={String(error)} /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Stat label="Packages" value={all.length} />
            <Stat label="Live" value={count("live")} />
            <Stat label="Exam" value={count("exam")} />
            <Stat label="Question" value={count("question")} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
            <input value={q} onChange={upd(setQ)} placeholder="Search name, category or course…" className={`${sel} col-span-2 md:flex-1 md:min-w-[240px]`} />
            <select value={type} onChange={upd(setType)} className={sel}>
              <option value="all">All types</option>
              <option value="live">Live</option>
              <option value="exam">Exam</option>
              <option value="question">Question</option>
            </select>
            <select value={cat} onChange={upd(setCat)} className={sel}>
              <option value="all">All categories</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={course} onChange={upd(setCourse)} className={`${sel} col-span-2 md:col-span-1`}>
              <option value="all">All courses</option>
              {courses.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="text-xs text-gray-400 col-span-2 md:ml-auto">{list.length} of {all.length}</span>
          </div>

          <Card bodyClass="">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{["Name", "Type", "Category", "Course", "Count", "Price", "Duration", "Answers", ""].map((h, i) => <th key={i} className="a-th">{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="a-tr">
                      <td className="a-td font-bold text-gray-800">{p.name}</td>
                      <td className="a-td"><Pill tone={TYPE_TONE[p.type] || "gray"}>{p.type ? p.type[0].toUpperCase() + p.type.slice(1) : "—"}</Pill></td>
                      <td className="a-td">{p.categoryName || "—"}</td>
                      <td className="a-td">{p.courseName || "—"}</td>
                      <td className="a-td font-semibold text-gray-800">{p.number ?? "—"}</td>
                      <td className="a-td font-semibold text-gray-800 whitespace-nowrap">{p.price ?? "—"}</td>
                      <td className="a-td whitespace-nowrap">{p.duration ? `${p.duration} days` : "—"}</td>
                      <td className="a-td whitespace-nowrap">{p.hasAnswers ? <><Pill tone="green">Yes</Pill><span className="text-xs text-gray-500 ml-1.5">{p.answersPrice || 0}</span></> : <Pill>No</Pill>}</td>
                      <td className="a-td">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => navigate(`/admin/packages/packages/edit/${p.id}`)} className="a-act" title={`Edit ${p.name}`} aria-label={`Edit ${p.name}`}><Pencil size={15} /></button>
                          <button onClick={() => setSelectedRow(p)} disabled={deleteLoading} className="a-act del" title={`Delete ${p.name}`} aria-label={`Delete ${p.name}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">{all.length ? "No packages match." : "No packages yet."}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Showing <b className="text-gray-800">{rows.length}</b> of <b className="text-gray-800">{list.length}</b> packages</span>
              {pages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(cur - 1)} disabled={cur <= 1} className="a-btn !py-1.5 !px-3">Previous</button>
                  <span className="text-xs font-semibold">Page {cur} of {pages}</span>
                  <button onClick={() => setPage(cur + 1)} disabled={cur >= pages} className="a-btn !py-1.5 !px-3">Next</button>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      <ConfirmDeleteModal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        onConfirm={confirmDelete}
        title="Delete package?"
        description={`Delete "${selectedRow?.name}"? This can’t be undone.`}
      />
    </div>
  );
};

export default Packages;
