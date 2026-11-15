// Payment → Daily reconciliation + Accounts & channels (MathPortal design: pay-recon / pay-method).
// API: GET/POST/PUT /api/admin/finance/reconciliation, …/suggest, …/:id/reconcile, …/:id/reopen; GET/POST/PUT …/accounts.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Landmark, ListTodo, Lock, Pencil, Percent, Plus, RotateCcw, Trash2 } from "lucide-react";
import api from "@/api/api";
import { Empty, Modal, Pill, SkelRows, errText } from "@/components/admin/kit";
import { CsvButton, Kpi, RCard, downloadCsv } from "@/pages/Admin/Reports/parts";
import { Field, FinHead, egp, shortDate, todayIso, useFin } from "./finKit";
import { LoadError, ReloadError, Switch, Table, dayOffset, num, signed, toInt, useAct } from "./partsA";

const TYPE_TONE = { Bank: "blue", Wallet: "purple", Cash: "gray" };

export default function Reconciliation() {
  const [params] = useSearchParams();
  const acc = useFin("/accounts");
  const accounts = acc.data?.accounts || [];
  // Accounts now live on their own page (Payment → Accounts & Channels); keep old links working.
  if (params.get("tab") === "accounts") return <Navigate to="/admin/payment/payment-method" replace />;

  return <div><DailyTab acc={acc} accounts={accounts} tabs={null} /></div>;
}

