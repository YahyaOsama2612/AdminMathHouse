// Payment → Adjustments & discounts (design: RepPages['pay-adjust'], Table 14 · H.33).
// API: GET/POST /api/admin/finance/adjustments, POST /:id/decide, POST /:id/implemented. Records only.
import toast from "react-hot-toast";
import { useState } from "react";
import { CheckCircle2, Clock, History, Plus, XCircle, CalendarCheck } from "lucide-react";
import api from "@/api/api";
import { Card, Modal, Pill } from "@/components/admin/kit";
import { Kpi, CsvButton, downloadCsv } from "@/pages/Admin/Reports/parts";
import { useFin, FinHead, RecordOnlyNote, LogList, Field, shortDate, todayIso, thisMonth } from "./finKit";
import { useRun, LoadState, FTable, Mini, Chips, FormModal, Two, StudentPicker, PackageSelect, matches, toastNeed , DeleteButton } from "./partsB";

const TYPES = ["Discount", "Price change", "Extension", "Session waiver", "Package change"];
const STATUS = { pending: ["Waiting for approval", "amber"], approved: ["Approved", "green"], rejected: ["Rejected", "gray"] };
const BLANK = { studentId: null, studentName: "", packageLabel: "", type: "Discount", beforeValue: "", afterValue: "", reason: "", requestedBy: "", impact: "" };

