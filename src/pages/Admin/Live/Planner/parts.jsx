// Shared helpers for the Planner "Add session" and "Build a plan" tabs.
// API: docs/admin-planner-api.md in the backend (GET /api/admin/planner/options, /courses/:id/lessons, /free).
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/api/api";
import { errText } from "@/components/admin/kit";

export const PLANNER_API = "/api/admin/planner";

/* ---------------- session types (colours follow the design's MS_TYPES) ---------------- */
export const SESSION_TYPES = ["Explanation", "Re-Explanation", "Mistakes", "Exam"];
export const TYPE_COLORS = {
  Explanation: ["#1d4ed8", "#eff6ff"],
  "Re-Explanation": ["#c2410c", "#fff7ed"],
  Mistakes: ["#7d0a0a", "#fdecec"],
  Exam: ["#7c3aed", "#f5f3ff"],
};
export const TypePill = ({ type }) => {
  const [c, bg] = TYPE_COLORS[type] || ["#475569", "#f1f5f9"];
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color: c, background: bg }}>{type}</span>;
};

/* ---------------- free / busy states ---------------- */
export const TEACHER_STATE = {
  free: { label: "Free", cls: "bg-green-50 text-green-700", rank: 0 },
  not_shared: { label: "Hours not shared", cls: "bg-gray-100 text-gray-500", rank: 1 },
  off: { label: "Outside their hours", cls: "bg-amber-50 text-amber-700", rank: 2 },
  busy: { label: "Busy", cls: "bg-red-50 text-red-600", rank: 3 },
};
export const STUDENT_STATE = {
  free: { label: "Free", cls: "bg-green-50 text-green-700", rank: 0 },
  unknown: { label: "No free times sent", cls: "bg-gray-100 text-gray-500", rank: 1 },
  off: { label: "Not free then", cls: "bg-amber-50 text-amber-700", rank: 2 },
  busy: { label: "Busy", cls: "bg-red-50 text-red-600", rank: 3 },
};
export const StateBadge = ({ meta }) =>
  meta ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${meta.cls}`}>{meta.label}</span> : null;

/** free & teaches the course first, then hours-not-shared, then outside hours, busy last. */
export const sortTeachers = (list = []) =>
  [...list].sort(
    (a, b) =>
      (TEACHER_STATE[a.state]?.rank ?? 9) - (TEACHER_STATE[b.state]?.rank ?? 9) ||
      Number(!!b.teachesCourse) - Number(!!a.teachesCourse) ||
      String(a.name || "").localeCompare(String(b.name || ""))
  );
export const sortStudents = (list = []) =>
  [...list].sort(
    (a, b) => (STUDENT_STATE[a.state]?.rank ?? 9) - (STUDENT_STATE[b.state]?.rank ?? 9) || String(a.name || "").localeCompare(String(b.name || ""))
  );

/* ---------------- dates & times ---------------- */
export const toMin = (t) => {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
export const fromMin = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const hhmm = (t) => String(t || "").slice(0, 5);
export const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return isoOf(new Date(y, m - 1, d + n));
};
export const todayIso = () => isoOf(new Date());
export const validTimes = (from, to) => Number.isFinite(toMin(from)) && Number.isFinite(toMin(to)) && toMin(from) < toMin(to);
export const overlaps = (a, b) => a.date === b.date && toMin(a.timeFrom) < toMin(b.timeTo) && toMin(b.timeFrom) < toMin(a.timeTo);

export const personName = (p, fallback = "Student") => p?.name || [p?.firstname, p?.lastname].filter(Boolean).join(" ") || fallback;
export const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const useDebounced = (value, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

/* ---------------- data hooks ---------------- */

/** GET /options[?studentId] → { courses, groups, studentCourseIds } */
export function usePlannerOptions(studentId) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  useEffect(() => {
    let alive = true;
    // Drop the previous student's data so their enrolled courses are never applied to the next student.
    setState({ data: null, loading: true, error: "" });
    api
      .get(`${PLANNER_API}/options`, { params: studentId ? { studentId } : {} })
      .then((r) => alive && setState({ data: r.data?.data || null, loading: false, error: "" }))
      .catch((err) => alive && setState({ data: null, loading: false, error: errText(err, "Could not load courses") }));
    return () => { alive = false; };
  }, [studentId]);
  return state;
}

/** GET /courses/:courseId/lessons → chapters[{ id, name, lessons[{ id, name }] }] */
/** studentId / planId (optional): each lesson gets status "attended" | "booked" | null for that student. */
export function useCourseLessons(courseId, { studentId, planId } = {}) {
  const [state, setState] = useState({ chapters: [], loading: false, error: "" });
  useEffect(() => {
    if (!courseId) { setState({ chapters: [], loading: false, error: "" }); return undefined; }
    let alive = true;
    setState({ chapters: [], loading: true, error: "" });
    api
      .get(`${PLANNER_API}/courses/${courseId}/lessons`, { params: studentId ? { studentId, ...(planId ? { planId } : {}) } : {} })
      .then((r) => alive && setState({ chapters: r.data?.data?.chapters || [], loading: false, error: "" }))
      .catch((err) => alive && setState({ chapters: [], loading: false, error: errText(err, "Could not load lessons") }));
    return () => { alive = false; };
  }, [courseId, studentId, planId]);
  return state;
}

/** GET /free (debounced ~300ms). Only runs when date + a valid time range are set. */
export function useFreeAt({ date, timeFrom, timeTo, courseId, skipPlanId }) {
  const ready = /^\d{4}-\d{2}-\d{2}$/.test(date || "") && validTimes(timeFrom, timeTo);
  const key = ready ? JSON.stringify({ date, timeFrom: hhmm(timeFrom), timeTo: hhmm(timeTo), courseId: courseId || "", skipPlanId: skipPlanId || "" }) : "";
  const debouncedKey = useDebounced(key, 300);
  const [state, setState] = useState({ data: null, loading: false, error: "", key: "" });
  const seq = useRef(0);
  useEffect(() => {
    if (!debouncedKey) { setState({ data: null, loading: false, error: "", key: "" }); return; }
    const q = JSON.parse(debouncedKey);
    const params = { date: q.date, timeFrom: q.timeFrom, timeTo: q.timeTo };
    if (q.courseId) params.courseId = q.courseId;
    if (q.skipPlanId) params.skipPlanId = q.skipPlanId;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api
      .get(`${PLANNER_API}/free`, { params })
      .then((r) => id === seq.current && setState({ data: r.data?.data || null, loading: false, error: "", key: debouncedKey }))
      .catch((err) => id === seq.current && setState({ data: null, loading: false, error: errText(err, "Could not check who is free"), key: debouncedKey }));
  }, [debouncedKey]);
  // Results only count for the inputs they were asked for.
  const fresh = !!key && state.key === key;
  return { ready, data: fresh ? state.data : null, loading: ready && (!fresh || state.loading), error: fresh ? state.error : "" };
}

/* ---------------- small UI pieces ---------------- */

/** Numbered section card, like the design's add-session steps. */
export const StepCard = ({ n, title, right, children }) => (
  <section className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 min-w-0">
    <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-7 h-7 rounded-full text-xs font-extrabold text-white flex items-center justify-center shrink-0 bg-one">{n}</span>
        <h3 className="font-bold text-gray-800 truncate">{title}</h3>
      </div>
      {right}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

export const SectionLabel = ({ children, className = "" }) => (
  <p className={`text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-2 ${className}`}>{children}</p>
);

/** Course <select>, grouped by category; `firstIds` go on top as "Enrolled". */
export function CourseSelect({ courses = [], value, onChange, firstIds = [], disabled, id }) {
  const groups = useMemo(() => {
    const first = new Set((firstIds || []).map(String));
    const mine = courses.filter((c) => first.has(String(c.id)));
    const byCat = new Map();
    courses
      .filter((c) => !first.has(String(c.id)))
      .forEach((c) => {
        const k = c.category || "Other";
        if (!byCat.has(k)) byCat.set(k, []);
        byCat.get(k).push(c);
      });
    return { mine, cats: [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
  }, [courses, firstIds]);
  return (
    <select id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="a-inp">
      <option value="">Pick a course…</option>
      {groups.mine.length > 0 && (
        <optgroup label="Enrolled">
          {groups.mine.map((c) => <option key={c.id} value={c.id}>{c.name} (enrolled)</option>)}
        </optgroup>
      )}
      {groups.cats.map(([cat, list]) => (
        <optgroup key={cat} label={cat}>
          {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
