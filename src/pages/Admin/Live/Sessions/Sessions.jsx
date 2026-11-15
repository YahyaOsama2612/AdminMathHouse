import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Ban, FileText, Pencil, Plus, RotateCcw, Search, Star, Trash2, UserCheck, X } from "lucide-react";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Errorpage from "@/components/Errorpage";
import { Pager } from "@/components/ReusableTable";
import { Modal, PageHead, Pill, SkelRows, Stat, errText, fmtDay, fmtStamp, fmtTime, refreshWaiting } from "@/components/admin/kit";
import ManualAttendanceModal from "./ManualAttendanceModal";
import { TypeBadge } from "./parts/formKit";

/* Live → Sessions (MathPortal design): one list of every live session.
   Endpoints: GET /api/admin/session, DELETE /api/admin/session/:id,
              PATCH /api/admin/session/:id/cancel { reason }, PATCH /api/admin/session/:id/restore,
              POST /api/admin/session/manual-attendance (in ManualAttendanceModal) */

const PER_PAGE = 15;
const NO_SESSIONS = [];
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day10 = (v) => {
  if (!v) return "";
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : isoDay(d);
};

// ── field readers (the list API has changed shape over time, so read every known spelling) ──
const getSessionType = (s) => {
  if (s.sessionRelationalType) return s.sessionRelationalType;
  if (s.type) return s.type;
  if (s.scheduleType === "once") return "Once";
  if (s.scheduleType === "recurring") return "Recurring";
  return "";
};

const getGroupNames = (s) => {
  if (Array.isArray(s.groups) && s.groups.length > 0) {
    const names = s.groups.map((g) => (typeof g === "string" ? g : g?.name || g?.groupName)).filter(Boolean);
    if (names.length) return names;
  }
  if (s.groups && typeof s.groups === "object" && s.groups.name) return [s.groups.name];
  if (s.group && typeof s.group === "object" && s.group.name) return [s.group.name];
  if (s.groupName) return [s.groupName];
  if (s.group_name) return [s.group_name];
  return [];
};

const getTeacherName = (s) => {
  if (s.teacher?.name) return s.teacher.name;
  if (s.teacher?.firstname || s.teacher?.lastname) return `${s.teacher.firstname || ""} ${s.teacher.lastname || ""}`.trim();
  return s.teacherName || s.teacher_name || "";
};

const getCategoryName = (s) =>
  s.categoryName || s.category?.name || s.examCategory?.name || s.lessons?.[0]?.category?.name || s.lessons?.[0]?.course?.category?.name || "";

const getCourseName = (s) => s.courseName || s.course?.name || s.examCourse?.name || s.lessons?.[0]?.course?.name || "";

const getLessonName = (s) => {
  if (s.lessonName) return s.lessonName;
  if (s.lesson?.name) return s.lesson.name;
  if (Array.isArray(s.lessons)) return s.lessons.map((l) => l.name || l.lessonName).filter(Boolean).join(", ");
  return "";
};

const toRow = (s) => {
  const start = day10(s.sessionDate) || day10(s.startDate);
  const end = s.sessionDate ? start : day10(s.endDate) || start;
  const groups = getGroupNames(s);
  const studentCount = s.studentCount ?? (Array.isArray(s.students) ? s.students.length : 0);
  return {
    id: s.id,
    name: s.name || "Untitled session",
    type: getSessionType(s),
    category: getCategoryName(s),
    course: getCourseName(s),
    lessons: getLessonName(s),
    groups,
    studentCount,
    teacher: getTeacherName(s),
    start,
    end,
    repeat: !s.sessionDate && !!s.startDate,
    timeFrom: s.timeFrom,
    timeTo: s.timeTo,
    status: s.status === "cancelled" ? "cancelled" : "scheduled",
    cancelReason: s.cancelReason,
    cancelledBy: s.cancelledBy,
    cancelledAt: s.cancelledAt,
    // PDFs dialog
    sessionRelationalType: s.sessionRelationalType,
    effectiveSessionPdf: s.effective_session_pdf,
    effectiveSessionAnswersPdf: s.effective_session_answers_pdf,
    effectiveSessionPdfs: Array.isArray(s.effective_session_pdfs) ? s.effective_session_pdfs : [],
    effectiveSessionAnswersPdfs: Array.isArray(s.effective_session_answers_pdfs) ? s.effective_session_answers_pdfs : [],
    raw: s,
  };
};

