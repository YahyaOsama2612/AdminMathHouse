// Add session → lessons the chosen students have IN COMMON (POST /api/admin/session/common-lessons).
// Shown when the session is for a group or 2+ students: no course / chapter picking — the admin ticks
// lessons straight from what every student owns. One course per session (the backend needs one).
import { useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";

// The backend lists only lessons NONE of the students attended yet (hiddenAttended = how many it left out).
export default function CommonLessonsPicker({ data, loading, error, value = [], onPick, onManual }) {
  const courses = data?.courses || [];
  const total = Number(data?.students) || 0;
  const hidden = Number(data?.hiddenAttended) || 0;
  const pickedCourse = courses.find((c) => c.chapters.some((ch) => ch.lessons.some((l) => value.includes(l.id))));
  const [courseId, setCourseId] = useState(null);
  const [closed, setClosed] = useState({});
  const course = courses.find((c) => c.id === (courseId || pickedCourse?.id)) || courses[0];

  // value → the ids + the course / chapter details the save payload needs
  const emit = (ids) => {
    const chapterIds = course.chapters.filter((ch) => ch.lessons.some((l) => ids.includes(l.id))).map((ch) => ch.id);
    onPick(ids, ids.length ? [{ categoryId: course.categoryId, subCategoryId: course.subCategoryId, courseId: course.id, chapterIds }] : []);
  };
  const toggle = (id) => emit(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const toggleChapter = (ch, on) => {
    const ids = ch.lessons.map((l) => l.id);
    emit(on ? [...new Set([...value, ...ids])] : value.filter((x) => !ids.includes(x)));
  };
  const switchCourse = (id) => {
    if (id === course?.id) return;
    setCourseId(id);
    if (value.length) onPick([], []); // one course per session
  };

  if (loading) return <div className="space-y-2"><div className="skel h-10"></div><div className="skel h-24"></div></div>;
  if (error) return (
    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      Could not load the common lessons — {error}. <button type="button" onClick={onManual} className="font-bold underline">Pick from the full course list</button>
    </div>
  );
  if (!courses.length) return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-bold">
        {hidden
          ? `No new lessons left: all ${hidden} lesson${hidden === 1 ? "" : "s"} these ${total} students share ${hidden === 1 ? "was" : "were"} already attended by at least one of them.`
          : `These ${total} students have no lesson in common.`}
      </p>
      {data?.ownsNothing?.length > 0 && <p className="text-xs mt-1">Nothing bought yet: {data.ownsNothing.join(", ")}.</p>}
      <button type="button" onClick={onManual} className="mt-2 text-xs font-bold text-one hover:underline">Pick from the full course list instead</button>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
          <Users size={15} className="text-one" /> Shared lessons none of the <b>{total}</b> students attended yet
          {value.length > 0 && <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-one">{value.length} picked</span>}
        </p>
        <button type="button" onClick={onManual} className="text-xs font-bold text-gray-400 hover:text-one">Full course list</button>
      </div>
      {hidden > 0 && (
        <p className="text-[11px] text-gray-400 -mt-1 mb-3">{hidden} shared lesson{hidden === 1 ? " is" : "s are"} hidden because at least one student already attended {hidden === 1 ? "it" : "them"}.</p>
      )}

      {courses.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="Course">
          {courses.map((c) => {
            const on = c.id === course.id;
            const n = c.chapters.reduce((a, ch) => a + ch.lessons.length, 0);
            return (
              <button key={c.id} type="button" role="tab" aria-selected={on} onClick={() => switchCourse(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${on ? "bg-one text-white border-one" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                {c.name} <span className={on ? "opacity-80" : "text-gray-400"}>· {n}</span>
              </button>
            );
          })}
        </div>
      )}
      {courses.length > 1 && value.length > 0 && <p className="text-[11px] text-gray-400 -mt-1 mb-2">A session covers one course — switching course clears the lessons you picked.</p>}

      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {course.chapters.map((ch) => {
          const shown = ch.lessons;
          if (!shown.length) return null;
          const on = shown.every((l) => value.includes(l.id));
          const some = shown.some((l) => value.includes(l.id));
          const isClosed = closed[ch.id];
          return (
            <div key={ch.id}>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                <input type="checkbox" checked={on} ref={(el) => el && (el.indeterminate = some && !on)} onChange={(e) => toggleChapter(ch, e.target.checked)}
                  className="w-4 h-4 accent-[#7d0a0a] shrink-0" aria-label={`All lessons in ${ch.name}`} />
                <button type="button" onClick={() => setClosed((c) => ({ ...c, [ch.id]: !c[ch.id] }))} className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left">
                  <span className="text-sm font-bold text-gray-800 truncate">{ch.name}</span>
                  <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1">{shown.length} lesson{shown.length === 1 ? "" : "s"} <ChevronDown size={14} className={`transition-transform ${isClosed ? "-rotate-90" : ""}`} /></span>
                </button>
              </div>
              {!isClosed && shown.map((l) => {
                const sel = value.includes(l.id);
                return (
                  <button key={l.id} type="button" onClick={() => toggle(l.id)} aria-pressed={sel}
                    className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 text-left transition-colors ${sel ? "bg-red-50/60" : "hover:bg-gray-50"}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-one border-one text-white" : "border-gray-300 bg-white"}`}>{sel && <Check size={12} />}</span>
                    <span className={`flex-1 min-w-0 text-sm truncate ${sel ? "font-semibold text-gray-900" : "text-gray-700"}`}>{l.name}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
