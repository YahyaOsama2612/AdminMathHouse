import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Check, RotateCw, Send, Trash2, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/api/api";
import { Pill, SkelRows, errText, fmtDay, fmtStamp, fmtTime, refreshWaiting } from "@/components/admin/kit";
import {
  CourseSelect, PLANNER_API, SESSION_TYPES, STUDENT_STATE, SectionLabel, TEACHER_STATE, TYPE_COLORS,
  addDays, fromMin, initials, overlaps, personName, sortTeachers, toMin, todayIso, useCourseLessons, useFreeAt, usePlannerOptions,
} from "./parts";

/* Live → Planner → Build a plan (MathPortal design "plan-builder").
   A student sent their free times (study-plan request) → the admin places sessions in those times,
   with teachers who are free then → POST /api/admin/planner/plans/:planId/build proposes them to the student.
   "Group sessions" mode (Phase F): existing group sessions that fit the student's free times and teach lessons
   they still need (GET …/plans/:planId/group-sessions) are added to the same draft and sent together. */

const PLANS_API = "/api/admin/availability-plans";
const LIST_STATUSES = [
  ["pending_admin_review", "Waiting for a plan", "amber"],
  ["plan_proposed", "Sent, waiting for the student", "blue"],
  ["rejected", "Declined by the student", "red"],
];
const STATUS_META = Object.fromEntries(LIST_STATUSES.map(([k, label, tone]) => [k, { label, tone }]));
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DURATIONS = [60, 90, 120];
const MAX_ITEMS = 60; // the backend accepts 1–60 sessions per plan
const WEEKS_AHEAD = 4;

/** dayOfWeek comes as a day name ("Wednesday"); numbers (0–6 / 1–7) are tolerated too. */
const dayName = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isInteger(n) && n >= 0 && n <= 7) return WEEKDAYS[n % 7];
  const s = String(v).trim().toLowerCase();
  return WEEKDAYS.find((d) => d.toLowerCase() === s) || String(v);
};
const weekdayOf = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
};
const sameId = (a, b) => String(a) === String(b);
const slotKey = (s) => `${s.date}|${s.timeFrom}|${s.timeTo}`;
/** lessons a draft row teaches (a new session has one, a group session can have several) */
const rowLessons = (r) => (r.group ? r.lessonIds : r.lessonId ? [r.lessonId] : []);
const sortDraft = (list) => [...list].sort((a, b) => `${a.date} ${a.timeFrom}`.localeCompare(`${b.date} ${b.timeFrom}`));

