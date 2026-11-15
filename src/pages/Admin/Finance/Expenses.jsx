// Payment → Expenses & payroll (design: RepPages['pay-expenses'], Task H · §21).
// API: GET /api/admin/finance/expenses?from&to, POST /expenses, PUT /expenses/:id, POST /expenses/:id/correct.
// Nothing is deleted: lines in a closed month are locked and fixed with correcting entries.
import { useState } from "react";
import { AlertTriangle, Lock, Paperclip, Pencil, Plus, Receipt, Undo2, Users, FileCheck2 } from "lucide-react";
import api from "@/api/api";
import { Pill } from "@/components/admin/kit";
import { Kpi, RCard, CsvButton, downloadCsv } from "@/pages/Admin/Reports/parts";
import { useFin, FinHead, DocInput, Field, egp, shortDate, todayIso, thisMonth, monthLabel } from "./finKit";
import { useRun, LoadState, FTable, Mini, FormModal, matches, monthEnd, toastNeed , DeleteButton } from "./partsB";

const METHODS = ["Cash", "Bank transfer", "Vodafone Cash", "InstaPay", "Cheque", "Other"];
const signed = (n) => (Number(n) > 0 ? `+${egp(n)}` : egp(n));
const sum = (rows) => rows.reduce((a, e) => a + (Number(e.amount) || 0), 0);

