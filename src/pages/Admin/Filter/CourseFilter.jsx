import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Table2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import { SkelRows } from "@/components/admin/kit";

/* Courses → Filter (MathPortal design "filter"): how students see the courses in their
   category → sub-category → grade. GET /api/admin/courses/catalog (courses + grades).
   The old "all tables" browser stays at /admin/Filter/tables. */

const PALETTE = ["#7c3aed", "#db2777", "#0d9488", "#d97706", "#2563eb", "#7d0a0a", "#16a34a"];
const colorOf = (s) => PALETTE[[...String(s || "")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const SEL = "a-inp !h-9 !py-0 text-sm";
const lbl = (t) => <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1"><span className="w-1.5 h-1.5 rounded-full bg-one"></span>{t}</span>;

export default function CourseFilter() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet("/api/admin/courses/catalog");
  const [main, setMain] = useState("");
  const [sub, setSub] = useState("");
  const [grade, setGrade] = useState("");

  const courses = useMemo(() => data?.data?.courses || [], [data]);
  const grades = useMemo(() => data?.data?.grades || [], [data]);
  const mainOf = (c) => c.parentName || c.categoryName || "Other";
  const mains = [...new Set(courses.map(mainOf))].sort();
  const subs = [...new Set(courses.filter((c) => !main || mainOf(c) === main).map((c) => c.categoryName).filter(Boolean))].sort();
  const gradeOpts = grades.filter((g) => (!main || g.parentName === main || g.categoryName === main) && (!sub || g.categoryName === sub));
  const list = courses.filter((c) => (!main || mainOf(c) === main) && (!sub || c.categoryName === sub) && (!grade || c.grades.some((g) => g.id === grade)));
  const empty = gradeOpts.filter((g) => g.courses === 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-bold text-xl text-gray-800">Filter</h1>
          <p className="text-xs text-gray-400">How students see the courses in their category → sub-category → grade. Courses get their grades in Categories; grades are managed in Settings → Grade.</p>
        </div>
        <button type="button" onClick={() => navigate("/admin/Filter/tables")} className="a-btn"><Table2 size={15} /> All content tables</button>
      </div>
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => navigate("/admin/settings/grade")} className="a-btn">Manage grades</button>
        <button type="button" onClick={() => navigate("/admin/courses/categories/manage")} className="a-btn primary">Manage categories</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label>{lbl("Category")}<select value={main} onChange={(e) => { setMain(e.target.value); setSub(""); setGrade(""); }} className={SEL}><option value="">All</option>{mains.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label>{lbl("Sub-category")}<select value={sub} onChange={(e) => { setSub(e.target.value); setGrade(""); }} className={SEL}><option value="">All</option>{subs.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label>{lbl("Grade")}<select value={grade} onChange={(e) => setGrade(e.target.value)} className={SEL}><option value="">All</option>{gradeOpts.map((g) => <option key={g.id} value={g.id}>{g.name}{g.categoryName ? ` (${g.categoryName})` : ""}</option>)}</select></label>
      </div>

      {empty.length > 0 && !grade && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4 text-xs text-amber-900">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <p><b>{empty.length === 1 ? "A grade has no course yet:" : `${empty.length} grades have no course yet:`}</b> {empty.slice(0, 8).map((g) => `${g.name}${g.categoryName ? ` (${g.categoryName})` : ""}`).join(", ")}{empty.length > 8 ? "…" : ""}. Students who pick them see an empty list.</p>
        </div>
      )}

      {loading && !data ? <SkelRows n={4} /> : error && !data ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center"><p className="font-bold text-gray-700">Couldn’t load courses</p><button onClick={refetch} className="a-btn mt-3">Try again</button></div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-2"><b className="text-gray-900">{list.length}</b> course{list.length === 1 ? "" : "s"} match</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((c) => (
              <article key={c.id} onClick={() => navigate(c.hasSemesters ? `/admin/courses/semester/${c.id}` : `/admin/courses/chapters/${c.id}`, { state: { courseId: c.id, courseName: c.name } })}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 cursor-pointer hover:shadow-md hover:border-one/30 transition min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-extrabold shrink-0" style={{ background: colorOf(c.name) }}>{initials(c.name)}</span>
                  <div className="min-w-0"><p className="font-bold text-gray-900 truncate">{c.name}</p><p className="text-[11px] text-gray-400 truncate">{c.categoryName} · {c.chapters} chapters · {c.lessons} lessons</p></div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {c.grades.length ? c.grades.map((g) => <span key={g.id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">{g.name}</span>)
                    : <span className="text-[10px] font-bold text-amber-700">No grade — students can’t find it by grade</span>}
                </div>
              </article>
            ))}
            {!list.length && <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">No course for this selection.</div>}
          </div>
        </>
      )}
    </div>
  );
}