export default function BuildPlanTab({ refreshKey = 0 }) {
  /* ---------- requests list (both statuses merged) ---------- */
  const [plans, setPlans] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const loadPlans = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await Promise.all(LIST_STATUSES.map(([s]) => api.get(PLANS_API, { params: { status: s, limit: 50 } })));
      const items = res.flatMap((r) => r.data?.data?.items || []);
      const seen = new Set();
      const merged = items
        .filter((p) => (seen.has(String(p.id)) ? false : seen.add(String(p.id))))
        .sort((a, b) => (a.status === b.status ? String(b.createdAt || "").localeCompare(String(a.createdAt || "")) : a.status === "pending_admin_review" ? -1 : b.status === "pending_admin_review" ? 1 : a.status === "rejected" ? -1 : 1));
      setPlans(merged);
      setSelectedId((cur) => (cur && merged.some((p) => sameId(p.id, cur)) ? cur : merged[0] ? String(merged[0].id) : ""));
    } catch (err) {
      setListError(errText(err, "Could not load the study-plan requests"));
    } finally {
      setListLoading(false);
    }
  }, []);
  useEffect(() => { loadPlans(); }, [loadPlans, refreshKey]); // refreshKey: a student was marked inactive from the alert

  /* ---------- selected plan ---------- */
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planVersion, setPlanVersion] = useState(0);
  useEffect(() => {
    if (!selectedId) { setPlan(null); return undefined; }
    let alive = true;
    setPlanLoading(true);
    setPlanError("");
    api
      .get(`${PLANS_API}/${selectedId}`)
      .then((r) => alive && setPlan(r.data?.data?.plan || null))
      .catch((err) => alive && (setPlan(null), setPlanError(errText(err, "Could not load this plan"))))
      .finally(() => alive && setPlanLoading(false));
    return () => { alive = false; };
  }, [selectedId, planVersion]);
  const current = plan && sameId(plan.id, selectedId) ? plan : null;
  const student = current?.student || null;
  const studentName = personName(student);
  // Active / Inactive for planner alerts (comes with the request list)
  const listed = plans.find((p) => sameId(p.id, selectedId));
  const plannerActive = listed?.student?.plannerActive !== false && listed?.student?.plannerActive !== 0;
  const [savingActive, setSavingActive] = useState(false);
  const setActive = async (active) => {
    if (!listed?.student?.id) return;
    setSavingActive(true);
    try {
      await api.put(`/api/admin/planner/students/${listed.student.id}/active`, { active });
      setPlans((list) => list.map((p) => (sameId(p.student?.id, listed.student.id) ? { ...p, student: { ...p.student, plannerActive: active } } : p)));
      toast.success(active ? "Active — you'll get planner alerts for this student" : "Inactive — no planner alerts for this student");
    } catch (err) {
      toast.error(errText(err, "Could not change the status"));
    } finally {
      setSavingActive(false);
    }
  };

  /* ---------- builder state ---------- */
  const { data: options } = usePlannerOptions(student?.id);
  const courses = options?.courses || [];
  const enrolledIds = options?.studentCourseIds || [];
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState("Explanation");
  const [duration, setDuration] = useState(60);
  const [slot, setSlot] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [draft, setDraft] = useState([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionName, setSessionName] = useState(""); // optional; the lesson name is used when empty
  const [mode, setMode] = useState("new"); // new | group
  // existing group sessions this student can join (free times + lessons they still need)
  const [groupList, setGroupList] = useState({ loading: false, error: "", sessions: [] });
  const [groupVersion, setGroupVersion] = useState(0);
  useEffect(() => {
    if (!selectedId) { setGroupList({ loading: false, error: "", sessions: [] }); return undefined; }
    let alive = true;
    setGroupList((g) => ({ ...g, loading: true, error: "" }));
    api.get(`${PLANNER_API}/plans/${selectedId}/group-sessions`)
      .then((r) => alive && setGroupList({ loading: false, error: "", sessions: r.data?.data?.sessions || [] }))
      .catch((err) => alive && setGroupList({ loading: false, error: errText(err, "Could not load the group sessions"), sessions: [] }));
    return () => { alive = false; };
  }, [selectedId, planVersion, groupVersion]);
  // sessions this student can still be planned (their purchased live sessions minus what is booked / waiting)
  const [budget, setBudget] = useState(null);
  useEffect(() => {
    if (!selectedId) { setBudget(null); return undefined; }
    let alive = true;
    api.get(`${PLANNER_API}/plans/${selectedId}/budget`).then((r) => alive && setBudget(r.data?.data || null)).catch(() => alive && setBudget(null));
    return () => { alive = false; };
  }, [selectedId, planVersion]);
  const target = budget ? budget.toPlan : MAX_ITEMS;
  const cap = Math.min(target, MAX_ITEMS);

  // A new plan → start a fresh draft.
  useEffect(() => {
    setCourseId("");
    setDraft([]);
    setAdminNotes("");
    setSlot("");
    setTeacherId("");
    setMode("new");
  }, [selectedId]);
  // Default course: the first one the student is enrolled in.
  useEffect(() => {
    if (!courseId && enrolledIds.length && courses.some((c) => sameId(c.id, enrolledIds[0]))) setCourseId(String(enrolledIds[0]));
  }, [courseId, enrolledIds, courses]);

  const { chapters, loading: lessonsLoading, error: lessonsError } = useCourseLessons(courseId, { studentId: student?.id, planId: current?.id });
  // returning students: an Explanation never repeats a lesson already attended, booked, or already in this draft
  const lessonTaken = useCallback((l) => type === "Explanation" && (!!l.status || draft.some((r) => r.type === "Explanation" && rowLessons(r).some((x) => sameId(x, l.id)))), [type, draft]);
  const lessonTag = (l) => (l.status === "attended" ? " — attended ✓" : l.status === "booked" ? " — already booked" : draft.some((r) => rowLessons(r).some((x) => sameId(x, l.id))) ? " — in this draft" : "");
  /** First lesson that can still be planned, starting at chapter ci / lesson li. */
  const nextOpen = useCallback((ci, li) => {
    for (let c = ci; c < chapters.length; c++) {
      const ls = chapters[c].lessons || [];
      for (let i = c === ci ? li : 0; i < ls.length; i++) if (!lessonTaken(ls[i])) return { chapter: chapters[c], lesson: ls[i] };
    }
    return null;
  }, [chapters, lessonTaken]);
  const doneCount = (c) => (c.lessons || []).filter((l) => l.status === "attended").length;
  useEffect(() => {
    if (!chapters.length) { setChapterId(""); setLessonId(""); return; }
    setChapterId((cur) => (chapters.some((c) => sameId(c.id, cur)) ? cur : String(chapters[0].id)));
  }, [chapters]);
  const chapter = chapters.find((c) => sameId(c.id, chapterId)) || null;
  useEffect(() => {
    if (!chapter) return;
    setLessonId((cur) => {
      if (cur === "" && type === "Exam") return "";
      const keep = chapter.lessons.find((l) => sameId(l.id, cur));
      if (keep && !lessonTaken(keep)) return cur;
      const open = chapter.lessons.find((l) => !lessonTaken(l));
      return open ? String(open.id) : "";
    });
  }, [chapter, type, lessonTaken]);

  /* ---------- free times → dated options for the next 4 weeks ---------- */
  const slots = useMemo(() => current?.slots || [], [current]);
  const slotOptions = useMemo(() => {
    const first = addDays(todayIso(), 1);
    const out = new Map();
    slots.forEach((s) => {
      const from = toMin(s.timeFrom), to = toMin(s.timeTo);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to - from < duration) return;
      const make = (date) => {
        const o = { date, timeFrom: fromMin(from), timeTo: fromMin(from + duration) };
        out.set(slotKey(o), o);
      };
      if (s.specificDate) {
        const d = String(s.specificDate).slice(0, 10);
        if (d >= first) make(d);
      } else if (s.dayOfWeek !== null && s.dayOfWeek !== undefined && s.dayOfWeek !== "") {
        const want = dayName(s.dayOfWeek);
        for (let i = 0; i < WEEKS_AHEAD * 7; i++) {
          const d = addDays(first, i);
          if (weekdayOf(d) === want) make(d);
        }
      }
    });
    return [...out.values()].filter((o) => !draft.some((r) => overlaps(o, r))).sort((a, b) => slotKey(a).localeCompare(slotKey(b)));
  }, [slots, duration, draft]);

  useEffect(() => {
    setSlot((cur) => (slotOptions.some((o) => slotKey(o) === cur) ? cur : slotOptions[0] ? slotKey(slotOptions[0]) : ""));
  }, [slotOptions]);
  const picked = slotOptions.find((o) => slotKey(o) === slot) || null;

  /* ---------- who is free at the picked time ---------- */
  const free = useFreeAt({ date: picked?.date, timeFrom: picked?.timeFrom, timeTo: picked?.timeTo, courseId, skipPlanId: current?.id });
  const teachers = useMemo(() => sortTeachers(free.data?.teachers || []), [free.data]);
  const teacherClash = useCallback(
    (t) => !!picked && draft.some((r) => sameId(r.teacherId, t.id) && overlaps(r, picked)),
    [draft, picked]
  );
  const selectable = useCallback((t) => t.state !== "busy" && t.state !== "off" && !teacherClash(t), [teacherClash]);
  useEffect(() => {
    if (!free.data) return;
    setTeacherId((cur) => {
      const t = teachers.find((x) => sameId(x.id, cur));
      if (t && selectable(t)) return cur;
      const first = teachers.find(selectable);
      return first ? String(first.id) : "";
    });
  }, [free.data, teachers, selectable]);
  const teacher = teachers.find((t) => sameId(t.id, teacherId)) || null;
  const studentAtTime = free.data && student ? (free.data.students || []).find((s) => sameId(s.id, student.id)) : null;
  const studentBusy = studentAtTime?.state === "busy";

  /* ---------- draft ---------- */
  const addToDraft = () => {
    if (!current) return;
    if (!courseId) return toast.error("Pick a course");
    if (!picked) return toast.error("No free time left for this length — try a shorter session");
    if (free.loading || !free.data) return toast("Still checking who is free — try again in a moment");
    if (studentBusy) return toast.error(`${studentName} already has a session then`);
    if (!teacher) return toast.error("Pick a teacher who is free then");
    if (!selectable(teacher)) return toast.error(`${teacher.name} is busy or outside their working hours then`);
    if (type !== "Exam" && !lessonId) return toast.error("Pick a lesson (only an exam can have none)");
    if (draft.length >= cap) return toast.error(budget ? `${studentName} has ${budget.toPlan} session${budget.toPlan === 1 ? "" : "s"} to plan — the plan is full` : `A plan can have up to ${MAX_ITEMS} sessions`);
    if (draft.some((r) => overlaps(r, picked))) return toast.error(`${studentName} already has a draft session at that time`);
    if (draft.some((r) => sameId(r.teacherId, teacher.id) && overlaps(r, picked))) return toast.error(`${teacher.name} already has a draft session at that time`);

    const lesson = chapter?.lessons.find((l) => sameId(l.id, lessonId)) || null;
    if (lesson && lessonTaken(lesson)) return toast.error(`"${lesson.name}" is${lessonTag(lesson)} — pick another lesson or a Re-Explanation`);
    const row = {
      name: sessionName.trim(),
      key: `${slotKey(picked)}|${Date.now()}`,
      ...picked,
      teacherId: String(teacher.id),
      teacherName: teacher.name,
      teacherState: teacher.state,
      type,
      lessonId: lesson ? String(lesson.id) : "",
      lessonName: lesson?.name || "",
      lessonNo: lesson ? chapter.lessons.indexOf(lesson) + 1 : 0,
      chapterName: lesson ? chapter.name : "",
      chapterNo: lesson ? chapters.indexOf(chapter) + 1 : 0,
    };
    setDraft((d) => sortDraft([...d, row]));
    setSessionName("");
    // Explanations go through the course in order: move on to the next lesson still open.
    if (type === "Explanation" && lesson && chapter) {
      const open = nextOpen(chapters.indexOf(chapter), chapter.lessons.indexOf(lesson) + 1);
      if (open) { setChapterId(String(open.chapter.id)); setLessonId(String(open.lesson.id)); }
    }
  };

  /** why a group session can't be added right now ("" = it can) */
  const groupBlock = (g) => {
    if (draft.some((r) => r.group && sameId(r.id, g.id))) return "";
    if (draft.length >= cap) return "The plan is full";
    const clash = draft.find((r) => overlaps(r, g));
    if (clash) return `Overlaps "${clash.name || clash.lessonName || "a draft session"}"`;
    if (g.type === "Explanation" && draft.some((r) => !r.group && r.type === "Explanation" && g.lessons.some((l) => sameId(l.id, r.lessonId)))) return "A new session in the draft already teaches one of its lessons";
    return "";
  };
  const toggleGroup = (g) => {
    if (draft.some((r) => r.group && sameId(r.id, g.id))) { setDraft((d) => d.filter((r) => !(r.group && sameId(r.id, g.id)))); return; }
    const why = groupBlock(g);
    if (why) return toast.error(why);
    setDraft((d) => sortDraft([...d, {
      group: true, key: `g|${g.id}`, id: String(g.id), name: g.name, date: g.date, timeFrom: g.timeFrom, timeTo: g.timeTo,
      teacherId: String(g.teacher?.id || ""), teacherName: g.teacher?.name || "", type: g.type,
      lessonIds: g.lessons.map((l) => String(l.id)), lessonName: g.lessons.map((l) => l.name).join(" · "),
      groupNames: g.groups.map((x) => x.name).join(", "),
    }]));
  };
  const newRows = draft.filter((r) => !r.group);
  const groupRows = draft.filter((r) => r.group);

  const send = async () => {
    if (sending || !current) return;
    if (!draft.length) return toast.error("Add at least one session to the plan");
    if (newRows.length && !courseId) return toast.error("Pick a course");
    const body = {
      ...(newRows.length ? { courseId } : {}),
      items: newRows.map((r) => ({ date: r.date, timeFrom: r.timeFrom, timeTo: r.timeTo, teacherId: r.teacherId, type: r.type, lessonIds: r.lessonId ? [r.lessonId] : [], ...(r.name ? { name: r.name } : {}) })),
      groupSessionIds: groupRows.map((r) => r.id),
    };
    if (adminNotes.trim()) body.adminNotes = adminNotes.trim();
    setSending(true);
    try {
      await api.post(`${PLANNER_API}/plans/${current.id}/build`, body);
      toast.success(`Plan sent to ${studentName} — ${draft.length} session${draft.length === 1 ? "" : "s"}${groupRows.length ? ` (${groupRows.length} with a group)` : ""} to approve`);
      setDraft([]);
      setAdminNotes("");
      refreshWaiting();
      setPlanVersion((v) => v + 1);
      loadPlans();
    } catch (err) {
      toast.error(errText(err, "Could not send the plan"));
      if (groupRows.length) setGroupVersion((v) => v + 1);
    } finally {
      setSending(false);
    }
  };

  /* ---------- render ---------- */
  if (listLoading && !plans.length && !listError) return <SkelRows n={6} />;
  if (listError && !plans.length) {
    return (
      <div className="bg-white rounded-xl border border-red-100 p-6 text-center text-sm text-red-600">
        {listError} <button type="button" onClick={loadPlans} className="font-bold underline">Retry</button>
      </div>
    );
  }
  if (!plans.length) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 px-4 text-center">
        <p className="font-bold text-gray-700">No student is waiting for a plan</p>
        <p className="text-sm text-gray-400">Requests appear here when a student sends the times they are free.</p>
        <Link to="/admin/live/availability-plans" className="inline-block mt-3 text-sm font-bold text-one hover:underline">Open Study Plans →</Link>
      </div>
    );
  }

  const proposed = current?.proposedSessions || [];
  const pct = cap ? Math.min(100, Math.round((draft.length / cap) * 100)) : 100;
  const freeByDay = groupFreeTimes(slots);
  const lessonRequired = type !== "Exam";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
      {/* Left: requests + student */}
      <div className="space-y-4 min-w-0">
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm min-w-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <p className="font-bold text-gray-800">Study-plan requests <span className="text-xs font-semibold text-gray-400">· {plans.length}</span></p>
            <button type="button" onClick={loadPlans} disabled={listLoading} className="a-act" title="Refresh" aria-label="Refresh requests">
              <RotateCw size={15} className={listLoading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {plans.map((p) => {
              const on = sameId(p.id, selectedId);
              const cameBack = p.status === "pending_admin_review" && p.proposedAt;
              const meta = cameBack ? { label: "Declined — reschedule", tone: "red" } : STATUS_META[p.status] || { label: p.status, tone: "gray" };
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(String(p.id))}
                  className={`w-full text-left px-4 py-3 ${on ? "bg-red-50/50 shadow-[inset_3px_0_0_#7d0a0a]" : "hover:bg-gray-50"}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-bold truncate ${on ? "text-one" : "text-gray-800"}`}>{personName(p.student)}</span>
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                  </span>
                  <span className="block text-xs text-gray-500 truncate">{p.title || "Untitled plan"}{(p.student?.plannerActive === false || p.student?.plannerActive === 0) && <span className="ml-1.5 text-[10px] font-bold uppercase text-gray-400">· Inactive</span>}</span>
                  <span className="block text-[11px] text-gray-400">Sent {fmtStamp(p.createdAt) || "—"}</span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedId && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 min-w-0">
            {planLoading && !current ? (
              <SkelRows n={3} />
            ) : planError && !current ? (
              <p className="text-sm text-red-600">
                {planError} <button type="button" onClick={() => setPlanVersion((v) => v + 1)} className="font-bold underline">Retry</button>
              </p>
            ) : current ? (
              <>
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-white shrink-0 bg-one">{initials(studentName)}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{studentName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[student?.grade?.name, student?.category?.name, student?.email || student?.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 -mt-1 mb-4">
                  <div className="inline-flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label="Planner alerts for this student">
                    {[[true, "Active"], [false, "Inactive"]].map(([v, l]) => (
                      <button key={l} type="button" disabled={savingActive || !listed} onClick={() => v !== plannerActive && setActive(v)}
                        className={`px-3 py-1 rounded-md text-xs font-bold ${plannerActive === v ? (v ? "bg-white text-green-700 shadow-sm" : "bg-white text-gray-700 shadow-sm") : "text-gray-500 hover:text-gray-800"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <Link to={`/admin/live/availability-plans?plan=${current.id}`} className="text-xs font-bold text-one hover:underline">Open study plan →</Link>
                  <p className="w-full text-[11px] text-gray-400">{plannerActive ? "You get an alert on the Planner when this student's free times wait for you." : "Inactive: no Planner alerts for this student."}</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">Plan: <b className="text-gray-800">{current.title || "Untitled plan"}</b></p>

                <p className="text-sm font-bold text-gray-800 mb-2 inline-flex items-center gap-1.5"><CalendarClock size={15} className="text-one" /> Free times</p>
                {freeByDay.length ? (
                  <div className="space-y-1.5">
                    {freeByDay.map(([label, list]) => (
                      <div key={label} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <span className="text-sm font-bold text-gray-700 shrink-0">{label}</span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {list.map((s, i) => (
                            <span key={s.id ?? i} className="text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                              {fmtTime(s.timeFrom)} – {fmtTime(s.timeTo)}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">This request has no free times.</p>
                )}

                {current.notes && (
                  <div className="mt-4">
                    <SectionLabel className="mb-1">Student notes</SectionLabel>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">“{current.notes}”</p>
                  </div>
                )}
                {proposed.length > 0 && (() => {
                  const kept = proposed.filter((x) => x.studentResponse === "accepted");
                  const declined = proposed.filter((x) => x.studentResponse === "rejected");
                  const waiting = proposed.filter((x) => x.studentResponse === "pending");
                  const row = (x) => (
                    <li key={x.planSessionId} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate"><b className="text-gray-700">{fmtDay(String(x.sessionDate || "").slice(0, 10))}</b> · {fmtTime(x.timeFrom)} · {x.sessionName}</span>
                      <span className="text-gray-400 shrink-0">{x.teacherName || ""}</span>
                    </li>
                  );
                  return (
                    <div className="mt-4 space-y-2">
                      {current.studentFeedback && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                          <b>Student:</b> “{current.studentFeedback}”
                        </div>
                      )}
                      {declined.length > 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                          <p className="text-xs font-bold text-red-800 mb-1">Declined — add new times for these ({declined.length})</p>
                          <ul className="space-y-1 text-red-900">{declined.map(row)}</ul>
                        </div>
                      )}
                      {kept.length > 0 && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
                          <p className="text-xs font-bold text-green-800 mb-1">Accepted — already booked, kept as they are ({kept.length})</p>
                          <ul className="space-y-1 text-green-900">{kept.map(row)}</ul>
                        </div>
                      )}
                      {waiting.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                          {waiting.length} session{waiting.length === 1 ? " is" : "s are"} still waiting for the student. Sending a new plan replaces {waiting.length === 1 ? "it" : "them"}.
                        </div>
                      )}
                      {(declined.length > 0 || waiting.length > 0) && kept.length > 0 && (
                        <p className="text-[11px] text-gray-500">Sending adds your new sessions; the accepted ones stay booked.</p>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : null}
          </section>
        )}
      </div>

      {/* Right: builder */}
      <section className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 min-w-0 flex flex-col">
        {!current ? (
          planLoading ? <SkelRows n={5} /> : <p className="text-sm text-gray-400 py-10 text-center">Pick a request on the left to build its plan.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-bold text-gray-900">
                  Build plan · {budget ? <>{draft.length} / {budget.toPlan} session{budget.toPlan === 1 ? "" : "s"} planned</> : <>{draft.length} session{draft.length === 1 ? "" : "s"} in the draft</>}
                </p>
                <p className="text-xs text-gray-400 truncate">{courses.find((c) => sameId(c.id, courseId))?.name || "No course yet"} · {studentName}</p>
                {budget && (
                  <p className={`text-[11px] mt-0.5 ${budget.toPlan === 0 ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                    Live balance {budget.liveBalance} · {budget.booked} already booked{budget.waiting ? ` · ${budget.waiting} waiting in another plan` : ""}
                    {budget.toPlan === 0 ? " — nothing left to plan; add a package first" : ` → plan ${budget.toPlan}`}
                  </p>
                )}
              </div>
              {draft.length > 0 && (
                <button type="button" onClick={() => setDraft([])} className="a-btn text-xs py-2"><Trash2 size={14} /> Clear</button>
              )}
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4" title={`${draft.length} of ${cap}`}>
              <span className={`block h-full rounded-full transition-all ${budget && draft.length >= cap ? "bg-green-600" : "bg-one"}`} style={{ width: `${pct}%` }} />
            </div>

            <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1 w-full sm:w-fit" role="tablist" aria-label="What to add">
              {[["new", "New sessions", newRows.length], ["group", "Group sessions", groupList.loading ? "…" : groupList.sessions.length]].map(([k, label, n]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === k ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                  {k === "group" && <Users size={13} className="inline -mt-0.5 mr-1" />}{label} <span className="text-gray-400 font-semibold">{n}</span>
                </button>
              ))}
            </div>

            {mode === "group" ? (
              <GroupSessionsTable list={groupList} draft={draft} block={groupBlock} onToggle={toggleGroup} onRefresh={() => setGroupVersion((v) => v + 1)} />
            ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="md:col-span-2 min-w-0">
                  <label className="a-lbl-f" htmlFor="pb-course">Course</label>
                  <CourseSelect id="pb-course" courses={courses} value={courseId} onChange={setCourseId} firstIds={enrolledIds} disabled={newRows.length > 0} />
                  {newRows.length > 0 && <p className="text-[11px] text-gray-400 mt-1">Remove the new sessions to change the course.</p>}
                </div>
                <div>
                  <label className="a-lbl-f" htmlFor="pb-type">Type</label>
                  <select id="pb-type" value={type} onChange={(e) => setType(e.target.value)} className="a-inp">
                    {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="min-w-0">
                  <label className="a-lbl-f" htmlFor="pb-len">Length</label>
                  <select id="pb-len" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="a-inp">
                    {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="a-lbl-f" htmlFor="pb-slot">Date &amp; time <span className="font-normal text-gray-400">(free times only)</span></label>
                  <select id="pb-slot" value={slot} onChange={(e) => setSlot(e.target.value)} disabled={!slotOptions.length} className="a-inp font-semibold">
                    {slotOptions.length ? (
                      slotOptions.map((o) => <option key={slotKey(o)} value={slotKey(o)}>{fmtDay(o.date)} · {fmtTime(o.timeFrom)} – {fmtTime(o.timeTo)}</option>)
                    ) : (
                      <option value="">No free time left</option>
                    )}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="a-lbl-f" htmlFor="pb-teacher">Teacher</label>
                  <select
                    id="pb-teacher"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    disabled={!picked || !free.data}
                    className={`a-inp ${free.data && !teachers.some(selectable) ? "border-red-300 text-red-600" : ""}`}
                  >
                    {!picked ? (
                      <option value="">Pick a time first</option>
                    ) : free.loading ? (
                      <option value="">Checking who is free…</option>
                    ) : free.error ? (
                      <option value="">Could not check</option>
                    ) : !teachers.some(selectable) ? (
                      <option value="">Nobody is free then</option>
                    ) : null}
                    {free.data && !free.loading &&
                      teachers.map((t) => (
                        <option key={t.id} value={String(t.id)} disabled={!selectable(t)}>
                          {t.state === "busy"
                            ? `${t.name} — Busy (${t.busyWith || "another session"})`
                            : t.state === "off"
                              ? `${t.name} — Outside working hours`
                            : teacherClash(t)
                              ? `${t.name} — In this draft then`
                              : `${t.name} — ${TEACHER_STATE[t.state]?.label || t.state}${courseId && t.teachesCourse ? " · teaches course" : ""}`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {slots.length > 0 && !slotOptions.length && (
                <p className="text-xs text-amber-700 mb-3">No free time of {duration} minutes is left in the next {WEEKS_AHEAD} weeks{draft.length ? " outside the draft" : ""}. Try a shorter length.</p>
              )}
              {free.error && <p className="text-xs font-semibold text-red-600 mb-3">{free.error}</p>}
              {studentBusy && <p className="text-xs font-semibold text-red-600 mb-3">{studentName} already has a session at this time — pick another one.</p>}
              {studentAtTime && !studentBusy && studentAtTime.state !== "free" && (
                <p className="text-xs text-gray-500 mb-3">Student: {STUDENT_STATE[studentAtTime.state]?.label}.</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="min-w-0">
                  <label className="a-lbl-f" htmlFor="pb-chapter">Chapter</label>
                  <select id="pb-chapter" value={chapterId} onChange={(e) => { setChapterId(e.target.value); setLessonId(""); }} disabled={!chapters.length} className="a-inp">
                    {!courseId ? <option value="">Pick a course first</option> : lessonsLoading ? <option value="">Loading…</option> : !chapters.length ? <option value="">No chapters</option> : null}
                    {chapters.map((c, i) => <option key={c.id} value={String(c.id)}>Chapter {i + 1}: {c.name}{doneCount(c) ? ` (${doneCount(c)}/${c.lessons.length} attended)` : ""}</option>)}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="a-lbl-f" htmlFor="pb-lesson">Lesson {!lessonRequired && <span className="font-normal text-gray-400">(optional)</span>}</label>
                  <select id="pb-lesson" value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!chapter} className="a-inp">
                    {(!lessonRequired || !chapter) && <option value="">{chapter ? "No lesson" : "—"}</option>}
                    {(chapter?.lessons || []).map((l, i) => (
                      <option key={l.id} value={String(l.id)} disabled={lessonTaken(l)}>Lesson {i + 1}: {l.name}{lessonTag(l)}</option>
                    ))}
                  </select>
                  {type === "Explanation" && chapter && chapter.lessons.length > 0 && chapter.lessons.every(lessonTaken) && (
                    <p className="text-[11px] text-amber-700 mt-1">Every lesson of this chapter is attended or planned — pick the next chapter.</p>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <label className="a-lbl-f" htmlFor="pb-name">Session name <span className="font-normal text-gray-400">(optional — the lesson name is used)</span></label>
                <input id="pb-name" value={sessionName} onChange={(e) => setSessionName(e.target.value)} maxLength={255} className="a-inp"
                  placeholder={chapter?.lessons.find((l) => sameId(l.id, lessonId))?.name || "e.g. Algebra — revision"} />
              </div>
              {lessonsError && <p className="text-xs font-semibold text-red-600 mb-3">{lessonsError}</p>}

              <button
                type="button"
                onClick={addToDraft}
                disabled={!picked || !teacher || !courseId || free.loading || studentBusy || draft.length >= cap}
                className="a-btn primary w-full"
              >
                + Add session to plan
              </button>
            </div>
            )}

            <div className="flex-1">
              {draft.length ? (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {draft.map((r, i) => {
                    const [c, bg] = TYPE_COLORS[r.type] || ["#475569", "#f1f5f9"];
                    return (
                      <div key={r.key} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 px-3 sm:px-4 py-3 border-t border-gray-100 first:border-0 hover:bg-gray-50">
                        <span className="w-7 h-7 rounded-lg text-[11px] font-extrabold flex items-center justify-center shrink-0 bg-gray-100 text-gray-500">{i + 1}</span>
                        <span className="w-1 self-stretch rounded-full shrink-0 hidden sm:block" style={{ background: c }} />
                        <div className="w-32 shrink-0">
                          <p className="text-sm font-bold text-gray-800">{fmtDay(r.date)}</p>
                          <p className="text-[11px] text-gray-400">{fmtTime(r.timeFrom)} – {fmtTime(r.timeTo)}</p>
                        </div>
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="text-sm font-bold text-gray-900 truncate">{r.name || r.lessonName || (r.type === "Exam" ? "Exam" : "Session")}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            <span className="font-bold px-1.5 py-0.5 rounded mr-1" style={{ color: c, background: bg }}>{r.type}</span>
                            {r.group ? (
                              <span className="font-bold text-indigo-700"><Users size={11} className="inline -mt-0.5 mr-0.5" />Joins {r.groupNames || "a group"}</span>
                            ) : r.chapterName ? `Chapter ${r.chapterNo}: ${r.chapterName} · Lesson ${r.lessonNo}` : ""}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-gray-600 shrink-0 whitespace-nowrap">{r.teacherName}</p>
                        <button type="button" onClick={() => setDraft((d) => d.filter((x) => x.key !== r.key))} className="a-act del shrink-0 ml-auto sm:ml-0" title="Remove" aria-label={`Remove session ${i + 1}`}>
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 px-4 text-center">
                  <p className="text-sm font-bold text-gray-500">No sessions added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Pick a free time, a teacher and a lesson, then add sessions one by one — or add the student to group sessions.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="a-lbl-f" htmlFor="pb-notes">Note to the student <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea id="pb-notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. We placed your sessions in your free times — approve the ones that suit you." className="a-inp resize-none mb-3" />
              <button type="button" onClick={send} disabled={sending || !draft.length || (newRows.length > 0 && !courseId)} className="a-btn primary w-full py-3 text-base">
                <Send size={16} /> {sending ? "Sending…" : `Send plan to ${studentName}`}
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-1.5">The student is notified and approves or rejects each session.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** Existing group sessions this student can join — click a row to add it to the draft (or remove it). */
function GroupSessionsTable({ list, draft, block, onToggle, onRefresh }) {
  const STATE = { attended: ["attended ✓", "bg-green-50 text-green-700 border-green-200"], booked: ["booked", "bg-amber-50 text-amber-700 border-amber-200"] };
  return (
    <div className="border border-gray-200 rounded-xl mb-4 overflow-hidden">
      <div className="px-3 sm:px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-600 min-w-0">Group sessions in the student's free times, in a course they bought, teaching lessons they still need.</p>
        <button type="button" onClick={onRefresh} disabled={list.loading} className="a-act shrink-0" title="Refresh" aria-label="Refresh group sessions">
          <RotateCw size={14} className={list.loading ? "animate-spin" : ""} />
        </button>
      </div>
      {list.loading && !list.sessions.length ? (
        <div className="p-4"><SkelRows n={3} /></div>
      ) : list.error ? (
        <p className="p-4 text-sm text-red-600">{list.error} <button type="button" onClick={onRefresh} className="font-bold underline">Retry</button></p>
      ) : !list.sessions.length ? (
        <div className="py-10 px-4 text-center">
          <p className="text-sm font-bold text-gray-500">No group session fits this student</p>
          <p className="text-xs text-gray-400 mt-1">None is inside their free times with a lesson they still need in the next 60 days. Add new sessions instead.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="w-10 px-3 py-2"></th>
                <th className="px-2 py-2">When</th>
                <th className="px-2 py-2">Session</th>
                <th className="px-2 py-2">Lessons</th>
                <th className="px-2 py-2">Group</th>
                <th className="px-2 py-2">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {list.sessions.map((g) => {
                const on = draft.some((r) => r.group && sameId(r.id, g.id));
                const why = on ? "" : block(g);
                const [c, bg] = TYPE_COLORS[g.type] || ["#475569", "#f1f5f9"];
                return (
                  <tr key={g.id} onClick={() => onToggle(g)} title={why || (on ? "Click to remove from the draft" : "Click to add to the draft")}
                    tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(g); } }}
                    aria-selected={on}
                    className={`border-t border-gray-100 align-top cursor-pointer outline-none focus-visible:bg-red-50/40 ${on ? "bg-red-50/60 shadow-[inset_3px_0_0_#7d0a0a]" : why ? "opacity-50" : "hover:bg-gray-50"}`}>
                    <td className="px-3 py-3">
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? "bg-one border-one text-white" : "border-gray-300 bg-white"}`}>{on && <Check size={13} />}</span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <p className="font-bold text-gray-800">{fmtDay(g.date)}</p>
                      <p className="text-[11px] text-gray-400">{fmtTime(g.timeFrom)} – {fmtTime(g.timeTo)}</p>
                    </td>
                    <td className="px-2 py-3 min-w-0">
                      <p className="font-bold text-gray-900">{g.name}</p>
                      <p className="text-[11px] text-gray-500">
                        <span className="font-bold px-1.5 py-0.5 rounded mr-1" style={{ color: c, background: bg }}>{g.type}</span>
                        {g.course || ""}
                      </p>
                      {g.inThisPlan === "pending" && <p className="text-[11px] font-semibold text-blue-700 mt-0.5">Already sent — waiting for the student</p>}
                      {g.inThisPlan === "rejected" && <p className="text-[11px] font-semibold text-red-700 mt-0.5">The student declined it before</p>}
                      {why && <p className="text-[11px] font-semibold text-red-600 mt-0.5">{why}</p>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {g.lessons.length ? g.lessons.map((l) => (
                          <span key={l.id} className={`text-[11px] font-semibold border rounded-md px-1.5 py-0.5 ${l.status ? STATE[l.status][1] : "bg-white text-gray-700 border-gray-200"}`}>
                            {l.name}{l.status ? ` · ${STATE[l.status][0]}` : ""}
                          </span>
                        )) : <span className="text-[11px] text-gray-400">No lesson linked</span>}
                      </div>
                      {g.lessons.length > 0 && (
                        <p className="text-[11px] text-gray-500 mt-1">{g.needed ? `${g.needed} new for this student` : "Revisits attended lessons"}{g.revisits && g.needed ? " · revisits some" : ""}</p>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {g.groups.map((x) => (
                        <p key={x.id} className="text-xs font-semibold text-gray-700 whitespace-nowrap"><Users size={12} className="inline -mt-0.5 mr-1 text-indigo-600" />{x.name} <span className="text-gray-400">· {x.size}</span></p>
                      ))}
                    </td>
                    <td className="px-2 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">{g.teacher?.name || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Free times grouped by weekday (Saturday first), then specific dates in order. */
function groupFreeTimes(slots) {
  const weekly = new Map();
  const dated = new Map();
  slots.forEach((s) => {
    if (s.specificDate) {
      const d = String(s.specificDate).slice(0, 10);
      if (!dated.has(d)) dated.set(d, []);
      dated.get(d).push(s);
    } else {
      const d = dayName(s.dayOfWeek) || "Any day";
      if (!weekly.has(d)) weekly.set(d, []);
      weekly.get(d).push(s);
    }
  });
  const byTime = (list) => [...list].sort((a, b) => toMin(a.timeFrom) - toMin(b.timeFrom));
  const days = [...weekly.keys()].sort((a, b) => (DAY_ORDER.indexOf(a) + 1 || 99) - (DAY_ORDER.indexOf(b) + 1 || 99));
  return [
    ...days.map((d) => [d, byTime(weekly.get(d))]),
    ...[...dated.keys()].sort().map((d) => [fmtDay(d), byTime(dated.get(d))]),
  ];
}