const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

/* ---------- PDFs dialog ---------- */
const PdfLink = ({ href, label }) => (
  <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-one hover:bg-red-50/50">
    <FileText size={17} />
    <span className="font-semibold text-gray-800 min-w-0 truncate">{label}</span>
    <span className="ml-auto text-xs font-bold whitespace-nowrap">Open PDF</span>
  </a>
);
const NoPdf = ({ children }) => <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">{children}</p>;

function PdfsModal({ row, onClose }) {
  return (
    <Modal title={`PDFs · ${row.name}`} onClose={onClose} wide actions={<button type="button" onClick={onClose} className="a-btn">Close</button>}>
      <div className="space-y-4">
        {row.sessionRelationalType === "Mistakes"
          ? [
              { label: "Session PDF", url: row.effectiveSessionPdf },
              { label: "Session Answers PDF", url: row.effectiveSessionAnswersPdf },
            ].map(({ label, url }) => (url ? <PdfLink key={label} href={url} label={label} /> : <NoPdf key={label}>{label} is not available for this session.</NoPdf>))
          : [
              { label: "Session PDFs", files: row.effectiveSessionPdfs },
              { label: "Session Answers PDFs", files: row.effectiveSessionAnswersPdfs },
            ].map(({ label, files }) => (
              <section key={label} className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">{label}</p>
                {files.length ? (
                  files.map((file, i) => <PdfLink key={`${file.sourceId || file.pdf}-${i}`} href={file.pdf} label={file.name || `PDF ${i + 1}`} />)
                ) : (
                  <NoPdf>No PDFs are available.</NoPdf>
                )}
              </section>
            ))}
      </div>
    </Modal>
  );
}

