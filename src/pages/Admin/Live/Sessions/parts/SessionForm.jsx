// The Add / Edit session form body (MathPortal design: numbered section cards + a summary card).
// All state and API calls stay in AddSessions.jsx / EditSessions.jsx — this file only renders.
import Select from "react-select";
import { useParams } from "react-router-dom";
import useTeacherStates, { TEACHER_STATE_LABEL } from "./useTeacherStates";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Plus, UserCheck, X } from "lucide-react";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "@/components/HierarchicalLessonSelector";
import { fmtDay, fmtTime } from "@/components/admin/kit";
import SessionExamSelect from "../SessionExamSelect";
import ExamSessionCourseFields from "../ExamSessionCourseFields";
import CommonLessonsReportView from "../CommonLessonsReportView";
import {
  ChoiceCard, FieldError, MiniLabel, Req, SELECT_STYLES, Section, TYPE_TONE,
  formatTimeToHMS, parseHMSToDate, parseLocalDate, toLocalDateString,
} from "./formKit";

const SESSION_TYPES = [
  ["Explanation", "New lesson"],
  ["Re-Explanation", "Explain again"],
  ["Mistakes", "Homework mistakes"],
  ["Exam", "Linked to an exam"],
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LINKS = [
  ["session_link", "Live session link", "https://zoom.us/j/..."],
  ["material_link", "Student material link", "https://drive.google.com/..."],
  ["teacher_material_link", "Teacher material link", "https://drive.google.com/..."],
];

const inpCls = (err) => `a-inp ${err ? "!border-red-300" : ""}`;

const TimePick = ({ value, onChange, placeholder, err }) => (
  <DatePicker
    selected={parseHMSToDate(value)}
    onChange={(d) => onChange(formatTimeToHMS(d))}
    showTimeSelect
    showTimeSelectOnly
    timeIntervals={15}
    timeFormat="hh:mm a"
    dateFormat="hh:mm a"
    placeholderText={placeholder}
    wrapperClassName="!block w-full"
    className={inpCls(err)}
  />
);

const DatePick = ({ value, onChange, placeholder, minDate, err }) => (
  <DatePicker
    minDate={minDate}
    selected={parseLocalDate(value)}
    onChange={(d) => onChange(toLocalDateString(d))}
    dateFormat="yyyy-MM-dd"
    placeholderText={placeholder}
    wrapperClassName="!block w-full"
    className={inpCls(err)}
  />
);

const SumRow = ({ k, v }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-gray-400 shrink-0">{k}</dt>
    <dd className="font-semibold text-gray-800 text-right break-words min-w-0">{v || "—"}</dd>
  </div>
);

export default function SessionForm({
  mode, // "add" | "edit"
  formData,
  errors,
  teacherOptions,
  groupOptions,
  onInput,
  onSelect,
  onSessionType,
  onExamCourse,
  onHierarchy,
  onStudents,
  isExamSession,
  minDate,
  // group members
  groupMembers,
  groupMembersLoading,
  groupMembersError,
  groupMembersSelectable,
  // attendance helpers
  onGenerateAttendance,
  attendanceLoading,
  commonLessonsData,
  attendanceStudents,
  attendanceNameMap,
  onManualAttendance,
  initialLessons,
  // submit
  isSubmitting,
  onSubmit,
  onCancel,
}) {
  const isOnce = formData.scheduleType === "once";
  // teachers free at the chosen time (busy / outside working hours can't be picked)
  const { id: editingId } = useParams();
  const { states: teacherStates, loading: statesLoading, hasSchedule } = useTeacherStates(formData, mode === "edit" ? editingId : null);
  const rankedTeachers = (() => {
    const order = { free: 0, not_shared: 1, off: 2, busy: 3 };
    const list = teacherOptions.map((o) => {
      const st = teacherStates?.get(String(o.value));
      return { ...o, tState: st?.state, tReason: st?.reason, isDisabled: !!st && (st.state === "busy" || st.state === "off") };
    });
    return teacherStates ? list.sort((a, b) => (order[a.tState] ?? 1) - (order[b.tState] ?? 1) || String(a.label).localeCompare(String(b.label))) : list;
  })();
  const teacher = rankedTeachers.find((o) => o.value === formData.teacherId) || teacherOptions.find((o) => o.value === formData.teacherId);
  const pickedBlocked = teacher && (teacher.tState === "busy" || teacher.tState === "off");
  const group = groupOptions.find((o) => o.value === formData.groupId);
  const errorCount = Object.values(errors).filter(Boolean).length;

  const setDay = (idx, key, value) => {
    const next = [...formData.recurringDays];
    next[idx][key] = value;
    onSelect("recurringDays", next);
  };

  const when = isOnce
    ? formData.sessionDate
      ? `${fmtDay(formData.sessionDate)}${formData.timeFrom ? ` · ${fmtTime(formData.timeFrom)} – ${fmtTime(formData.timeTo)}` : ""}`
      : ""
    : formData.startDate
      ? `${fmtDay(formData.startDate)} → ${formData.endDate ? fmtDay(formData.endDate) : "…"}`
      : "";
  const audience = [
    formData.assignToGroup && group ? `Group: ${group.label}` : "",
    formData.assignToStudents && formData.userIds.length ? `${formData.userIds.length} student${formData.userIds.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(" + ");

  const allMembersOn = groupMembers.length > 0 && groupMembers.every((s) => formData.userIds.includes(s.id || s.studentId));
  const toggleAllMembers = (on) => {
    const ids = groupMembers.map((s) => s.id || s.studentId);
    onSelect("userIds", on ? [...new Set([...formData.userIds, ...ids])] : formData.userIds.filter((id) => !ids.includes(id)));
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start text-left" dir="ltr">
      <div className="xl:col-span-2 min-w-0">
        {/* 1 — Session */}
        <Section n={1} title="Session" sub="Name, type and teacher">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="a-lbl-f" htmlFor="session-name">Session name <Req /></label>
              <input id="session-name" type="text" name="name" value={formData.name} onChange={onInput} className={inpCls(errors.name)} placeholder="e.g. Algebra Intensive Review" />
              <FieldError msg={errors.name} />
            </div>

            <div className="md:col-span-2">
              <span className="a-lbl-f">Session type <Req /></span>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {SESSION_TYPES.map(([v, sub]) => {
                  const on = formData.sessionRelationalType === v;
                  const [c] = TYPE_TONE[v];
                  return (
                    <button key={v} type="button" aria-pressed={on} onClick={() => onSessionType(v)} className={`text-left rounded-xl border-2 px-3 py-2.5 transition-colors ${on ? "bg-white" : "border-gray-200 bg-white hover:border-gray-300"}`} style={on ? { borderColor: c, background: TYPE_TONE[v][1] } : undefined}>
                      <p className="text-sm font-bold" style={{ color: on ? c : "#1f2937" }}>{v}</p>
                      <p className="text-[11px] text-gray-500">{sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {isExamSession && (
              <div className="md:col-span-2">
                <SessionExamSelect value={formData.examId} onChange={(examId) => onSelect("examId", examId)} error={errors.examId} />
              </div>
            )}

            <div>
              <label className="a-lbl-f">Teacher <Req /></label>
              <Select
                options={rankedTeachers}
                value={teacher || null}
                onChange={(s) => onSelect("teacherId", s ? s.value : "")}
                placeholder={hasSchedule ? "Select teacher…" : "Select teacher… (pick the date & time to see who is free)"}
                styles={SELECT_STYLES}
                isOptionDisabled={(o) => !!o.isDisabled}
                formatOptionLabel={(o, { context }) => (
                  <span className="flex items-center justify-between gap-2 w-full" title={o.tReason || ""}>
                    <span className="truncate">{o.label}</span>
                    {o.tState && context === "menu" && (
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${TEACHER_STATE_LABEL[o.tState]?.cls || ""}`}>
                        {TEACHER_STATE_LABEL[o.tState]?.text}
                      </span>
                    )}
                  </span>
                )}
              />
              {statesLoading && <p className="text-[11px] text-gray-400 mt-1">Checking who is free…</p>}
              {!statesLoading && pickedBlocked && (
                <p className="text-xs font-semibold text-red-600 mt-1">{teacher.label} can't take this time — {teacher.tReason}. Pick another teacher or time.</p>
              )}
              <FieldError msg={errors.teacherId} />
            </div>

            <div>
              <span className="a-lbl-f">Schedule <Req /></span>
              <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1">
                {[["once", "Once"], ["repeat", "Repeat weekly"]].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={formData.scheduleType === v} onClick={() => onSelect("scheduleType", v)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold ${formData.scheduleType === v ? "bg-one text-white" : "text-gray-500 hover:text-gray-800"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 2 — When */}
        <Section n={2} title="When" sub={isOnce ? "One date and time" : "A date range and the weekly days"}>
          {isOnce ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="a-lbl-f">Date <Req /></label>
                <DatePick value={formData.sessionDate} onChange={(v) => onSelect("sessionDate", v)} placeholder="Select date" minDate={minDate} err={errors.sessionDate} />
                <FieldError msg={errors.sessionDate} />
              </div>
              <div>
                <label className="a-lbl-f">From <Req /></label>
                <TimePick value={formData.timeFrom} onChange={(v) => onSelect("timeFrom", v)} placeholder="Start time" err={errors.timeFrom} />
                <FieldError msg={errors.timeFrom} />
              </div>
              <div>
                <label className="a-lbl-f">To <Req /></label>
                <TimePick value={formData.timeTo} onChange={(v) => onSelect("timeTo", v)} placeholder="End time" err={errors.timeTo} />
                <FieldError msg={errors.timeTo} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="a-lbl-f">Start date <Req /></label>
                  <DatePick value={formData.startDate} onChange={(v) => onSelect("startDate", v)} placeholder="First day" minDate={minDate} err={errors.startDate} />
                  <FieldError msg={errors.startDate} />
                </div>
                <div>
                  <label className="a-lbl-f">End date <Req /></label>
                  <DatePick value={formData.endDate} onChange={(v) => onSelect("endDate", v)} placeholder="Last day" minDate={minDate} err={errors.endDate} />
                  <FieldError msg={errors.endDate} />
                </div>
              </div>
              <div>
                <MiniLabel>Weekly days · {formData.recurringDays.length}</MiniLabel>
                <div className="rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {formData.recurringDays.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3">
                      <div>
                        <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Day</span>
                        <select value={item.dayOfWeek} onChange={(e) => setDay(idx, "dayOfWeek", e.target.value)} className="a-inp">
                          <option value="">Select day…</option>
                          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">From</span>
                        <TimePick value={item.timeFrom} onChange={(v) => setDay(idx, "timeFrom", v)} placeholder="Start time" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">To</span>
                        <TimePick value={item.timeTo} onChange={(v) => setDay(idx, "timeTo", v)} placeholder="End time" />
                      </div>
                      <div className="flex sm:justify-end">
                        {formData.recurringDays.length > 1 && (
                          <button type="button" onClick={() => onSelect("recurringDays", formData.recurringDays.filter((_, i) => i !== idx))} className="a-act del" title="Remove day" aria-label="Remove day">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => onSelect("recurringDays", [...formData.recurringDays, { dayOfWeek: "", timeFrom: "", timeTo: "" }])} className="mt-2 text-xs font-bold text-one hover:underline inline-flex items-center gap-1">
                  <Plus size={13} /> Add another day
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* 3 — Who */}
        <Section
          n={3}
          title="Who"
          sub="A group, specific students, or both"
          right={formData.userIds.length > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-one">{formData.userIds.length} selected</span>}
        >
          <div className="flex flex-wrap gap-2 mb-1">
            <ChoiceCard className="flex-1 min-w-[160px]" on={formData.assignToGroup} onClick={() => onSelect("assignToGroup", !formData.assignToGroup)} title="Group" sub="Everyone in one group" />
            <ChoiceCard className="flex-1 min-w-[160px]" on={formData.assignToStudents} onClick={() => onSelect("assignToStudents", !formData.assignToStudents)} title="Specific students" sub="Pick students by name" />
          </div>
          <FieldError msg={errors.assignmentTarget} />

          {formData.assignToGroup && (
            <div className="mt-4 max-w-xl">
              <label className="a-lbl-f">Group <Req /></label>
              <Select options={groupOptions} value={group || null} onChange={(s) => onSelect("groupId", s ? s.value : "")} placeholder="Choose the group…" styles={SELECT_STYLES} />
              <FieldError msg={errors.groupId} />

              {formData.groupId && (
                <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  <MiniLabel>Students in this group{groupMembers.length ? ` · ${groupMembers.length}` : ""}</MiniLabel>
                  {groupMembersLoading ? (
                    <div className="skel h-8"></div>
                  ) : groupMembersError ? (
                    <p className="text-xs font-semibold text-red-600">Could not load group students</p>
                  ) : groupMembers.length === 0 ? (
                    <p className="text-xs text-gray-400">No students found in this group</p>
                  ) : groupMembersSelectable ? (
                    <>
                      <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={allMembersOn} onChange={(e) => toggleAllMembers(e.target.checked)} className="w-4 h-4 accent-[#7d0a0a]" />
                        Select all
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {groupMembers.map((s) => {
                          const sid = s.id || s.studentId;
                          const checked = formData.userIds.includes(sid);
                          return (
                            <label key={sid} className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => onSelect("userIds", e.target.checked ? [...new Set([...formData.userIds, sid])] : formData.userIds.filter((uid) => uid !== sid))}
                                className="w-4 h-4 accent-[#7d0a0a] shrink-0"
                              />
                              <span className="truncate">{s.name || s.studentName || s.fullName || ""}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {groupMembers.map((s) => (
                        <span key={s.id || s.studentId} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                          {s.name || s.studentName || s.fullName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Student search is always visible so it can be combined with a group */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <span className="a-lbl-f !mb-0">Search &amp; select students {formData.assignToStudents && <Req />}</span>
              {!isExamSession && (
                <div className="flex flex-wrap items-center gap-2">
                  {onManualAttendance && (
                    <button type="button" onClick={onManualAttendance} className="a-btn !py-1.5 !px-3 !text-xs">
                      <UserCheck size={14} /> Manual attendance
                    </button>
                  )}
                  <button type="button" onClick={onGenerateAttendance} disabled={attendanceLoading || !formData.userIds?.length} className="a-btn !py-1.5 !px-3 !text-xs">
                    {attendanceLoading ? "Generating…" : "Generate attendance"}
                  </button>
                </div>
              )}
            </div>
            <SearchStudents value={formData.userIds} onChange={onStudents} error={errors.userIds} />

            {!isExamSession && (
              <CommonLessonsReportView
                commonLessonsData={commonLessonsData}
                attendanceStudents={attendanceStudents}
                sessionName={formData.name}
                userIds={formData.userIds}
                attendanceNameMap={attendanceNameMap}
              />
            )}
          </div>
        </Section>

        {/* 4 — Lessons / exam course */}
        <Section n={4} title={isExamSession ? "Exam course" : "Lessons"} sub={isExamSession ? "Exam sessions use the selected exam and need no lessons" : "The lessons this session covers"}>
          {isExamSession ? (
            <ExamSessionCourseFields categoryId={formData.examCategoryId} subCategoryId={formData.examSubCategoryId} courseId={formData.examCourseId} onChange={onExamCourse} />
          ) : (
            <div>
              <span className="a-lbl-f">Lesson hierarchy <Req /></span>
              <HierarchicalLessonSelector value={formData.lessonIds} onChange={onHierarchy} initialLessons={initialLessons} />
              <FieldError msg={errors.lessonIds} />
            </div>
          )}
        </Section>

        {/* 5 — Links & PDFs */}
        <Section n={5} title="Links & PDFs" sub="Optional">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LINKS.map(([field, label, ph]) => (
              <div key={field}>
                <label className="a-lbl-f" htmlFor={`f-${field}`}>{label}</label>
                <input id={`f-${field}`} type="text" name={field} value={formData[field]} onChange={onInput} className="a-inp" placeholder={ph} />
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-sm font-bold text-gray-700">PDFs from assigned lessons</p>
            <p className="text-xs text-gray-500">
              Session and answer PDFs come from the lessons assigned to this session. Mistakes PDFs are generated automatically.
            </p>
          </div>
        </Section>
      </div>

      {/* Summary */}
      <aside className="xl:sticky xl:top-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <MiniLabel>{mode === "edit" ? "Edit session" : "New session"}</MiniLabel>
          <dl className="space-y-2 text-sm">
            <SumRow k="Name" v={formData.name.trim()} />
            <SumRow k="Type" v={`${formData.sessionRelationalType} · ${isOnce ? "Once" : "Repeat"}`} />
            <SumRow k="When" v={when} />
            <SumRow k="Teacher" v={teacher?.label} />
            <SumRow k="Who" v={audience} />
            {!isExamSession && <SumRow k="Lessons" v={formData.lessonIds.length ? String(formData.lessonIds.length) : ""} />}
          </dl>
          {errorCount > 0 && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs font-semibold text-red-700" role="alert">
              {errorCount} field{errorCount === 1 ? " needs" : "s need"} attention — see the red notes.
            </div>
          )}
          <button type="submit" disabled={isSubmitting} className="a-btn primary w-full mt-4 !py-3">
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {mode === "edit" ? "Updating…" : "Saving…"}
              </>
            ) : mode === "edit" ? "Update session" : "Create session"}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className="a-btn w-full mt-2">Cancel</button>
        </div>
      </aside>
    </form>
  );
}
