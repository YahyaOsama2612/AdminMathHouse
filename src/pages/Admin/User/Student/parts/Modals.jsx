// Wallet top-up and lesson-extension dialogs of the student profile.
import { useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/api/api";
import { Modal } from "@/components/admin/kit";
import { MONEY } from "./shared";

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000];

/* POST /api/admin/student/:id/top-up-wallet  { amount, operation: deposit|withdrawal, description? } */
export const TopUpWalletModal = ({
  studentId,
  studentName,
  currentBalance,
  initialOperation = "deposit",
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [operation, setOperation] = useState(initialOperation);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const add = operation === "deposit";

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg("");

    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/api/admin/student/${studentId}/top-up-wallet`, {
        amount: numericAmount,
        operation,
        description: description.trim() || undefined,
      });

      const returnedBalance = res?.data?.data?.balance;
      const nextBalance =
        typeof returnedBalance === "number"
          ? returnedBalance
          : operation === "deposit"
            ? currentBalance + numericAmount
            : currentBalance - numericAmount;

      toast.success(operation === "deposit"
        ? `Added ${numericAmount.toLocaleString("en-US")} EGP to the wallet`
        : `Deducted ${numericAmount.toLocaleString("en-US")} EGP from the wallet`);
      onSuccess(nextBalance);
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to top up wallet. Please try again.";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const a = Number(amount) || 0;
  const after = add ? Number(currentBalance) + a : Number(currentBalance) - a;

  return (
    <Modal
      title={`${add ? "Top up wallet" : "Deduct from wallet"}${studentName ? ` · ${studentName}` : ""}`}
      onClose={onClose}
      actions={
        <>
          <button type="button" onClick={onClose} className="a-btn">
            Cancel
          </button>
          <button
            type="submit"
            form="wallet-form"
            disabled={submitting}
            className={`a-btn ${add ? "primary" : "danger"}`}
          >
            {submitting ? "Processing..." : add ? "Confirm top-up" : "Confirm deduction"}
          </button>
        </>
      }
    >
      <form id="wallet-form" onSubmit={handleSubmit} className="pt-2">
        <div className="inline-flex gap-1 bg-gray-100 rounded-xl p-1 mb-4" role="group" aria-label="Operation">
          {[
            ["deposit", "+ Add money"],
            ["withdrawal", "− Deduct"],
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={operation === k}
              onClick={() => setOperation(k)}
              className={`h-9 px-4 rounded-lg text-sm font-bold ${operation === k ? "bg-white text-one shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Amount (EGP) <span className="text-red-500">*</span>
          </span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="a-inp !h-12 !text-xl font-extrabold tabular-nums"
            autoFocus
          />
        </label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className="h-8 px-3 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-one"
            >
              {n.toLocaleString("en-US")}
            </button>
          ))}
        </div>

        <label className="block mt-4">
          <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={add ? "e.g. Monthly subscription" : "e.g. Refund correction"}
            className="a-inp"
          />
        </label>

        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600">
          {a > 0 ? (
            after < 0 ? (
              <span className="text-red-600 font-semibold">That is more than the balance ({MONEY(currentBalance)}).</span>
            ) : (
              <>
                {MONEY(currentBalance)} {add ? "+" : "−"} {MONEY(a)} = <b className="text-gray-900">{MONEY(after)}</b> new balance
              </>
            )
          ) : (
            <>
              Current balance: <b className="text-gray-900">{MONEY(currentBalance)}</b>
            </>
          )}
        </div>

        {errorMsg && <p className="text-sm text-red-600 font-medium mt-3">{errorMsg}</p>}
      </form>
    </Modal>
  );
};

/* POST /api/admin/student/:id/increase-lessons-duration  { lessonIds: [id], days } */
export const ExtendLessonDurationModal = ({ studentId, lesson, onClose }) => {
  const [days, setDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg("");

    const numericDays = Number(days);
    if (!days || Number.isNaN(numericDays) || numericDays <= 0) {
      setErrorMsg("Please enter a valid number of days greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/api/admin/student/${studentId}/increase-lessons-duration`, {
        lessonIds: [lesson.id],
        days: numericDays,
      });
      toast.success("Lesson duration extended successfully");
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to extend lesson duration. Please try again.";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Extend lesson duration"
      onClose={onClose}
      actions={
        <>
          <button type="button" onClick={onClose} className="a-btn">
            Cancel
          </button>
          <button type="submit" form="extend-form" disabled={submitting} className="a-btn primary">
            {submitting ? "Processing..." : "Confirm extension"}
          </button>
        </>
      }
    >
      <p className="text-gray-500 mb-4">{lesson?.name}</p>
      <form id="extend-form" onSubmit={handleSubmit}>
        <label className="a-lbl-f" htmlFor="extend-days">
          Additional days
        </label>
        <input
          id="extend-days"
          type="number"
          min="1"
          step="1"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="e.g. 7"
          className="a-inp"
          autoFocus
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[3, 7, 14, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(String(n))}
              className="h-8 px-3 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-one"
            >
              +{n} days
            </button>
          ))}
        </div>
        {errorMsg && <p className="text-sm text-red-600 font-medium mt-3">{errorMsg}</p>}
      </form>
    </Modal>
  );
};
