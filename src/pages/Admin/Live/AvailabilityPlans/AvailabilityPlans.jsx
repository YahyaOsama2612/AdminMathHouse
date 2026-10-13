import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckSquare,
  Clock3,
  Eye,
  RotateCw,
  Square,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import useDelete from "@/hooks/useDelete";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import usePut from "@/hooks/usePut";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Errorpage from "@/components/Errorpage";
import Loader from "@/components/Loader";
import ReusableTableSearch from "@/components/ReusableTableSearch";

const API_URL = "/api/admin/availability-plans";

/* ------------------------------------------------------------------ */
/* Status metadata                                                     */
/* ------------------------------------------------------------------ */

// Known statuses get a proper label + color. Unknown statuses coming from the
// API still work (humanized label + neutral color).
const STATUS_META = {
  pending_admin_review: {
    label: "Pending admin review",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  sessions_proposed: {
    label: "Sessions proposed",
    tone: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  },
  confirmed: {
    label: "Confirmed",
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
};
const BASE_STATUSES = ["pending_admin_review", "cancelled"];
const CLOSED_STATUSES = ["cancelled"];
const DEFAULT_TONE = "bg-muted text-muted-foreground";

const humanize = (value) =>
  String(value || "unknown")
    .replaceAll("_", " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const getStatusLabel = (value) => STATUS_META[value]?.label || humanize(value);

const StatusBadge = ({ value }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      STATUS_META[value]?.tone || DEFAULT_TONE
    }`}
  >
    {getStatusLabel(value)}
  </span>
);

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isValidDate(d)
    ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
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
  return isValidDate(d)
    ? d.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Handles 0–6 (JS) and 1–7 (ISO, 7 = Sunday) numbers, or a day-name string.
// The old code used `dayOfWeek || ...`, so Sunday (0) showed "Date not specified".
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
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

const formatTimeRange = (from, to) =>
  [formatTime(from), formatTime(to)].filter(Boolean).join(" – ") || "Time not specified";

const getPersonName = (person, fallback) =>
  person?.name ||
  [person?.firstname, person?.lastname].filter(Boolean).join(" ") ||
  fallback;

const getStudentName = (student) => getPersonName(student, "Unknown student");

const getSessionName = (session) =>
  session?.name || session?.title || session?.sessionName || "Session";

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

  // Detail / propose state
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [sessionNotes, setSessionNotes] = useState({});

  // Status / delete state
  const [deletePlan, setDeletePlan] = useState(null);
  const [statusPlan, setStatusPlan] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  // Reset to page 1 only when the *effective* filters change (after debounce),
  // so typing doesn't fire an extra request with stale filters.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStudentId, status, limit]);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({
      spage: String(page), // NOTE: confirm the backend expects "spage" (not "page")
      limit: String(limit),
    });
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedStudentId) params.set("studentId", debouncedStudentId);
    return `${API_URL}?${params.toString()}`;
  }, [page, limit, status, debouncedSearch, debouncedStudentId]);

  const { data, loading, error, refetch } = useGet(listUrl);
  const {
    data: detailResponse,
    loading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useGet(selectedPlanId ? `${API_URL}/${selectedPlanId}` : "");
  const {
    data: matchingResponse,
    loading: matchingLoading,
    error: matchingError,
    refetch: refetchMatching,
  } = useGet(selectedPlanId ? `${API_URL}/${selectedPlanId}/matching-sessions` : "");
  const { postData, loading: proposing } = usePost();
  const { putData, loading: updatingStatus } = usePut();
  const { deleteData, loading: deleting } = useDelete();

  const plans = useMemo(() => data?.data?.items ?? [], [data]);
  const pagination = data?.data?.pagination || {
    page,
    limit,
    total: 0,
    totalPages: 1,
  };
  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);

  // Ignore a stale detail response from the previously opened plan.
  const rawPlanDetails = detailResponse?.data?.plan;
  const planDetails =
    rawPlanDetails &&
    (rawPlanDetails.id == null || String(rawPlanDetails.id) === String(selectedPlanId))
      ? rawPlanDetails
      : null;

  const matchingData = matchingResponse?.data;
  const candidateSessions = useMemo(
    () => (matchingData?.candidateSessions || []).filter((s) => getSessionId(s) != null),
    [matchingData],
  );
  const planSlots = matchingData?.planSlots || planDetails?.slots || [];
  const isPlanClosed = CLOSED_STATUSES.includes(planDetails?.status);

  // If the current page is beyond the last page (e.g. after deleting the last
  // row on the last page), step back instead of showing an empty table.
  useEffect(() => {
    if (!loading && data && page > totalPages) setPage(totalPages);
  }, [loading, data, page, totalPages]);

  // Keep a stable, growing list of statuses so the filter dropdown doesn't
  // shrink when the table is filtered (old code derived it from the current page).
  const [seenStatuses, setSeenStatuses] = useState(BASE_STATUSES);
  useEffect(() => {
    const incoming = [...plans.map((p) => p.status), planDetails?.status].filter(Boolean);
    setSeenStatuses((current) => {
      const missing = [...new Set(incoming)].filter((s) => !current.includes(s));
      return missing.length ? [...current, ...missing] : current;
    });
  }, [plans, planDetails?.status]);

  const statusOptions = useMemo(
    () =>
      [...new Set([...seenStatuses, status].filter(Boolean))].map((value) => ({
        value,
        label: getStatusLabel(value),
      })),
    [seenStatuses, status],
  );

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
    setSelectedSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  };

  const allSelected =
    candidateSessions.length > 0 &&
    candidateSessions.every((s) => selectedSessionIds.includes(getSessionId(s)));

  const toggleAll = () => {
    setSelectedSessionIds(allSelected ? [] : candidateSessions.map(getSessionId));
  };

  const proposeSessions = async () => {
    if (proposing) return;
    if (isPlanClosed) {
      toast.error("This plan is cancelled. Reopen it before proposing sessions.");
      return;
    }
    // Only send sessions that are still in the current candidate list.
    const validIds = selectedSessionIds.filter((id) =>
      candidateSessions.some((s) => getSessionId(s) === id),
    );
    if (!validIds.length) {
      toast.error("Select at least one matching session.");
      return;
    }
    const payload = {
      sessionIds: validIds,
      adminNotes: adminNotes.trim(),
      sessionNotes: validIds.map((sessionId) => ({
        sessionId,
        notes: (sessionNotes[sessionId] || "").trim(),
      })),
    };
    try {
      await postData(
        payload,
        `${API_URL}/${selectedPlanId}/propose-sessions`,
        "Sessions proposed successfully",
      );
      setSelectedSessionIds([]);
      setAdminNotes("");
      setSessionNotes({});
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
    Boolean(statusPlan) &&
    nextStatus === statusPlan.status &&
    statusNotes.trim() === (statusPlan.adminNotes || "").trim();

  const saveStatus = async () => {
    if (!statusPlan || !nextStatus || updatingStatus || statusUnchanged) return;
    const planId = statusPlan.id;
    try {
      await putData(
        { status: nextStatus, adminNotes: statusNotes.trim() },
        `${API_URL}/${planId}/status`,
        "Availability plan status updated",
      );
      closeStatus();
      await Promise.all([
        refetch(),
        ...(String(selectedPlanId) === String(planId)
          ? [refetchDetail(), refetchMatching()]
          : []),
      ]);
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

  /* ---------------- Table ---------------- */

  const columns = [
    {
      header: "Student",
      key: "student",
      render: (_, plan) => (
        <div className="min-w-0">
          <div className="font-semibold">{getStudentName(plan.student)}</div>
          <div className="truncate text-xs text-muted-foreground">
            {plan.student?.email || "—"}
          </div>
        </div>
      ),
    },
    {
      header: "Plan",
      key: "title",
      render: (value) => value || <span className="text-muted-foreground">Untitled plan</span>,
    },
    {
      header: "Status",
      key: "status",
      render: (value) => <StatusBadge value={value} />,
    },
    {
      header: "Slots",
      key: "slots",
      render: (slots) => slots?.length || 0,
    },
    {
      header: "Created",
      key: "createdAt",
      render: (value) => formatDate(value),
    },
  ];

  if (loading && !data) return <Loader />;
  if (error && !data) return <Errorpage />;

  const selectedCount = selectedSessionIds.length;
  const canPropose =
    !proposing && !matchingLoading && !isPlanClosed && selectedCount > 0;

  return (
    <div className="space-y-5">
      <ReusableTableSearch
        title="Student Availability Plans"
        columns={columns}
        data={plans}
        loading={loading || deleting}
        currentPage={pagination.page || page}
        totalPages={totalPages}
        totalResults={pagination.total || 0}
        rowsPerPage={limit}
        onPageChange={setPage}
        onRowsPerPageChange={setLimit}
        searchTerm={search}
        onSearchChange={setSearch}
        filters={[
          { key: "status", label: "Status", options: statusOptions },
          { key: "studentId", label: "Student ID", type: "text" },
        ]}
        filterValues={{ status, studentId }}
        onFilterChange={(key, value) => {
          if (key === "status") setStatus(value);
          else if (key === "studentId") setStudentId(value);
        }}
        extraActions={(plan) => (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => openPlan(plan)}
              className="inline-flex items-center gap-1 rounded-lg bg-one px-3 py-2 text-xs font-semibold text-white hover:bg-one/90"
            >
              <Eye size={14} /> View / propose
            </button>
            <button
              type="button"
              onClick={() => openStatus(plan)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10"
            >
              <Clock3 size={14} /> Update status
            </button>
            <button
              type="button"
              onClick={() => setDeletePlan(plan)}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      />

      {/* ---------------- Plan detail / propose modal ---------------- */}
      {selectedPlanId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !proposing) closePlan();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-plan-title"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="availability-plan-title" className="truncate text-xl font-bold text-one">
                    {planDetails?.title || "Availability plan"}
                  </h2>
                  {planDetails?.status && <StatusBadge value={planDetails.status} />}
                </div>
                {planDetails?.student && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {getStudentName(planDetails.student)}
                    {planDetails.student.email ? ` · ${planDetails.student.email}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closePlan}
                disabled={proposing}
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
                aria-label="Close plan details"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {detailLoading && !planDetails ? (
                <div className="p-8">
                  <Loader />
                </div>
              ) : detailError && !planDetails ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <p className="text-sm text-red-600">Could not load availability plan details.</p>
                  <button
                    type="button"
                    onClick={() => refetchDetail()}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <RotateCw size={14} /> Retry
                  </button>
                </div>
              ) : planDetails ? (
                <div className="space-y-6 p-4 sm:p-6">
                  <dl className="grid gap-4 rounded-xl bg-muted/30 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold">Created</dt>
                      <dd className="mt-0.5 text-muted-foreground">{formatDate(planDetails.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Slots</dt>
                      <dd className="mt-0.5 text-muted-foreground">{planSlots.length}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-semibold">Student notes</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                        {planDetails.notes || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-semibold">Admin notes</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                        {planDetails.adminNotes || "—"}
                      </dd>
                    </div>
                  </dl>

                  {isPlanClosed && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                      This plan is cancelled. Change its status before proposing sessions.
                    </p>
                  )}

                  <section>
                    <h3 className="mb-3 text-lg font-bold">Requested availability</h3>
                    {planSlots.length ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {planSlots.map((slot, index) => (
                          <div
                            key={slot.id ?? index}
                            className="flex items-start gap-3 rounded-xl border border-border p-4"
                          >
                            <CalendarDays size={18} className="mt-0.5 shrink-0 text-one" />
                            <div>
                              <div className="font-semibold">
                                {formatDay(slot.specificDate) ||
                                  formatDayOfWeek(slot.dayOfWeek) ||
                                  "Date not specified"}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {formatTimeRange(slot.timeFrom, slot.timeTo)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No availability slots found.</p>
                    )}
                  </section>

                  <section>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold">
                        Matching sessions
                        {candidateSessions.length > 0 && (
                          <span className="ms-2 text-sm font-normal text-muted-foreground">
                            {selectedCount} / {candidateSessions.length} selected
                          </span>
                        )}
                      </h3>
                      {candidateSessions.length > 1 && !isPlanClosed && (
                        <button
                          type="button"
                          onClick={toggleAll}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-one hover:bg-one/10"
                        >
                          {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          {allSelected ? "Clear selection" : "Select all"}
                        </button>
                      )}
                    </div>

                    {matchingLoading && !candidateSessions.length ? (
                      <p className="text-sm text-muted-foreground">Finding matching sessions…</p>
                    ) : matchingError ? (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-4 dark:bg-red-500/10">
                        <p className="text-sm text-red-600">Could not load matching sessions.</p>
                        <button
                          type="button"
                          onClick={() => refetchMatching()}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline"
                        >
                          <RotateCw size={14} /> Retry
                        </button>
                      </div>
                    ) : candidateSessions.length ? (
                      <div className="space-y-3">
                        {candidateSessions.map((session) => {
                          const sessionId = getSessionId(session);
                          const isSelected = selectedSessionIds.includes(sessionId);
                          const meta = [
                            session.type && humanize(session.type),
                            formatDay(session.sessionDate),
                            session.timeFrom && formatTimeRange(session.timeFrom, session.timeTo),
                            session.groups?.name,
                            getPersonName(session.teacher, ""),
                          ].filter(Boolean);
                          return (
                            <div
                              key={sessionId}
                              className={`rounded-xl border p-4 transition-colors ${
                                isSelected ? "border-one bg-one/5" : "border-border hover:bg-muted/30"
                              } ${isPlanClosed ? "opacity-60" : ""}`}
                            >
                              <label
                                className={`flex items-start gap-3 ${
                                  isPlanClosed ? "cursor-not-allowed" : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isPlanClosed || proposing}
                                  onChange={() => toggleSession(sessionId)}
                                  className="mt-1 h-4 w-4 accent-one"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-semibold">{getSessionName(session)}</span>
                                  <span className="mt-1 block text-sm text-muted-foreground">
                                    {meta.join(" · ") || "Session details unavailable"}
                                  </span>
                                </span>
                              </label>
                              {isSelected && (
                                <textarea
                                  value={sessionNotes[sessionId] || ""}
                                  onChange={(event) =>
                                    setSessionNotes((current) => ({
                                      ...current,
                                      [sessionId]: event.target.value,
                                    }))
                                  }
                                  placeholder="Notes for this session (optional)"
                                  rows={2}
                                  disabled={proposing}
                                  className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-one focus:ring-2 focus:ring-one/20"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
                        No matching sessions are currently available.
                      </p>
                    )}
                  </section>

                  {!isPlanClosed && candidateSessions.length > 0 && (
                    <section className="space-y-2">
                      <label htmlFor="availability-admin-notes" className="block font-semibold">
                        Notes to student
                      </label>
                      <textarea
                        id="availability-admin-notes"
                        value={adminNotes}
                        onChange={(event) => setAdminNotes(event.target.value)}
                        rows={3}
                        disabled={proposing}
                        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-one focus:ring-2 focus:ring-one/20"
                        placeholder="Add a note to include with your proposed sessions"
                      />
                    </section>
                  )}
                </div>
              ) : null}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closePlan}
                disabled={proposing}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={proposeSessions}
                disabled={!canPropose}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-one px-4 py-2 text-sm font-semibold text-white hover:bg-one/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={16} />
                {proposing
                  ? "Sending…"
                  : selectedCount
                    ? `Propose ${selectedCount} session${selectedCount === 1 ? "" : "s"}`
                    : "Propose sessions"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* ---------------- Status modal ---------------- */}
      {statusPlan && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingStatus) closeStatus();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-status-title"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="availability-status-title" className="text-lg font-bold">
                  Update plan status
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {statusPlan.title || "Untitled plan"} · {getStudentName(statusPlan.student)}
                </p>
              </div>
              <StatusBadge value={statusPlan.status} />
            </div>

            <label className="mb-4 block text-sm font-semibold">
              New status
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                disabled={updatingStatus}
                className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 font-normal outline-none focus:border-one focus:ring-2 focus:ring-one/20"
              >
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-5 block text-sm font-semibold">
              Admin notes
              <textarea
                value={statusNotes}
                onChange={(event) => setStatusNotes(event.target.value)}
                rows={3}
                disabled={updatingStatus}
                className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-normal outline-none focus:border-one focus:ring-2 focus:ring-one/20"
                placeholder="Optional note for the student"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeStatus}
                disabled={updatingStatus}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStatus}
                disabled={updatingStatus || !nextStatus || statusUnchanged}
                className="rounded-lg bg-one px-4 py-2 text-sm font-semibold text-white hover:bg-one/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingStatus ? "Saving…" : "Save status"}
              </button>
            </div>
          </section>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deletePlan)}
        onClose={() => !deleting && setDeletePlan(null)}
        onConfirm={confirmDelete}
        title="Delete availability plan"
        description={`Are you sure you want to delete "${deletePlan?.title || "this plan"}"? This can't be undone.`}
      />
    </div>
  );
};

export default AvailabilityPlans;