/* ───────────────────────── Daily reconciliation ───────────────────────── */
function DailyTab({ acc, accounts, tabs }) {
  const [range, setRange] = useState({ from: dayOffset(-13), to: todayIso() });
  const [accountId, setAccountId] = useState("");
  const path = `/reconciliation?from=${range.from}&to=${range.to}${accountId ? `&accountId=${accountId}` : ""}`;
  const rec = useFin(path);
  const lines = useMemo(() => rec.data?.lines || [], [rec.data]);
  const [modal, setModal] = useState(null); // { line? } add / edit
  const [closing, setClosing] = useState(null); // line needing an explanation
  const [removing, setRemoving] = useState(null); // line waiting for delete confirmation
  const [busy, run] = useAct();
  const deleteDay = async () => {
    const l = removing;
    if (await run(l.id, () => api.delete(`/api/admin/finance/reconciliation/${l.id}`), "Day deleted")) { setRemoving(null); reload(); }
  };

  const reload = () => { rec.reload(); acc.reload(); };
  const reconciled = lines.filter((l) => l.status === "reconciled").length;
  const open = lines.filter((l) => l.status !== "reconciled");
  const varLines = open.filter((l) => l.variance);
  const pct = lines.length ? Math.round((reconciled / lines.length) * 100) : null;

  const closeDay = async (l) => {
    if (l.variance) { setClosing(l); return; }
    if (await run(l.id, () => api.post(`/api/admin/finance/reconciliation/${l.id}/reconcile`, {}), "Day reconciled")) reload();
  };
  const reopen = async (l) => {
    if (await run(l.id, () => api.post(`/api/admin/finance/reconciliation/${l.id}/reopen`), "Day reopened — you can edit it now")) reload();
  };
  const exportCsv = () => downloadCsv(`daily-reconciliation-${range.from}-to-${range.to}.csv`, [
    ["Date", "Account", "Opening", "System receipts", "Statement receipts", "Payments", "Expected", "Actual", "Variance", "Action / reason", "Status", "Reviewer", "Reviewed on"],
    ...lines.map((l) => [l.day, l.accountName, l.opening, l.systemReceipts, l.statementReceipts, l.payments, l.expected, l.actual, l.variance, l.action || "", l.status, l.reviewedBy || "", l.reviewedAt ? String(l.reviewedAt).slice(0, 10) : ""]),
  ]);

  return (
    <>
      <FinHead title="Daily Reconciliation" refLabel="Table 12 · H.31"
        sub="Each account, each day: system receipts vs. the bank / wallet statement. Expected = opening + system receipts − payments; actual = opening + statement − payments. A day is closed only when the variance is zero or explained.">
        <CsvButton onClick={exportCsv} />
        <button onClick={() => setModal({})} disabled={!accounts.length} title={accounts.length ? "" : "Add an account first"} className="a-btn primary"><Plus size={15} /> Add day</button>
      </FinHead>
      {tabs}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <Kpi label="Reconciled" value={pct == null ? "—" : `${pct}%`} sub={`${reconciled} of ${lines.length} lines in range · target 100%`} bg={pct === 100 ? "#f0fdf4" : "#fef3c7"} fg={pct === 100 ? "#15803d" : "#b45309"} icon={Percent} />
        <Kpi label="Open lines" value={open.length} sub="Account-days not closed" bg="#eff6ff" fg="#1d4ed8" icon={ListTodo} />
        <Kpi label="Variances" value={varLines.length} sub={`${egp(varLines.reduce((a, l) => a + Math.abs(l.variance), 0))} to explain`} bg="#fdecec" fg="#7d0a0a" icon={AlertTriangle} />
        <Kpi label="Accounts" value={accounts.filter((a) => a.isActive).length} sub="Banks, wallets and cash boxes" bg="#f3f4f6" fg="#475569" icon={Landmark} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setRange({ from: dayOffset(-13), to: todayIso() })} className={`a-chip ${range.from === dayOffset(-13) && range.to === todayIso() ? "on" : ""}`}>Last 14 days</button>
        <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} className="a-inp !w-auto !py-1.5 text-xs" aria-label="From" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} className="a-inp !w-auto !py-1.5 text-xs" aria-label="To" />
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="a-inp !w-auto !py-1.5 text-xs min-w-[160px]" aria-label="Account">
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {rec.loading && !rec.data ? <SkelRows n={6} />
        : rec.error && !rec.data ? <LoadError error={rec.error} onRetry={rec.reload} />
        : (
          <RCard title="Reconciliation lines" sub={`${shortDate(rec.data?.from)} – ${shortDate(rec.data?.to)} · a closed month's lines are read-only`}>
            <ReloadError error={rec.error} onRetry={rec.reload} />
            {!accounts.length && !acc.loading
              ? <p className="text-sm text-gray-500 py-6 text-center">No receiving accounts yet — add them under <Link to="/admin/payment/payment-method" className="font-bold text-one hover:underline">Accounts &amp; Channels</Link> first.</p>
              : (
                <Table minW={1250} heads={["Date", "Account", "Opening", "System receipts", "Statement receipts", "Payments", "Expected", "Actual", "Variance", "Action / reason", "Status", ""]}
                  empty={lines.length ? null : "No lines in this range. Use “Add day” to record an account's day."}>
                  {lines.map((l) => (
                    <tr key={l.id} className={`a-tr ${l.variance && l.status !== "reconciled" ? "bg-red-50/40" : ""}`}>
                      <td className="a-td whitespace-nowrap text-gray-500">{shortDate(l.day)}</td>
                      <td className="a-td whitespace-nowrap font-bold text-gray-800">{l.accountName}</td>
                      <td className="a-td text-gray-500">{num(l.opening)}</td>
                      <td className="a-td">{num(l.systemReceipts)}</td>
                      <td className="a-td">{num(l.statementReceipts)}</td>
                      <td className="a-td text-gray-500">{num(l.payments)}</td>
                      <td className="a-td">{num(l.expected)}</td>
                      <td className="a-td font-bold text-gray-800">{num(l.actual)}</td>
                      <td className={`a-td font-extrabold whitespace-nowrap ${l.variance ? "text-red-600" : "text-green-700"}`}>{signed(l.variance)}</td>
                      <td className="a-td text-xs text-gray-600 max-w-[240px]">{l.action || <span className="text-gray-300">—</span>}</td>
                      <td className="a-td whitespace-nowrap">
                        {l.status === "reconciled"
                          ? <><Pill tone="green">Reconciled{l.reviewedBy ? ` · ${l.reviewedBy}` : ""}</Pill>{l.reviewedAt && <div className="text-[11px] text-gray-400 mt-0.5">{shortDate(l.reviewedAt)}</div>}</>
                          : <Pill tone={l.variance ? "red" : "amber"}>Open</Pill>}
                      </td>
                      <td className="a-td whitespace-nowrap">
                        {l.locked ? <Pill tone="gray"><Lock size={11} /> Month closed</Pill>
                          : l.status === "reconciled" ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => reopen(l)} disabled={busy === l.id} className="a-act" title="Reopen this day" aria-label="Reopen"><RotateCcw size={15} /></button>
                              <button onClick={() => setRemoving(l)} className="a-act del" title="Delete this day" aria-label={`Delete ${l.accountName} ${l.day}`}><Trash2 size={15} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setModal({ line: l })} className="a-act" title="Edit" aria-label="Edit"><Pencil size={15} /></button>
                              <button onClick={() => setRemoving(l)} className="a-act del" title="Delete this day" aria-label={`Delete ${l.accountName} ${l.day}`}><Trash2 size={15} /></button>
                              <button onClick={() => closeDay(l)} disabled={busy === l.id}
                                className={`text-[11px] font-extrabold px-3 py-1.5 rounded-lg ${l.variance ? "text-red-600 border border-red-200 bg-white hover:bg-red-50" : "text-white bg-green-700 hover:bg-green-800"}`}>
                                {l.variance ? "Explain & close" : "Close day"}
                              </button>
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
          </RCard>
        )}

      {modal && <LineModal line={modal.line} accounts={accounts} defaultAccount={accountId} lines={lines}
        onEdit={(line) => setModal({ line })} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
      {closing && <CloseDayModal line={closing} onClose={() => setClosing(null)} onDone={() => { setClosing(null); reload(); }} />}
      {removing && (
        <Modal title={`Delete ${removing.accountName} · ${shortDate(removing.day)}?`} onClose={() => busy !== removing.id && setRemoving(null)}
          actions={<>
            <button onClick={() => setRemoving(null)} disabled={busy === removing.id} className="a-btn">Cancel</button>
            <button onClick={deleteDay} disabled={busy === removing.id} className="a-btn danger">{busy === removing.id ? "Deleting…" : "Delete day"}</button>
          </>}>
          <p className="text-sm text-gray-600">This removes this account's line for that day permanently.</p>
          {removing.status === "reconciled" && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
              This day is already reconciled{removing.reviewedBy ? ` by ${removing.reviewedBy}` : ""}. Deleting it removes that review too.
            </p>
          )}
          <p className="text-xs text-gray-500 mt-3">The next day's opening balance is taken from the latest remaining day, so check the following days after deleting.</p>
        </Modal>
      )}
    </>
  );
}

/** Add a day (with the suggest prefill) or edit an open line; shows Expected / Actual / Variance live. */
function LineModal({ line, accounts, defaultAccount, lines, onEdit, onClose, onSaved }) {
  const edit = !!line;
  const [f, setF] = useState(() => (edit
    ? { accountId: line.accountId, day: line.day, opening: String(line.opening), systemReceipts: String(line.systemReceipts), statementReceipts: String(line.statementReceipts), payments: String(line.payments), action: line.action || "" }
    : { accountId: defaultAccount || accounts.find((a) => a.isActive)?.id || accounts[0]?.id || "", day: todayIso(), opening: "", systemReceipts: "", statementReceipts: "", payments: "0", action: "" }));
  const [sug, setSug] = useState(null); // suggest response | { error }
  const [sugLoading, setSugLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    if (edit || !f.accountId || !f.day) return undefined;
    let alive = true;
    setSugLoading(true);
    api.get("/api/admin/finance/reconciliation/suggest", { params: { accountId: f.accountId, day: f.day } })
      .then((r) => {
        if (!alive) return;
        const d = r.data?.data || {};
        setSug(d);
        setF((x) => ({ ...x, opening: String(d.opening ?? 0), systemReceipts: d.linkedToPaymentMethod ? String(d.systemReceipts ?? 0) : x.systemReceipts }));
      })
      .catch((e) => alive && setSug({ error: errText(e, "Could not load the suggestion") }))
      .finally(() => alive && setSugLoading(false));
    return () => { alive = false; };
  }, [edit, f.accountId, f.day]);

  const n = { opening: toInt(f.opening), sys: toInt(f.systemReceipts), stm: toInt(f.statementReceipts), pay: toInt(f.payments) };
  const ready = [n.opening, n.sys, n.stm, n.pay].every((v) => !Number.isNaN(v));
  const expected = ready ? n.opening + n.sys - n.pay : null;
  const actual = ready ? n.opening + n.stm - n.pay : null;
  const variance = ready ? n.stm - n.sys : null;
  const account = accounts.find((a) => a.id === f.accountId);

  const openExisting = async () => {
    const found = lines.find((l) => l.id === sug.existingLineId);
    if (found) { onEdit(found); return; }
    try {
      const r = await api.get("/api/admin/finance/reconciliation", { params: { from: f.day, to: f.day, accountId: f.accountId } });
      const l = (r.data?.data?.lines || []).find((x) => x.id === sug.existingLineId);
      if (!l) { toast.error("Could not open that line"); return; }
      if (l.locked) { toast.error("That line is in a closed month — it is read-only"); return; }
      if (l.status === "reconciled") { toast.error("That day is already reconciled — reopen it from the table first"); return; }
      onEdit(l);
    } catch (e) { toast.error(errText(e)); }
  };

  const save = async () => {
    if (!f.accountId || !f.day) { toast.error("Pick the account and the day"); return; }
    if (!ready) { toast.error("Enter whole numbers for opening, receipts and payments"); return; }
    if (n.sys < 0 || n.stm < 0 || n.pay < 0) { toast.error("Receipts and payments can't be negative"); return; }
    setSaving(true);
    try {
      const body = { opening: n.opening, systemReceipts: n.sys, statementReceipts: n.stm, payments: n.pay, action: f.action.trim() };
      if (edit) await api.put(`/api/admin/finance/reconciliation/${line.id}`, body);
      else await api.post("/api/admin/finance/reconciliation", { accountId: f.accountId, day: f.day, ...body });
      toast.success(edit ? "Line saved" : "Day added");
      onSaved();
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };

  return (
    <Modal wide title={edit ? `Edit ${line.accountName} · ${shortDate(line.day)}` : "Add a reconciliation day"} onClose={onClose}
      actions={<>
        <button onClick={onClose} className="a-btn">Cancel</button>
        <button onClick={save} disabled={saving || (!edit && !!sug?.existingLineId)} className="a-btn primary">{saving ? "Saving…" : edit ? "Save line" : "Add day"}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!edit && (
          <>
            <Field label="Account" req>
              <select value={f.accountId} onChange={set("accountId")} className="a-inp">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.isActive ? "" : " (inactive)"}</option>)}
              </select>
            </Field>
            <Field label="Day" req><input type="date" value={f.day} max={todayIso()} onChange={set("day")} className="a-inp" /></Field>
            <div className="sm:col-span-2 text-xs">
              {sugLoading ? <p className="text-gray-400">Looking up the opening balance and system receipts…</p>
                : sug?.error ? <p className="text-red-600">{sug.error}</p>
                : sug?.existingLineId ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800 flex flex-wrap items-center justify-between gap-2">
                    <span>{account?.name} already has a line for {shortDate(f.day)} — one line per account per day.</span>
                    <button onClick={openExisting} className="a-btn !py-1 !px-3 text-xs">Edit that line</button>
                  </div>
                ) : sug ? (
                  <p className={`rounded-xl px-3 py-2 border ${sug.linkedToPaymentMethod ? "bg-gray-50 border-gray-100 text-gray-600" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                    Opening = the last actual balance before this day.{" "}
                    {sug.linkedToPaymentMethod
                      ? <>System receipts = {egp(sug.systemReceipts)} from {sug.systemCount} payment{sug.systemCount === 1 ? "" : "s"} recorded with {account?.paymentMethodName || "the linked payment method"}.</>
                      : <>This account isn't linked to a payment method — enter system receipts by hand.</>}
                  </p>
                ) : null}
            </div>
          </>
        )}
        <Field label="Opening (EGP)" req hint="Can be negative"><input type="number" step="1" value={f.opening} onChange={set("opening")} className="a-inp" /></Field>
        <Field label="System receipts (EGP)" req hint="Recorded in the system for this account"><input type="number" min="0" step="1" value={f.systemReceipts} onChange={set("systemReceipts")} className="a-inp" /></Field>
        <Field label="Statement receipts (EGP)" req hint="From the bank / wallet statement or cash count"><input type="number" min="0" step="1" value={f.statementReceipts} onChange={set("statementReceipts")} className="a-inp" /></Field>
        <Field label="Payments (EGP)" req hint="Money paid out of the account that day"><input type="number" min="0" step="1" value={f.payments} onChange={set("payments")} className="a-inp" /></Field>
        <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
          <div><p className="text-[11px] font-bold text-gray-400 uppercase">Expected</p><p className="font-extrabold text-gray-800">{expected == null ? "—" : num(expected)}</p></div>
          <div><p className="text-[11px] font-bold text-gray-400 uppercase">Actual</p><p className="font-extrabold text-gray-800">{actual == null ? "—" : num(actual)}</p></div>
          <div><p className="text-[11px] font-bold text-gray-400 uppercase">Variance</p><p className={`font-extrabold ${variance ? "text-red-600" : "text-green-700"}`}>{variance == null ? "—" : variance ? signed(variance) : "0"}</p></div>
        </div>
        <Field label="Action / reason" span hint={variance ? "There is a variance — the day can only be closed with a written explanation." : "Optional"}>
          <textarea rows={2} value={f.action} onChange={set("action")} className="a-inp" placeholder={variance > 0 ? "e.g. transfer without a student name — opened an unmatched case" : variance < 0 ? "e.g. bank posts the transfer next working day" : ""} />
        </Field>
      </div>
    </Modal>
  );
}

/** Closing a day with a variance needs the explanation (API rule). */
function CloseDayModal({ line, onClose, onDone }) {
  const [why, setWhy] = useState(line.action || "");
  const [saving, setSaving] = useState(false);
  const v = line.variance;
  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/api/admin/finance/reconciliation/${line.id}/reconcile`, { action: why.trim() });
      toast.success("Day reconciled with the explanation");
      onDone();
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };
  return (
    <Modal title={`Variance on ${line.accountName} · ${shortDate(line.day)}`} onClose={onClose}
      actions={<>
        <button onClick={onClose} className="a-btn">Cancel</button>
        <button onClick={save} disabled={saving || !why.trim()} title={why.trim() ? "" : "Write the explanation first"} className="a-btn primary"><CheckCircle2 size={15} /> {saving ? "Closing…" : "Close day"}</button>
      </>}>
      <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 mb-3">
        The statement shows {egp(Math.abs(v))} {v > 0 ? "more" : "less"} than the system. Explain it before closing — the variance is never hidden.
      </div>
      <Field label="Reason & action" req hint="What caused it and what was done (e.g. the unmatched case opened, the bank's posting date).">
        <textarea rows={3} autoFocus value={why} onChange={(e) => setWhy(e.target.value)} className="a-inp" />
      </Field>
    </Modal>
  );
}

/* ───────────────────────── Accounts & channels ───────────────────────── */
/* Payment → Accounts & Channels (its own menu page): receiving accounts on top, then the payment methods. */
export function AccountsChannels({ methods }) {
  const acc = useFin("/accounts");
  return <div><AccountsTab acc={acc} accounts={acc.data?.accounts || []} tabs={null} />{methods}</div>;
}

function AccountsTab({ acc, accounts, tabs }) {
  const [modal, setModal] = useState(null); // { account? }
  const [removing, setRemoving] = useState(null); // account waiting for delete confirmation
  const [deleting, setDeleting] = useState(false);
  const [withDays, setWithDays] = useState(false); // also delete the account's reconciliation days
  const askDelete = (a) => { setWithDays(false); setRemoving(a); };
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/api/admin/finance/accounts/${removing.id}${withDays ? "?withDays=1" : ""}`);
      const days = res?.data?.data?.removedDays || 0;
      toast.success(`${removing.name} deleted${days ? ` with ${days} reconciliation day${days === 1 ? "" : "s"}` : ""}`);
      setRemoving(null);
      acc.reload();
    } catch (e) {
      toast.error(errText(e, "Could not delete the account"), { duration: 6000 });
      setRemoving(null);
    } finally {
      setDeleting(false);
    }
  };
  const exportCsv = () => downloadCsv("receiving-accounts.csv", [
    ["Account", "Type", "Number", "Owner", "Linked payment method", "Receipts (7d)", "Payments (7d)", "Balance", "Not reconciled", "Last reconciled day", "Active"],
    ...accounts.map((a) => [a.name, a.type, a.number || "", a.owner || "", a.paymentMethodName || "", a.receipts7, a.payments7, a.balance, a.openLines, a.lastReconciledDay || "", a.isActive ? "Yes" : "No"]),
  ]);
  return (
    <>
      <FinHead title="Accounts & Channels" refLabel="Task H · §20"
        sub="Every payment is recorded on the account that actually received it. Link an account to a payment method so its completed payments become the account's system receipts.">
        <CsvButton onClick={exportCsv} />
        <button onClick={() => setModal({})} className="a-btn primary"><Plus size={15} /> Add account</button>
      </FinHead>
      {tabs}
      {acc.loading && !acc.data ? <SkelRows n={4} />
        : acc.error && !acc.data ? <LoadError error={acc.error} onRetry={acc.reload} />
        : !accounts.length ? <Empty title="No receiving accounts yet" text="Add the bank accounts, wallets and cash boxes that receive money first — daily reconciliation works per account." />
        : (
          <RCard title="Receiving accounts — summary (last 7 days)" sub="Receipts and payments from the statement lines, current balance (last actual) and lines still not reconciled">
            <ReloadError error={acc.error} onRetry={acc.reload} />
            <Table minW={1100} heads={["Account", "Type", "Number", "Owner", "Linked payment method", "Receipts 7d", "Payments 7d", "Balance", "Not reconciled", "Active", ""]}>
              {accounts.map((a) => (
                <tr key={a.id} className={`a-tr ${a.isActive ? "" : "opacity-60"}`}>
                  <td className="a-td font-bold text-gray-800 whitespace-nowrap">{a.name}</td>
                  <td className="a-td"><Pill tone={TYPE_TONE[a.type]}>{a.type}</Pill></td>
                  <td className="a-td text-gray-500">{a.number || "—"}</td>
                  <td className="a-td text-gray-600">{a.owner || "—"}</td>
                  <td className="a-td text-gray-600">{a.paymentMethodName || <span className="text-gray-400 text-xs">Not linked</span>}</td>
                  <td className="a-td font-bold text-gray-800 whitespace-nowrap">{egp(a.receipts7)}</td>
                  <td className="a-td text-gray-600 whitespace-nowrap">{egp(a.payments7)}</td>
                  <td className="a-td font-extrabold text-gray-800 whitespace-nowrap">{egp(a.balance)}</td>
                  <td className="a-td whitespace-nowrap">{a.openLines ? <Pill tone="amber">{a.openLines} open</Pill> : <Pill tone="green">All reconciled</Pill>}
                    {a.lastReconciledDay && <div className="text-[11px] text-gray-400 mt-0.5">Last line {shortDate(a.lastReconciledDay)}</div>}</td>
                  <td className="a-td">{a.isActive ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Inactive</Pill>}</td>
                  <td className="a-td">
                    <div className="flex gap-1.5">
                      <button onClick={() => setModal({ account: a })} className="a-act" title={`Edit ${a.name}`} aria-label={`Edit ${a.name}`}><Pencil size={15} /></button>
                      <button onClick={() => askDelete(a)} className="a-act del" title={`Delete ${a.name}`} aria-label={`Delete ${a.name}`}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </RCard>
        )}
      {modal && <AccountModal account={modal.account} onClose={() => setModal(null)} onSaved={() => { setModal(null); acc.reload(); }} />}
      {removing && (
        <Modal title={`Delete ${removing.name}?`} onClose={() => !deleting && setRemoving(null)}
          actions={<>
            <button onClick={() => setRemoving(null)} disabled={deleting} className="a-btn">Cancel</button>
            <button onClick={deleteAccount} disabled={deleting} className="a-btn danger">{deleting ? "Deleting…" : "Delete account"}</button>
          </>}>
          <p className="text-sm text-gray-600">This removes the receiving account permanently.</p>
          <label className="flex items-start gap-2 mt-3 rounded-lg border border-gray-200 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={withDays} onChange={(e) => setWithDays(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#7d0a0a]" />
            <span className="text-sm text-gray-700">
              <b>Also delete its Daily Reconciliation days</b>
              <span className="block text-xs text-gray-500">All of this account's days are deleted with it, and its unmatched receipts stay, without an account. Days in a closed month block the delete.</span>
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-3">Without this, an account that already has days or unmatched receipts can't be deleted — or switch it to <b>Inactive</b> (Edit) to keep its records.</p>
        </Modal>
      )}
    </>
  );
}

function AccountModal({ account, onClose, onSaved }) {
  const edit = !!account;
  const [f, setF] = useState(() => ({
    name: account?.name || "", number: account?.number || "", type: account?.type || "Bank", owner: account?.owner || "",
    openingBalance: String(account?.openingBalance ?? 0), paymentMethodId: account?.paymentMethodId || "", isActive: account ? !!account.isActive : true,
  }));
  const [methods, setMethods] = useState(null); // [{id,name,isActive}] | { error }
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    api.get("/api/admin/paymentMethod")
      .then((r) => setMethods(r.data?.data?.data || []))
      .catch((e) => setMethods({ error: errText(e, "Could not load payment methods") }));
  }, []);

  const save = async () => {
    const opening = toInt(f.openingBalance);
    if (!f.name.trim()) { toast.error("Name is required"); return; }
    if (Number.isNaN(opening) || opening < 0) { toast.error("Opening balance must be a whole number, 0 or more"); return; }
    setSaving(true);
    try {
      const body = { name: f.name.trim(), number: f.number.trim(), type: f.type, owner: f.owner.trim(), openingBalance: opening, paymentMethodId: f.paymentMethodId || null, isActive: f.isActive };
      if (edit) await api.put(`/api/admin/finance/accounts/${account.id}`, body);
      else await api.post("/api/admin/finance/accounts", body);
      toast.success(edit ? "Account saved" : "Account added");
      onSaved();
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };

  const list = Array.isArray(methods) ? methods : [];
  return (
    <Modal wide title={edit ? `Edit ${account.name}` : "Add receiving account"} onClose={onClose}
      actions={<>
        <button onClick={onClose} className="a-btn">Cancel</button>
        <button onClick={save} disabled={saving} className="a-btn primary">{saving ? "Saving…" : edit ? "Save account" : "Add account"}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name" req><input value={f.name} onChange={set("name")} className="a-inp" placeholder="e.g. QNB Bank" /></Field>
        <Field label="Type" req>
          <select value={f.type} onChange={set("type")} className="a-inp">{["Bank", "Wallet", "Cash"].map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Number / handle"><input value={f.number} onChange={set("number")} className="a-inp" placeholder="Account number, wallet number…" /></Field>
        <Field label="Owner"><input value={f.owner} onChange={set("owner")} className="a-inp" placeholder="e.g. Accounts manager" /></Field>
        <Field label="Opening balance (EGP)" hint="Used as the opening of the first reconciliation day"><input type="number" min="0" step="1" value={f.openingBalance} onChange={set("openingBalance")} className="a-inp" /></Field>
        <Field label="Linked payment method" hint={methods?.error ? methods.error : "Completed payments with this method count as the account's system receipts"}>
          <select value={f.paymentMethodId} onChange={set("paymentMethodId")} className="a-inp" disabled={methods == null}>
            <option value="">{methods == null ? "Loading…" : "— Not linked —"}</option>
            {list.map((m) => <option key={m.id} value={m.id}>{m.name}{m.isActive === false ? " (inactive)" : ""}</option>)}
            {f.paymentMethodId && !list.some((m) => m.id === f.paymentMethodId) && <option value={f.paymentMethodId}>{account?.paymentMethodName || "Current method"}</option>}
          </select>
        </Field>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Switch on={f.isActive} onChange={(v) => setF((x) => ({ ...x, isActive: v }))} label="Active" />
          <span className="text-sm text-gray-600">{f.isActive ? "Active — receives money" : "Inactive — kept for the records"}</span>
        </div>
      </div>
    </Modal>
  );
}
