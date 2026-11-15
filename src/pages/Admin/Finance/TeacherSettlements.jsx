// Payment → Teacher settlements (design: finSettlementRows + RepPages['pay-teachers'], Table 20 · §15).
// API: GET /api/admin/finance/teachers?period, PUT /teachers/:id/contract, POST /teachers/:id/settlement, POST …/settlement/pay.
import { useState } from "react";
import { AlertTriangle, BadgeCheck, CalendarCheck2, FileSignature, Lock, Paperclip, Wallet } from "lucide-react";
import api from "@/api/api";
import { Pill } from "@/components/admin/kit";
import { Kpi, RCard, CsvButton, downloadCsv } from "@/pages/Admin/Reports/parts";
import { useFin, FinHead, DocInput, Field, egp, shortDate, todayIso, thisMonth, monthLabel } from "./finKit";
import { useRun, LoadState, FTable, Mini, Chips, FormModal, matches, toastNeed , DeleteButton } from "./partsB";

const contractText = (c) => (!c ? "" : c.kind === "per_session"
  ? `${egp(c.ratePerSession)} / session`
  : `${Number(c.percent)}% of ${c.basis === "net" ? "net" : "gross"}`);

export default function TeacherSettlements() {
  const [period, setPeriod] = useState(thisMonth());
  const { data, loading, error, reload } = useFin(`/teachers?period=${period}`);
  const [busy, run] = useRun(reload);
  const [show, setShow] = useState("active");
  const [q, setQ] = useState("");
  const [bases, setBases] = useState({}); // teacherId → typed base for % contracts
  const [modal, setModal] = useState(null); // { kind: contract|pay, row }
  const [f, setF] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));
  const close = () => setModal(null);
  const open = (kind, row, init) => { setF(init); setModal({ kind, row }); };

  const locked = !!data?.locked;
  const all = data?.teachers || [];
  const active = all.filter((t) => t.held || t.upcoming || t.cancelled || t.settlement);
  const rows = (show === "active" ? active : all).filter((t) => matches(q, t.name, t.email, t.contract?.contractRef));
  const saved = all.filter((t) => t.settlement);
  const paid = saved.filter((t) => t.settlement.paidOn);
  const missing = active.filter((t) => !t.contract);

  const baseOf = (t) => (bases[t.id] ?? (t.settlement?.base != null ? String(t.settlement.base) : ""));
  const previewOf = (t) => {
    if (!t.contract) return null;
    if (t.contract.kind === "per_session") return t.preview ?? t.held * (Number(t.contract.ratePerSession) || 0);
    const b = baseOf(t);
    return b === "" ? null : Math.round((Number(b) * Number(t.contract.percent)) / 100);
  };

  const saveMonth = (t) => {
    const body = { period };
    if (t.contract.kind === "percent") {
      const b = Number(baseOf(t));
      if (baseOf(t) === "" || !Number.isInteger(b) || b < 0) return toastNeed("The month's revenue base (whole EGP)");
      body.base = b;
    }
    run(() => api.post(`/api/admin/finance/teachers/${t.id}/settlement`, body), "Settlement saved",
      () => setBases((s) => { const n = { ...s }; delete n[t.id]; return n; }));
  };
  const saveContract = () => {
    if (!f.contractRef?.trim()) return toastNeed("Contract reference");
    let body;
    if (f.kind === "per_session") {
      const r = Number(f.ratePerSession);
      if (!Number.isInteger(r) || r < 1) return toastNeed("The amount per session (whole EGP)");
      body = { kind: "per_session", ratePerSession: r, contractRef: f.contractRef.trim(), notes: f.notes.trim() || undefined };
    } else {
      const p = Number(f.percent);
      if (!(p > 0 && p <= 100)) return toastNeed("A share between 0 and 100%");
      body = { kind: "percent", percent: p, basis: f.basis, contractRef: f.contractRef.trim(), notes: f.notes.trim() || undefined };
    }
    run(() => api.put(`/api/admin/finance/teachers/${modal.row.id}/contract`, body), "Contract saved", close);
  };
  const pay = () => {
    if (!f.paidOn) return toastNeed("The payment date");
    if (!f.paymentRef?.trim()) return toastNeed("The transfer reference");
    run(() => api.post(`/api/admin/finance/teachers/${modal.row.id}/settlement/pay`, { period, paidOn: f.paidOn, paymentRef: f.paymentRef.trim(), proof: f.proof || null }),
      "Marked as paid", close);
  };
  const openContract = (t) => open("contract", t, {
    kind: t.contract?.kind || "per_session", ratePerSession: t.contract?.ratePerSession != null ? String(t.contract.ratePerSession) : "",
    percent: t.contract?.percent != null ? String(t.contract.percent) : "", basis: t.contract?.basis || "gross",
    contractRef: t.contract?.contractRef || "", notes: t.contract?.notes || "",
  });
  const exportCsv = () => downloadCsv(`teacher-settlements-${period}.csv`, [
    ["Month", "Teacher", "Held", "Upcoming", "Cancelled", "Contract", "Contract ref", "Base", "Due (saved)", "Saved", "Paid on", "Transfer ref", "Proof"],
    ...rows.map((t) => [period, t.name, t.held, t.upcoming, t.cancelled, t.contract ? contractText(t.contract) : "MISSING", t.contract?.contractRef || "",
      t.settlement?.base ?? "", t.settlement?.due ?? "", t.settlement ? "yes" : "", t.settlement?.paidOn || "", t.settlement?.paymentRef || "", t.settlement?.proof || ""]),
  ]);

  return (
    <div>
      <FinHead title="Teacher Settlements" refLabel="Table 20 · §15"
        sub="Each teacher’s due is calculated from the written contract — an amount per session, or a share of gross or net collections. No default rate is ever applied. Pay only with a transfer reference or proof.">
        <CsvButton onClick={exportCsv} />
      </FinHead>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="a-inp !w-auto !py-1.5 text-xs" aria-label="Month" />
        <Chips value={show} onChange={setShow} opts={[["active", "With sessions this month", active.length], ["all", "All teachers", all.length]]} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teacher or contract…" className="a-inp !py-1.5 text-xs flex-1 min-w-[160px]" />
      </div>

      <LoadState loading={loading} error={error} data={data} reload={reload}>
        {locked && (
          <div className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
            <Lock size={14} className="mt-0.5 shrink-0" />
            <span><b>{monthLabel(period)} is closed.</b> Its settlements are read-only — they can’t be recalculated or marked as paid here.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Total due" value={egp(saved.reduce((a, t) => a + (Number(t.settlement.due) || 0), 0))} sub={`${saved.length} saved settlements`} icon={Wallet} />
          <Kpi label="Paid" value={egp(paid.reduce((a, t) => a + (Number(t.settlement.due) || 0), 0))} sub={`${paid.length} teacher${paid.length === 1 ? "" : "s"}`} bg="#f0fdf4" fg="#15803d" icon={BadgeCheck} />
          <Kpi label="Sessions held" value={all.reduce((a, t) => a + (t.held || 0), 0)} sub={`${all.reduce((a, t) => a + (t.upcoming || 0), 0)} upcoming · ${all.reduce((a, t) => a + (t.cancelled || 0), 0)} cancelled`} bg="#eff6ff" fg="#1d4ed8" icon={CalendarCheck2} />
          <Kpi label="Contracts missing" value={missing.length} sub={missing.length ? "Payment blocked" : "All covered"} bg={missing.length ? "#fef3c7" : "#f0fdf4"} fg={missing.length ? "#b45309" : "#15803d"} icon={missing.length ? AlertTriangle : FileSignature} />
        </div>

        <RCard title={`Settlement register — ${monthLabel(period)}`} sub="Save the month to freeze the due; recalculating is allowed until it is paid" className="mb-4 !px-3 sm:!px-5">
          <FTable count={rows.length} empty={show === "active" ? "No teacher has sessions in this month." : "No teachers."}
            heads={["Teacher", "Held", "Contract", "Base", "Due", "Status", ""]}>
            {rows.map((t) => {
              const s = t.settlement, c = t.contract, isPaid = !!s?.paidOn, pv = previewOf(t);
              return (
                <tr key={t.id} className={`a-tr align-top ${c ? "" : "bg-amber-50/50"}`}>
                  <td className="a-td min-w-[140px]"><p className="font-bold text-gray-800">{t.name}</p>{t.email && <p className="text-[11px] text-gray-400">{t.email}</p>}</td>
                  <td className="a-td whitespace-nowrap">
                    <b className="text-gray-800">{t.held}</b>
                    <p className="text-[11px] text-gray-400">{t.upcoming} upcoming · {t.cancelled} cancelled</p>
                    {s && s.sessions !== t.held && !isPaid && <p className="text-[11px] text-amber-600">Saved with {s.sessions}</p>}
                  </td>
                  <td className="a-td whitespace-nowrap">
                    {c ? (
                      <>
                        <p className="text-gray-700 font-semibold">{contractText(c)}</p><p className="text-[11px] text-gray-400">{c.contractRef}</p>
                        <DeleteButton label="Remove contract" what={`contract of ${t.name}`} title={`Remove ${t.name}'s contract?`} busy={busy}
                          description={`${contractText(c)}${c.contractRef ? ` · ${c.contractRef}` : ""}`}
                          warning="Months already saved or paid keep their amounts. Until you add a new contract, new months for this teacher can't be calculated or paid."
                          note={null} confirmLabel="Remove contract"
                          onDelete={() => run(() => api.delete(`/api/admin/finance/teachers/${t.id}/contract`), "Contract removed")} />
                      </>
                    ) : (
                      <div className="flex flex-col items-start gap-1.5"><Pill tone="amber">No contract</Pill><Mini tone="primary" onClick={() => openContract(t)}>Add contract</Mini></div>
                    )}
                  </td>
                  <td className="a-td whitespace-nowrap">
                    {c?.kind === "percent" ? (
                      isPaid || locked
                        ? <span className="text-gray-700">{s?.base != null ? egp(s.base) : "—"}</span>
                        : <input type="number" min="0" step="1" value={baseOf(t)} onChange={(e) => setBases((b) => ({ ...b, [t.id]: e.target.value }))}
                            placeholder={`${c.basis === "net" ? "Net" : "Gross"} EGP`} className="a-inp !py-1.5 text-xs !w-32" aria-label={`Revenue base for ${t.name}`} />
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="a-td whitespace-nowrap">
                    {s ? <b className="text-gray-900">{egp(s.due)}</b> : pv != null ? <><span className="text-gray-400 font-semibold">{egp(pv)}</span><p className="text-[11px] text-gray-400">not saved</p></> : <span className="text-gray-400">—</span>}
                    {s && !isPaid && pv != null && pv !== Number(s.due) && <p className="text-[11px] text-amber-600">Now {egp(pv)} — recalculate</p>}
                  </td>
                  <td className="a-td whitespace-nowrap">
                    {!c ? <Pill tone="amber">Blocked — no contract</Pill>
                      : isPaid ? (
                        <>
                          <Pill tone="green">Paid on {shortDate(s.paidOn)}</Pill>
                          {s.paymentRef && <p className="text-[11px] text-gray-400 mt-1">Ref: {s.paymentRef}</p>}
                          {s.proof && <a href={s.proof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-one hover:underline"><Paperclip size={12} /> Proof</a>}
                        </>
                      ) : s ? <><Pill tone="blue">Saved</Pill><p className="text-[11px] text-gray-400 mt-1">{shortDate(s.savedAt)}</p></>
                      : <Pill tone="gray">Not saved</Pill>}
                  </td>
                  <td className="a-td">
                    <div className="flex items-center justify-end gap-1.5">
                      {c && !isPaid && !locked && <Mini tone="primary" disabled={busy} onClick={() => saveMonth(t)}>{s ? "Recalculate" : "Save month"}</Mini>}
                      {s && !isPaid && !locked && <Mini tone="green" onClick={() => open("pay", t, { paidOn: todayIso(), paymentRef: "", proof: null })}>Mark paid</Mini>}
                      {c && <button onClick={() => openContract(t)} className="a-act" title="Contract" aria-label="Contract"><FileSignature size={15} /></button>}
                      {s && !locked && (
                        <DeleteButton what={`${t.name}'s saved month`} title={`Delete ${t.name}'s saved ${period}?`} busy={busy}
                          warning={isPaid ? "This month is marked paid — the payment record (date, reference, proof) is removed too." : null}
                          onDelete={() => run(() => api.delete(`/api/admin/finance/teachers/${t.id}/settlement?period=${period}`), "Saved month deleted")} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </FTable>
          <div className="text-[11px] text-gray-500 mt-3 space-y-0.5 px-1">
            <p><b className="text-gray-700">How the due is calculated:</b> per-session contracts — held sessions × the rate; % contracts — the month’s revenue base × the share (enter the base, gross or net as the contract says).</p>
            <p>No default rate is ever used — a teacher without a contract can’t be settled. “Held” counts scheduled sessions dated in the month up to today.</p>
            <p>Free trial sessions are not tracked separately yet — check them by hand before saving.</p>
          </div>
        </RCard>
      </LoadState>

      {modal?.kind === "contract" && (
        <FormModal title={`Contract — ${modal.row.name}`} onClose={close} onSave={saveContract} busy={busy} saveLabel="Save contract"
          intro={<p className="text-xs text-gray-500">Copy the terms from the signed contract. Months already saved keep their due until you recalculate them; paid months never change.</p>}>
          <div className="sm:col-span-2">
            <span className="a-lbl-f">How the teacher is paid <span className="text-red-500">*</span></span>
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <label className="inline-flex items-center gap-2"><input type="radio" name="fin-kind" checked={f.kind === "per_session"} onChange={() => setF((s) => ({ ...s, kind: "per_session" }))} className="accent-[#7d0a0a]" /> Amount per session</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="fin-kind" checked={f.kind === "percent"} onChange={() => setF((s) => ({ ...s, kind: "percent" }))} className="accent-[#7d0a0a]" /> Share of collections (%)</label>
            </div>
          </div>
          {f.kind === "per_session" ? (
            <Field label="Amount per session (EGP)" req hint="From the signed contract — never a default"><input type="number" min="1" step="1" value={f.ratePerSession} onChange={set("ratePerSession")} className="a-inp" /></Field>
          ) : (
            <>
              <Field label="Teacher share %" req hint="From the signed contract — never a default"><input type="number" min="0.01" max="100" step="0.01" value={f.percent} onChange={set("percent")} className="a-inp" /></Field>
              <Field label="Calculated on" req>
                <select value={f.basis} onChange={set("basis")} className="a-inp">
                  <option value="gross">Gross collected</option>
                  <option value="net">Net after discounts</option>
                </select>
              </Field>
            </>
          )}
          <Field label="Contract reference" req><input value={f.contractRef} onChange={set("contractRef")} placeholder="e.g. TC-014" className="a-inp" /></Field>
          <Field label="Notes" span><textarea rows={2} value={f.notes} onChange={set("notes")} className="a-inp" /></Field>
        </FormModal>
      )}

      {modal?.kind === "pay" && (
        <FormModal title={`Pay ${modal.row.name}`} onClose={close} onSave={pay} busy={busy} saveLabel="Record payment"
          intro={<div className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">{monthLabel(period)} · {modal.row.settlement.sessions} sessions · due <b className="text-gray-900">{egp(modal.row.settlement.due)}</b>. This records the payment — the transfer itself is made outside the system.</div>}>
          <Field label="Paid on" req><input type="date" value={f.paidOn} onChange={set("paidOn")} className="a-inp" /></Field>
          <Field label="Transfer reference" req><input value={f.paymentRef} onChange={set("paymentRef")} placeholder="TRX-… / receipt number" className="a-inp" /></Field>
          <div className="sm:col-span-2"><DocInput label="Proof of transfer (optional)" value={f.proof} onChange={set("proof")} /></div>
        </FormModal>
      )}
    </div>
  );
}
