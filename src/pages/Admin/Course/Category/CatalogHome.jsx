import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderTree, Plus, Search, BookOpen, FileText, Lightbulb, CheckCircle2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import { SkelRows } from "@/components/admin/kit";

/* Courses → Categories = "Courses & content" (MathPortal design catHome).
   Every course grouped by its main category, with grades, teachers and content readiness.
   GET /api/admin/courses/catalog. Category management lives at /admin/courses/categories/manage. */

const PALETTE = ["#7c3aed", "#db2777", "#0d9488", "#d97706", "#2563eb", "#7d0a0a", "#16a34a"];
const colorOf = (s) => PALETTE[[...String(s || "")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
const initials = (n) => String(n || "?").replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const SEL = "a-inp !h-9 !py-0 text-sm";

function Kpi({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-0">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold leading-tight mt-1" style={{ color: color || "#111827" }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
    </div>
  );
}

export default function CatalogHome() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet("/api/admin/courses/catalog");
  const [q, setQ] = useState("");
  const [main, setMain] = useState("");
  const [sub, setSub] = useState("");
  const [grade, setGrade] = useState("");
  const [teacher, setTeacher] = useState("");
  const [content, setContent] = useState("");

  const d = data?.data;
  const all = useMemo(() => d?.courses || [], [d]);
  const mainOf = (c) => c.parentName || c.categoryName || "Other";
  const mains = useMemo(() => [...new Set(all.map(mainOf))].sort(), [all]);
  const subs = useMemo(() => [...new Set(all.filter((c) => !main || mainOf(c) === main).map((c) => c.categoryName).filter(Boolean))].sort(), [all, main]);
  const grades = useMemo(() => [...new Set(all.flatMap((c) => c.grades.map((g) => g.name)))].sort(), [all]);
  const teachers = useMemo(() => [...new Set(all.flatMap((c) => c.teachers.map((t) => t.name)))].sort(), [all]);

  const ql = q.trim().toLowerCase();
  const list = all.filter((c) => (!ql || [c.name, c.description, c.categoryName, c.parentName].join(" ").toLowerCase().includes(ql))
    && (!main || mainOf(c) === main) && (!sub || c.categoryName === sub)
    && (!grade || c.grades.some((g) => g.name === grade)) && (!teacher || c.teachers.some((t) => t.name === teacher))
    && (!content || (content === "ready" ? c.lessons && c.lessonsReady === c.lessons : content === "missing" ? c.lessonsReady < c.lessons : c.lessons === 0)));
  const groups = [];
  list.forEach((c) => {
    const key = mainOf(c);
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, subName: c.parentName ? c.categoryName : null, items: [] }; groups.push(g); }
    g.items.push(c);
  });
  const open = (c) => navigate(c.hasSemesters ? `/admin/courses/semester/${c.id}` : `/admin/courses/chapters/${c.id}`, { state: { courseId: c.id, courseName: c.name } });
  const t = d?.totals || {};
  const filtering = q || main || sub || grade || teacher || content;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-bold text-xl text-gray-800">Courses &amp; content</h1>
          <p className="text-xs text-gray-400">Open a course to manage its chapters, lessons, PDFs, ideas and tasks. Prices are set in Store.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate("/admin/courses/categories/manage")} className="a-btn"><FolderTree className="w-4 h-4" /> Manage categories</button>
          <button type="button" onClick={() => navigate("/admin/courses/courses/add")} className="a-btn primary"><Plus className="w-4 h-4" /> Add course</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Courses" value={t.courses ?? "—"} />
        <Kpi label="Lessons" value={t.lessons ?? "—"} />
        <Kpi label="Both PDFs ready" value={t.lessons ? `${t.lessonsReady}/${t.lessons}` : "—"} sub="Session + answers PDF" color="#b45309" />
        <Kpi label="Lesson ideas" value={t.ideas ?? "—"} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 space-y-3">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories, courses…" className="a-inp !pl-9 !h-10" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {["", ...mains].map((m) => (
            <button key={m || "all"} type="button" onClick={() => { setMain(m); setSub(""); }} className={`a-chip ${main === m ? "on" : ""}`}>{m || "All categories"}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <label><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sub-category</span>
            <select value={sub} onChange={(e) => setSub(e.target.value)} className={SEL}><option value="">All</option>{subs.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Grade</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className={SEL}><option value="">All</option>{grades.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Teacher</span>
            <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className={SEL}><option value="">All</option>{teachers.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Content</span>
            <select value={content} onChange={(e) => setContent(e.target.value)} className={SEL}><option value="">All</option><option value="ready">All PDFs ready</option><option value="missing">PDFs missing</option><option value="empty">No lessons yet</option></select></label>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{list.length} course{list.length === 1 ? "" : "s"}</span>
          {filtering && <button type="button" onClick={() => { setQ(""); setMain(""); setSub(""); setGrade(""); setTeacher(""); setContent(""); }} className="font-bold text-one hover:underline">Clear filters</button>}
        </div>
      </div>

      {loading && !data ? <SkelRows n={5} /> : error && !data ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center"><p className="font-bold text-gray-700">Couldn’t load courses</p><button onClick={refetch} className="a-btn mt-3">Try again</button></div>
      ) : !groups.length ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center"><p className="font-bold text-gray-700">{filtering ? "No courses match" : "No courses yet"}</p></div>
      ) : groups.map((g) => (
        <section key={g.key} className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-extrabold text-gray-900">{g.key} <span className="text-xs font-semibold text-gray-400">· {g.items.length} course{g.items.length === 1 ? "" : "s"}</span></p>
            <button type="button" onClick={() => navigate("/admin/courses/courses/add")} className="text-xs font-bold text-one hover:underline">+ Add course here</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {g.items.map((c) => {
              const pct = c.lessons ? Math.round((c.lessonsReady / c.lessons) * 100) : 0;
              return (
                <article key={c.id} onClick={() => open(c)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-one/30 transition min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    {c.image
                      ? <img src={c.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      : <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0" style={{ background: colorOf(c.name) }}>{initials(c.name)}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{c.description || c.categoryName}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{c.categoryName}</span>
                  </div>
                  {c.grades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {c.grades.slice(0, 4).map((gr) => <span key={gr.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">{gr.name}</span>)}
                      {c.grades.length > 4 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">+{c.grades.length - 4}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex -space-x-2">
                      {c.teachers.slice(0, 4).map((tc) => (
                        <span key={tc.id} title={tc.name} className="w-6 h-6 rounded-full border-2 border-white bg-one text-white text-[9px] font-extrabold flex items-center justify-center">{initials(tc.name)}</span>
                      ))}
                      {c.teachers.length > 4 && <span className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 text-gray-600 text-[9px] font-extrabold flex items-center justify-center">+{c.teachers.length - 4}</span>}
                    </div>
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><BookOpen size={12} /> {c.chapters} ch · {c.lessons} lessons</span>
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Lightbulb size={12} /> {c.ideas}</span>
                    <div className="ml-auto flex items-center gap-2 min-w-[90px]">
                      <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : "#d97706" }}></span></span>
                      <span className="text-[10px] font-bold text-gray-600 flex items-center gap-0.5">{pct === 100 ? <CheckCircle2 size={11} className="text-green-600" /> : <FileText size={11} />}{c.lessonsReady}/{c.lessons}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
