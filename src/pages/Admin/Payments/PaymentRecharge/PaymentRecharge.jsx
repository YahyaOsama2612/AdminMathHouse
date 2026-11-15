import { API_URL } from "@/api/api";
import PaymentRequests from "../parts/PaymentRequests";

/* Payments → Wallet recharge requests (MathPortal "Receipts & Activation" look). */
const PaymentRecharge = ({ headless = false }) => (
  <PaymentRequests
    headless={headless}
    title="Wallet Recharge Requests"
    sub="Students who topped up their wallet. Check each receipt against the amount before approving — approving adds the amount to the student’s wallet."
    endpoint="/api/admin/payment/recharge-requests"
    replyUrl={(id) => `${API_URL}/api/admin/payment/recharge-requests/${id}/reply`}
    noun="recharge request"
    itemHeader="Request"
    renderItem={(row) => (
      <div>
        <p className="font-semibold text-gray-800">Wallet recharge</p>
        {row.source && <p className="text-[11px] text-gray-400 capitalize">Source: {row.source}</p>}
      </div>
    )}
    successMsg={{ approve: "Request approved successfully!", reject: "Request rejected successfully!" }}
    confirmText={{
      approve: "Are you sure you want to approve this recharge request?",
      reject: "Are you sure you want to reject this recharge request?",
    }}
  />
);

export default PaymentRecharge;