export default function Expenses() {
  const [month, setMonth] = useState(thisMonth());
  const { data, loading, error, reload } = useFin(`/expenses?from=${month}-01&to=${monthEnd(month)}`);
  const [busy, run] = useRun(reload, { waiting: true });
  const [branch, setBranch] = useState("all");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // { kind: add|edit|doc|correct, row }
  const [f, setF] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));
  const close = () => setModal(null);
  const open = (kind, row, init) => { setF(init); setModal({ kind, row }); };

  const all = data?.expenses || [];
  const branches = data?.branches || [];
  const categories = data?.categories || [];
  const rows = all.filter((e) => (branch === "all" || e.branch === branch) && (cat === "all" || e.category === cat)
    && (status === "all" || e.status === status) && matches(q, e.payee, e.notes, e.approvedBy, e.method, e.category, e.branch));
  const noDoc = rows.filter((e) => !e.document);
  const docPct = rows.length ? Math.round(((rows.length - noDoc.length) / rows.length) * 100) : 100;
  const catTotals = {};
  rows.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + (Number(e.amount) || 0); });
  const byCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const anyLocked = all.some((e) => e.locked);

  // ── forms ──
  const blank = { spentOn: todayIso(), branch: branches[0] || "", category: categories[0] || "Rent", otherCat: "", amount: "", payee: "", method: "Cash", approvedBy: "", notes: "", document: null };
  const catOf = (v) => (v.category === "__other" ? v.otherCat.trim() : v.category);
  const saveLine = () => {
    const isCorr = !!modal.row?.correctsId;
    const amount = Number(f.amount);
    if (!f.spentOn) return toastNeed("Date");
    if (!f.branch?.trim()) return toastNeed("Branch");
    if (!catOf(f)) return toastNeed("Category");
    if (!isCorr && !(Number.isInteger(amount) && amount > 0)) return toastNeed("An amount in whole EGP above 0");
    if (!f.payee?.trim()) return toastNeed("Payee");
    const body = {
      spentOn: f.spentOn, branch: f.branch.trim(), category: catOf(f), payee: f.payee.trim(), method: f.method,
      approvedBy: f.approvedBy.trim(), notes: f.notes.trim(), document: f.document || null,
    };
    if (!isCorr) body.amount = amount;
    if (modal.kind === "add") {
      run(() => api.post("/api/admin/finance/expenses", body), body.document ? "Expense recorded" : "Expense recorded — it stays pending until its document is attached", close);
    } else {
      run(() => api.put(`/api/admin/finance/expenses/${modal.row.id}`, body), "Expense saved", close);
    }
  };
  const saveDoc = () => {
    if (!f.document) return toastNeed("The document");
    const body = { document: f.document };
    if (f.approvedBy.trim()) body.approvedBy = f.approvedBy.trim();
    run(() => api.put(`/api/admin/finance/expenses/${modal.row.id}`, body), "Document attached", close);
  };
  const saveCorrection = () => {
    const amount = Number(f.amount);
    if (!f.spentOn) return toastNeed("Date");
    if (!Number.isInteger(amount) || amount === 0) return toastNeed("A whole EGP amount other than 0");
    if (!f.notes.trim()) return toastNeed("Why this correction is needed");
    run(() => api.post(`/api/admin/finance/expenses/${modal.row.id}/correct`, { spentOn: f.spentOn, amount, notes: f.notes.trim(), document: f.document || null }),
      "Correcting entry added", close);
  };
  const openEdit = (e) => open("edit", e, {
    spentOn: e.spentOn, branch: e.branch, category: categories.includes(e.category) ? e.category : "__other", otherCat: categories.includes(e.category) ? "" : e.category,
    amount: String(e.amount), payee: e.payee || "", method: e.method || "Cash", approvedBy: e.approvedBy || "", notes: e.notes || "", document: e.document || null,
  });
  const exportCsv = () => downloadCsv(`expenses-${month}.csv`, [
    ["Date", "Branch", "Category", "Amount (EGP)", "Payee", "Method", "Approved by", "Document", "Notes", "Correction", "Status", "Locked"],
    ...rows.map((e) => [e.spentOn, e.branch, e.category, e.amount, e.payee, e.method, e.approvedBy, e.document, e.notes, e.correctsId ? "yes" : "", e.status, e.locked ? "yes" : ""]),
  ]);

  return (
    <div>
      <FinHead title="Expenses & Payroll" refLabel="Task H · §21"
        sub="Nothing is written without a document showing the reason, date, amount, payee, approver and payment method. A line without its document stays “Pending — missing document” until completed. Nothing is deleted — mistakes get a correcting entry.">
        <CsvButton onClick={exportCsv} />
        <button onClick={() => open("add", null, blank)} className="a-btn primary"><Plus size={15} /> Add expense</button>
      </FinHead>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="a-inp !py-1.5 text-xs md:!w-auto" aria-label="Month" />
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="a-inp !py-1.5 text-xs md:!w-auto">
          <option value="all">All branches</option>
          {branches.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="a-inp !py-1.5 text-xs md:!w-auto">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="a-inp !py-1.5 text-xs md:!w-auto">
          <option value="all">Any status</option>
          <option value="complete">Complete</option>
          <option value="missing">Missing document / approver</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search payee, notes, approver…" className="a-inp !py-1.5 text-xs col-span-2 md:flex-1 md:min-w-[180px]" />
      </div>

      <LoadState loading={loading} error={error} data={data} reload={reload}>
        {anyLocked && (
          <div className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
            <Lock size={14} className="mt-0.5 shrink-0" />
            <span><b>{monthLabel(month)} is closed.</b> Its lines are read-only. To fix one, use “Correct” — it adds a correcting entry dated in an open month and keeps the original.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Total" value={egp(sum(rows))} sub={`${rows.length} lines · ${monthLabel(month)}`} bg="#faf5ff" fg="#7e22ce" icon={Receipt} />
          <Kpi label="Salaries" value={egp(sum(rows.filter((e) => e.category === "Salaries")))} sub="Payroll lines" bg="#eff6ff" fg="#1d4ed8" icon={Users} />
          <Kpi label="With documents" value={`${docPct}%`} sub="Target 100%" bg={docPct === 100 ? "#f0fdf4" : "#fef3c7"} fg={docPct === 100 ? "#15803d" : "#b45309"} icon={FileCheck2} />
          <Kpi label="Missing document" value={noDoc.length} sub={`${egp(sum(noDoc))} pending`} icon={AlertTriangle} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
          <RCard title="Expense lines" sub="Each line needs its document (receipt / transfer proof) and an approver to be complete" className="xl:col-span-3 !px-3 sm:!px-5">
            <FTable count={rows.length} empty={all.length ? "No lines match the filters." : `No expenses in ${monthLabel(month)}.`}
              heads={["Date", "Branch", "Category", "Amount", "Payee", "Method", "Approved by", "Document", "Status", ""]}>
              {rows.map((e) => (
                <tr key={e.id} className={`a-tr align-top ${e.document ? "" : "bg-amber-50/50"}`}>
                  <td className="a-td text-gray-500 whitespace-nowrap">{shortDate(e.spentOn)}</td>
                  <td className="a-td text-gray-600 whitespace-nowrap">{e.branch}</td>
                  <td className="a-td"><Pill tone={e.category === "Salaries" ? "blue" : "gray"}>{e.category}</Pill></td>
                  <td className="a-td whitespace-nowrap">
                    <b className={e.correctsId ? (e.amount < 0 ? "text-red-600" : "text-green-700") : "text-gray-800"}>{e.correctsId ? signed(e.amount) : egp(e.amount)}</b>
                    {e.correctsId && <p className="text-[11px] text-gray-400 max-w-[220px] whitespace-normal" title={e.notes}>{e.notes || "Correction"}</p>}
                  </td>
                  <td className="a-td text-gray-600 min-w-[120px]">
                    {e.payee}
                    {!e.correctsId && e.notes && <p className="text-[11px] text-gray-400 max-w-[200px]">{e.notes}</p>}
                  </td>
                  <td className="a-td text-gray-600 whitespace-nowrap">{e.method}</td>
                  <td className="a-td whitespace-nowrap">{e.approvedBy || <span className="text-amber-600 text-xs font-bold">Not approved</span>}</td>
                  <td className="a-td text-xs whitespace-nowrap">
                    {e.document
                      ? <a href={e.document} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-one hover:underline"><Paperclip size={13} /> View</a>
                      : <Pill tone="amber">Missing</Pill>}
                  </td>
                  <td className="a-td whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {e.status === "complete" ? <Pill tone="green">Complete</Pill> : <Pill tone="amber">Pending — missing {e.document ? "approver" : "document"}</Pill>}
                      {e.locked && <Pill tone="gray"><Lock size={11} className="inline -mt-0.5" /> Locked</Pill>}
                    </div>
                  </td>
                  <td className="a-td">
                    <div className="flex items-center justify-end gap-1.5">
                      {!e.locked && !e.document && <Mini tone="primary" onClick={() => open("doc", e, { document: null, approvedBy: e.approvedBy || "" })}>Attach document</Mini>}
                      {!e.locked && <button onClick={() => openEdit(e)} className="a-act" title="Edit" aria-label="Edit"><Pencil size={15} /></button>}
                      <button onClick={() => open("correct", e, { spentOn: todayIso(), amount: "", notes: "", document: null })} className="a-act" title="Correct (adds a correcting entry)" aria-label="Correct"><Undo2 size={15} /></button>
                      {!e.locked && (
                        <DeleteButton what={`expense to ${e.payee}`} busy={busy}
                          warning={e.amount < 0 ? "This is a correcting entry — the original line goes back to its uncorrected amount." : null}
                          onDelete={() => run(() => api.delete(`/api/admin/finance/expenses/${e.id}`), "Expense deleted")} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </FTable>
          </RCard>
          <RCard title="By category" sub="Current filters">
            {byCat.length ? byCat.map(([c, v]) => (
              <div key={c} className="flex justify-between gap-2 text-sm py-1.5 border-b border-gray-50">
                <span className="text-gray-600 truncate">{c}</span><span className="font-bold text-gray-800 whitespace-nowrap">{egp(v)}</span>
              </div>
            )) : <p className="text-sm text-gray-400">No expenses.</p>}
            {byCat.length > 0 && (
              <div className="flex justify-between text-sm pt-2"><span className="font-bold text-gray-700">Total</span><span className="font-extrabold text-gray-900">{egp(sum(rows))}</span></div>
            )}
          </RCard>
        </div>
      </LoadState>

      {(modal?.kind === "add" || modal?.kind === "edit") && (
        <FormModal title={modal.kind === "add" ? "Add expense or salary" : "Edit expense"} onClose={close} onSave={saveLine} busy={busy} saveLabel={modal.kind === "add" ? "Add line" : "Save"}>
          <Field label="Date" req><input type="date" value={f.spentOn} onChange={set("spentOn")} className="a-inp" /></Field>
          <Field label="Branch" req>
            <input list="fin-exp-branches" value={f.branch} onChange={set("branch")} placeholder="e.g. Cairo branch" className="a-inp" />
            <datalist id="fin-exp-branches">{branches.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <Field label="Category" req>
            <select value={f.category} onChange={set("category")} className="a-inp">
              {categories.map((c) => <option key={c}>{c}</option>)}
              <option value="__other">Other…</option>
            </select>
            {f.category === "__other" && <input value={f.otherCat} onChange={set("otherCat")} placeholder="Category name" className="a-inp mt-2" />}
          </Field>
          {modal.row?.correctsId
            ? <Field label="Amount" hint="A correction’s amount can’t be changed — add another correction instead"><input value={signed(modal.row.amount)} disabled className="a-inp" /></Field>
            : <Field label="Amount (EGP)" req><input type="number" min="1" step="1" value={f.amount} onChange={set("amount")} className="a-inp" /></Field>}
          <Field label="Payee / recipient" req><input value={f.payee} onChange={set("payee")} className="a-inp" /></Field>
          <Field label="Payment method" req>
            <select value={f.method} onChange={set("method")} className="a-inp">
              {[...new Set([...METHODS, f.method].filter(Boolean))].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Approved by" hint="Without an approver the line stays pending"><input value={f.approvedBy} onChange={set("approvedBy")} placeholder="Name / role" className="a-inp" /></Field>
          <Field label="Reason / period"><input value={f.notes} onChange={set("notes")} placeholder="e.g. October salary · AC repair room 2" className="a-inp" /></Field>
          <div className="sm:col-span-2">
            <DocInput label="Document (receipt / transfer proof)" value={f.document} onChange={set("document")} />
            <p className="text-[11px] text-gray-400 mt-1">Without a document the line stays “Pending — missing document”.</p>
          </div>
        </FormModal>
      )}

      {modal?.kind === "doc" && (
        <FormModal title="Attach document" onClose={close} onSave={saveDoc} busy={busy} saveLabel="Attach" intro={<Line e={modal.row} />}>
          <div className="sm:col-span-2"><DocInput label="Document (receipt / transfer proof)" value={f.document} onChange={set("document")} /></div>
          {!modal.row.approvedBy && <Field label="Approved by" span><input value={f.approvedBy} onChange={set("approvedBy")} placeholder="Name / role" className="a-inp" /></Field>}
        </FormModal>
      )}

      {modal?.kind === "correct" && (
        <FormModal title="Correcting entry" onClose={close} onSave={saveCorrection} busy={busy} saveLabel="Add correction"
          intro={<><Line e={modal.row} /><p className="text-xs text-gray-500">The original line is kept. This adds a new line linked to it (same branch, category, payee and method), dated in an open month.</p></>}>
          <Field label="Date" req><input type="date" value={f.spentOn} onChange={set("spentOn")} className="a-inp" /></Field>
          <Field label="Amount (EGP, + or −)" req hint={`Negative reduces the total, e.g. −${Math.abs(Number(modal.row.amount) || 0)} cancels the line`}>
            <input type="number" step="1" value={f.amount} onChange={set("amount")} className="a-inp" />
          </Field>
          <Field label="Why this correction is needed" req span><textarea rows={2} value={f.notes} onChange={set("notes")} className="a-inp" /></Field>
          <div className="sm:col-span-2"><DocInput label="Document (optional)" value={f.document} onChange={set("document")} /></div>
        </FormModal>
      )}
    </div>
  );
}

const Line = ({ e }) => (
  <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-2">
    <b className="text-gray-800">{shortDate(e.spentOn)} · {e.payee} · {e.correctsId ? signed(e.amount) : egp(e.amount)}</b>
    <span className="text-gray-500"> — {e.branch} · {e.category} · {e.method}{e.locked ? " · locked (closed month)" : ""}</span>
  </div>
);
