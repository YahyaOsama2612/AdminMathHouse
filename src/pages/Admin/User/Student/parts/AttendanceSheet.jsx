import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Check, X, Save, RotateCcw } from "lucide-react";
import useGet from "@/hooks/useGet";
import axios from "@/api/api";
import { Empty, Pill, SkelRows, Stat } from "@/components/admin/kit";
import { SearchBox } from "./shared";

/* Students → Content & attendance → Attendance sheet.
   GET /api/admin/student/:id/lesson-attendance → { student, summary, courses: [course → chapters → lessons] }
   PUT /api/admin/student/:id/lesson-attendance  { entries: [{ lessonId, status: "present" | "absent" | null }] }
   Every lesson the student owns, marked Attended / Absent like a score sheet. */

const MARK = {
  present: { label: "Attended", Icon: Check, on: "bg-green-600 text-white border-green-600", hover: "hover:border-green-600 hover:text-green-700" },
  absent: { label: "Absent", Icon: X, on: "bg-red-600 text-white border-red-600", hover: "hover:border-red-600 hover:text-red-700" },
};

const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function AttendanceSheet({ studentId }) {
  const { data, error, refetch } = useGet(`/api/admin/student/${studentId}/lesson-attendance`);
  const payload = data?.data; // useGet gives the response body: { success, data: { student, summary, courses, emptyEnrollments } }
  const courses = useMemo(() => (Array.isArray(payload?.courses) ? payload.courses : []), [payload]);
  // enrolled courses / chapters that don't have any lessons yet
  const emptyEnrollments = Array.isArray(payload?.emptyEnrollments) ? payload.emptyEnrollments : [];

  // saved marks from the server, and the admin's unsaved edits on top
  const saved = useMemo(() => {
    const m = {};
    courses.forEach((c) => c.chapters.forEach((ch) => ch.lessons.forEach((l) => { m[l.id] = l.status || null; })));
    return m;
  }, [courses]);
  const [draft, setDraft] = useState({});
  const [courseId, setCourseId] = useState(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft({}), [saved]);

  const valueOf = (id) => (id in draft ? draft[id] : saved[id]);
  const set = (id, k) => setDraft((d) => {
    const next = { ...d };
    const v = valueOf(id) === k ? null : k;
    if (v === saved[id]) delete next[id];
    else next[id] = v;
    return next;
  });
  const changes = Object.keys(draft);

  const course = courses.find((c) => c.id === courseId) || courses[0] || null;
  const courseLessons = useMemo(() => (course ? course.chapters.flatMap((ch) => ch.lessons) : []), [course]);
  const markAll = (k) => setDraft((d) => {
    const next = { ...d };
    courseLessons.forEach((l) => { if (saved[l.id] === k) delete next[l.id]; else next[l.id] = k; });
    return next;
  });

  const visibleChapters = useMemo(() => {
    const term = q.trim().toLowerCase();
    const chs = course?.chapters || [];
    if (!term) return chs;
    return chs
      .map((ch) => (ch.name?.toLowerCase().includes(term) ? ch : { ...ch, lessons: ch.lessons.filter((l) => l.name?.toLowerCase().includes(term)) }))
      .filter((ch) => ch.lessons.length > 0);
  }, [course, q]);

  const counts = useMemo(() => {
    const all = courses.flatMap((c) => c.chapters.flatMap((ch) => ch.lessons));
    const v = all.map((l) => valueOf(l.id));
    return { lessons: all.length, present: v.filter((x) => x === "present").length, absent: v.filter((x) => x === "absent").length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, draft, saved]);

  const save = async () => {
    if (!changes.length) return;
    setSaving(true);
    try {
      const entries = changes.map((lessonId) => ({ lessonId, status: draft[lessonId] }));
      await axios.put(`/api/admin/student/${studentId}/lesson-attendance`, { entries });
      toast.success(`Attendance saved for ${entries.length} lesson${entries.length === 1 ? "" : "s"}`);
      await refetch();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || "Could not save attendance");
    } finally {
      setSaving(false);
    }
  };

  if (!data && !error) return <SkelRows n={6} />;
  if (error) return <Empty title="Could not load the attendance sheet" text="Please try again." />;
  const emptyNote = emptyEnrollments.length > 0 && (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-900">
      <p className="font-bold mb-1">Enrolled, but no lessons added yet</p>
      <ul className="list-disc ms-5 space-y-0.5">
        {emptyEnrollments.map((e) => (
          <li key={`${e.type}-${e.id}`}>
            {e.type === "course" ? "Course" : "Chapter"} <b>{e.name}</b>{e.courseName ? ` (${e.courseName})` : ""}
          </li>
        ))}
      </ul>
      <p className="text-xs mt-1.5 text-amber-800">Add lessons to {emptyEnrollments.length === 1 ? "it" : "them"} under Courses, and they'll appear here to mark Attended / Absent.</p>
    </div>
  );

  if (courses.length === 0) {
    return emptyNote || <Empty title="Not enrolled in anything yet" text="Enroll this student in a course, chapter or lesson from the Enrollment tab, and the lessons will appear here." />;
  }

  return (
    <div>
      {emptyNote}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Lessons owned" value={counts.lessons} sub="All courses" />
        <Stat label="Attended" value={counts.present} sub="Marked on the sheet" color={counts.present ? "#15803d" : undefined} />
        <Stat label="Absent" value={counts.absent} sub="Marked on the sheet" color={counts.absent ? "#b91c1c" : undefined} />
        <Stat label="Not marked" value={counts.lessons - counts.present - counts.absent} sub="Still to mark" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {courses.map((c) => (
          <button key={c.id} type="button" onClick={() => setCourseId(c.id)} className={`a-chip ${c.id === course?.id ? "on" : ""}`}>
            {c.name}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-one">Attendance sheet</p>
          <h2 className="font-bold text-gray-900">{course?.name}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
          Mark all:
          <button type="button" onClick={() => markAll("present")} className={`px-2.5 py-1 rounded-lg border border-gray-200 ${MARK.present.hover}`}>Attended</button>
          <button type="button" onClick={() => markAll("absent")} className={`px-2.5 py-1 rounded-lg border border-gray-200 ${MARK.absent.hover}`}>Absent</button>
        </div>
        <SearchBox value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters or lessons..." className="w-full md:w-64" />
      </section>

      {visibleChapters.length === 0 ? (
        <Empty title="Nothing matches your search" />
      ) : (
        <div className="space-y-4 pb-20">
          {visibleChapters.map((ch) => (
            <section key={ch.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/40">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-one">Chapter</p>
                <h3 className="font-bold text-gray-900">{ch.name}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {ch.lessons.map((l) => {
                  const v = valueOf(l.id);
                  const changed = l.id in draft;
                  return (
                    <div key={l.id} className={`px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${changed ? "bg-amber-50/40" : ""}`}>
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="font-semibold text-gray-800">{l.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {l.access === "expired" && <Pill tone="gray">Access expired</Pill>}
                          {l.sessions.map((s) => (
                            <span key={s.id} title={`Live session${s.date ? ` on ${fmtDate(s.date)}` : ""}`}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${s.status === "present" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                              {s.status === "present" ? "Session: attended" : "Session: absent"}{s.date ? ` · ${fmtDate(s.date)}` : ""}
                            </span>
                          ))}
                          {!changed && l.markedAt && <span className="text-[11px] text-gray-400">Marked {fmtDate(l.markedAt)}</span>}
                          {changed && <span className="text-[11px] font-bold text-amber-700">Unsaved</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5" role="group" aria-label={`Attendance for ${l.name}`}>
                        {Object.entries(MARK).map(([k, m]) => (
                          <button key={k} type="button" onClick={() => set(l.id, k)} aria-pressed={v === k}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors inline-flex items-center gap-1.5 ${v === k ? m.on : `bg-white text-gray-500 border-gray-200 ${m.hover}`}`}>
                            <m.Icon size={13} /> {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {changes.length > 0 && (
        <div className="sticky bottom-3 z-10 flex justify-end">
          <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">{changes.length} unsaved change{changes.length === 1 ? "" : "s"}</span>
            <button type="button" onClick={() => setDraft({})} disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              <RotateCcw size={14} /> Undo
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-one text-white text-sm font-bold disabled:opacity-60">
              <Save size={14} /> {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
