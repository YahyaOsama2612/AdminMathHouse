import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckSquare, Clock3, Eye, RotateCw, Square, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/api/api";
import useDelete from "@/hooks/useDelete";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import usePut from "@/hooks/usePut";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pager } from "@/components/ReusableTable";
import { Card, Empty, Modal, PageHead, Pill, SkelRows, Stat, Tabs, refreshWaiting } from "@/components/admin/kit";

/* Live → Study Plans (MathPortal design "availability-plans").
   Students send the times they are free → the admin proposes matching sessions → the student accepts or rejects.
   Endpoints (unchanged): GET /api/admin/availability-plans (?page&limit&status&search&studentId),
   GET …/:id, GET …/:id/matching-sessions, POST …/:id/propose-sessions, PUT …/:id/status, DELETE …/:id */

const API_URL = "/api/admin/availability-plans";

/* ------------------------------------------------------------------ */
/* Status metadata                                                     */
/* ------------------------------------------------------------------ */

// Known statuses get a label + pill tone. Unknown statuses from the API still work (humanized, gray).
const STATUS_META = {
  pending_admin_review: { label: "Waiting for you", tone: "amber" },
  plan_proposed: { label: "Proposed · awaiting student", tone: "blue" },
  accepted: { label: "Accepted by student", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  cancelled: { label: "Cancelled", tone: "gray" },
  sessions_proposed: { label: "Sessions proposed", tone: "blue" },
  confirmed: { label: "Confirmed", tone: "green" },
};
// The statuses the backend accepts (PUT …/:id/status).
const BASE_STATUSES = ["pending_admin_review", "plan_proposed", "accepted", "rejected", "cancelled"];
const CLOSED_STATUSES = ["cancelled"];
const RESPONSE_TONE = { pending: "amber", accepted: "green", rejected: "red" };

const humanize = (value) =>
  String(value || "unknown")
    .replaceAll("_", " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const getStatusLabel = (value) => STATUS_META[value]?.label || humanize(value);
const StatusBadge = ({ value }) => <Pill tone={STATUS_META[value]?.tone || "gray"}>{getStatusLabel(value)}</Pill>;

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isValidDate(d) ? d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
};

// "2026-10-13" is parsed by `new Date` as UTC midnight, which shows the
// previous day for users west of UTC. Parse date-only strings as local dates.
const parseDateOnly = (value) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

const formatDay = (value) => {
  if (!value) return null;
  const d = parseDateOnly(value);
  return isValidDate(d) ? d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : null;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Handles 0–6 (JS) and 1–7 (ISO, 7 = Sunday) numbers, or a day-name string.
const formatDayOfWeek = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isInteger(n) && n >= 0 && n <= 7) return WEEKDAYS[n % 7];
  return humanize(value);
};

const formatTime = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value);
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatTimeRange = (from, to) => [formatTime(from), formatTime(to)].filter(Boolean).join(" – ") || "Time not specified";

const slotDay = (slot) => formatDay(slot.specificDate) || formatDayOfWeek(slot.dayOfWeek) || "Date not specified";

const getPersonName = (person, fallback) => person?.name || [person?.firstname, person?.lastname].filter(Boolean).join(" ") || fallback;
const getStudentName = (student) => getPersonName(student, "Unknown student");
const getSessionName = (session) => session?.name || session?.title || session?.sessionName || "Session";
const getSessionId = (session) => session?.id ?? session?.sessionId;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

/** Plans per status for the KPI row: one tiny list request per status (limit=1, reads pagination.total).
    Failures stay silent — the KPI just shows "—". */
