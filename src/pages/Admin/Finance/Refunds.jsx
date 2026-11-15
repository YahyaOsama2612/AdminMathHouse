// Payment → Refunds & disputes (design: RepPages['pay-refunds'], Table 17 · H.37).
// API: GET/POST /api/admin/finance/refunds, PUT /:id, POST /:id/decide, POST /:id/close. Records only.
import toast from "react-hot-toast";
import { useState } from "react";
import { CheckCircle2, Hourglass, History, MessageSquareText, Pencil, Plus, Timer } from "lucide-react";
import api from "@/api/api";
import { Card, Modal, Pill } from "@/components/admin/kit";
import { Kpi, CsvButton, downloadCsv } from "@/pages/Admin/Reports/parts";
import { useFin, FinHead, RecordOnlyNote, LogList, Field, shortDate, todayIso, daysSince } from "./finKit";
import { useRun, LoadState, FTable, Mini, Chips, FormModal, Two, StudentPicker, matches, toastNeed , DeleteButton } from "./partsB";

const TYPES = ["Refund", "Package cancellation", "Session dispute", "Discount dispute"];
const STATUS = { review: ["Under review", "amber"], decided: ["Decided — tell the parent", "blue"], closed: ["Closed", "green"] };
const FIELDS = ["studentId", "studentName", "parentName", "type", "requestedOn", "amount", "policy", "evidence", "reviewer"];

