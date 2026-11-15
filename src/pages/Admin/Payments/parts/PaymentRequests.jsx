import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, ImageOff, RotateCcw, Search } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import { Card, Modal, PageHead, Pill, Stat, Tabs, refreshWaiting } from "@/components/admin/kit";

/* Payment request queues (wallet recharge, package purchase, content purchase) in the MathPortal design:
   page head, KPI row, Pending / Accepted / Rejected tabs, search bar, request table with a receipt
   preview and Approve / Reject decisions. Each page passes its endpoints and wording; the API calls
   are the same as before: GET `${endpoint}?page&limit&search`, POST `replyUrl(id)` with { action }. */

const STATUS = {
  pending: { tone: "amber", label: "Pending" },
  completed: { tone: "green", label: "Accepted" },
  rejected: { tone: "red", label: "Rejected" },
};

const money = (v) => {
  const n = Number(v);
  return `${Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v ?? "—"} EGP`;
};

const stamp = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const isPdf = (url) => /\.pdf(\?|#|$)/i.test(String(url || ""));

const studentName = (row) => [row.student?.firstname, row.student?.lastname].filter(Boolean).join(" ") || "—";

/** The uploaded receipt: image preview, or a link for PDFs / images that fail to load. */
function ReceiptView({ url }) {
  const [broken, setBroken] = useState(false);
  if (!url) return <p className="text-sm text-gray-400">No receipt was uploaded with this request.</p>;
  return (
    <div>
      {isPdf(url) || broken ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
          {broken ? <ImageOff className="mx-auto text-gray-300" size={28} /> : <FileText className="mx-auto text-gray-300" size={28} />}
          <p className="text-sm text-gray-500 mt-2">{broken ? "The receipt can’t be shown here." : "The receipt is a PDF file."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
          <img src={url} alt="Payment receipt" onError={() => setBroken(true)} className="w-full max-h-[60vh] object-contain rounded-lg" />
        </div>
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-one hover:underline mt-2">
        <ExternalLink size={13} /> Open the original
      </a>
    </div>
  );
}

const CHECKS = [
  ["payer", "Payer / student name matches"],
  ["amount", "Amount matches the price"],
  ["date", "Date and method are clear"],
  ["ref", "Transaction number present"],
  ["doc", "Receipt is readable"],
];

export default function PaymentRequests({
  title,
  sub,
  endpoint,
  replyUrl,
  noun = "request",
  itemHeader = "Request",
  renderItem,
  successMsg,
  confirmText,
  headless = false, // inside Receipts & Activation the hub shows the page title and the tabs
}) {
  const [activeTab, setActiveTab] = useState("pending");
  const [checks, setChecks] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Approve / reject confirmation and receipt preview
  const [modal, setModal] = useState({ isOpen: false, requestId: null, actionType: "", row: null });
  const [preview, setPreview] = useState(null);

  const { postData, loading: actionLoading } = usePost();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const queryParams = new URLSearchParams({
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  }).toString();

  const { data, loading: getLoading, error, refetch } = useGet(`${endpoint}?${queryParams}`);

  const responseData = data?.data?.data || { pending: [], accepted: [], rejected: [] };
  const paginationData = data?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const rows = responseData[activeTab] || [];
  const pending = responseData.pending || [];
  const firstLoad = getLoading && !data;
  const partial = (paginationData.totalPages || 1) > 1;

  const handleOpenModal = (row, actionType) => {
    setPreview(null);
    setModal({ isOpen: true, requestId: row.id, actionType, row });
  };
  const closeModal = () => setModal({ isOpen: false, requestId: null, actionType: "", row: null });

  const handleConfirmAction = async () => {
    try {
      const body = { action: modal.actionType };
      await postData(body, replyUrl(modal.requestId), modal.actionType === "approve" ? successMsg.approve : successMsg.reject);
      closeModal();
      refetch();
      refreshWaiting();
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  const tabs = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
  ];
  const heads = ["Date", "Student", itemHeader, "Amount", "Receipt", ...(activeTab === "pending" ? ["Checks"] : []), "Status", activeTab === "pending" ? "Decision" : activeTab === "rejected" ? "Reason" : ""];
  // Design (Task H §4): approve only after every check on the receipt is ticked. Kept in the page, not saved.
  const ready = (row) => CHECKS.every(([k]) => checks[row.id]?.[k]);
  const toggleCheck = (id, k) => setChecks((c) => ({ ...c, [id]: { ...c[id], [k]: !c[id]?.[k] } }));
  const exportCsv = () => {
    const esc = (v) => (/[",\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
    const lines = [["Date", "Student", "Email", "Amount", "Status", "Reason"], ...rows.map((r) => [r.createdAt, studentName(r), r.student?.email, r.amount, r.status, r.reason])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + lines.map((l) => l.map(esc).join(",")).join("\n")], { type: "text/csv" }));
    a.download = `${noun.replace(/\s+/g, "-")}s-${activeTab}.csv`;
    a.click();
  };

  return (
    <div>
      {headless ? <p className="text-xs text-gray-400 mb-3 -mt-2">{sub}</p> : <PageHead title={title} sub={sub} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Waiting for review" value={firstLoad ? "…" : pending.length} color={pending.length ? "#b45309" : undefined} sub={partial ? "On this page" : "Receipts to check"} />
        <Stat label="Amount waiting" value={firstLoad ? "…" : money(pending.reduce((a, r) => a + (Number(r.amount) || 0), 0))} sub={partial ? "On this page" : "Pending requests"} />
        <Stat label="Accepted" value={firstLoad ? "…" : (responseData.accepted || []).length} color="#15803d" sub={partial ? "On this page" : undefined} />
        <Stat label="All requests" value={firstLoad ? "…" : paginationData.total} sub={debouncedSearch ? "Matching the search" : "Every status"} />
      </div>

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student name, email or phone…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-white outline-none focus:border-one focus:ring-2 focus:ring-one/10"
          />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{paginationData.total} total</span>
        <button type="button" onClick={exportCsv} disabled={!rows.length} className="a-btn !py-2">Export CSV</button>
      </div>

      {error ? (
        <Card>
          <p className="font-bold text-gray-800">The requests could not be loaded</p>
          <p className="text-sm text-gray-500 mb-3">{String(error)}</p>
          <button onClick={refetch} className="a-btn"><RotateCcw size={15} /> Try again</button>
        </Card>
      ) : (
        <Card bodyClass="" className={`transition-opacity ${getLoading && data ? "opacity-60" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>{heads.map((h, i) => <th key={i} className="a-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {firstLoad ? (
                  <tr><td colSpan={heads.length} className="p-4"><div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skel h-10"></div>)}</div></td></tr>
                ) : rows.length ? (
                  rows.map((row) => {
                    const st = STATUS[row.status] || STATUS[activeTab === "accepted" ? "completed" : activeTab] || { tone: "gray", label: row.status };
                    return (
                      <tr key={row.id} className="a-tr align-top">
                        <td className="a-td text-gray-500 whitespace-nowrap">{stamp(row.createdAt)}</td>
                        <td className="a-td">
                          <p className="font-bold text-gray-800">{studentName(row)}</p>
                          {row.student?.nickname && <p className="text-[11px] text-gray-400">@{row.student.nickname}</p>}
                          <p className="text-[11px] text-gray-500 break-all">{row.student?.email || "—"}</p>
                          {row.student?.phone && <p className="text-[11px] text-gray-500">{row.student.phone}</p>}
                        </td>
                        <td className="a-td text-gray-600">{renderItem(row)}</td>
                        <td className="a-td font-extrabold text-gray-800 whitespace-nowrap">{money(row.amount)}</td>
                        <td className="a-td">
                          {row.receiptImg ? (
                            <button onClick={() => setPreview(row)} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-red-50 text-one hover:bg-red-100 whitespace-nowrap">
                              <FileText size={13} /> View receipt
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No receipt</span>
                          )}
                        </td>
                        {activeTab === "pending" && (
                          <td className="a-td min-w-[210px]">
                            <div className="space-y-1">
                              {CHECKS.map(([k, l]) => (
                                <label key={k} className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer select-none">
                                  <input type="checkbox" checked={!!checks[row.id]?.[k]} onChange={() => toggleCheck(row.id, k)} className="accent-[#7d0a0a]" />{l}
                                </label>
                              ))}
                            </div>
                          </td>
                        )}
                        <td className="a-td"><Pill tone={st.tone}>{st.label}</Pill></td>
                        <td className="a-td">
                          {activeTab === "pending" ? (
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => handleOpenModal(row, "approve")} disabled={!ready(row)} title={ready(row) ? "Approve and activate" : "Tick every check first"}
                                className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg text-white bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed">Approve</button>
                              <button onClick={() => handleOpenModal(row, "reject")} className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50">Reject</button>
                            </div>
                          ) : activeTab === "rejected" ? (
                            <span className="text-xs text-gray-500">{row.reason || "—"}</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={heads.length} className="py-14 text-center">
                      <p className="font-bold text-gray-700">{debouncedSearch ? "Nothing matches" : `No ${activeTab} ${noun}s`}</p>
                      <p className="text-sm text-gray-400">{debouncedSearch ? "Try another search." : partial ? "Other pages may have some — use the pager below." : activeTab === "pending" ? "New requests from students show up here." : ""}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <span><b className="text-gray-800">{paginationData.total}</b> requests</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:border-one cursor-pointer"
              >
                {[10, 20, 50, 100].map((size) => <option key={size} value={size}>Show {size}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="a-act disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-semibold">Page <b className="text-gray-800">{page}</b> of {paginationData.totalPages || 1}</span>
              <button disabled={page >= (paginationData.totalPages || 1)} onClick={() => setPage(page + 1)} className="a-act disabled:opacity-30" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </Card>
      )}

      {/* Receipt preview */}
      {preview && (
        <Modal
          wide
          title="Payment receipt"
          onClose={() => setPreview(null)}
          actions={preview.status === "pending" ? (
            <>
              <button onClick={() => handleOpenModal(preview, "reject")} className="a-btn !text-red-600 !border-red-200 hover:!bg-red-50">Reject</button>
              <button onClick={() => handleOpenModal(preview, "approve")} disabled={!ready(preview)} title={ready(preview) ? "" : "Tick every check in the list first"} className="a-btn primary disabled:opacity-40" style={{ background: "#15803d", borderColor: "#15803d" }}>Approve</button>
            </>
          ) : (
            <button onClick={() => setPreview(null)} className="a-btn">Close</button>
          )}
        >
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-3">
            <b className="text-gray-800">{studentName(preview)}</b>
            <span className="font-extrabold text-gray-800">{money(preview.amount)}</span>
            <span className="text-gray-400">{stamp(preview.createdAt)}</span>
          </div>
          <ReceiptView url={preview.receiptImg} />
          {preview.status === "pending" && <p className="text-xs text-gray-500 mt-3">Check the amount, the receiving account and the reference before approving.</p>}
        </Modal>
      )}

      {/* Approve / reject confirmation */}
      {modal.isOpen && (
        <Modal
          title={modal.actionType === "approve" ? "Approve request" : "Reject request"}
          onClose={() => !actionLoading && closeModal()}
          actions={
            <>
              <button onClick={closeModal} disabled={actionLoading} className="a-btn">Cancel</button>
              <button
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className={`a-btn ${modal.actionType === "approve" ? "primary" : "danger"}`}
                style={modal.actionType === "approve" ? { background: "#15803d", borderColor: "#15803d" } : undefined}
              >
                {actionLoading ? "Processing…" : modal.actionType === "approve" ? "Approve" : "Reject"}
              </button>
            </>
          }
        >
          <p className="mb-3">{modal.actionType === "approve" ? confirmText.approve : confirmText.reject}</p>
          {modal.row && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-1">
              <p className="font-bold text-gray-800">{studentName(modal.row)}</p>
              <div className="text-gray-600">{renderItem(modal.row)}</div>
              <p className="font-extrabold text-gray-800">{money(modal.row.amount)}</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