export default function Adjustments() {
  const { data, loading, error, reload } = useFin("/adjustments");
  const [busy, run] = useRun(reload, { waiting: true });
  const [tab, setTab] = useState("pending");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // { kind, row }
  const [f, setF] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));
  const close = () => setModal(null);
  const open = (kind, row, init = {}) => { setF(init); setModal({ kind, row }); };

  const all = data?.adjustments || [];
  const count = (s) => all.filter((a) => a.status === s).length;
  const month = thisMonth();
  const list = all.filter((a) => (tab === "all" || a.status === tab) && (type === "all" || a.type === type)
    && matches(q, a.studentName, a.packageLabel, a.reason, a.requestedBy, a.approvedBy, a.approvalRef, a.impact));

  const save = () => {
    if (!f.studentId) return toast.error("Choose the student from the list");
    const need = [["studentName", "Student"], ["beforeValue", "Value before"], ["afterValue", "Value after"], ["reason", "Business reason"], ["requestedBy", "Requested by"]].find(([k]) => !String(f[k] || "").trim());
    if (need) return toastNeed(need[1]);
    run(() => api.post("/api/admin/finance/adjustments", { ...f, studentId: f.studentId || null }), "Request recorded — waiting for written approval", close);
  };
  const approve = () => {
    if (!f.approvedBy?.trim() || !f.approvalRef?.trim()) return toastNeed("Approved by and the written approval reference");
    run(() => api.post(`/api/admin/finance/adjustments/${modal.row.id}/decide`, {
      status: "approved", approvedBy: f.approvedBy.trim(), approvalRef: f.approvalRef.trim(), note: f.note?.trim() || undefined, implementedOn: f.implementedOn || null,
    }), "Approved", close);
  };
  const reject = () => {
    if (!f.note?.trim()) return toastNeed("The reason for rejecting");
    run(() => api.post(`/api/admin/finance/adjustments/${modal.row.id}/decide`, { status: "rejected", note: f.note.trim() }), "Rejected", close);
  };
  const implemented = () => {
    if (!f.implementedOn) return toastNeed("The date");
    run(() => api.post(`/api/admin/finance/adjustments/${modal.row.id}/implemented`, { implementedOn: f.implementedOn }), "Marked as implemented", close);
  };
  const exportCsv = () => downloadCsv("adjustments-log.csv", [
    ["Student", "Package", "Type", "Before", "After", "Reason", "Requested by", "Approved by", "Approval ref", "Implemented", "Impact", "Status", "Decision note", "History"],
    ...list.map((a) => [a.studentName, a.packageLabel, a.type, a.beforeValue, a.afterValue, a.reason, a.requestedBy, a.approvedBy, a.approvalRef, a.implementedOn, a.impact, a.status, a.decisionNote, (a.log || []).map((l) => `${String(l.at).slice(0, 10)} ${l.by}: ${l.text}`).join(" | ")]),
  ]);

  return (
    <div>
      <FinHead title="Adjustments & Discounts" refLabel="Table 14 · H.33"
        sub="Every price change, discount, extension, session waiver or package change is a request with a before/after value, a business reason, the requester and a written approval reference. Verbal approval is not accepted. Nothing is edited silently.">
        <CsvButton onClick={exportCsv} />
        <button onClick={() => open("new", null, { ...BLANK })} className="a-btn primary"><Plus size={15} /> New request</button>
      </FinHead>
      <RecordOnlyNote />

      <LoadState loading={loading} error={error} data={data} reload={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Waiting for approval" value={count("pending")} sub="Not applied yet" bg="#fef3c7" fg="#b45309" icon={Clock} />
          <Kpi label="Approved" value={count("approved")} sub="With written approval" bg="#f0fdf4" fg="#15803d" icon={CheckCircle2} />
          <Kpi label="Rejected" value={count("rejected")} sub="Kept on record" bg="#f3f4f6" fg="#475569" icon={XCircle} />
          <Kpi label="Approved this month" value={all.filter((a) => a.status === "approved" && String(a.decidedAt || "").slice(0, 7) === month).length} sub={`${count("approved") - all.filter((a) => a.status === "approved" && a.implementedOn).length} approved, not implemented yet`} icon={CalendarCheck} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
          <Chips value={tab} onChange={setTab} opts={[["pending", "Pending", count("pending")], ["approved", "Approved", count("approved")], ["rejected", "Rejected", count("rejected")], ["all", "All", all.length]]} />
          <select value={type} onChange={(e) => setType(e.target.value)} className="a-inp !w-auto !py-1.5 text-xs">
            <option value="all">All types</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, package, reason, people…" className="a-inp !py-1.5 text-xs flex-1 min-w-[180px]" />
        </div>

        <Card title="Requests" sub="Open a row’s history to see every step" bodyClass="px-2 pb-2">
          <FTable count={list.length} empty="No requests here."
            heads={["Student / package", "Type", "Before → After", "Reason", "Requested by", "Approved by", "Implemented", "Impact", "Status", ""]}>
            {list.map((a) => (
              <tr key={a.id} className="a-tr align-top">
                <td className="a-td min-w-[150px]"><Two strong a={a.studentName} b={a.packageLabel} /></td>
                <td className="a-td"><Pill tone="blue">{a.type}</Pill></td>
                <td className="a-td whitespace-nowrap"><span className="text-gray-500">{a.beforeValue}</span> <span className="text-gray-300">→</span> <b className="text-gray-800">{a.afterValue}</b></td>
                <td className="a-td text-xs text-gray-600 min-w-[160px] max-w-[240px]">{a.reason}</td>
                <td className="a-td text-gray-600 whitespace-nowrap">{a.requestedBy}<p className="text-[11px] text-gray-400">{shortDate(a.createdAt)}</p></td>
                <td className="a-td whitespace-nowrap">
                  {a.approvedBy ? <Two a={a.approvedBy} b={a.approvalRef ? `Ref: ${a.approvalRef}` : null} /> : <span className="text-gray-400">—</span>}
                </td>
                <td className="a-td text-gray-500 whitespace-nowrap">{a.implementedOn ? shortDate(a.implementedOn) : "—"}</td>
                <td className="a-td text-xs text-gray-600 min-w-[110px]">{a.impact || "—"}</td>
                <td className="a-td whitespace-nowrap">
                  <Pill tone={STATUS[a.status]?.[1]}>{STATUS[a.status]?.[0] || a.status}</Pill>
                  {a.status === "rejected" && a.decisionNote && <p className="text-[11px] text-gray-400 mt-1 max-w-[180px] whitespace-normal">{a.decisionNote}</p>}
                </td>
                <td className="a-td">
                  <div className="flex items-center justify-end gap-1.5">
                    {a.status === "pending" && (
                      <>
                        <Mini tone="green" onClick={() => open("approve", a, { approvedBy: "", approvalRef: "", note: "", implementedOn: "" })}>Approve</Mini>
                        <Mini tone="danger" onClick={() => open("reject", a, { note: "" })}>Reject</Mini>
                      </>
                    )}
                    {a.status === "approved" && !a.implementedOn && <Mini onClick={() => open("implemented", a, { implementedOn: todayIso() })}>Mark implemented</Mini>}
                    <button onClick={() => open("history", a)} className="a-act" title="History" aria-label="History"><History size={15} /></button>
                    <DeleteButton what={`request for ${a.studentName}`} busy={busy}
                      warning={a.status !== "pending" ? `This request is ${a.status} — its approval record and history are removed too.` : null}
                      onDelete={() => run(() => api.delete(`/api/admin/finance/adjustments/${a.id}`), "Request deleted")} />
                  </div>
                </td>
              </tr>
            ))}
          </FTable>
        </Card>
      </LoadState>

      {modal?.kind === "new" && (
        <FormModal title="New adjustment request" onClose={close} onSave={save} busy={busy} saveLabel="Submit for approval">
          <Field label="Student" req>
            <StudentPicker value={{ studentId: f.studentId, studentName: f.studentName }} onChange={(v) => setF((s) => ({ ...s, ...v }))} />
          </Field>
          <Field label="Package"><PackageSelect value={f.packageLabel} onChange={(v) => setF((s) => ({ ...s, packageLabel: v }))} /></Field>
          <Field label="Type" req>
            <select value={f.type} onChange={set("type")} className="a-inp">{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </Field>
          <Field label="Requested by" req><input value={f.requestedBy} onChange={set("requestedBy")} placeholder="Name & team" className="a-inp" /></Field>
          <Field label="Value before" req><input value={f.beforeValue} onChange={set("beforeValue")} placeholder="e.g. 2,400 EGP" className="a-inp" /></Field>
          <Field label="Value after" req><input value={f.afterValue} onChange={set("afterValue")} placeholder="e.g. 2,000 EGP" className="a-inp" /></Field>
          <Field label="Business reason" req span><textarea rows={2} value={f.reason} onChange={set("reason")} className="a-inp" /></Field>
          <Field label="Impact on revenue / sessions" span><input value={f.impact} onChange={set("impact")} placeholder="e.g. −400 EGP revenue · +1 session" className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "approve" && (
        <FormModal title={`Approve — ${modal.row.studentName}`} onClose={close} onSave={approve} busy={busy} saveLabel="Approve"
          intro={<Summary a={modal.row} note="Approving records the decision only. Apply the change by hand in the student's account." />}>
          <Field label="Approved by" req><input value={f.approvedBy} onChange={set("approvedBy")} placeholder="Name / role" className="a-inp" /></Field>
          <Field label="Written approval reference" req hint="Email / ticket number — verbal approval is not accepted">
            <input value={f.approvalRef} onChange={set("approvalRef")} className="a-inp" />
          </Field>
          <Field label="Implemented on" hint="Leave empty if it is not applied yet"><input type="date" value={f.implementedOn} onChange={set("implementedOn")} className="a-inp" /></Field>
          <Field label="Note"><input value={f.note} onChange={set("note")} className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "reject" && (
        <FormModal title={`Reject — ${modal.row.studentName}`} onClose={close} onSave={reject} busy={busy} saveLabel="Reject" intro={<Summary a={modal.row} note="The request is kept on record." />}>
          <Field label="Reason for rejecting" req span><textarea rows={3} value={f.note} onChange={set("note")} className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "implemented" && (
        <FormModal title="Mark as implemented" onClose={close} onSave={implemented} busy={busy} saveLabel="Save" wide={false}
          intro={<Summary a={modal.row} note="Use the date the change was applied by hand in the student's account." />}>
          <Field label="Implemented on" req span><input type="date" value={f.implementedOn} onChange={set("implementedOn")} className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "history" && (
        <Modal title={`History — ${modal.row.studentName}`} onClose={close} actions={<button onClick={close} className="a-btn">Close</button>}>
          <Summary a={modal.row} />
          <LogList log={modal.row.log} />
        </Modal>
      )}
    </div>
  );
}

function Summary({ a, note }) {
  return (
    <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3 space-y-0.5">
      <p><b className="text-gray-800">{a.type}</b>{a.packageLabel ? ` · ${a.packageLabel}` : ""} · {a.beforeValue} → <b>{a.afterValue}</b></p>
      <p className="text-gray-500">{a.reason}</p>
      {note && <p className="text-gray-400">{note}</p>}
    </div>
  );
}
