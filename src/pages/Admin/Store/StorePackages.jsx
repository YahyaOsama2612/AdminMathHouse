// Store → Packages (MathPortal "store-packages"): live-session bundles, exam add-ons and mistakes reviews,
// per course, priced in EGP. Uses the existing /api/admin/package API (same body as the classic Add / Edit forms).
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import api from "@/api/api";
import { Card, Modal, PageHead, SkelRows, Empty, errText } from "@/components/admin/kit";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { CourseChip, ErrorCard, Switch, egp, fmtNum, useLoad } from "./parts";

const KINDS = [
  { key: "live", label: "Live sessions", unit: "Sessions", one: "session" },
  { key: "exam", label: "Exam add-ons", unit: "Exams", one: "exam" },
  { key: "question", label: "Mistakes reviews", unit: "Reviews", one: "review" },
];

export default function StorePackages() {
  const [params, setParams] = useSearchParams();
  const courseList = useLoad("/api/admin/store/courses");
  const pkgList = useLoad("/api/admin/package?limit=1000");
  const select = useLoad("/api/admin/package/select");
  const packages = useMemo(() => (Array.isArray(pkgList.data) ? pkgList.data : []), [pkgList.data]);

  const courses = useMemo(() => {
    const count = new Map();
    for (const p of packages) count.set(p.courseId, (count.get(p.courseId) || 0) + 1);
    const list = (courseList.data?.courses || []).map((c) => ({ ...c, packs: count.get(c.id) || 0 }));
    return [...list.filter((c) => c.packs), ...list.filter((c) => !c.packs)];
  }, [courseList.data, packages]);

  const courseId = params.get("course") || courses[0]?.id || "";
  const kind = KINDS.some((k) => k.key === params.get("kind")) ? params.get("kind") : "live";
  const course = courses.find((c) => c.id === courseId);
  const K = KINDS.find((k) => k.key === kind);
  const ofCourse = packages.filter((p) => p.courseId === courseId);
  const rows = ofCourse.filter((p) => p.type === kind).sort((a, b) => Number(a.number) - Number(b.number));
  const go = (next) => setParams({ course: courseId, kind, ...next });

  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // package being added / edited
  const [del, setDel] = useState(null);
  const filtered = q.trim() ? courses.filter((c) => `${c.name} ${c.category || ""}`.toLowerCase().includes(q.trim().toLowerCase())) : courses;

  const reload = () => pkgList.reload();
  const confirmDelete = async () => {
    try {
      await api.delete(`/api/admin/package/${del.id}`);
      toast.success("Package deleted");
      setDel(null);
      reload();
    } catch (e) { toast.error(errText(e)); }
  };

  const loading = (courseList.loading && !courseList.data) || (pkgList.loading && !pkgList.data);
  const error = courseList.error || pkgList.error;

  return (
    <div>
      <PageHead title="Store · Packages" sub="Live sessions, exam add-ons and mistakes reviews — priced per course in EGP.">
        <Link to="/admin/packages/packages" className="text-xs font-bold text-one hover:underline">Open the classic packages list →</Link>
      </PageHead>

      {loading ? <SkelRows n={6} /> : error ? <ErrorCard text={error} onRetry={() => { courseList.reload(); pkgList.reload(); }} /> : !courses.length ? (
        <Empty title="No courses yet" text="Packages belong to a course — add a course first." />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4">
            {courses.length > 8 && (
              <div className="relative mb-2.5 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a course…" className="a-inp !pl-9 !py-2" />
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {filtered.map((c) => (
                <CourseChip key={c.id} on={c.id === courseId} onClick={() => go({ course: c.id })} name={c.name}
                  hint={c.packs ? `${c.packs} package${c.packs === 1 ? "" : "s"}` : "No packages"} />
              ))}
              {!filtered.length && <p className="text-sm text-gray-400 px-1 py-2">No course matches.</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit max-w-full">
            {KINDS.map((k) => (
              <button key={k.key} onClick={() => go({ kind: k.key })} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${k.key === kind ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                {k.label} <span className="text-xs text-gray-400">· {ofCourse.filter((p) => p.type === k.key).length}</span>
              </button>
            ))}
          </div>

          {course && (
            <Card title={`${course.name} — ${K.label}`} sub="Prices in EGP — what the student pays." bodyClass="p-0"
              right={<button className="a-btn primary !py-2 !text-xs" onClick={() => setForm({ type: kind, name: "", number: "", price: "", duration: "", hasAnswers: false, answersPrice: "" })}><Plus size={14} /> Add package</button>}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr>
                      <th className="a-th">Package name</th>
                      <th className="a-th">{K.unit}</th>
                      <th className="a-th">Price</th>
                      <th className="a-th">Valid</th>
                      {kind === "exam" && <th className="a-th">Answers add-on</th>}
                      <th className="a-th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const n = Number(p.number) || 0, price = Number(p.price) || 0;
                      return (
                        <tr key={p.id} className="a-tr">
                          <td className="a-td font-semibold text-gray-800">{p.name}</td>
                          <td className="a-td tabular-nums">{fmtNum(n, 0)}</td>
                          <td className="a-td whitespace-nowrap">
                            <p className="font-extrabold text-gray-900">{egp(price)}</p>
                            {n > 0 && <p className="text-[11px] text-gray-400">{egp(price / n)} each</p>}
                          </td>
                          <td className="a-td whitespace-nowrap">{fmtNum(p.duration, 0)} days</td>
                          {kind === "exam" && (
                            <td className="a-td whitespace-nowrap">{p.hasAnswers ? <span className="font-semibold text-gray-700">+ {egp(p.answersPrice)}</span> : <span className="text-gray-400">No answers</span>}</td>
                          )}
                          <td className="a-td">
                            <div className="flex justify-end gap-1.5">
                              <button className="a-act" aria-label="Edit package" onClick={() => setForm({ ...p, number: String(p.number ?? ""), price: String(Number(p.price) || 0), duration: String(p.duration ?? ""), hasAnswers: Boolean(p.hasAnswers), answersPrice: String(Number(p.answersPrice) || 0) })}><Pencil size={15} /></button>
                              <button className="a-act del" aria-label="Delete package" onClick={() => setDel(p)}><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!rows.length && <tr><td colSpan={kind === "exam" ? 6 : 5} className="py-10 text-center text-sm text-gray-400">No {K.label.toLowerCase()} for {course.name} yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {form && course && (
        <PackageModal pkg={form} course={course} packages={packages} categories={select.data?.categories || []}
          onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />
      )}
      <ConfirmDeleteModal open={Boolean(del)} onClose={() => setDel(null)} onConfirm={confirmDelete}
        title="Delete this package?" description={del ? `“${del.name}” will no longer be sold. This can’t be undone.` : ""} />
    </div>
  );
}

/** The course's category id: from one of its packages, else the category with the course's name that lists it. */
async function resolveCategoryId(course, packages, categories) {
  const known = packages.find((p) => p.courseId === course.id && p.categoryId);
  if (known) return known.categoryId;
  const named = categories.filter((c) => c.label === course.category);
  const rest = categories.filter((c) => c.label !== course.category);
  for (const c of [...named, ...rest]) {
    const r = await api.get(`/api/admin/package/courses/${c.value}`);
    if ((r.data?.data || []).some((x) => x.value === course.id)) return c.value;
  }
  return null;
}

/** Add / edit a package — same body as the classic AddPackages / EditPackages forms. */
function PackageModal({ pkg, course, packages, categories, onClose, onSaved }) {
  const [f, setF] = useState(pkg);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isEdit = Boolean(pkg.id);
  const isExam = f.type === "exam";
  const K = KINDS.find((k) => k.key === f.type) || KINDS[0];
  const n = Number(f.number), price = Number(f.price);

  const save = async () => {
    if (!f.name.trim()) return toast.error("Give the package a name");
    if (!(n >= 1) || !Number.isInteger(n)) return toast.error(`${K.unit} must be a whole number of 1 or more`);
    if (!(price > 0)) return toast.error("Enter a price above 0");
    if (!(Number(f.duration) >= 1)) return toast.error("Valid days must be 1 or more");
    if (isExam && f.hasAnswers && !(Number(f.answersPrice) >= 0 && f.answersPrice !== "")) return toast.error("Enter the answers price");
    setSaving(true);
    try {
      const categoryId = isEdit && pkg.courseId === course.id && pkg.categoryId ? pkg.categoryId : await resolveCategoryId(course, packages, categories);
      if (!categoryId) { toast.error("Couldn’t find this course’s category — use the classic packages form"); setSaving(false); return; }
      const body = {
        name: f.name.trim(), type: f.type, categoryId, courseId: isEdit ? pkg.courseId : course.id,
        number: n, price, duration: Number(f.duration),
        hasAnswers: isExam ? Boolean(f.hasAnswers) : false,
        answersPrice: isExam && f.hasAnswers && f.answersPrice ? Number(f.answersPrice) : 0,
      };
      if (isEdit) await api.put(`/api/admin/package/${pkg.id}`, body);
      else await api.post("/api/admin/package", body);
      toast.success(isEdit ? "Package updated" : "Package added");
      onSaved();
    } catch (e) { toast.error(errText(e)); setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit package" : `Add package · ${course.name}`} onClose={onClose}
      actions={<>
        <button className="a-btn" onClick={onClose}>Cancel</button>
        <button className="a-btn primary" disabled={saving} onClick={save}><Save size={15} /> {saving ? "Saving…" : isEdit ? "Save" : "Add package"}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="a-lbl-f">Package name</label>
          <input className="a-inp" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={`e.g. 8 ${K.unit.toLowerCase()}`} />
        </div>
        <div className="col-span-2">
          <label className="a-lbl-f">Kind</label>
          <select className="a-inp" value={f.type} onChange={(e) => set("type", e.target.value)}>
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </div>
        <div>
          <label className="a-lbl-f">{K.unit}</label>
          <input type="number" min="1" step="1" className="a-inp" value={f.number} onChange={(e) => set("number", e.target.value)} />
        </div>
        <div>
          <label className="a-lbl-f">Valid (days)</label>
          <input type="number" min="1" step="1" className="a-inp" value={f.duration} onChange={(e) => set("duration", e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="a-lbl-f">Price (EGP)</label>
          <input type="number" min="0" step="any" className="a-inp" value={f.price} onChange={(e) => set("price", e.target.value)} />
          {n > 0 && price > 0 && <p className="text-[11px] text-gray-400 mt-1">{egp(price / n)} per {K.one}</p>}
        </div>
        {isExam && (
          <div className="col-span-2 rounded-xl border border-gray-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-700">Answers add-on</p>
                <p className="text-[11px] text-gray-400">Students can buy the model answers on top.</p>
              </div>
              <Switch on={Boolean(f.hasAnswers)} onChange={(v) => set("hasAnswers", v)} label="Answers add-on" />
            </div>
            {f.hasAnswers && (
              <div className="mt-3">
                <label className="a-lbl-f">Answers price (EGP)</label>
                <input type="number" min="0" step="any" className="a-inp" value={f.answersPrice} onChange={(e) => set("answersPrice", e.target.value)} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
