// Payment → Unmatched receipts (MathPortal design: pay-unmatched · Table 13 · H.32).
// API: GET/POST/PUT /api/admin/finance/unmatched, POST …/:id/resolve; GET …/accounts for the account select.
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertOctagon, CheckCircle2, HelpCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import api from "@/api/api";
import { Modal, Pill, SkelRows, errText, refreshWaiting } from "@/components/admin/kit";
import { CsvButton, Kpi, RCard, downloadCsv } from "@/pages/Admin/Reports/parts";
import { Field, FinHead, egp, shortDate, todayIso, useFin } from "./finKit";
import { LoadError, ReloadError, StudentPicker, Table, dayOffset, toInt } from "./partsA";

const ISSUES = ["Transfer without student name", "Receipt without reference", "Amount does not match any package", "Arrived on a different account", "Possible duplicate"];

export default function Unmatched() {
  const um = useFin("/unmatched");
  const acc = useFin("/accounts");
  const accounts = acc.data?.accounts || [];
  const cases = useMemo(() => um.data?.cases || [], [um.data]);
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // { case? }
  const [resolving, setResolving] = useState(null);
  const [removing, setRemoving] = useState(null); // case waiting for delete confirmation
  const [deleting, setDeleting] = useState(false);
  const today = todayIso();

  const deleteCase = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/admin/finance/unmatched/${removing.id}`);
      toast.success("Case deleted");
      setRemoving(null);
      changed();
    } catch (e) {
      toast.error(errText(e, "Could not delete the case"), { duration: 6000 });
    } finally {
      setDeleting(false);
    }
  };

  const open = cases.filter((c) => c.status === "open");
  const late = open.filter((c) => c.dueOn && c.dueOn < today);
  const resolved = cases.length - open.length;
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return cases.filter((c) => (filter === "all" || c.status === filter) && (!s || [c.payer, c.possibleStudent, c.evidence, c.issue, c.owner, c.accountName, c.resolution, c.matchedStudentName, String(c.amount)]
      .some((v) => String(v || "").toLowerCase().includes(s))));
  }, [cases, filter, q]);

  const changed = () => { um.reload(); refreshWaiting(); };
  const exportCsv = () => downloadCsv("unmatched-receipts.csv", [
    ["Received", "Amount", "Account", "Payer / ref", "Possible student", "Evidence", "Issue", "Owner", "Due", "Status", "Resolution", "Matched student", "Resolved by", "Resolved on"],
    ...rows.map((c) => [c.receivedOn, c.amount, c.accountName || "", c.payer, c.possibleStudent || "", c.evidence || "", c.issue, c.owner || "", c.dueOn || "", c.status, c.resolution || "", c.matchedStudentName || "", c.resolvedBy || "", c.resolvedAt ? String(c.resolvedAt).slice(0, 10) : ""]),
  ]);

  return (
    <div>
      <FinHead title="Unmatched Receipts" refLabel="Table 13 · H.32"
        sub="Any transfer without a clear student, a receipt without a reference, an amount that matches no package, or money on the wrong account. Never assign it by guessing — match it through the parent, sales or management, then record the evidence.">
        <CsvButton onClick={exportCsv} />
        <button onClick={() => setModal({})} className="a-btn primary"><Plus size={15} /> New case</button>
      </FinHead>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Kpi label="Open cases" value={open.length} sub={`${egp(open.reduce((a, c) => a + c.amount, 0))} not assigned`} bg="#fef3c7" fg="#b45309" icon={HelpCircle} />
        <Kpi label="Past due date" value={late.length} sub="Escalate to the reviewer" bg="#fdecec" fg="#7d0a0a" icon={AlertOctagon} />
        <Kpi label="Resolved" value={resolved} sub="With the result and document recorded" bg="#f0fdf4" fg="#15803d" icon={CheckCircle2} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        {[["open", "Open", open.length], ["resolved", "Resolved", resolved], ["all", "All", cases.length]].map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k)} className={`a-chip ${filter === k ? "on" : ""}`}>{l} · {n}</button>
        ))}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search payer, student, evidence, owner…" className="a-inp !pl-9 !py-1.5" />
        </div>
      </div>

      {um.loading && !um.data ? <SkelRows n={5} />
        : um.error && !um.data ? <LoadError error={um.error} onRetry={um.reload} />
        : (
          <RCard title="Cases" sub="A case is closed only with the result and the final document — contacting the payer is not enough">
            <ReloadError error={um.error} onRetry={um.reload} />
            <Table minW={1300} heads={["Received", "Amount", "Account", "Payer / ref", "Possible student", "Evidence", "Issue", "Owner", "Due", "Status", ""]}
              empty={rows.length ? null : cases.length ? "No case matches this filter." : "No unmatched receipts recorded. Open a case when money arrives that can't be matched to a student."}>
              {rows.map((c) => {
                const pastDue = c.status === "open" && c.dueOn && c.dueOn < today;
                return (
                  <tr key={c.id} className={`a-tr align-top ${pastDue ? "bg-red-50/40" : ""}`}>
                    <td className="a-td whitespace-nowrap text-gray-500">{shortDate(c.receivedOn)}</td>
                    <td className="a-td whitespace-nowrap font-extrabold text-gray-800">{egp(c.amount)}</td>
                    <td className="a-td whitespace-nowrap text-gray-600">{c.accountName || "—"}</td>
                    <td className="a-td text-gray-700 max-w-[180px]">{c.payer}</td>
                    <td className="a-td text-gray-600 max-w-[160px]">{c.possibleStudent || "—"}</td>
                    <td className="a-td text-xs text-gray-500 max-w-[200px]">{c.evidence || "—"}</td>
                    <td className="a-td text-xs text-gray-600 max-w-[200px]">{c.issue}</td>
                    <td className="a-td whitespace-nowrap text-gray-600">{c.owner || "—"}</td>
                    <td className={`a-td whitespace-nowrap ${pastDue ? "text-red-600 font-bold" : "text-gray-500"}`}>{c.dueOn ? shortDate(c.dueOn) : "—"}</td>
                    <td className="a-td text-xs max-w-[260px]">
                      {c.status === "resolved" ? (
                        <>
                          <Pill tone="green">Resolved</Pill>
                          <p className="text-gray-600 mt-1">{c.resolution}</p>
                          {c.matchedStudentName && <p className="text-gray-500 mt-0.5">Matched: <b className="text-gray-700">{c.matchedStudentName}</b></p>}
                          <p className="text-gray-400 mt-0.5">{[c.resolvedBy, c.resolvedAt && shortDate(c.resolvedAt)].filter(Boolean).join(" · ")}</p>
                        </>
                      ) : pastDue ? <Pill tone="red">Past due</Pill> : <Pill tone="amber">Open</Pill>}
                    </td>
                    <td className="a-td whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {c.status === "open" && <button onClick={() => setModal({ case: c })} className="a-act" title="Edit" aria-label="Edit"><Pencil size={15} /></button>}
                        <button onClick={() => setRemoving(c)} className="a-act del" title="Delete this case" aria-label={`Delete case from ${c.payer}`}><Trash2 size={15} /></button>
                        {c.status === "open" && <button onClick={() => setResolving(c)} className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg text-white bg-one hover:opacity-90">Resolve</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </RCard>
        )}

      {modal && <CaseModal item={modal.case} accounts={accounts} onClose={() => setModal(null)} onSaved={() => { setModal(null); changed(); }} />}
      {resolving && <ResolveModal item={resolving} onClose={() => setResolving(null)} onDone={() => { setResolving(null); setFilter("resolved"); changed(); }} />}
      {removing && (
        <Modal title={`Delete case · ${egp(removing.amount)} from ${removing.payer}?`} onClose={() => !deleting && setRemoving(null)}
          actions={<>
            <button onClick={() => setRemoving(null)} disabled={deleting} className="a-btn">Cancel</button>
            <button onClick={deleteCase} disabled={deleting} className="a-btn danger">{deleting ? "Deleting…" : "Delete case"}</button>
          </>}>
          <p className="text-sm text-gray-600">This removes the case permanently.</p>
          {removing.status === "resolved" && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
              This case is resolved{removing.matchedStudentName ? ` (matched to ${removing.matchedStudentName})` : ""}. Deleting it removes that record and its evidence too.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

function CaseModal({ item, accounts, onClose, onSaved }) {
  const edit = !!item;
  const [f, setF] = useState(() => ({
    receivedOn: item?.receivedOn || todayIso(), amount: item ? String(item.amount) : "", accountId: item?.accountId || "",
    payer: item?.payer || "", possibleStudent: item?.possibleStudent || "", evidence: item?.evidence || "",
    issue: item?.issue || ISSUES[0], owner: item?.owner ?? "Collections officer", dueOn: item ? item.dueOn || "" : dayOffset(2),
  }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    const amount = toInt(f.amount);
    if (!f.receivedOn) { toast.error("Enter the date the money was received"); return; }
    if (Number.isNaN(amount) || amount <= 0) { toast.error("Amount must be a whole number more than 0"); return; }
    if (!f.payer.trim()) { toast.error("Payer / reference is required"); return; }
    if (!f.issue.trim()) { toast.error("Describe the issue"); return; }
    setSaving(true);
    try {
      const body = {
        receivedOn: f.receivedOn, amount, accountId: f.accountId || null, payer: f.payer.trim(), possibleStudent: f.possibleStudent.trim(),
        evidence: f.evidence.trim(), issue: f.issue.trim(), owner: f.owner.trim(), dueOn: f.dueOn || null,
      };
      if (edit) await api.put(`/api/admin/finance/unmatched/${item.id}`, body);
      else await api.post("/api/admin/finance/unmatched", body);
      toast.success(edit ? "Case saved" : "Case opened");
      onSaved();
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };

  return (
    <Modal wide title={edit ? "Edit unmatched receipt" : "New unmatched receipt"} onClose={onClose}
      actions={<>
        <button onClick={onClose} className="a-btn">Cancel</button>
        <button onClick={save} disabled={saving} className="a-btn primary">{saving ? "Saving…" : edit ? "Save case" : "Open case"}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Received on" req><input type="date" value={f.receivedOn} max={todayIso()} onChange={set("receivedOn")} className="a-inp" /></Field>
        <Field label="Amount (EGP)" req><input type="number" min="1" step="1" value={f.amount} onChange={set("amount")} className="a-inp" /></Field>
        <Field label="Receiving account">
          <select value={f.accountId} onChange={set("accountId")} className="a-inp">
            <option value="">— Not known —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Payer / reference" req><input value={f.payer} onChange={set("payer")} className="a-inp" placeholder="Name on the transfer, reference number…" /></Field>
        <Field label="Possible student" hint="Only if there is a hint — not a decision"><input value={f.possibleStudent} onChange={set("possibleStudent")} className="a-inp" /></Field>
        <Field label="Owner"><input value={f.owner} onChange={set("owner")} className="a-inp" /></Field>
        <Field label="Issue" req span>
          <input list="um-issues" value={f.issue} onChange={set("issue")} className="a-inp" />
          <datalist id="um-issues">{ISSUES.map((i) => <option key={i} value={i} />)}</datalist>
        </Field>
        <Field label="Evidence available" span hint="Statement line, SMS, screenshot…"><textarea rows={2} value={f.evidence} onChange={set("evidence")} className="a-inp" /></Field>
        <Field label="Due date" hint="When it must be matched or escalated"><input type="date" value={f.dueOn} onChange={set("dueOn")} className="a-inp" /></Field>
      </div>
    </Modal>
  );
}

function ResolveModal({ item, onClose, onDone }) {
  const [resolution, setResolution] = useState("");
  const [student, setStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!resolution.trim()) { toast.error("Write the result and the final document"); return; }
    setSaving(true);
    try {
      await api.post(`/api/admin/finance/unmatched/${item.id}/resolve`, { resolution: resolution.trim(), matchedStudentId: student?.value || null });
      toast.success("Case resolved");
      onDone();
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };
  return (
    <Modal wide title={`Resolve · ${egp(item.amount)} from ${item.payer}`} onClose={onClose}
      actions={<>
        <button onClick={onClose} className="a-btn">Cancel</button>
        <button onClick={save} disabled={saving || !resolution.trim()} className="a-btn primary"><CheckCircle2 size={15} /> {saving ? "Saving…" : "Resolve case"}</button>
      </>}>
      <p className="text-xs text-gray-500 mb-3">Received {shortDate(item.receivedOn)}{item.accountName ? ` on ${item.accountName}` : ""} · {item.issue}</p>
      <div className="grid grid-cols-1 gap-3">
        <Field label="Resolution" req hint="The result + the final document (e.g. “Parent confirmed by phone, receipt RC-221 attached — added to Omar's wallet”). Contacting the payer is not enough.">
          <textarea rows={3} autoFocus value={resolution} onChange={(e) => setResolution(e.target.value)} className="a-inp" />
        </Field>
        <div>
          <span className="a-lbl-f">Matched student <span className="text-gray-400 font-normal">(optional)</span></span>
          <StudentPicker value={student} onChange={setStudent} />
          {item.possibleStudent && <span className="block text-[11px] text-gray-400 mt-1">Hint on the case: {item.possibleStudent}</span>}
        </div>
        <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          This is a record. Resolving does not move money or change a wallet — apply it by hand in the student's account.
        </p>
      </div>
    </Modal>
  );
}