const COUNT_STATUSES = ["pending_admin_review", "plan_proposed", "accepted", "rejected", "cancelled"];
const useStatusCounts = (version) => {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    let alive = true;
    Promise.all(
      COUNT_STATUSES.map((s) =>
        api
          .get(`${API_URL}?page=1&limit=1&status=${s}`)
          .then((r) => [s, Number(r.data?.data?.pagination?.total) || 0])
          .catch(() => [s, null])
      )
    ).then((pairs) => alive && setCounts(Object.fromEntries(pairs)));
    return () => { alive = false; };
  }, [version]);
  return counts;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const AvailabilityPlans = () => {
  // List state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [studentId, setStudentId] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedStudentId = useDebouncedValue(studentId.trim());
  const [countsVersion, setCountsVersion] = useState(0);

  // Detail / propose state
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [sessionNotes, setSessionNotes] = useState({});

  // Status / delete / quick-decline state
  const [deletePlan, setDeletePlan] = useState(null);
  const [statusPlan, setStatusPlan] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [declining, setDeclining] = useState(null); // plan id with the inline decline box open
  const [declineNote, setDeclineNote] = useState("");

  // Reset to page 1 only when the *effective* filters change (after debounce).
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStudentId, status, limit]);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedStudentId) params.set("studentId", debouncedStudentId);
    return `${API_URL}?${params.toString()}`;
  }, [page, limit, status, debouncedSearch, debouncedStudentId]);

  const { data, loading, error, refetch } = useGet(listUrl);
  const { data: detailResponse, loading: detailLoading, error: detailError, refetch: refetchDetail } = useGet(
    selectedPlanId ? `${API_URL}/${selectedPlanId}` : ""
  );
  const { data: matchingResponse, loading: matchingLoading, error: matchingError, refetch: refetchMatching } = useGet(
    selectedPlanId ? `${API_URL}/${selectedPlanId}/matching-sessions` : ""
  );
  const { postData, loading: proposing } = usePost();
  const { putData, loading: updatingStatus } = usePut();
  const { deleteData, loading: deleting } = useDelete();

  // KPI counts (per status)
  const counts = useStatusCounts(countsVersion);
  const nPending = counts.pending_admin_review ?? null;
  const nProposed = counts.plan_proposed ?? null;
  const nAccepted = counts.accepted ?? null;
  const nRejected = counts.rejected ?? null;
  const nCancelled = counts.cancelled ?? null;

  const plans = useMemo(() => data?.data?.items ?? [], [data]);
  const pagination = data?.data?.pagination || { page, limit, total: 0, totalPages: 1 };
  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);

  // Ignore a stale detail response from the previously opened plan.
  const rawPlanDetails = detailResponse?.data?.plan;
  const planDetails =
    rawPlanDetails && (rawPlanDetails.id == null || String(rawPlanDetails.id) === String(selectedPlanId)) ? rawPlanDetails : null;

  const matchingData = matchingResponse?.data;
  const candidateSessions = useMemo(() => (matchingData?.candidateSessions || []).filter((s) => getSessionId(s) != null), [matchingData]);
  const planSlots = matchingData?.planSlots || planDetails?.slots || [];
  const proposedSessions = planDetails?.proposedSessions || [];
  const isPlanClosed = CLOSED_STATUSES.includes(planDetails?.status);

  // If the current page is beyond the last page, step back instead of showing an empty table.
  useEffect(() => {
    if (!loading && data && page > totalPages) setPage(totalPages);
  }, [loading, data, page, totalPages]);

  // Keep a stable, growing list of statuses so the options don't shrink when the table is filtered.
  const [seenStatuses, setSeenStatuses] = useState(BASE_STATUSES);
  useEffect(() => {
    const incoming = [...plans.map((p) => p.status), planDetails?.status].filter(Boolean);
    setSeenStatuses((current) => {
      const missing = [...new Set(incoming)].filter((s) => !current.includes(s));
      return missing.length ? [...current, ...missing] : current;
    });
  }, [plans, planDetails?.status]);

  const statusOptions = useMemo(
    () => [...new Set([...seenStatuses, status].filter(Boolean))].map((value) => ({ value, label: getStatusLabel(value) })),
    [seenStatuses, status]
  );

  const afterChange = () => {
    setCountsVersion((v) => v + 1);
    refreshWaiting();
  };

  /* ---------------- Detail modal actions ---------------- */

  const openPlan = (plan) => {
    setSelectedPlanId(plan.id);
    setSelectedSessionIds([]);
    setAdminNotes("");
    setSessionNotes({});
  };

  const closePlan = useCallback(() => {
    setSelectedPlanId("");
    setSelectedSessionIds([]);
    setAdminNotes("");
    setSessionNotes({});
  }, []);

  const toggleSession = (sessionId) => {
    setSelectedSessionIds((current) => (current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId]));
  };

  const allSelected = candidateSessions.length > 0 && candidateSessions.every((s) => selectedSessionIds.includes(getSessionId(s)));
  const toggleAll = () => setSelectedSessionIds(allSelected ? [] : candidateSessions.map(getSessionId));

  const proposeSessions = async () => {
    if (proposing) return;
    if (isPlanClosed) {
      toast.error("This plan is cancelled. Reopen it before proposing sessions.");
      return;
    }
    // Only send sessions that are still in the current candidate list.
    const validIds = selectedSessionIds.filter((id) => candidateSessions.some((s) => getSessionId(s) === id));
    if (!validIds.length) {
      toast.error("Select at least one matching session.");
      return;
    }
    const payload = {
      sessionIds: validIds,
      adminNotes: adminNotes.trim(),
      sessionNotes: validIds.map((sessionId) => ({ sessionId, notes: (sessionNotes[sessionId] || "").trim() })),
    };
    try {
      await postData(payload, `${API_URL}/${selectedPlanId}/propose-sessions`, "Sessions proposed successfully");
      setSelectedSessionIds([]);
      setAdminNotes("");
      setSessionNotes({});
      afterChange();
      await Promise.all([refetch(), refetchDetail(), refetchMatching()]);
    } catch {
      // The shared request hook displays the API error.
    }
  };

  /* ---------------- Status modal actions ---------------- */

  const openStatus = (plan) => {
    setStatusPlan(plan);
    setNextStatus(plan.status || BASE_STATUSES[0]);
    setStatusNotes(plan.adminNotes || "");
  };

  const closeStatus = useCallback(() => {
    setStatusPlan(null);
    setNextStatus("");
    setStatusNotes("");
  }, []);

  const statusUnchanged =
    Boolean(statusPlan) && nextStatus === statusPlan.status && statusNotes.trim() === (statusPlan.adminNotes || "").trim();

  const saveStatus = async () => {
    if (!statusPlan || !nextStatus || updatingStatus || statusUnchanged) return;
    const planId = statusPlan.id;
    try {
      await putData({ status: nextStatus, adminNotes: statusNotes.trim() }, `${API_URL}/${planId}/status`, "Availability plan status updated");
      closeStatus();
      afterChange();
      await Promise.all([refetch(), ...(String(selectedPlanId) === String(planId) ? [refetchDetail(), refetchMatching()] : [])]);
    } catch {
      // The shared request hook displays the API error.
    }
  };

  /* Quick decline from the table (same PUT …/:id/status call, status "rejected") */
  const decline = async (plan) => {
    if (updatingStatus) return;
    if (!declineNote.trim()) {
      toast.error("Write why the times don't work — the student sees it");
      return;
    }
    try {
      await putData({ status: "rejected", adminNotes: declineNote.trim() }, `${API_URL}/${plan.id}/status`, "Plan declined");
      setDeclining(null);
      setDeclineNote("");
      afterChange();
      await refetch();
    } catch {
      // The shared request hook displays the API error.
    }
  };

  /* ---------------- Delete ---------------- */

  const confirmDelete = async () => {
    if (!deletePlan || deleting) return;
    const planId = deletePlan.id;
    try {
      await deleteData(`${API_URL}/${planId}`);
      setDeletePlan(null);
      if (String(selectedPlanId) === String(planId)) closePlan();
      afterChange();
      // Last row on a page > 1 → go back a page (the URL change refetches).
      if (plans.length === 1 && page > 1) setPage((p) => p - 1);
      else await refetch();
    } catch {
      // The shared request hook displays the API error.
    }
  };

  /* ---------------- Modal UX: Escape + scroll lock ---------------- */

  useEffect(() => {
    if (!selectedPlanId && !statusPlan) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (statusPlan) {
        if (!updatingStatus) closeStatus();
      } else if (!proposing) {
        closePlan();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPlanId, statusPlan, proposing, updatingStatus, closePlan, closeStatus]);

  const selectedCount = selectedSessionIds.length;
  const canPropose = !proposing && !matchingLoading && !isPlanClosed && selectedCount > 0;
  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-0";
  const kpi = (n) => (n === null ? "—" : n);
  const tabs = [
    { key: "", label: "All" },
    { key: "pending_admin_review", label: "Waiting for you", count: nPending || 0 },
    ...statusOptions.filter((o) => o.value !== "pending_admin_review").map((o) => ({ key: o.value, label: STATUS_META[o.value] ? o.label.split(" · ")[0] : o.label })),
  ];

  return (
    <div>
      <PageHead
        title="Study Plans"
        sub="Students send the times they are free → you propose matching sessions → the student accepts the plan."
      >
        <button type="button" onClick={() => { refetch(); setCountsVersion((v) => v + 1); }} disabled={loading} className="a-btn">
          <RotateCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Waiting for you" value={kpi(nPending)} sub="New times to review" color={nPending ? "#b45309" : "#94a3b8"} />
        <Stat label="Awaiting student" value={kpi(nProposed)} sub="Sessions proposed, not answered yet" color="#1d4ed8" />
        <Stat label="Accepted plans" value={kpi(nAccepted)} sub="Approved by the student" color="#15803d" />
        <Stat label="Rejected / cancelled" value={nRejected === null || nCancelled === null ? "—" : nRejected + nCancelled} sub={`${kpi(nRejected)} rejected · ${kpi(nCancelled)} cancelled`} color="#7d0a0a" />
      </div>

      <Tabs tabs={tabs} value={status} onChange={setStatus} />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plan title, student name, email or phone…" className={`${sel} col-span-2 md:flex-1 md:min-w-[240px]`} />
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student ID" className={`${sel} md:w-56`} />
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={sel} aria-label="Rows per page">
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
        </select>
        <span className="text-xs text-gray-400 col-span-2 md:ml-auto">{pagination.total || 0} plan{pagination.total === 1 ? "" : "s"}</span>
      </div>

      {loading && !data ? (
        <SkelRows n={6} />
      ) : error && !data ? (
        <div className="bg-white rounded-xl border border-red-100 p-6 text-center text-sm text-red-600">
          Could not load study plans. <button onClick={() => refetch()} className="font-bold underline">Retry</button>
        </div>
      ) : plans.length === 0 ? (
        <Empty title="No study plans" text={status || debouncedSearch || debouncedStudentId ? "No plans match these filters." : "Plans appear here when a student sends the times they are free."} />
      ) : (
        <Card bodyClass="" className={loading || deleting ? "opacity-70 transition-opacity" : ""}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>{["Student", "Plan", "Requested times", "Proposed", "Status", "Created", ""].map((h) => <th key={h} className="a-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const slots = plan.slots || [];
                  const pending = plan.status === "pending_admin_review";
                  return [
                    <tr key={plan.id} className="a-tr">
                      <td className="a-td">
                        <p className="font-bold text-gray-800">{getStudentName(plan.student)}</p>
                        <p className="text-[11px] text-gray-400 truncate">{plan.student?.email || plan.student?.phone || "—"}</p>
                      </td>
                      <td className="a-td">
                        <p className="font-semibold text-gray-800">{plan.title || <span className="text-gray-400">Untitled plan</span>}</p>
                        {plan.notes && <p className="text-xs text-gray-400 line-clamp-2">“{plan.notes}”</p>}
                      </td>
                      <td className="a-td">
                        {slots.length ? (
                          <div className="flex flex-wrap gap-1">
                            {slots.slice(0, 2).map((s, i) => (
                              <span key={s.id ?? i} className="text-[11px] font-semibold text-one bg-white border border-red-100 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                                {slotDay(s).split(",")[0]} {formatTime(s.timeFrom)}
                              </span>
                            ))}
                            {slots.length > 2 && <span className="text-[11px] text-gray-400 self-center">+{slots.length - 2} more</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No slots</span>
                        )}
                      </td>
                      <td className="a-td font-bold text-gray-800">{plan.proposedSessionsCount ?? 0}</td>
                      <td className="a-td">
                        <StatusBadge value={plan.status} />
                        {plan.status === "rejected" && plan.studentFeedback && <p className="text-[11px] text-red-600 mt-1 line-clamp-2">“{plan.studentFeedback}”</p>}
                      </td>
                      <td className="a-td text-gray-500 whitespace-nowrap">{formatDate(plan.createdAt)}</td>
                      <td className="a-td">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {pending && (
                            <>
                              <button type="button" onClick={() => openPlan(plan)} className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg text-white whitespace-nowrap" style={{ background: "#15803d" }} title="See the times and propose matching sessions">
                                Review &amp; propose
                              </button>
                              <button type="button" onClick={() => { setDeclining(declining === plan.id ? null : plan.id); setDeclineNote(""); }} className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 bg-white whitespace-nowrap">
                                Decline
                              </button>
                            </>
                          )}
                          {!pending && (
                            <button type="button" onClick={() => openPlan(plan)} className="a-act" title="View / propose" aria-label="View plan"><Eye size={16} /></button>
                          )}
                          <button type="button" onClick={() => openStatus(plan)} className="a-act" title="Update status" aria-label="Update status"><Clock3 size={16} /></button>
                          <button type="button" onClick={() => setDeletePlan(plan)} disabled={deleting} className="a-act del" title="Delete" aria-label="Delete plan"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>,
                    declining === plan.id && (
                      <tr key={`${plan.id}-decline`}>
                        <td colSpan={7} className="px-3 pb-3">
                          <div className="flex flex-col sm:flex-row gap-2 bg-red-50/50 border border-red-200 rounded-xl p-3">
                            <input
                              autoFocus
                              value={declineNote}
                              onChange={(e) => setDeclineNote(e.target.value)}
                              placeholder="Why these times can't work, e.g. no teachers on Sunday mornings"
                              className="flex-1 border border-red-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-one"
                            />
                            <button type="button" onClick={() => decline(plan)} disabled={updatingStatus} className="a-btn danger">{updatingStatus ? "Saving…" : "Decline plan"}</button>
                            <button type="button" onClick={() => setDeclining(null)} className="a-btn">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
          <Pager currentPage={pagination.page || page} totalPages={totalPages} setPage={setPage} shown={plans.length} total={pagination.total || 0} label="plans" />
        </Card>
      )}

      {/* ---------------- Plan detail / propose modal ---------------- */}
      {selectedPlanId && (
        <div className="a-modal-bg" onMouseDown={(event) => { if (event.target === event.currentTarget && !proposing) closePlan(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="availability-plan-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="availability-plan-title" className="truncate text-lg font-bold text-gray-900">{planDetails?.title || "Study plan"}</h2>
                  {planDetails?.status && <StatusBadge value={planDetails.status} />}
                </div>
                {planDetails?.student && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {getStudentName(planDetails.student)}
                    {planDetails.student.email ? ` · ${planDetails.student.email}` : ""}
                    {planDetails.student.phone ? ` · ${planDetails.student.phone}` : ""}
                  </p>
                )}
              </div>
              <button type="button" onClick={closePlan} disabled={proposing} className="a-act shrink-0" aria-label="Close plan details"><X size={18} /></button>
            </header>

            <div className="flex-1 overflow-y-auto bg-[#fcfafa]">
              {detailLoading && !planDetails ? (
                <div className="p-5"><SkelRows n={4} /></div>
              ) : detailError && !planDetails ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <p className="text-sm text-red-600">Could not load this plan.</p>
                  <button type="button" onClick={() => refetchDetail()} className="a-btn"><RotateCw size={14} /> Retry</button>
                </div>
              ) : planDetails ? (
                <div className="space-y-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sr-box">
                      <p className="sr-label">Plan</p>
                      {[
                        ["Created", formatDate(planDetails.createdAt)],
                        ["Requested slots", planSlots.length],
                        ["Proposed", planDetails.proposedAt ? `${formatDate(planDetails.proposedAt)}${planDetails.proposedByAdmin?.name ? ` · ${planDetails.proposedByAdmin.name}` : ""}` : "—"],
                        ["Student answered", formatDate(planDetails.respondedAt)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 text-sm py-1">
                          <span className="text-gray-400">{k}</span>
                          <span className="font-semibold text-gray-800 text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="sr-box space-y-2">
                      <div><p className="sr-label">Student notes</p><p className="text-sm text-gray-600 whitespace-pre-wrap">{planDetails.notes || "—"}</p></div>
                      <div><p className="sr-label">Admin notes</p><p className="text-sm text-gray-600 whitespace-pre-wrap">{planDetails.adminNotes || "—"}</p></div>
                      {planDetails.studentFeedback && (
                        <div><p className="sr-label">Student feedback</p><p className="text-sm text-red-600 whitespace-pre-wrap">“{planDetails.studentFeedback}”</p></div>
                      )}
                    </div>
                  </div>

                  {isPlanClosed && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">This plan is cancelled. Change its status before proposing sessions.</p>
                  )}

                  <section className="sr-box">
                    <p className="sr-label mb-2">Times the student is free</p>
                    {planSlots.length ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {planSlots.map((slot, index) => (
                          <div key={slot.id ?? index} className="border border-gray-100 rounded-xl p-2.5 bg-red-50/40">
                            <p className="text-xs font-bold text-gray-700 mb-1.5">{slotDay(slot)}</p>
                            <p className="text-[11px] font-semibold text-one bg-white border border-red-100 rounded-md px-1.5 py-0.5 inline-block">{formatTimeRange(slot.timeFrom, slot.timeTo)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No availability slots found.</p>
                    )}
                  </section>

                  {proposedSessions.length > 0 && (
                    <section className="sr-box">
                      <p className="sr-label mb-2">Currently proposed ({proposedSessions.length})</p>
                      <div className="divide-y divide-gray-50">
                        {proposedSessions.map((ps, i) => (
                          <div key={ps.planSessionId ?? i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{ps.sessionName || "Session"}</p>
                              <p className="text-xs text-gray-400">
                                {[formatDay(ps.sessionDate || ps.startDate), ps.timeFrom && formatTimeRange(ps.timeFrom, ps.timeTo), ps.teacherName].filter(Boolean).join(" · ")}
                                {ps.planSessionNotes ? ` · “${ps.planSessionNotes}”` : ""}
                              </p>
                            </div>
                            <Pill tone={RESPONSE_TONE[ps.studentResponse] || "gray"}>{humanize(ps.studentResponse || "pending")}</Pill>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-gray-800">
                        Matching sessions
                        {candidateSessions.length > 0 && <span className="ms-2 text-xs font-normal text-gray-400">{selectedCount} / {candidateSessions.length} selected</span>}
                      </p>
                      {candidateSessions.length > 1 && !isPlanClosed && (
                        <button type="button" onClick={toggleAll} className="inline-flex items-center gap-1.5 text-xs font-bold text-one hover:underline">
                          {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                          {allSelected ? "Clear selection" : "Select all"}
                        </button>
                      )}
                    </div>

                    {matchingLoading && !candidateSessions.length ? (
                      <SkelRows n={3} />
                    ) : matchingError ? (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-4">
                        <p className="text-sm text-red-600">Could not load matching sessions.</p>
                        <button type="button" onClick={() => refetchMatching()} className="inline-flex items-center gap-1 text-sm font-bold text-red-700 hover:underline"><RotateCw size={14} /> Retry</button>
                      </div>
                    ) : candidateSessions.length ? (
                      <div className="space-y-2">
                        {candidateSessions.map((session) => {
                          const sessionId = getSessionId(session);
                          const isSelected = selectedSessionIds.includes(sessionId);
                          const meta = [
                            (session.type || session.scheduleType) && humanize(session.type || session.scheduleType),
                            formatDay(session.sessionDate || session.startDate),
                            session.timeFrom && formatTimeRange(session.timeFrom, session.timeTo),
                            session.groups?.name,
                            getPersonName(session.teacher, "") || session.teacherName,
                          ].filter(Boolean);
                          const lessons = (session.lessons || []).map((l) => l.lessonName).filter(Boolean);
                          return (
                            <div key={sessionId} className={`rounded-xl border bg-white p-3.5 transition-colors ${isSelected ? "border-one bg-red-50/40" : "border-gray-100 hover:border-gray-200"} ${isPlanClosed ? "opacity-60" : ""}`}>
                              <label className={`flex items-start gap-3 ${isPlanClosed ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                <input type="checkbox" checked={isSelected} disabled={isPlanClosed || proposing} onChange={() => toggleSession(sessionId)} className="mt-1 h-4 w-4 accent-one" />
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-gray-800">{getSessionName(session)}</span>
                                    {session.studentAlreadyEnrolled && <Pill tone="green">Already enrolled</Pill>}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-gray-500">{meta.join(" · ") || "Session details unavailable"}</span>
                                  {lessons.length > 0 && <span className="mt-0.5 block text-[11px] text-gray-400">Lessons: {lessons.join(", ")}</span>}
                                </span>
                              </label>
                              {isSelected && (
                                <textarea
                                  value={sessionNotes[sessionId] || ""}
                                  onChange={(event) => setSessionNotes((current) => ({ ...current, [sessionId]: event.target.value }))}
                                  placeholder="Notes for this session (optional)"
                                  rows={2}
                                  disabled={proposing}
                                  className="a-inp mt-3 resize-none"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-white border border-dashed border-gray-200 p-4 text-sm text-gray-400">No matching sessions are currently available.</p>
                    )}
                  </section>

                  {!isPlanClosed && candidateSessions.length > 0 && (
                    <section>
                      <label htmlFor="availability-admin-notes" className="a-lbl-f">Notes to student</label>
                      <textarea
                        id="availability-admin-notes"
                        value={adminNotes}
                        onChange={(event) => setAdminNotes(event.target.value)}
                        rows={3}
                        disabled={proposing}
                        className="a-inp resize-none"
                        placeholder="Add a note to include with your proposed sessions"
                      />
                    </section>
                  )}
                </div>
              ) : null}
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={closePlan} disabled={proposing} className="a-btn">Close</button>
              <button type="button" onClick={proposeSessions} disabled={!canPropose} className="a-btn primary">
                <Check size={16} />
                {proposing ? "Sending…" : selectedCount ? `Propose ${selectedCount} session${selectedCount === 1 ? "" : "s"}` : "Propose sessions"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* ---------------- Status modal ---------------- */}
      {statusPlan && (
        <Modal
          title="Update plan status"
          onClose={() => { if (!updatingStatus) closeStatus(); }}
          actions={
            <>
              <button type="button" onClick={closeStatus} disabled={updatingStatus} className="a-btn">Cancel</button>
              <button type="button" onClick={saveStatus} disabled={updatingStatus || !nextStatus || statusUnchanged} className="a-btn primary">
                {updatingStatus ? "Saving…" : "Save status"}
              </button>
            </>
          }
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="truncate text-xs text-gray-400">{statusPlan.title || "Untitled plan"} · {getStudentName(statusPlan.student)}</p>
            <StatusBadge value={statusPlan.status} />
          </div>
          <label className="a-lbl-f" htmlFor="plan-next-status">New status</label>
          <select id="plan-next-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} disabled={updatingStatus} className="a-inp mb-4">
            {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <label className="a-lbl-f" htmlFor="plan-status-notes">Admin notes</label>
          <textarea id="plan-status-notes" value={statusNotes} onChange={(event) => setStatusNotes(event.target.value)} rows={3} disabled={updatingStatus} className="a-inp resize-none" placeholder="Optional note for the student" />
        </Modal>
      )}

      <ConfirmDeleteModal
        open={Boolean(deletePlan)}
        onClose={() => !deleting && setDeletePlan(null)}
        onConfirm={confirmDelete}
        title="Delete study plan"
        description={`Are you sure you want to delete "${deletePlan?.title || "this plan"}"? This can't be undone.`}
      />
    </div>
  );
};

export default AvailabilityPlans;
