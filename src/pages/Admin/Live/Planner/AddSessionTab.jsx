import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/api/api";
import { Empty, SkelRows, errText, fmtDay, fmtTime } from "@/components/admin/kit";
import {
  CourseSelect, PLANNER_API, SESSION_TYPES, STUDENT_STATE, SectionLabel, StateBadge, StepCard, TEACHER_STATE, TypePill,
  addDays, fromMin, sortStudents, sortTeachers, toMin, todayIso, useCourseLessons, useFreeAt, usePlannerOptions, validTimes,
} from "./parts";

/* Live → Planner → Add session (MathPortal design "add-session").
   Course → who (one-to-one students or groups) → lesson(s) → type → date & time → teacher.
   Who is free comes from GET /api/admin/planner/free; the session is created with POST /api/admin/planner/sessions. */

const DEFAULT_FROM = "16:00";
const DEFAULT_TO = "17:00";
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function AddSessionTab({ onCreated }) {
  const { data: options, loading: optLoading, error: optError } = usePlannerOptions();
  const courses = options?.courses || [];
  const groups = options?.groups || [];

  const [courseId, setCourseId] = useState("");
  const [mode, setMode] = useState("students"); // "students" | "groups"
  const [studentIds, setStudentIds] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [lessonIds, setLessonIds] = useState([]);
  const [type, setType] = useState("Explanation");
  const [date, setDate] = useState(() => addDays(todayIso(), 1));
  const [timeFrom, setTimeFrom] = useState(DEFAULT_FROM);
  const [timeTo, setTimeTo] = useState(DEFAULT_TO);
  const [teacherId, setTeacherId] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const [studentQ, setStudentQ] = useState("");
  const [groupQ, setGroupQ] = useState("");
  const [lessonQ, setLessonQ] = useState("");
  const [teacherQ, setTeacherQ] = useState("");
  const [closed, setClosed] = useState({}); // chapterId → collapsed

  const { chapters, loading: lessonsLoading, error: lessonsError } = useCourseLessons(courseId);
  const free = useFreeAt({ date, timeFrom, timeTo, courseId });
  const teachers = useMemo(() => sortTeachers(free.data?.teachers || []), [free.data]);
  const students = useMemo(() => sortStudents(free.data?.students || []), [free.data]);

  const course = courses.find((c) => String(c.id) === String(courseId));
  const teacher = teachers.find((t) => String(t.id) === String(teacherId));

  // A teacher who turns out to be busy at the new time can't stay picked.
  useEffect(() => {
    if (teacher && (teacher.state === "busy" || teacher.state === "off")) setTeacherId("");
  }, [teacher]);

  const pickCourse = (id) => {
    setCourseId(id);
    setStudentIds([]);
    setLessonIds([]);
    setClosed({});
    setLessonQ("");
  };

  const changeFrom = (v) => {
    const len = validTimes(timeFrom, timeTo) ? toMin(timeTo) - toMin(timeFrom) : 60;
    setTimeFrom(v);
    const start = toMin(v);
    if (Number.isFinite(start)) setTimeTo(fromMin(Math.min(start + len, 23 * 60 + 59)));
  };

  /* ---------- who ---------- */
  const lessonMap = useMemo(() => {
    const m = new Map();
    chapters.forEach((ch) => ch.lessons.forEach((l) => m.set(String(l.id), { ...l, chapter: ch.name })));
    return m;
  }, [chapters]);

  const studentById = useMemo(() => new Map(students.map((s) => [String(s.id), s])), [students]);
  const pickedStudents = studentIds.map((id) => studentById.get(String(id))).filter(Boolean);
  const leftOut = pickedStudents.filter((s) => s.state === "busy");
  const sendStudents = pickedStudents.filter((s) => s.state !== "busy");
  const pickedGroups = groups.filter((g) => groupIds.includes(String(g.id)));

  const sq = studentQ.trim().toLowerCase();
  const shownStudents = sq ? students.filter((s) => `${s.name} ${s.nickname || ""}`.toLowerCase().includes(sq)) : students;
  const gq = groupQ.trim().toLowerCase();
  const shownGroups = gq ? groups.filter((g) => String(g.name).toLowerCase().includes(gq)) : groups;

  const toggle = (setter) => (id) => setter((cur) => (cur.includes(String(id)) ? cur.filter((x) => x !== String(id)) : [...cur, String(id)]));
  const toggleStudent = toggle(setStudentIds);
  const toggleGroup = toggle(setGroupIds);
  const toggleLesson = toggle(setLessonIds);
  const selectAllFree = () => {
    const add = shownStudents.filter((s) => s.state === "free").map((s) => String(s.id));
    if (!add.length) return toast("Nobody in this list is free then");
    setStudentIds((cur) => [...new Set([...cur, ...add])]);
  };

  /* ---------- lessons ---------- */
  const lq = lessonQ.trim().toLowerCase();
  const shownChapters = useMemo(
    () =>
      chapters
        .map((ch, i) => ({ ...ch, no: i + 1, rows: lq && !String(ch.name).toLowerCase().includes(lq) ? ch.lessons.filter((l) => String(l.name).toLowerCase().includes(lq)) : ch.lessons }))
        .filter((ch) => ch.rows.length),
    [chapters, lq]
  );
  const pickedLessons = lessonIds.map((id) => lessonMap.get(id)).filter(Boolean);

  /* ---------- teachers ---------- */
  const tq = teacherQ.trim().toLowerCase();
  const shownTeachers = tq ? teachers.filter((t) => String(t.name).toLowerCase().includes(tq)) : teachers;
  const freeTeacherCount = teachers.filter((t) => t.state !== "busy" && t.state !== "off").length;

  /* ---------- create ---------- */
  const submit = async () => {
    if (saving) return;
    if (!courseId) return toast.error("Pick a course");
    if (free.ready && !free.data) return toast(free.error || "Still checking who is free — try again in a moment");
    if (!sendStudents.length && !groupIds.length) {
      return toast.error(leftOut.length ? "Every student you picked is busy then — pick someone free or a group" : "Pick at least one student or group");
    }
    if (type !== "Exam" && !lessonIds.length) return toast.error("Pick at least one lesson (only an exam can have none)");
    if (!date) return toast.error("Pick a date");
    if (date < todayIso()) return toast.error("That date is in the past");
    if (!validTimes(timeFrom, timeTo)) return toast.error("The end time must be after the start time");
    if (!teacherId) return toast.error("Pick a teacher");
    if (teacher?.state === "busy") return toast.error(`${teacher.name} is busy then`);
    if (teacher?.state === "off") return toast.error(`That is outside ${teacher.name}'s working hours`);

    const body = {
      courseId,
      date,
      timeFrom,
      timeTo,
      teacherId,
      type,
      lessonIds: lessonIds.filter((id) => lessonMap.has(id)),
      studentIds: sendStudents.map((s) => String(s.id)),
      groupIds,
    };
    if (name.trim()) body.name = name.trim();

    setSaving(true);
    try {
      const res = await api.post(`${PLANNER_API}/sessions`, body);
      toast.success("Session added — dispatch it from the timetable");
      if (leftOut.length) toast(`${plural(leftOut.length, "busy student")} left out`);
      const sessionId = res.data?.data?.sessionId;
      setStudentIds([]);
      setGroupIds([]);
      setLessonIds([]);
      setName("");
      setTeacherId("");
      setDate(addDays(todayIso(), 1));
      setTimeFrom(DEFAULT_FROM);
      setTimeTo(DEFAULT_TO);
      onCreated?.(sessionId);
    } catch (err) {
      toast.error(errText(err, "Could not add the session"));
    } finally {
      setSaving(false);
    }
  };

  if (optLoading && !options) return <SkelRows n={6} />;
  if (optError && !options) return <Empty title="Could not load the planner" text={optError} />;

  const timeOk = validTimes(timeFrom, timeTo);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
      <div className="xl:col-span-2 min-w-0">
        {/* 1 · Course */}
        <StepCard n={1} title="Course" right={course?.category ? <span className="text-xs font-bold text-gray-400 truncate">{course.category}</span> : null}>
          <label className="a-lbl-f" htmlFor="ps-course">Course</label>
          <CourseSelect id="ps-course" courses={courses} value={courseId} onChange={pickCourse} />
          {!courses.length && <p className="text-xs text-gray-400 mt-2">No courses yet.</p>}
        </StepCard>

        {/* 2 · Who */}
        <StepCard
          n={2}
          title="Who"
          right={<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-one">{studentIds.length + groupIds.length} selected</span>}
        >
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-full sm:w-fit">
            {[
              ["students", "Students", studentIds.length],
              ["groups", "Groups", groupIds.length],
            ].map(([k, label, n]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${mode === k ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              >
                {label}
                {n > 0 && <span className="ml-1.5 text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center bg-red-50 text-one">{n}</span>}
              </button>
            ))}
          </div>

          {mode === "students" ? (
            !courseId ? (
              <p className="text-sm text-gray-400">Pick a course first — then its students are listed with who is free at the chosen time.</p>
            ) : !free.ready ? (
              <p className="text-sm text-gray-400">Set a date and a time range (step 4) to see who is free.</p>
            ) : free.error ? (
              <p className="text-sm font-semibold text-red-600">{free.error}</p>
            ) : free.loading && !free.data ? (
              <SkelRows n={3} />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="relative flex-1 min-w-0">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={studentQ} onChange={(e) => setStudentQ(e.target.value)} placeholder="Search students…" className="a-inp pl-9" />
                  </div>
                  <button type="button" onClick={selectAllFree} className="a-btn shrink-0"><Check size={15} /> Select all free</button>
                </div>
                <SectionLabel>Students of {course?.name || "this course"} · {students.length}</SectionLabel>
                <div className="rounded-xl border border-gray-100 max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {shownStudents.map((s) => {
                    const on = studentIds.includes(String(s.id));
                    const busy = s.state === "busy";
                    return (
                      <label key={s.id} className={`flex items-center gap-3 px-3 py-2.5 ${busy && !on ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${on ? "bg-red-50/40" : "hover:bg-gray-50"}`}>
                        <input type="checkbox" checked={on} disabled={busy && !on} onChange={() => toggleStudent(s.id)} className="w-4 h-4 accent-one shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-800 truncate">{s.name}</span>
                          {s.nickname && <span className="block text-[11px] text-one font-bold truncate">{s.nickname}</span>}
                        </span>
                        <StateBadge meta={STUDENT_STATE[s.state]} />
                      </label>
                    );
                  })}
                  {!shownStudents.length && (
                    <p className="px-3 py-6 text-center text-sm text-gray-400">{students.length ? "No student matches this search." : "No student has an active enrolment in this course."}</p>
                  )}
                </div>
              </>
            )
          ) : (
            <>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={groupQ} onChange={(e) => setGroupQ(e.target.value)} placeholder="Search groups…" className="a-inp pl-9" />
              </div>
              <SectionLabel>Groups · {groups.length}</SectionLabel>
              <div className="rounded-xl border border-gray-100 max-h-80 overflow-y-auto divide-y divide-gray-50">
                {shownGroups.map((g) => {
                  const on = groupIds.includes(String(g.id));
                  return (
                    <label key={g.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${on ? "bg-red-50/40" : "hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleGroup(g.id)} className="w-4 h-4 accent-one shrink-0" />
                      <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800 truncate">{g.name}</span>
                      <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap inline-flex items-center gap-1"><Users size={12} /> {plural(g.size || 0, "student")}</span>
                    </label>
                  );
                })}
                {!shownGroups.length && <p className="px-3 py-6 text-center text-sm text-gray-400">{groups.length ? "No group matches this search." : "No groups yet."}</p>}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Every member of a picked group joins the session. Free times are not checked for groups.</p>
            </>
          )}
        </StepCard>

        {/* 3 · Lessons */}
        <StepCard
          n={3}
          title={type === "Exam" ? "Lessons (optional for an exam)" : "Lessons"}
          right={<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-one">{plural(lessonIds.length, "lesson")}</span>}
        >
          {!courseId ? (
            <p className="text-sm text-gray-400">Pick a course first — its chapters and lessons are listed here.</p>
          ) : lessonsLoading ? (
            <SkelRows n={3} />
          ) : lessonsError ? (
            <p className="text-sm font-semibold text-red-600">{lessonsError}</p>
          ) : !chapters.length ? (
            <p className="text-sm font-semibold text-amber-700">This course has no lessons yet{type === "Exam" ? "." : " — only an exam can be added."}</p>
          ) : (
            <>
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={lessonQ} onChange={(e) => setLessonQ(e.target.value)} placeholder="Search lessons or chapters…" className="a-inp pl-9" />
              </div>
              <div className="max-h-[26rem] overflow-y-auto pr-0.5">
                {shownChapters.map((ch) => {
                  const open = lq ? true : !closed[ch.id];
                  const nSel = ch.lessons.filter((l) => lessonIds.includes(String(l.id))).length;
                  return (
                    <div key={ch.id} className="rounded-xl border border-gray-100 mb-2 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setClosed((c) => ({ ...c, [ch.id]: open }))}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50/70 text-left"
                      >
                        <span className="text-sm font-bold text-gray-800 min-w-0 truncate">Chapter {ch.no}: {ch.name}</span>
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap inline-flex items-center gap-1">
                          {nSel > 0 && <span className="text-one">{nSel} picked ·</span>}
                          {plural(ch.lessons.length, "lesson")} {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </span>
                      </button>
                      {open && (
                        <div className="divide-y divide-gray-50">
                          {ch.rows.map((l) => {
                            const on = lessonIds.includes(String(l.id));
                            return (
                              <label key={l.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${on ? "bg-red-50/60" : "hover:bg-gray-50"}`}>
                                <input type="checkbox" checked={on} onChange={() => toggleLesson(l.id)} className="w-4 h-4 accent-one shrink-0" />
                                <span className={`text-sm min-w-0 ${on ? "font-bold text-one" : "text-gray-700"}`}>Lesson {ch.lessons.indexOf(l) + 1}: {l.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!shownChapters.length && <p className="py-6 text-center text-sm text-gray-400">No lesson matches this search.</p>}
              </div>
            </>
          )}
        </StepCard>

        {/* 4 · Type, date & time */}
        <StepCard n={4} title="Type & time">
          <SectionLabel>Session type</SectionLabel>
          <div className="flex flex-wrap gap-2 mb-4">
            {SESSION_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`a-chip ${type === t ? "on" : ""}`}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="a-lbl-f" htmlFor="ps-date">Date</label>
              <input id="ps-date" type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} className="a-inp" />
            </div>
            <div>
              <label className="a-lbl-f" htmlFor="ps-from">From</label>
              <input id="ps-from" type="time" value={timeFrom} onChange={(e) => changeFrom(e.target.value)} className="a-inp" />
            </div>
            <div>
              <label className="a-lbl-f" htmlFor="ps-to">To</label>
              <input id="ps-to" type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className={`a-inp ${timeOk ? "" : "border-red-300"}`} />
            </div>
          </div>
          {!timeOk && timeFrom && timeTo && <p className="text-xs font-semibold text-red-600 mt-2">The end time must be after the start time.</p>}
        </StepCard>

        {/* 5 · Teacher */}
        <StepCard
          n={5}
          title="Teacher"
          right={free.data ? <span className="text-xs font-bold text-gray-400">{freeTeacherCount} of {teachers.length} can take it</span> : null}
        >
          {!free.ready ? (
            <p className="text-sm text-gray-400">Set a date and a time range to see which teachers are free.</p>
          ) : free.error ? (
            <p className="text-sm font-semibold text-red-600">{free.error}</p>
          ) : free.loading && !free.data ? (
            <SkelRows n={3} />
          ) : (
            <>
              {teachers.length > 8 && (
                <div className="relative mb-3">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={teacherQ} onChange={(e) => setTeacherQ(e.target.value)} placeholder="Search teachers…" className="a-inp pl-9" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-0.5">
                {shownTeachers.map((t) => {
                  const on = String(t.id) === String(teacherId);
                  const busy = t.state === "busy" || t.state === "off";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setTeacherId(String(t.id))}
                      className={`text-left rounded-xl border-2 px-4 py-3 min-w-0 ${on ? "border-one bg-red-50/50" : "border-gray-200 hover:border-gray-300"} ${busy ? "opacity-60 cursor-not-allowed hover:border-gray-200" : ""}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-bold truncate ${on ? "text-one" : "text-gray-800"}`}>{t.name}</span>
                        <StateBadge meta={TEACHER_STATE[t.state]} />
                      </span>
                      <span className={`block text-[11px] mt-0.5 truncate ${busy ? "text-red-600 font-semibold" : t.teachesCourse ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                        {t.state === "off" ? "Outside working hours" : busy ? `Busy — ${t.busyWith || "another session"}` : !courseId ? "Pick a course to see who teaches it" : t.teachesCourse ? "Teaches this course" : "Doesn't teach this course"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!shownTeachers.length && <p className="py-6 text-center text-sm text-gray-400">{teachers.length ? "No teacher matches this search." : "No teachers found."}</p>}
              {teachers.length > 0 && !freeTeacherCount && <p className="text-sm font-bold text-red-600 mt-3">No teacher is free then (busy or outside their hours) — try another time.</p>}
            </>
          )}
        </StepCard>
      </div>

      {/* Summary */}
      <aside className="xl:sticky xl:top-4 min-w-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionLabel className="mb-3">New session</SectionLabel>
          <dl className="space-y-2 text-sm">
            {[
              ["Course", course?.name || "—"],
              ["Type", <TypePill key="t" type={type} />],
              ["Students", sendStudents.length ? (sendStudents.length > 3 ? `${sendStudents.slice(0, 3).map((s) => s.name).join(", ")} +${sendStudents.length - 3}` : sendStudents.map((s) => s.name).join(", ")) : "—"],
              ["Groups", pickedGroups.length ? pickedGroups.map((g) => `${g.name} (${g.size || 0})`).join(", ") : "—"],
              ["Lessons", pickedLessons.length ? (pickedLessons.length > 2 ? `${pickedLessons[0].name} +${pickedLessons.length - 1}` : pickedLessons.map((l) => l.name).join(", ")) : type === "Exam" ? "None (exam)" : "—"],
              ["When", date && timeOk ? `${fmtDay(date)} · ${fmtTime(timeFrom)} – ${fmtTime(timeTo)}` : "—"],
              ["Teacher", teacher?.name || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-gray-400 shrink-0">{k}</dt>
                <dd className="font-semibold text-gray-800 text-right break-words min-w-0">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <label className="a-lbl-f" htmlFor="ps-name">Session name <span className="font-normal text-gray-400">(optional)</span></label>
            <input id="ps-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} placeholder="Defaults to the lesson names" className="a-inp" />
          </div>

          {leftOut.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900">
              <b>Busy then:</b> {leftOut.map((s) => s.name).join(", ")}. They are left out.
            </div>
          )}

          <button type="button" onClick={submit} disabled={saving} className="a-btn primary w-full mt-4 h-11">
            {saving ? "Adding…" : "Add session"}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">It is added as approved; dispatch it from the timetable to notify everyone.</p>
        </div>
      </aside>
    </div>
  );
}
