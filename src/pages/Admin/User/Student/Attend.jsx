import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import useGet from "@/hooks/useGet";
import Errorpage from "@/components/Errorpage";
import axios from "@/api/api";
import { Empty, Pill, SkelRows, Stat } from "@/components/admin/kit";
import { SearchBox } from "./parts/shared";
import AttendanceSheet from "./parts/AttendanceSheet";

/* Admin → Students → Content & attendance (MathPortal "attPage" design).
   GET  /api/admin/student/:id/content   → { student, content: [course → chapters → lessons] }
   POST /api/admin/student/:id/enroll    → { courses, chapters, lessons: [{ id, priceId:null }], action, extraDays? } */

const Switch = ({ on, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!on}
    aria-label={label}
    title={on ? "Enrolled — switch off to remove" : "Not enrolled — switch on to enroll"}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`a-switch ${on ? "on" : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    <span />
  </button>
);

const Attend = () => {
  const navigate = useNavigate();
  const { id: studentId } = useParams();
  const [actionLoading, setActionLoading] = useState(false);
  // extra days sent with any enroll (empty = not sent)
  const [extraDays, setExtraDays] = useState("");
  const extraDaysNumber = Number(extraDays) || 0;
  const [notice, setNotice] = useState("");
  const [courseId, setCourseId] = useState(null);
  const [q, setQ] = useState("");
  // "sheet" = mark each owned lesson Attended / Absent; "enroll" = open or remove content
  const [tab, setTab] = useState("sheet");

  const { data, error, refetch } = useGet(`/api/admin/student/${studentId}/content`);

  const buildPayload = (row, action, withDays) => {
    const targetObject = { id: row.id, priceId: null };
    return {
      courses: row.type === "course" ? [targetObject] : [],
      chapters: row.type === "chapter" ? [targetObject] : [],
      lessons: row.type === "lesson" ? [targetObject] : [],
      action,
      ...(withDays ? { extraDays: extraDaysNumber } : {}),
    };
  };

  const handleEnrollmentChange = async (row, isChecked) => {
    if (!row.id) return;
    setActionLoading(true);
    try {
      // extraDays only goes with an enroll, and only when above 0
      const payload = buildPayload(row, isChecked ? "enroll" : "unenroll", isChecked && extraDaysNumber > 0);
      const res = await axios.post(`/api/admin/student/${studentId}/enroll`, payload);
      const body = res?.data?.data || {}; // { message, data: { removed | enrolledCount } }
      const d = body.data || {};
      if (!isChecked) {
        if (d.removed > 0) toast.success(`Removed ${row.name}`);
        else toast(body.message || "Nothing to remove", { icon: "ℹ️" });
      } else if (d.enrolledCount > 0) toast.success(`Enrolled in ${row.name}`);
      await refetch();
    } catch (err) {
      console.error("Failed to update enrollment:", err);
      toast.error(err.response?.data?.error?.message || "حدث خطأ أثناء تحديث حالة الحضور");
    } finally {
      setActionLoading(false);
    }
  };

  // add days to an item the student is already enrolled in (no unenroll)
  const handleAddDays = async (row) => {
    if (!row.id || extraDaysNumber <= 0) return;
    setActionLoading(true);
    setNotice("");
    try {
      await axios.post(`/api/admin/student/${studentId}/enroll`, buildPayload(row, "enroll", true));
      setNotice(`Added ${extraDaysNumber} day${extraDaysNumber === 1 ? "" : "s"} to ${row.name}.`);
      await refetch();
    } catch (err) {
      console.error("Failed to add extra days:", err);
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "حدث خطأ أثناء زيادة الأيام");
    } finally {
      setActionLoading(false);
    }
  };

  const content = useMemo(() => {
    const arr = data?.data?.data?.content;
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const course = content.find((c) => c.id === courseId) || content[0] || null;

  const stats = useMemo(() => {
    if (!course) return null;
    const chapters = course.chapters || [];
    const lessons = chapters.flatMap((ch) => ch.lessons || []);
    return {
      lessons: lessons.length,
      lessonsOn: lessons.filter((l) => l.isEnrolled).length,
      chapters: chapters.length,
      chaptersOn: chapters.filter((ch) => ch.isEnrolled).length,
      coursesOn: content.filter((c) => c.isEnrolled).length,
    };
  }, [course, content]);

  const visibleChapters = useMemo(() => {
    const chapters = course?.chapters || [];
    const term = q.trim().toLowerCase();
    if (!term) return chapters;
    return chapters
      .map((ch) =>
        ch.name?.toLowerCase().includes(term)
          ? ch
          : { ...ch, lessons: (ch.lessons || []).filter((l) => l.name?.toLowerCase().includes(term)) },
      )
      .filter((ch) => ch.name?.toLowerCase().includes(term) || ch.lessons.length > 0);
  }, [course, q]);

  if (!data && !error) {
    return (
      <div>
        <div className="skel h-24 mb-4" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel h-20" />
          ))}
        </div>
        <SkelRows n={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Errorpage />
      </div>
    );
  }

  const studentName = data?.data?.data?.student?.name || "Student";
  const initials = studentName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const daysBtn = (row) =>
    row.isEnrolled ? (
      <button
        type="button"
        disabled={actionLoading || extraDaysNumber <= 0}
        onClick={() => handleAddDays(row)}
        title={extraDaysNumber > 0 ? `Add ${extraDaysNumber} days to ${row.name}` : "Set the number of extra days above first"}
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:border-[#7d0a0a] hover:text-one disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600 whitespace-nowrap"
      >
        <CalendarPlus size={13} /> {extraDaysNumber > 0 ? `+ ${extraDaysNumber} days` : "+ Days"}
      </button>
    ) : (
      <span className="inline-block w-[74px] text-center text-xs text-gray-300">—</span>
    );

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/admin/users/students")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-one mb-3"
      >
        <ArrowLeft size={15} /> Students
      </button>

      {/* Student + extra days */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-white shrink-0 bg-one">
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Content & attendance</p>
          <h1 className="font-bold text-xl text-gray-900 truncate">{studentName}</h1>
          <button
            type="button"
            onClick={() => navigate(`/admin/users/student-information/${studentId}`)}
            className="text-xs font-bold text-one hover:underline"
          >
            Open profile →
          </button>
        </div>
        {tab === "enroll" && (
        <div className="flex flex-wrap items-end gap-3 basis-full lg:basis-auto">
          <div>
            <label htmlFor="extraDays" className="a-lbl-f !text-xs">
              Extra days
            </label>
            <input
              id="extraDays"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={extraDays}
              onChange={(e) => setExtraDays(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="a-inp !w-28"
            />
          </div>
          <p className="text-xs text-gray-500 max-w-xs pb-1">
            {extraDaysNumber > 0
              ? `Press "+ ${extraDaysNumber} days" on an enrolled row to extend it, or switch on a new row to enroll it with these days.`
              : "Set a number, then use the + Days button on any enrolled row."}
          </p>
        </div>
        )}
        {notice && <p className="basis-full text-xs font-semibold text-green-700">{notice}</p>}
      </div>

      <div className="flex gap-1.5 mb-4" role="tablist">
        {[["sheet", "Attendance sheet"], ["enroll", "Enrollment"]].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`a-chip ${tab === k ? "on" : ""}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "sheet" ? (
        <AttendanceSheet studentId={studentId} />
      ) : content.length === 0 ? (
        <Empty title="No content for this student" text="No courses match the student's category and grade." />
      ) : (
        <>
          {/* Course picker */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {content.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCourseId(c.id)}
                className={`a-chip ${c.id === course?.id ? "on" : ""}`}
              >
                {c.name}
                {c.isEnrolled && <span className={`ml-1 ${c.id === course?.id ? "text-white/80" : "text-green-600"}`}>✓</span>}
              </button>
            ))}
            {actionLoading && <span className="ml-auto text-xs font-semibold text-gray-400">Saving…</span>}
          </div>

          {stats && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
              <Stat label="Lessons enrolled" value={`${stats.lessonsOn}/${stats.lessons}`} sub={course.name} color={stats.lessonsOn ? "#15803d" : undefined} />
              <Stat label="Chapters enrolled" value={`${stats.chaptersOn}/${stats.chapters}`} sub="Whole chapter open" />
              <Stat label="This course" value={course.isEnrolled ? "Enrolled" : "Not enrolled"} sub="Whole course" color={course.isEnrolled ? "#15803d" : "#9ca3af"} />
              <Stat label="Courses enrolled" value={`${stats.coursesOn}/${content.length}`} sub="For this grade" />
            </div>
          )}

          {/* Whole course row */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-one">Course</p>
              <h2 className="font-bold text-gray-900">{course.name}</h2>
              <p className="text-xs text-gray-400">{course.categoryName || "Main Category"}</p>
            </div>
            <Pill tone={course.isEnrolled ? "green" : "gray"}>{course.isEnrolled ? "Enrolled" : "Not enrolled"}</Pill>
            <Switch
              on={course.isEnrolled}
              disabled={actionLoading}
              label={`Enroll in ${course.name}`}
              onChange={(v) => handleEnrollmentChange({ id: course.id, type: "course", name: course.name }, v)}
            />
            {daysBtn({ id: course.id, type: "course", name: course.name, isEnrolled: course.isEnrolled })}
            <SearchBox value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters or lessons..." className="w-full md:w-64 md:ml-auto" />
          </section>

          {visibleChapters.length === 0 ? (
            <Empty title={q ? "Nothing matches your search" : "No chapters in this course yet"} />
          ) : (
            <div className="space-y-4">
              {visibleChapters.map((ch) => {
                const lessons = ch.lessons || [];
                const allLessons = (course.chapters || []).find((x) => x.id === ch.id)?.lessons || lessons;
                const done = allLessons.filter((l) => l.isEnrolled).length;
                const chNo = (course.chapters || []).findIndex((x) => x.id === ch.id) + 1;
                return (
                  <section key={ch.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2 bg-gray-50/40">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-one">Chapter {chNo}</p>
                        <h3 className="font-bold text-gray-900">{ch.name}</h3>
                      </div>
                      <span className="text-xs font-bold text-gray-400 whitespace-nowrap">
                        {done}/{allLessons.length} lessons enrolled
                      </span>
                      <Switch
                        on={ch.isEnrolled}
                        disabled={actionLoading}
                        label={`Enroll in chapter ${ch.name}`}
                        onChange={(v) => handleEnrollmentChange({ id: ch.id, type: "chapter", name: ch.name }, v)}
                      />
                      {daysBtn({ id: ch.id, type: "chapter", name: ch.name, isEnrolled: ch.isEnrolled })}
                    </div>
                    {lessons.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">No lessons in this chapter.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {lessons.map((l) => {
                          const lNo = allLessons.findIndex((x) => x.id === l.id) + 1;
                          return (
                            <div key={l.id} className={`px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2`}>
                              <div className="min-w-0 flex-1 basis-48">
                                <p className="text-[11px] font-bold text-gray-400 uppercase">Lesson {lNo}</p>
                                <p className={`font-semibold ${l.isEnrolled ? "text-gray-800" : "text-gray-500"}`}>{l.name}</p>
                              </div>
                              <Pill tone={l.isEnrolled ? "green" : "gray"}>{l.isEnrolled ? "Enrolled" : "Not enrolled"}</Pill>
                              <Switch
                                on={l.isEnrolled}
                                disabled={actionLoading}
                                label={`Enroll in lesson ${l.name}`}
                                onChange={(v) => handleEnrollmentChange({ id: l.id, type: "lesson", name: l.name }, v)}
                              />
                              {daysBtn({ id: l.id, type: "lesson", name: l.name, isEnrolled: l.isEnrolled })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Attend;
