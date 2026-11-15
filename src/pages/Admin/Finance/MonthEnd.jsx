// Payment → Month-end close (MathPortal design: pay-close · Table 23 · H.38).
// API: GET /api/admin/finance/close?period, PUT /close/items, POST /close/lock.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, HelpCircle, Lock, Receipt, Users, Wallet } from "lucide-react";
import api from "@/api/api";
import { Modal, Pill, SkelRows, errText, refreshWaiting } from "@/components/admin/kit";
import { CsvButton, Kpi, RCard, downloadCsv } from "@/pages/Admin/Reports/parts";
import { Field, FinHead, egp, monthLabel, shortDate, thisMonth, useFin } from "./finKit";
import { LoadError, ReloadError, Switch, Table, prevMonth, useAct } from "./partsA";

const shiftMonth = (p, n) => {
  const d = new Date(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const totalsText = (t) => (t ? `Collected ${egp(t.collected)} · Expenses ${egp(t.expenses)} · Teacher dues ${egp(t.teacherDue)} · Unmatched open ${egp(t.unmatchedOpen)}` : "—");

export default function MonthEnd() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(prevMonth);
  const cl = useFin(`/close?period=${period}`);
  const d = cl.data && cl.data.period === period ? cl.data : null;
  const items = d?.items || [];
  const locked = !!d?.locked;
  const version = d?.versions?.find((v) => v.period === period);
  const [evidence, setEvidence] = useState({});
  const [busy, run] = useAct();
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { setEvidence(Object.fromEntries((d?.items || []).map((i) => [i.key, i.evidence || ""]))); }, [d]);

  const put = async (item, patch, ok) => {
    if (await run(item.key, () => api.put("/api/admin/finance/close/items", { period, itemKey: item.key, ...patch }), ok)) cl.reload();
  };
  const saveEvidence = (item) => {
    const v = (evidence[item.key] || "").trim();
    if (v === (item.evidence || "")) return;
    put(item, { evidence: v }, "Evidence saved");
  };

  const monthOver = period < thisMonth();
  const allApproved = items.length > 0 && items.every((i) => i.approvedAt);
  const canClose = !locked && allApproved && monthOver;
  const why = locked ? "" : !monthOver ? `${monthLabel(period)} isn't over yet — it can be closed from ${monthLabel(shiftMonth(period, 1))} 1.`
    : !allApproved ? `${items.filter((i) => !i.approvedAt).length} of ${items.length} items still need the management approval.` : "Everything is reviewed and approved.";

  const exportCsv = () => downloadCsv(`month-end-${period}.csv`, [
    ["Item", "Owner", "Open items", "Evidence", "Reviewed by", "Reviewed on", "Approved by", "Approved on"],
    ...items.map((i) => [i.label, i.owner, i.open, i.evidence || "", i.reviewedBy || "", i.reviewedAt ? String(i.reviewedAt).slice(0, 10) : "", i.approvedBy || "", i.approvedAt ? String(i.approvedAt).slice(0, 10) : ""]),
  ]);

  return (
    <div>
      <FinHead title="Month-End Close" refLabel="Table 23 · H.38"
        sub="Cut-off, review and approval for the month. Each item needs zero open items, an accounts review and a management approval. Closing saves a read-only version; any later change is a documented correcting entry.">
        <CsvButton onClick={exportCsv} />
      </FinHead>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-500">Month</span>
        <button onClick={() => setPeriod((p) => shiftMonth(p, -1))} className="a-act" aria-label="Previous month"><ChevronLeft size={16} /></button>
        <input type="month" value={period} max={thisMonth()} onChange={(e) => e.target.value && e.target.value <= thisMonth() && setPeriod(e.target.value)} className="a-inp !w-auto !py-1.5 text-sm" aria-label="Month" />
        <button onClick={() => setPeriod((p) => shiftMonth(p, 1))} disabled={period >= thisMonth()} className="a-act disabled:opacity-40" aria-label="Next month"><ChevronRight size={16} /></button>
        {period !== prevMonth() && <button onClick={() => setPeriod(prevMonth())} className="a-chip">Last month</button>}
        {d && (locked ? <Pill tone="gray"><Lock size={11} /> Closed</Pill> : <Pill tone="amber">Open</Pill>)}
      </div>

      {!d && cl.loading ? <SkelRows n={7} />
        : !d && cl.error ? <LoadError error={cl.error} onRetry={cl.reload} />
        : d && (
          <>
            {locked && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 mb-4 text-sm text-green-800 flex items-start gap-2">
                <Lock size={16} className="mt-0.5 shrink-0" />
                <p><b>{monthLabel(period)} is closed.</b> Version {version?.version ?? 1} approved{version?.approvedAt ? ` on ${shortDate(version.approvedAt)}` : ""}{version?.approvedBy ? ` by ${version.approvedBy}` : ""}.
                  {" "}Everything dated in it is read-only — fix mistakes with a correcting entry dated in an open month.</p>
              </div>
            )}
            <ReloadError error={cl.error} onRetry={cl.reload} />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              <Kpi label="Collected" value={egp(d.totals?.collected)} sub="Completed payments in the month" bg="#f0fdf4" fg="#15803d" icon={Wallet} />
              <Kpi label="Expenses" value={egp(d.totals?.expenses)} sub="Expense lines dated in the month" bg="#fdecec" fg="#7d0a0a" icon={Receipt} />
              <Kpi label="Teacher dues" value={egp(d.totals?.teacherDue)} sub="Saved settlements for the month" bg="#eff6ff" fg="#1d4ed8" icon={Users} />
              <Kpi label="Unmatched still open" value={egp(d.totals?.unmatchedOpen)} sub="Received up to month end" bg="#fef3c7" fg="#b45309" icon={HelpCircle} />
            </div>

            <RCard className="mb-4" title={`Closing checklist — ${monthLabel(period)}`} sub="Open items are counted live from each page; “Fix →” takes you there. Review first, then management approval.">
              <Table minW={1000} heads={["Closing item", "Open items", "Evidence", "Accounts review", "Management approval", "Status"]}>
                {items.map((i) => {
                  const reviewed = !!i.reviewedAt, approved = !!i.approvedAt;
                  const apprBlock = !approved && (!reviewed ? "Needs the accounts review first" : i.open > 0 ? `${i.open} open item${i.open === 1 ? "" : "s"} left — fix them first` : "");
                  return (
                    <tr key={i.key} className="a-tr">
                      <td className="a-td"><p className="font-bold text-gray-800">{i.label}</p><p className="text-[11px] text-gray-400">{i.owner}</p></td>
                      <td className="a-td whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold ${i.open > 0 ? "text-red-600" : "text-green-700"}`}>{i.open}</span>
                          {i.open > 0 && i.route && <button onClick={() => navigate(i.route)} className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 bg-white hover:border-one hover:text-one">Fix →</button>}
                        </div>
                      </td>
                      <td className="a-td">
                        <input value={evidence[i.key] ?? ""} disabled={locked || busy === i.key} onChange={(e) => setEvidence((x) => ({ ...x, [i.key]: e.target.value }))}
                          onBlur={() => saveEvidence(i)} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          placeholder={locked ? "" : "Link / file / note"} className="a-inp !py-1.5 text-xs min-w-[180px]" aria-label={`Evidence for ${i.label}`} />
                      </td>
                      <td className="a-td whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Switch on={reviewed} disabled={locked || busy === i.key} label={`Accounts review for ${i.label}`}
                            title={reviewed && approved ? "Un-reviewing also removes the approval" : ""}
                            onChange={(v) => put(i, { reviewed: v }, v ? "Marked as reviewed" : "Review removed")} />
                          <span className="text-[11px] text-gray-500">{reviewed ? <>{i.reviewedBy || "Reviewed"}<br /><span className="text-gray-400">{shortDate(i.reviewedAt)}</span></> : "Not reviewed"}</span>
                        </div>
                      </td>
                      <td className="a-td whitespace-nowrap">
                        <div className="flex items-center gap-2" title={apprBlock || ""}>
                          <Switch on={approved} disabled={locked || busy === i.key || !!apprBlock} title={apprBlock || ""} label={`Management approval for ${i.label}`}
                            onChange={(v) => put(i, { approved: v }, v ? "Approved" : "Approval removed")} />
                          <span className="text-[11px] text-gray-500">{approved ? <>{i.approvedBy || "Approved"}<br /><span className="text-gray-400">{shortDate(i.approvedAt)}</span></> : apprBlock ? <span className="text-gray-400">{apprBlock}</span> : "Not approved"}</span>
                        </div>
                      </td>
                      <td className="a-td whitespace-nowrap">
                        {approved ? <Pill tone="green">Approved</Pill> : i.open > 0 ? <Pill tone="red">Open items</Pill> : reviewed ? <Pill tone="blue">Reviewed</Pill> : <Pill tone="amber">Waiting review</Pill>}
                      </td>
                    </tr>
                  );
                })}
              </Table>
              {!locked && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <p className="text-xs text-gray-500 max-w-xl">{why} Closing makes the month read-only: reconciliation lines, expenses, teacher settlements and this checklist can't be changed afterwards — later fixes are correcting entries.</p>
                  <button onClick={() => setConfirm(true)} disabled={!canClose} title={canClose ? "" : why} className="a-btn primary"><Lock size={15} /> Close {monthLabel(period)}</button>
                </div>
              )}
            </RCard>

            <RCard title="Approved versions" sub="Read-only snapshots saved when a month is closed">
              <Table minW={760} heads={["Period", "Version", "Approved on", "Approved by", "Totals", "Note"]} empty={d.versions?.length ? null : "No month closed yet."}>
                {(d.versions || []).map((v) => (
                  <tr key={v.id} className="a-tr">
                    <td className="a-td font-bold text-gray-800 whitespace-nowrap">{monthLabel(v.period)}</td>
                    <td className="a-td">v{v.version}</td>
                    <td className="a-td text-gray-500 whitespace-nowrap">{shortDate(v.approvedAt)}</td>
                    <td className="a-td text-gray-600">{v.approvedBy || "—"}</td>
                    <td className="a-td text-xs text-gray-500 min-w-[260px]">{totalsText(v.totals)}</td>
                    <td className="a-td text-xs text-gray-500">{v.note || "—"}</td>
                  </tr>
                ))}
              </Table>
            </RCard>
          </>
        )}

      {confirm && <LockModal period={period} totals={d?.totals} onClose={() => setConfirm(false)} onDone={() => { setConfirm(false); cl.reload(); refreshWaiting(); }} />}
    </div>
  );
}

function LockModal({ period, totals, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.post("/api/admin/finance/close/lock", { period, note: note.trim() });
      toast.success(r.data?.data?.message || `${monthLabel(period)} closed`);
      onDone();
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };
  return (
    <Modal title={`Close ${monthLabel(period)}?`} onClose={onClose}
      actions={<>
        <button onClick={onClose} className="a-btn">Cancel</button>
        <button onClick={save} disabled={saving} className="a-btn primary"><Lock size={15} /> {saving ? "Closing…" : `Close ${monthLabel(period)}`}</button>
      </>}>
      <p className="mb-2">This saves version 1 of the month with these totals and locks it:</p>
      <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3">{totalsText(totals)}</p>
      <p className="mb-3 text-xs text-gray-500">After closing, reconciliation lines, expenses, teacher settlements and the checklist dated in {monthLabel(period)} are read-only. It can't be reopened here — any later fix is a correcting entry dated in an open month.</p>
      <Field label="Note (optional)"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="a-inp" placeholder="e.g. Approved in the finance meeting" /></Field>
    </Modal>
  );
}
