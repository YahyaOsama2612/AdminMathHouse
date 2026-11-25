import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Check, Gift } from "lucide-react";
import useGet from "@/hooks/useGet";
import axios from "@/api/api";
import { Card, Empty, Modal, PageHead, Pill, SkelRows, Stat, errText } from "@/components/admin/kit";

/* Student → Packages: the packages of the student's category, which ones they bought,
   and enrolling them in one with a manual payment method.
   GET  /api/admin/student/:id/packages
   POST /api/admin/student/:id/packages { packageId, paymentMethodId } */

const TYPE_TONE = { live: "blue", exam: "amber", question: "purple" };
const REASONS = ["Compensation", "Free trial", "Sibling discount", "Teacher's mistake", "Gift"];
const fmtDate = (v) => (v ? new Date(String(v).replace(" ", "T")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

/* Free live sessions with a reason: POST/GET /api/admin/student/:id/free-sessions.
   They go into the live balance; the reports show sessions used from them as free — given by admin. */
function FreeSessions({ studentId, studentName, onGiven }) {
  const { data, refetch } = useGet(`/api/admin/student/${studentId}/free-sessions`);
  // flat response { success, data: { grants, total } }; useGet keeps res.data
  const grants = data?.data?.grants || [];
  const total = data?.data?.total || 0;
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = Number.isInteger(Number(n)) && Number(n) >= 1 && Number(n) <= 50 && reason.trim().length >= 3;

  const give = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const r = await axios.post(`/api/admin/student/${studentId}/free-sessions`, { sessions: Number(n), reason: reason.trim() });
      toast.success(`${n} free session${Number(n) === 1 ? "" : "s"} added — live balance is now ${r.data?.data?.liveBalance ?? "updated"}`);
      setOpen(false); setN(1); setReason("");
      refetch(); onGiven?.();
    } catch (err) {
      toast.error(errText(err, "Could not add the free sessions"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mb-4" title={<span className="inline-flex items-center gap-2"><Gift size={16} className="text-amber-600" /> Free live sessions</span>}
        sub={total ? `${total} given free so far — they count as free (0 EGP) in the reports` : "Give sessions without a payment: compensation, a trial, a discount…"}
        right={<button onClick={() => setOpen(true)} className="a-btn primary !py-1.5"><Gift size={15} /> Give free sessions</button>}>
        {grants.length ? (
          <ul className="divide-y divide-gray-50 -my-2">
            {grants.map((g) => (
              <li key={g.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                <b className="text-amber-700 w-16 shrink-0">+{g.sessions}</b>
                <span className="text-gray-800 flex-1 min-w-[140px]">{g.reason}</span>
                <span className="text-xs text-gray-400">{fmtDate(g.createdAt)}{g.givenBy ? ` · by ${g.givenBy}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-400">No free sessions given yet.</p>}
      </Card>

      {open && (
        <Modal title="Give free live sessions" onClose={() => !saving && setOpen(false)}
          actions={<>
            <button onClick={() => setOpen(false)} disabled={saving} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={give} disabled={saving || !valid} className="a-btn primary !py-2">{saving ? "Adding…" : `Add ${Number(n) || 0} free session${Number(n) === 1 ? "" : "s"}`}</button>
          </>}>
          <p className="mb-3">Adds sessions to <b>{studentName}</b>&apos;s live balance with no payment. Sessions they use from it earn 0 EGP in the reports.</p>
          <label className="a-lbl-f" htmlFor="free-n">How many sessions</label>
          <input id="free-n" type="number" min={1} max={50} value={n} onChange={(e) => setN(e.target.value)} className="a-inp !w-32 mb-3" />
          <label className="a-lbl-f" htmlFor="free-reason">Reason <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {REASONS.map((r) => <button key={r} type="button" onClick={() => setReason(r)} className={`a-chip ${reason === r ? "on" : ""}`}>{r}</button>)}
          </div>
          <input id="free-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} placeholder="Or write the reason…" className="a-inp" />
        </Modal>
      )}
    </>
  );
}

const UserPackage = () => {
  const navigate = useNavigate();
  const { id: studentId } = useParams();
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [confirmPkg, setConfirmPkg] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const { data, loading, error, refetch } = useGet(`/api/admin/student/${studentId}/packages`);
  const rootData = data?.data?.data;
  const student = rootData?.student;
  const paymentMethods = rootData?.manualPaymentMethods || [];
  const all = useMemo(() => (Array.isArray(rootData?.packages) ? rootData.packages : []), [rootData]);
  const ql = q.trim().toLowerCase();
  const list = all.filter((p) => (type === "all" || p.type === type) && (!ql || String(p.name || "").toLowerCase().includes(ql)));
  const methodName = paymentMethods.find((m) => String(m.id) === String(selectedPaymentMethod))?.name;

  const askEnroll = (pkg) => {
    if (!selectedPaymentMethod) { toast.error("Choose a payment method first, then enroll the package."); return; }
    setConfirmPkg(pkg);
  };

  const enroll = async () => {
    const row = confirmPkg;
    if (!row?.id) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/admin/student/${studentId}/packages`, { packageId: row.id, paymentMethodId: selectedPaymentMethod });
      toast.success(`${row.name} enrolled for ${student?.name || "the student"}`);
      setConfirmPkg(null);
      await refetch();
    } catch (err) {
      console.error("Failed to enroll package:", err);
      toast.error(errText(err, "Could not enroll the package"));
    } finally {
      setActionLoading(false);
    }
  };

  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-0";

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm font-semibold text-gray-500 hover:text-one mb-3 inline-flex items-center gap-1"><ArrowLeft size={15} /> Back</button>
      <PageHead title={student ? `${student.name} · Packages` : "Student packages"} sub="Packages for the student's category. Enrolling records a manual payment and adds the package." />

      {loading && !data ? <SkelRows n={6} /> : error ? <Empty title="Could not load the packages" text={String(error)} /> : (
        <>
          {student && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Stat label="Live balance" value={student.balances?.live || 0} />
              <Stat label="Exam balance" value={student.balances?.exam || 0} />
              <Stat label="Question balance" value={student.balances?.question || 0} />
              <Stat label="Packages bought" value={all.filter((p) => p.isPurchasedBefore).length} sub={`of ${all.length} available`} />
            </div>
          )}

          {student && <FreeSessions studentId={studentId} studentName={student.name} onGiven={refetch} />}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search packages…" className={`${sel} col-span-2 md:flex-1 md:min-w-[200px]`} />
            <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
              <option value="all">All types</option>
              <option value="live">Live</option>
              <option value="exam">Exam</option>
              <option value="question">Question</option>
            </select>
            <select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className={`${sel} ${selectedPaymentMethod ? "" : "!border-amber-300"}`} aria-label="Payment method">
              <option value="">Payment method…</option>
              {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <span className="text-xs text-gray-400 col-span-2 md:ml-auto">{list.length} of {all.length}</span>
          </div>

          <Card bodyClass="">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{["Package", "Type", "Count", "Price", "Duration", "Purchases", ""].map((h, i) => <th key={i} className="a-th">{h}</th>)}</tr></thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="a-tr">
                      <td className="a-td font-bold text-gray-800">{p.name}</td>
                      <td className="a-td"><Pill tone={TYPE_TONE[p.type] || "gray"}>{String(p.type || "—").toUpperCase()}</Pill></td>
                      <td className="a-td font-semibold text-gray-800">{p.number ?? "—"}</td>
                      <td className="a-td font-semibold text-gray-800 whitespace-nowrap">{p.price} EGP</td>
                      <td className="a-td whitespace-nowrap">{p.duration} Days</td>
                      <td className="a-td">{p.purchaseCount || 0}</td>
                      <td className="a-td text-right">
                        {p.isPurchasedBefore ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700" title="Cancelling an enrolment is done from finance / payments."><Check size={14} /> Enrolled</span>
                        ) : (
                          <button onClick={() => askEnroll(p)} disabled={actionLoading} className="a-btn !py-1.5 !px-3">Enroll</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!list.length && <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">{all.length ? "No packages match." : "No packages for this student's category."}</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
          {!paymentMethods.length && <p className="text-xs text-amber-700 mt-3">No active manual payment method — add one in Payment Methods to enroll packages.</p>}
        </>
      )}

      {confirmPkg && (
        <Modal
          title="Enroll this package?"
          onClose={() => !actionLoading && setConfirmPkg(null)}
          actions={<>
            <button onClick={() => setConfirmPkg(null)} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={enroll} disabled={actionLoading} className="a-btn primary !py-2">{actionLoading ? "Enrolling…" : "Enroll"}</button>
          </>}
        >
          <p>Enroll <b>{student?.name}</b> in <b>{confirmPkg.name}</b> for <b>{confirmPkg.price} EGP</b>, paid by <b>{methodName}</b>?</p>
        </Modal>
      )}
    </div>
  );
};

export default UserPackage;