/* ---------- Page ---------- */
const Sessions = () => {
  const navigate = useNavigate();
  const { data, refetch, error } = useGet("/api/admin/session");
  const { deleteData } = useDelete();

  const [deleteRow, setDeleteRow] = useState(null);
  const [pdfRow, setPdfRow] = useState(null);
  const [openManualAttendance, setOpenManualAttendance] = useState(false);
  const [manualAttendanceSession, setManualAttendanceSession] = useState(null);
  const [cancelRow, setCancelRow] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(null);

  // filters
  const [when, setWhen] = useState("upcoming");
  const [q, setQ] = useState("");
  const [f, setF] = useState({ type: "", teacher: "", group: "", category: "", course: "", status: "" });
  const [page, setPage] = useState(1);
  const setFilter = (k, v) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => setPage(1), [when, q, f]);

  const sessions = data?.data?.sessions;
  const rows = useMemo(() => (sessions || []).map(toRow), [sessions]);
  const today = isoDay(new Date());
  const week = isoDay(new Date(Date.now() + 6 * 86400000));
  const isUpcoming = (r) => !r.end || r.end >= today;

  const opts = useMemo(
    () => ({
      type: uniq(rows.map((r) => r.type)),
      teacher: uniq(rows.map((r) => r.teacher)),
      group: uniq(rows.flatMap((r) => r.groups)),
      category: uniq(rows.map((r) => r.category)),
      course: uniq(rows.map((r) => r.course)),
    }),
    [rows],
  );

  const ql = q.trim().toLowerCase();
  const list = useMemo(() => {
    const out = rows.filter(
      (r) =>
        (when === "all" || (when === "upcoming" ? isUpcoming(r) : !isUpcoming(r))) &&
        (!f.type || r.type === f.type) &&
        (!f.teacher || r.teacher === f.teacher) &&
        (!f.group || r.groups.includes(f.group)) &&
        (!f.category || r.category === f.category) &&
        (!f.course || r.course === f.course) &&
        (!f.status || r.status === f.status) &&
        (!ql || [r.name, r.teacher, r.groups.join(" "), r.course, r.category, r.lessons, r.type].join(" ").toLowerCase().includes(ql)),
    );
    const key = (r) => `${r.start || "9999"}${r.timeFrom || ""}`;
    out.sort((a, b) => key(a).localeCompare(key(b)));
    if (when === "past") out.reverse();
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, when, f, ql, today]);

  const counts = useMemo(() => {
    const up = rows.filter(isUpcoming);
    return {
      upcoming: up.filter((r) => r.status === "scheduled").length,
      week: up.filter((r) => r.status === "scheduled" && r.start && r.start <= week).length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
      upTab: up.length,
      pastTab: rows.length - up.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, today, week]);

  const totalPages = Math.ceil(list.length / PER_PAGE);
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const activeFilters = Object.values(f).filter(Boolean).length + (ql ? 1 : 0);

  // ── actions ──
  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/session/${deleteRow.id}`);
      setDeleteRow(null);
      refetch();
    } catch {
      // useDelete already showed the error toast
    }
  };

  const openAttendance = (session) => {
    setManualAttendanceSession(session);
    setOpenManualAttendance(true);
  };

  const submitCancel = async () => {
    const text = reason.trim();
    if (text.length < 3) {
      toast.error("Write the reason (at least 3 characters) — students see it");
      return;
    }
    setBusy(cancelRow.id);
    try {
      await api.patch(`/api/admin/session/${cancelRow.id}/cancel`, { reason: text });
      toast.success("Session cancelled — students were notified");
      setCancelRow(null);
      refreshWaiting();
      await refetch();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  const restore = async (row) => {
    setBusy(row.id);
    try {
      await api.patch(`/api/admin/session/${row.id}/restore`);
      toast.success("Session restored");
      refreshWaiting();
      await refetch();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  if (error && !sessions) return <Errorpage />;

  const sel = (k, label) =>
    opts[k].length > 0 && (
      <select value={f[k]} onChange={(e) => setFilter(k, e.target.value)} className={`border rounded-xl px-3 py-2 text-sm bg-white min-w-0 ${f[k] ? "border-one text-one font-semibold" : "border-gray-200 text-gray-700"}`}>
        <option value="">All {label}</option>
        {opts[k].map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  const tab = (k, l, n) => (
    <button type="button" onClick={() => setWhen(k)} className={`px-3.5 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap ${when === k ? "bg-one text-white" : "text-gray-500 hover:text-gray-800"}`}>
      {l}
      {n != null && <span className={`ml-1.5 text-[11px] ${when === k ? "text-white/80" : "text-gray-400"}`}>{n}</span>}
    </button>
  );

  return (
    <div>
      <PageHead title="Sessions" sub="Every live session in one list — add, edit, cancel, take attendance and open the session PDFs.">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate("/admin/live/planner")} className="a-btn">Open Master Schedule</button>
          <button type="button" onClick={() => openAttendance(null)} className="a-btn"><UserCheck size={16} /> Manual attendance</button>
          <button type="button" onClick={() => navigate("/admin/live/sessions/add")} className="a-btn primary"><Plus size={16} /> Add session</button>
        </div>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Upcoming" value={sessions ? counts.upcoming : "—"} />
        <Stat label="Next 7 days" value={sessions ? counts.week : "—"} />
        <Stat label="Cancelled" value={sessions ? counts.cancelled : "—"} color={counts.cancelled ? "#b91c1c" : "#94a3b8"} />
        <Stat label="All sessions" value={sessions ? rows.length : "—"} />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
        <div className="col-span-2 flex w-fit max-w-full overflow-x-auto bg-gray-50 border border-gray-200 rounded-xl p-1">
          {tab("upcoming", "Upcoming", counts.upTab)}
          {tab("past", "Past", counts.pastTab)}
          {tab("all", "All", rows.length)}
        </div>
        <div className="relative col-span-2 md:flex-1 md:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search session, teacher, group or lesson…" className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm bg-white outline-none focus:border-one focus:ring-2 focus:ring-one/10" />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" aria-label="Clear search"><X className="w-4 h-4" /></button>
          )}
        </div>
        {sel("type", "types")}
        {sel("teacher", "teachers")}
        {sel("group", "groups")}
        {sel("category", "categories")}
        {sel("course", "courses")}
        <select value={f.status} onChange={(e) => setFilter("status", e.target.value)} className={`border rounded-xl px-3 py-2 text-sm bg-white min-w-0 ${f.status ? "border-one text-one font-semibold" : "border-gray-200 text-gray-700"}`}>
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="col-span-2 flex items-center gap-3 md:ml-auto">
          {activeFilters > 0 && (
            <button type="button" onClick={() => { setQ(""); setF({ type: "", teacher: "", group: "", category: "", course: "", status: "" }); }} className="text-xs font-bold text-gray-500 hover:text-one flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <span className="text-xs text-gray-400">{list.length} session{list.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Table */}
      {!sessions ? (
        <SkelRows n={6} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>{["Date", "Time", "Type", "Session", "Teacher", "Group / students", "Status", ""].map((h, i) => <th key={i} className={`a-th ${i === 7 ? "text-right" : ""}`}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {shown.length ? (
                  shown.map((r) => {
                    const cancelled = r.status === "cancelled";
                    const sub = [r.course, r.lessons].filter(Boolean).join(" · ");
                    return (
                      <tr key={r.id} className={`a-tr ${cancelled ? "bg-red-50/30" : ""}`}>
                        <td className="a-td whitespace-nowrap">
                          {r.repeat ? (
                            <>
                              <p className={`font-bold ${cancelled ? "text-gray-400 line-through" : "text-gray-800"}`}>{fmtDay(r.start)}</p>
                              <p className="text-[11px] text-gray-400">to {fmtDay(r.end)} · repeats</p>
                            </>
                          ) : (
                            <>
                              <p className={`font-bold ${cancelled ? "text-gray-400 line-through" : "text-gray-800"}`}>{fmtDay(r.start)}</p>
                              {r.start && <p className="text-[11px] text-gray-400">{r.start.slice(0, 4)}</p>}
                            </>
                          )}
                        </td>
                        <td className="a-td text-gray-600 whitespace-nowrap">{r.timeFrom ? `${fmtTime(r.timeFrom)} – ${fmtTime(r.timeTo)}` : <span className="text-gray-300">—</span>}</td>
                        <td className="a-td"><TypeBadge type={r.type} /></td>
                        <td className="a-td max-w-[260px]">
                          <p className="font-semibold text-gray-800 truncate" title={r.name}>{r.name}</p>
                          {sub && <p className="text-[11px] text-gray-400 truncate" title={sub}>{sub}</p>}
                        </td>
                        <td className="a-td text-gray-700">{r.teacher || <span className="text-gray-300">—</span>}</td>
                        <td className="a-td">
                          {r.groups.length > 0 && <p className="text-gray-700 font-semibold">{r.groups.join(", ")}</p>}
                          {r.studentCount > 0 && <p className="text-[11px] text-gray-400">{r.groups.length ? "+ " : ""}{r.studentCount} student{r.studentCount === 1 ? "" : "s"}</p>}
                          {!r.groups.length && !r.studentCount && <span className="text-gray-300">—</span>}
                        </td>
                        <td className="a-td">
                          {cancelled ? (
                            <span title={[r.cancelReason && `Reason: ${r.cancelReason}`, r.cancelledBy && `By ${r.cancelledBy}`, fmtStamp(r.cancelledAt)].filter(Boolean).join(" · ")} className="cursor-help">
                              <Pill tone="red">Cancelled</Pill>
                            </span>
                          ) : isUpcoming(r) ? (
                            <Pill tone="green">Scheduled</Pill>
                          ) : (
                            <Pill tone="gray">Past</Pill>
                          )}
                        </td>
                        <td className="a-td">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button type="button" onClick={() => openAttendance(r.raw)} className="a-act" title="Manual attendance" aria-label="Manual attendance"><UserCheck size={15} /></button>
                            <button type="button" onClick={() => setPdfRow(r)} className="a-act" title="Session PDFs" aria-label="Session PDFs"><FileText size={15} /></button>
                            <button type="button" onClick={() => navigate(`/admin/live/sessions/${r.id}/ratings`)} className="a-act" title="Session ratings" aria-label="Session ratings"><Star size={15} /></button>
                            {cancelled ? (
                              <button type="button" onClick={() => restore(r)} disabled={busy === r.id} className="a-act disabled:opacity-40" title="Restore session" aria-label="Restore session"><RotateCcw size={15} /></button>
                            ) : (
                              <button type="button" onClick={() => { setCancelRow(r); setReason(""); }} disabled={busy === r.id} className="a-act del disabled:opacity-40" title="Cancel session" aria-label="Cancel session"><Ban size={15} /></button>
                            )}
                            <button type="button" onClick={() => navigate(`/admin/live/sessions/edit/${r.id}`)} className="a-act" title="Edit" aria-label="Edit"><Pencil size={15} /></button>
                            <button type="button" onClick={() => setDeleteRow(r)} className="a-act del" title="Delete" aria-label="Delete"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <p className="font-bold text-gray-700">{rows.length ? "No sessions here" : "No sessions yet"}</p>
                      <p className="text-sm text-gray-400">{rows.length ? "Try another tab, search or filter." : "Use “Add session” to create the first one."}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <Pager currentPage={page} totalPages={totalPages} setPage={setPage} shown={shown.length} total={list.length} label="sessions" />}
        </div>
      )}

      {pdfRow && <PdfsModal row={pdfRow} onClose={() => setPdfRow(null)} />}

      {cancelRow && (
        <Modal
          title="Cancel session"
          onClose={() => busy !== cancelRow.id && setCancelRow(null)}
          actions={
            <>
              <button type="button" onClick={() => setCancelRow(null)} disabled={busy === cancelRow.id} className="a-btn">Keep session</button>
              <button type="button" onClick={submitCancel} disabled={busy === cancelRow.id || reason.trim().length < 3} className="a-btn danger">
                {busy === cancelRow.id ? "Cancelling…" : "Cancel session"}
              </button>
            </>
          }
        >
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 mb-4">
            <p className="font-bold text-gray-800">{cancelRow.name}</p>
            <p className="text-xs text-gray-500">
              {fmtDay(cancelRow.start)}
              {cancelRow.timeFrom && ` · ${fmtTime(cancelRow.timeFrom)} – ${fmtTime(cancelRow.timeTo)}`}
              {cancelRow.teacher && ` · ${cancelRow.teacher}`}
            </p>
          </div>
          <label className="a-lbl-f" htmlFor="cancel-reason">Reason <span className="text-red-500">*</span></label>
          <textarea id="cancel-reason" autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} placeholder="Why is this session cancelled? Students see this." className="a-inp resize-y" />
          <p className="text-[11px] text-gray-400 mt-1.5">The students of this session are notified. You can restore it later.</p>
        </Modal>
      )}

      <ConfirmDeleteModal
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
        title="Delete Session"
        description={`Are you sure you want to delete "${deleteRow?.name}"?`}
      />

      <ManualAttendanceModal
        open={openManualAttendance}
        onClose={() => {
          setOpenManualAttendance(false);
          setManualAttendanceSession(null);
        }}
        initialSession={manualAttendanceSession}
        allSessions={sessions || NO_SESSIONS}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default Sessions;