export default function Refunds() {
  const { data, loading, error, reload } = useFin("/refunds");
  const [busy, run] = useRun(reload, { waiting: true });
  const [tab, setTab] = useState("open");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // { kind, row }
  const [f, setF] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const close = () => setModal(null);
  const open = (kind, row, init = {}) => { setF(init); setModal({ kind, row }); };

  const all = data?.refunds || [];
  const count = (s) => all.filter((r) => r.status === s).length;
  const notClosed = all.filter((r) => r.status !== "closed");
  const oldest = notClosed.length ? Math.max(...notClosed.map((r) => daysSince(r.requestedOn) ?? 0)) : null;
  const list = all.filter((r) => (tab === "all" || (tab === "open" ? r.status !== "closed" : r.status === tab))
    && matches(q, r.studentName, r.parentName, r.type, r.amount, r.policy, r.evidence, r.reviewer, r.decision, r.financialEffect));

  const saveTicket = () => {
    if (!f.studentId) return toast.error("Choose the student from the list");
    if (!f.amount?.trim()) return toastNeed("Amount / sessions");
    if (!f.requestedOn) return toastNeed("The request date");
    const body = Object.fromEntries(FIELDS.map((k) => [k, typeof f[k] === "string" ? f[k].trim() : f[k]]));
    body.studentId = body.studentId || null;
    run(() => (modal.row ? api.put(`/api/admin/finance/refunds/${modal.row.id}`, body) : api.post("/api/admin/finance/refunds", body)),
      modal.row ? "Ticket saved" : "Ticket opened", close);
  };
  const decide = () => {
    if (!f.decision?.trim()) return toastNeed("The written decision");
    run(() => api.post(`/api/admin/finance/refunds/${modal.row.id}/decide`, {
      decision: f.decision.trim(), financialEffect: f.financialEffect?.trim() || undefined, reviewer: f.reviewer?.trim() || undefined,
    }), "Decision recorded — tell the parent, then close the ticket", close);
  };
  const closeTicket = () => {
    if (!f.notifiedOn) return toastNeed("The date the parent was told");
    run(() => api.post(`/api/admin/finance/refunds/${modal.row.id}/close`, { notifiedOn: f.notifiedOn }), "Ticket closed", close);
  };
  const exportCsv = () => downloadCsv("refunds-disputes.csv", [
    ["Student", "Parent", "Type", "Requested", "Amount/sessions", "Policy", "Evidence", "Reviewer", "Decision", "Financial effect", "Notified", "Status"],
    ...list.map((r) => [r.studentName, r.parentName, r.type, r.requestedOn, r.amount, r.policy, r.evidence, r.reviewer, r.decision, r.financialEffect, r.notifiedOn, r.status]),
  ]);
  const blank = { studentId: null, studentName: "", parentName: "", type: "Refund", requestedOn: todayIso(), amount: "", policy: "", evidence: "", reviewer: "" };

  return (
    <div>
      <FinHead title="Refunds & Disputes" refLabel="Table 17 · H.37"
        sub="Refund requests, package cancellations, disputes on session counts or discounts. Each case links to the policy or contract, has a reviewer and a written decision. It is closed only after the parent is told and the financial effect is recorded.">
        <CsvButton onClick={exportCsv} />
        <button onClick={() => open("ticket", null, blank)} className="a-btn primary"><Plus size={15} /> New ticket</button>
      </FinHead>
      <RecordOnlyNote>This is a record. A decision here does not refund money or change any balance — apply the financial effect by hand, then write it on the ticket.</RecordOnlyNote>

      <LoadState loading={loading} error={error} data={data} reload={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Open tickets" value={count("review")} sub="Under review" bg="#fef3c7" fg="#b45309" icon={Hourglass} />
          <Kpi label="Decided" value={count("decided")} sub="Waiting to tell the parent" bg="#eff6ff" fg="#1d4ed8" icon={MessageSquareText} />
          <Kpi label="Closed" value={count("closed")} sub="Parent notified" bg="#f0fdf4" fg="#15803d" icon={CheckCircle2} />
          <Kpi label="Oldest open" value={oldest == null ? "—" : `${oldest} days`} sub="Since the request" icon={Timer} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
          <Chips value={tab} onChange={setTab} opts={[["open", "Open", notClosed.length], ["review", "Under review", count("review")], ["decided", "Decided", count("decided")], ["closed", "Closed", count("closed")], ["all", "All", all.length]]} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, parent, policy, decision…" className="a-inp !py-1.5 text-xs flex-1 min-w-[180px]" />
        </div>

        <Card title="Tickets" sub="Open a ticket’s history to see every step" bodyClass="px-2 pb-2">
          <FTable count={list.length} empty="No tickets here."
            heads={["Ticket", "Student / parent", "Requested", "Amount / sessions", "Policy / contract", "Evidence", "Reviewer", "Decision", "Notified", "Status", ""]}>
            {list.map((r) => (
              <tr key={r.id} className="a-tr align-top">
                <td className="a-td"><Pill tone={r.type === "Refund" ? "red" : "purple"}>{r.type}</Pill></td>
                <td className="a-td min-w-[140px]"><Two strong a={r.studentName} b={r.parentName} /></td>
                <td className="a-td text-gray-500 whitespace-nowrap">
                  {shortDate(r.requestedOn)}
                  {r.status !== "closed" && <p className="text-[11px] text-gray-400">{daysSince(r.requestedOn)} days ago</p>}
                </td>
                <td className="a-td font-bold text-gray-800 whitespace-nowrap">{r.amount}</td>
                <td className="a-td text-xs text-gray-600 min-w-[120px]">{r.policy || <span className="text-amber-600">Not linked yet</span>}</td>
                <td className="a-td text-xs text-gray-500 min-w-[120px] max-w-[200px]">{r.evidence || "—"}</td>
                <td className="a-td text-gray-600 whitespace-nowrap">{r.reviewer || "—"}</td>
                <td className="a-td text-xs text-gray-700 min-w-[160px] max-w-[240px]">
                  {r.decision || "—"}
                  {r.financialEffect && <p className="text-[11px] text-gray-400 mt-0.5">Effect: {r.financialEffect}</p>}
                </td>
                <td className="a-td text-gray-500 whitespace-nowrap">{shortDate(r.notifiedOn)}</td>
                <td className="a-td whitespace-nowrap"><Pill tone={STATUS[r.status]?.[1]}>{STATUS[r.status]?.[0] || r.status}</Pill></td>
                <td className="a-td">
                  <div className="flex items-center justify-end gap-1.5">
                    {r.status === "review" && <Mini tone="primary" onClick={() => open("decide", r, { decision: "", financialEffect: "", reviewer: r.reviewer || "" })}>Record decision</Mini>}
                    {r.status === "decided" && <Mini tone="green" onClick={() => open("close", r, { notifiedOn: todayIso() })}>Close</Mini>}
                    {r.status !== "closed" && (
                      <button onClick={() => open("ticket", r, Object.fromEntries(FIELDS.map((k) => [k, r[k] ?? (k === "studentId" ? null : "")])))} className="a-act" title="Edit" aria-label="Edit"><Pencil size={15} /></button>
                    )}
                    <button onClick={() => open("history", r)} className="a-act" title="History" aria-label="History"><History size={15} /></button>
                    <DeleteButton what={`ticket for ${r.studentName}`} busy={busy}
                      warning={r.status !== "review" ? "This ticket already has a decision — its decision and financial effect are removed too." : null}
                      onDelete={() => run(() => api.delete(`/api/admin/finance/refunds/${r.id}`), "Ticket deleted")} />
                  </div>
                </td>
              </tr>
            ))}
          </FTable>
        </Card>
      </LoadState>

      {modal?.kind === "ticket" && (
        <FormModal title={modal.row ? "Edit ticket" : "New refund / dispute ticket"} onClose={close} onSave={saveTicket} busy={busy} saveLabel={modal.row ? "Save" : "Open ticket"}>
          <Field label="Student" req>
            <StudentPicker value={{ studentId: f.studentId, studentName: f.studentName }} onChange={(v) => setF((s) => ({ ...s, ...v }))} />
          </Field>
          <Field label="Parent"><input value={f.parentName} onChange={set("parentName")} className="a-inp" /></Field>
          <Field label="Type" req>
            <select value={f.type} onChange={set("type")} className="a-inp">{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </Field>
          <Field label="Requested on" req><input type="date" value={f.requestedOn} onChange={set("requestedOn")} className="a-inp" /></Field>
          <Field label="Amount / sessions" req><input value={f.amount} onChange={set("amount")} placeholder="e.g. 1,150 EGP or 2 sessions" className="a-inp" /></Field>
          <Field label="Reviewer"><input value={f.reviewer} onChange={set("reviewer")} placeholder="Who reviews the case" className="a-inp" /></Field>
          <Field label="Policy / contract" span><input value={f.policy} onChange={set("policy")} placeholder="Which written rule applies" className="a-inp" /></Field>
          <Field label="Evidence" span><textarea rows={2} value={f.evidence} onChange={set("evidence")} placeholder="Messages, attendance log, receipts…" className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "decide" && (
        <FormModal title={`Decision — ${modal.row.studentName}`} onClose={close} onSave={decide} busy={busy} saveLabel="Save decision"
          intro={<Summary r={modal.row} note="Recording a decision does not move any money. Apply the financial effect by hand." />}>
          <Field label="Written decision" req span><textarea rows={3} value={f.decision} onChange={set("decision")} placeholder="e.g. Approved — refund 5 unused sessions (1,150 EGP)" className="a-inp" /></Field>
          <Field label="Financial effect" hint="e.g. refund by bank transfer / +2 sessions on the balance"><input value={f.financialEffect} onChange={set("financialEffect")} className="a-inp" /></Field>
          <Field label="Reviewer"><input value={f.reviewer} onChange={set("reviewer")} className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "close" && (
        <FormModal title={`Close — ${modal.row.studentName}`} onClose={close} onSave={closeTicket} busy={busy} saveLabel="Close ticket" wide={false}
          intro={<Summary r={modal.row} note="Close only after the parent has been told the decision. The ticket is then kept as a record." />}>
          <Field label="Parent notified on" req span><input type="date" value={f.notifiedOn} onChange={set("notifiedOn")} className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "history" && (
        <Modal title={`History — ${modal.row.studentName}`} onClose={close} actions={<button onClick={close} className="a-btn">Close</button>}>
          <Summary r={modal.row} />
          <LogList log={modal.row.log} />
        </Modal>
      )}
    </div>
  );
}

function Summary({ r, note }) {
  return (
    <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3 space-y-0.5">
      <p><b className="text-gray-800">{r.type}</b> · {r.amount} · requested {shortDate(r.requestedOn)}</p>
      {r.decision && <p className="text-gray-600">Decision: {r.decision}{r.financialEffect ? ` (effect: ${r.financialEffect})` : ""}</p>}
      {note && <p className="text-gray-400">{note}</p>}
    </div>
  );
}
