// Store → Courses (MathPortal "store-courses"): every price of one course in one place — the full course,
// each chapter and each lesson has its own plans (EGP is what students pay, USD is stored as a reference) —
// with bulk tools to give many items the same plans or raise / lower their prices.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight, Percent, Layers, Pencil, RotateCcw, Save, Search, X } from "lucide-react";
import api from "@/api/api";
import { Card, Modal, PageHead, Pill, SkelRows, Stat, Empty, errText } from "@/components/admin/kit";
import {
  CourseChip, ErrorCard, INP, Note, PlanCard, PlanEditor, PLAN_KEY, blankRow, checkRows, egp, fmtNum, lostEnrolments,
  planSummary, rowTotal, sameRows, toDraft, toPayload, useLoad, usd,
} from "./parts";

const BASE = "/api/admin/store";
const AMBER = "#b45309";

export default function StoreCourses() {
  const [params, setParams] = useSearchParams();
  const list = useLoad(`${BASE}/courses`);
  const courses = useMemo(() => list.data?.courses || [], [list.data]);
  const courseId = params.get("course") || courses[0]?.id || "";
  const summary = courses.find((c) => c.id === courseId);
  const detail = useLoad(courseId ? `${BASE}/courses/${courseId}` : null);
  const course = detail.data?.course;
  const chapters = useMemo(() => detail.data?.chapters || [], [detail.data]);

  // ── full-course plan draft ──
  const [rows, setRows] = useState([]);
  const [baseRows, setBaseRows] = useState([]);
  const [draftFor, setDraftFor] = useState(null);
  const dirty = !sameRows(rows, baseRows);
  useEffect(() => {
    if (!course) return;
    if (draftFor !== course.id || !dirty) {
      const d = toDraft(course.plans);
      setRows(d); setBaseRows(d); setDraftFor(course.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]);
  const [savingCourse, setSavingCourse] = useState(false);
  const [pendingCourse, setPendingCourse] = useState(null);
  const [q, setQ] = useState("");

  // ── selection / modals ──
  const [sel, setSel] = useState(() => new Set());
  const [open, setOpen] = useState(() => new Set());
  const [edit, setEdit] = useState(null); // { type, id, name, plans }
  const [bulk, setBulk] = useState(null); // "apply" | "adjust"
  useEffect(() => { setSel(new Set()); setOpen(new Set()); }, [courseId]);

  const items = useMemo(() => {
    const m = new Map();
    for (const ch of chapters) {
      m.set(`chapter:${ch.id}`, { type: "chapter", id: ch.id, name: ch.name, plans: ch.plans });
      for (const l of ch.lessons) m.set(`lesson:${l.id}`, { type: "lesson", id: l.id, name: l.name, chapter: ch.name, plans: l.plans });
    }
    return m;
  }, [chapters]);
  const lessons = useMemo(() => [...items.values()].filter((i) => i.type === "lesson"), [items]);
  const missingChapters = chapters.filter((c) => !c.plans.length).length;
  const missingLessons = lessons.filter((l) => !l.plans.length).length;
  const selected = [...sel].map((k) => items.get(k)).filter(Boolean);

  const pickCourse = (id) => {
    if (id === courseId) return;
    if (dirty) { setPendingCourse(id); return; }
    setParams({ course: id });
  };
  const reloadAll = () => { list.reload(); detail.reload(); };

  const saveCourse = async () => {
    const problem = checkRows(rows);
    if (problem) return toast.error(problem);
    setSavingCourse(true);
    try {
      await api.put(`${BASE}/prices/course/${course.id}`, { plans: toPayload(rows) });
      toast.success("Course prices saved — live in the Store");
      setBaseRows(rows); // so the reload replaces the draft with the saved plans
      setDraftFor(null);
      reloadAll();
    } catch (e) { toast.error(errText(e)); } finally { setSavingCourse(false); }
  };

  const toggle = (k) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const addKeys = (keys) => setSel((s) => new Set([...s, ...keys]));
  const toggleOpen = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOpen = chapters.length > 0 && open.size === chapters.length;

  const filtered = q.trim() ? courses.filter((c) => `${c.name} ${c.category || ""}`.toLowerCase().includes(q.trim().toLowerCase())) : courses;
  const chapterFrom = minTotal(chapters.map((c) => c.plans));
  const lessonFrom = minTotal(lessons.map((l) => l.plans));
  const previewRows = rows.filter((r) => r.label.trim());

  return (
    <div>
      <PageHead title="Store · Courses" sub="Students pay the EGP price · the full course, each chapter and each lesson has its own plans · changes are live in the Store immediately." />

      {list.loading && !list.data ? <SkelRows n={6} /> : list.error ? <ErrorCard text={list.error} onRetry={list.reload} /> : !courses.length ? (
        <Empty title="No courses yet" text="Add a course first, then price it here." />
      ) : (
        <>
          {/* course chips */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4">
            {courses.length > 8 && (
              <div className="relative mb-2.5 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a course…" className="a-inp !pl-9 !py-2" />
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {filtered.map((c) => {
                const missing = !c.plans.length || c.pricedChapters < c.chapters || c.pricedLessons < c.lessons;
                return (
                  <CourseChip key={c.id} on={c.id === courseId} onClick={() => pickCourse(c.id)} name={c.name} warn={missing}
                    hint={!c.plans.length ? "No course price" : c.lessons ? `${c.pricedLessons}/${c.lessons} lessons priced` : `${c.pricedChapters}/${c.chapters} chapters priced`} />
                );
              })}
              {!filtered.length && <p className="text-sm text-gray-400 px-1 py-2">No course matches.</p>}
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
            <Stat label="Chapters" value={fmtNum(course ? chapters.length : summary?.chapters, 0)} />
            <Stat label="Lessons" value={fmtNum(course ? lessons.length : summary?.lessons, 0)} />
            <Stat label="Students" value={fmtNum(summary?.students, 0)} sub="active enrolments" />
            <Stat label="From" value={summary?.fromEgp != null ? egp(summary.fromEgp) : "—"} sub="cheapest full-course plan" />
            <Stat label="Missing prices" value={course ? fmtNum(missingChapters + missingLessons, 0) : "—"} color={missingChapters + missingLessons > 0 ? AMBER : undefined}
              sub={course ? `${missingChapters} chapters · ${missingLessons} lessons can’t be bought` : ""} />
          </div>

          {detail.loading && !detail.data ? <SkelRows n={6} /> : detail.error ? <ErrorCard text={detail.error} onRetry={detail.reload} /> : course && (
            <>
              {/* full course plans */}
              <Card className="mb-4" title={`${course.name} — full course`} sub="Plans for buying the whole course. The first plan is the default."
                right={
                  <div className="flex flex-wrap items-center gap-2">
                    {dirty && <Pill tone="amber">Unsaved changes</Pill>}
                    <button className="a-btn !py-2 !text-xs" disabled={!dirty || savingCourse} onClick={() => setRows(baseRows)}><RotateCcw size={14} /> Revert</button>
                    <button className="a-btn primary !py-2 !text-xs" disabled={!dirty || savingCourse} onClick={saveCourse}><Save size={14} /> {savingCourse ? "Saving…" : "Save"}</button>
                  </div>
                }>
                <PlanEditor rows={rows} onChange={setRows} emptyText="No plans — students can’t buy the full course until you add one." />
                {lostEnrolments(course.plans, rows) > 0 && (
                  <div className="mt-3"><Note>{fmtNum(lostEnrolments(course.plans, rows), 0)} enrolments keep access but lose the link to their plan when you save.</Note></div>
                )}
              </Card>

              {/* student preview */}
              <Card className="mb-4" title="What the student sees" sub={`Buying ${course.name} opens this choice. Checkout charges the EGP price.`}>
                {previewRows.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {previewRows.map((r, i) => (
                      <PlanCard key={r.key} label={r.label} days={r.days} totalEgp={rowTotal(r)} priceEgp={r.priceEgp} discounted={r.hasDiscount && Number(r.discountEgp) > 0} highlight={i === 0} />
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">No plans yet — the course can’t be bought.</p>}
                {(chapterFrom != null || lessonFrom != null) && (
                  <p className="text-xs text-gray-500 mt-3">
                    {chapterFrom != null && <>Single chapters from <b className="text-gray-700">{egp(chapterFrom)}</b></>}
                    {chapterFrom != null && lessonFrom != null && " · "}
                    {lessonFrom != null && <>single lessons from <b className="text-gray-700">{egp(lessonFrom)}</b></>}
                  </p>
                )}
              </Card>

              {/* chapters & lessons */}
              <Card title="Chapters & lessons" sub="Each chapter and lesson is sold on its own with its own plans. Tick items to change many at once." bodyClass="p-0"
                right={
                  <div className="flex flex-wrap gap-1.5">
                    <button className="a-chip" onClick={() => addKeys(chapters.map((c) => `chapter:${c.id}`))}>All chapters</button>
                    <button className="a-chip" onClick={() => addKeys(lessons.map((l) => `lesson:${l.id}`))}>All lessons</button>
                    <button className="a-chip" disabled={!missingLessons} onClick={() => addKeys(lessons.filter((l) => !l.plans.length).map((l) => `lesson:${l.id}`))}>Lessons without a price{missingLessons ? ` (${missingLessons})` : ""}</button>
                    {sel.size > 0 && <button className="a-chip" onClick={() => setSel(new Set())}>Clear</button>}
                    <button className="a-chip" onClick={() => setOpen(allOpen ? new Set() : new Set(chapters.map((c) => c.id)))}>{allOpen ? "Collapse all" : "Expand all"}</button>
                  </div>
                }>
                {!chapters.length ? <p className="text-sm text-gray-400 text-center py-10">This course has no chapters yet.</p> : (
                  <ul className="divide-y divide-gray-100">
                    {chapters.map((ch) => {
                      const isOpen = open.has(ch.id), priced = ch.lessons.filter((l) => l.plans.length).length;
                      return (
                        <li key={ch.id}>
                          <ItemRow checked={sel.has(`chapter:${ch.id}`)} onCheck={() => toggle(`chapter:${ch.id}`)} plans={ch.plans}
                            onEdit={() => setEdit({ type: "chapter", id: ch.id, name: ch.name, plans: ch.plans })}
                            lead={<button onClick={() => toggleOpen(ch.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0" aria-label={isOpen ? "Collapse" : "Expand"}>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}
                            title={<button onClick={() => toggleOpen(ch.id)} className="font-bold text-gray-800 text-left hover:text-one">{ch.name}</button>}
                            meta={`${ch.lessons.length} lessons · ${priced}/${ch.lessons.length} priced`} />
                          {isOpen && (
                            <div className="bg-gray-50/60 border-t border-gray-100">
                              {ch.lessons.length > 1 && (
                                <button className="text-[11px] font-bold text-one hover:underline ml-[68px] mt-2" onClick={() => addKeys(ch.lessons.map((l) => `lesson:${l.id}`))}>Select the {ch.lessons.length} lessons of this chapter</button>
                              )}
                              {ch.lessons.map((l) => (
                                <ItemRow key={l.id} nested checked={sel.has(`lesson:${l.id}`)} onCheck={() => toggle(`lesson:${l.id}`)} plans={l.plans}
                                  onEdit={() => setEdit({ type: "lesson", id: l.id, name: l.name, plans: l.plans })}
                                  title={<span className="font-semibold text-gray-700">{l.name}</span>} />
                              ))}
                              {!ch.lessons.length && <p className="text-xs text-gray-400 py-3 pl-[68px]">No lessons in this chapter.</p>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {/* sticky bulk bar */}
              {selected.length > 0 && (
                <div className="sticky bottom-3 z-30 mt-4">
                  <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
                    <p className="text-sm font-bold">
                      {selected.length} selected
                      <span className="text-white/60 font-semibold"> · {selected.filter((s) => s.type === "chapter").length} chapters, {selected.filter((s) => s.type === "lesson").length} lessons</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setBulk("apply")} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold bg-white text-gray-900 hover:bg-gray-100"><Layers size={14} /> Set the same plans</button>
                      <button onClick={() => setBulk("adjust")} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold bg-white text-gray-900 hover:bg-gray-100"><Percent size={14} /> Raise / lower prices</button>
                      <button onClick={() => setSel(new Set())} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white/80 hover:text-white border border-white/20"><X size={14} /> Clear</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {edit && <EditItemModal item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reloadAll(); }} />}
      {bulk === "apply" && <ApplyModal targets={selected} onClose={() => setBulk(null)} onDone={() => { setBulk(null); setSel(new Set()); reloadAll(); }} />}
      {bulk === "adjust" && <AdjustModal targets={selected} onClose={() => setBulk(null)} onDone={() => { setBulk(null); setSel(new Set()); reloadAll(); }} />}
      {pendingCourse && (
        <Modal title="Discard unsaved changes?" onClose={() => setPendingCourse(null)}
          actions={<>
            <button className="a-btn" onClick={() => setPendingCourse(null)}>Keep editing</button>
            <button className="a-btn danger" onClick={() => { setRows(baseRows); setParams({ course: pendingCourse }); setPendingCourse(null); }}>Discard</button>
          </>}>
          The full-course plans of {course?.name} have changes that are not saved yet.
        </Modal>
      )}
    </div>
  );
}

function minTotal(planLists) {
  const all = planLists.flat().map((p) => p.totalEgp);
  return all.length ? Math.min(...all) : null;
}

/** One chapter / lesson row: checkbox, name, plans summary (or "No price"), Edit prices. */
function ItemRow({ checked, onCheck, lead, title, meta, plans, onEdit, nested }) {
  return (
    <div className={`flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 py-3 pr-4 ${nested ? "pl-4 sm:pl-[52px]" : "pl-4"}`}>
      <input type="checkbox" checked={checked} onChange={onCheck} className="w-4 h-4 accent-[#7d0a0a] shrink-0" aria-label="Select" />
      {lead}
      <div className="min-w-0 flex-1">
        <div className="truncate">{title}</div>
        {meta && <p className="text-[11px] text-gray-400">{meta}</p>}
      </div>
      <div className="text-xs text-gray-500 sm:text-right sm:max-w-[45%] min-w-0 w-full sm:w-auto pl-7 sm:pl-0">
        {plans.length ? <span className="font-semibold">{planSummary(plans)}</span> : <Pill tone="amber">No price — can’t be bought</Pill>}
      </div>
      <button onClick={onEdit} className="a-btn !py-1.5 !px-2.5 !text-xs shrink-0"><Pencil size={13} /> Edit prices</button>
    </div>
  );
}

/** Edit one chapter's / lesson's plans → PUT /prices/:type/:id */
function EditItemModal({ item, onClose, onSaved }) {
  const [rows, setRows] = useState(() => (item.plans.length ? toDraft(item.plans) : [blankRow()]));
  const [saving, setSaving] = useState(false);
  const lost = lostEnrolments(item.plans, rows);
  const save = async () => {
    const problem = checkRows(rows);
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      await api.put(`${BASE}/prices/${item.type}/${item.id}`, { plans: toPayload(rows) });
      toast.success(`Prices of ${item.name} saved`);
      onSaved();
    } catch (e) { toast.error(errText(e)); setSaving(false); }
  };
  return (
    <Modal wide title={`Prices · ${item.name}`} onClose={onClose}
      actions={<>
        <button className="a-btn" onClick={onClose}>Cancel</button>
        <button className="a-btn primary" disabled={saving} onClick={save}><Save size={15} /> {saving ? "Saving…" : "Save prices"}</button>
      </>}>
      <p className="text-xs text-gray-400 mb-3">{item.type === "chapter" ? "Chapter" : "Lesson"} sold on its own. Students pay the EGP total; the first plan is the default.</p>
      <PlanEditor rows={rows} onChange={setRows} />
      {lost > 0 && <div className="mt-3"><Note>{fmtNum(lost, 0)} enrolments keep access but lose the link to their plan.</Note></div>}
    </Modal>
  );
}

/** Give every selected item the same plans → POST /prices/apply */
function ApplyModal({ targets, onClose, onDone }) {
  const first = targets.find((t) => t.plans.length) || targets[0];
  const [rows, setRows] = useState(() => (first?.plans.length ? toDraft(first.plans, false) : [blankRow()]));
  const [saving, setSaving] = useState(false);
  const affected = targets.map((t) => ({ t, lost: lostEnrolments(t.plans, rows, false) })).filter((x) => x.lost > 0);
  const lost = affected.reduce((a, x) => a + x.lost, 0);
  const keys = new Set(rows.map((r) => `${r.label.trim()}|${Number(r.days)}`));
  const replaced = targets.filter((t) => t.plans.some((p) => !keys.has(PLAN_KEY(p)))).length;
  const apply = async () => {
    const problem = checkRows(rows);
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const r = await api.post(`${BASE}/prices/apply`, { targets: targets.map(({ type, id }) => ({ type, id })), plans: toPayload(rows, false) });
      const d = r.data?.data || {};
      toast.success(`${d.message || "Prices applied"}${d.plansRemoved ? ` · ${d.plansRemoved} old plans removed` : ""}`);
      onDone();
    } catch (e) { toast.error(errText(e)); setSaving(false); }
  };
  return (
    <Modal wide title={`Set the same plans · ${targets.length} items`} onClose={onClose}
      actions={<>
        <button className="a-btn" onClick={onClose}>Cancel</button>
        <button className="a-btn primary" disabled={saving} onClick={apply}><Layers size={15} /> {saving ? "Applying…" : `Apply to ${targets.length} items`}</button>
      </>}>
      <p className="text-xs text-gray-400 mb-3">
        Every selected chapter and lesson gets exactly these plans{first?.plans.length ? <> (prefilled from <b className="text-gray-600">{first.name}</b>)</> : ""}. A plan with the same name and days is updated in place and keeps its enrolments; other plans are removed.
      </p>
      <PlanEditor rows={rows} onChange={setRows} showEnrolments={false} />
      <div className="mt-3 space-y-2">
        {lost > 0 && (
          <Note tone="red">
            {fmtNum(lost, 0)} enrolments keep access but lose the link to their plan — their plan name + days is not in the list above
            ({affected.slice(0, 3).map((x) => x.t.name).join(", ")}{affected.length > 3 ? ` and ${affected.length - 3} more` : ""}).
          </Note>
        )}
        {replaced > 0 && !lost && <Note tone="gray">{replaced} of the selected items have plans that will be removed (none of them has enrolments).</Note>}
      </div>
    </Modal>
  );
}

const adjustValue = (v, factor, r) => Math.max(0, Math.round((Number(v) * factor) / r) * r);

/** Raise / lower prices of the selected items → POST /prices/adjust */
function AdjustModal({ targets, onClose, onDone }) {
  const [percent, setPercent] = useState("10");
  const [currency, setCurrency] = useState("both");
  const [roundTo, setRoundTo] = useState(5);
  const [saving, setSaving] = useState(false);
  const pct = Number(percent);
  const valid = percent !== "" && Number.isFinite(pct) && pct !== 0 && pct >= -90 && pct <= 500;
  const factor = 1 + pct / 100;
  const plans = targets.flatMap((t) => t.plans.map((p) => ({ ...p, item: t.name })));
  const examples = plans.slice(0, 3);
  const after = (p) => {
    const pe = currency !== "usd" ? adjustValue(p.priceEgp, factor, roundTo) : p.priceEgp;
    const de = currency !== "usd" ? Math.min(adjustValue(p.discountEgp, factor, roundTo), pe) : p.discountEgp;
    const pu = currency !== "egp" ? adjustValue(p.priceUsd, factor, 0.01) : p.priceUsd;
    return { pe, te: p.hasDiscount ? pe - de : pe, pu };
  };
  const run = async () => {
    if (!valid) return toast.error("Enter a percentage from −90 to 500 (not 0)");
    setSaving(true);
    try {
      const r = await api.post(`${BASE}/prices/adjust`, { targets: targets.map(({ type, id }) => ({ type, id })), percent: pct, currency, roundTo });
      toast.success(r.data?.data?.message || "Prices updated");
      onDone();
    } catch (e) { toast.error(errText(e)); setSaving(false); }
  };
  const seg = (on) => `px-3 py-1.5 rounded-lg text-xs font-bold ${on ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`;
  return (
    <Modal title={`Raise / lower prices · ${targets.length} items`} onClose={onClose}
      actions={<>
        <button className="a-btn" onClick={onClose}>Cancel</button>
        <button className="a-btn primary" disabled={saving || !valid || !plans.length} onClick={run}><Percent size={15} /> {saving ? "Updating…" : `Update ${plans.length} plans`}</button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="a-lbl-f">Change by (%) — use a minus to lower</label>
          <div className="flex flex-wrap gap-1.5 items-center">
            <input type="number" step="any" value={percent} onChange={(e) => setPercent(e.target.value)} className={`${INP} !w-28`} aria-label="Percent" />
            {[-10, 5, 10, 20].map((v) => <button key={v} type="button" className={`a-chip ${Number(percent) === v ? "on" : ""}`} onClick={() => setPercent(String(v))}>{v > 0 ? "+" : ""}{v}%</button>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="a-lbl-f">Currency</label>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {[["egp", "EGP"], ["usd", "USD"], ["both", "Both"]].map(([k, l]) => <button key={k} type="button" className={seg(currency === k)} onClick={() => setCurrency(k)}>{l}</button>)}
            </div>
          </div>
          <div>
            <label className="a-lbl-f">Round to</label>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {[1, 5, 10].map((v) => <button key={v} type="button" className={seg(roundTo === v)} onClick={() => setRoundTo(v)}>{v}</button>)}
            </div>
          </div>
        </div>
        {currency !== "egp" && <p className="text-[11px] text-gray-400">The rounding step is for EGP; USD prices keep exact cents.</p>}
        {!plans.length ? <Note>None of the selected items has a price yet — use “Set the same plans” first.</Note> : (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 px-3 py-2 bg-gray-50/70">Preview{plans.length > 3 ? ` · 3 of ${plans.length} plans` : ""}</p>
            {examples.map((p) => {
              const a = valid ? after(p) : null;
              return (
                <div key={p.id} className="px-3 py-2 border-t border-gray-50 text-xs">
                  <p className="font-semibold text-gray-700 truncate">{p.item} · {p.label}</p>
                  <p className="text-gray-500 tabular-nums">
                    {currency !== "usd" && <>{egp(p.totalEgp)} → <b className="text-gray-900">{a ? egp(a.te) : "—"}</b></>}
                    {currency === "both" && <span className="text-gray-300"> · </span>}
                    {currency !== "egp" && <>{usd(p.priceUsd)} → <b className="text-gray-900">{a ? usd(a.pu) : "—"}</b></>}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-gray-400">Discounts change by the same percentage. Students pay the new EGP price from now on.</p>
      </div>
    </Modal>
  );
}
