import { Package } from "lucide-react";
import PaymentRequests from "../parts/PaymentRequests";

/* Payments → Package purchase requests (MathPortal "Receipts & Activation" look). */
const PaymentPackage = ({ headless = false }) => (
  <PaymentRequests
    headless={headless}
    title="Package Requests"
    sub="Students who bought a package with a transfer. Check the receipt matches the package price before approving."
    endpoint="/api/admin/payment/package-buy-requests"
    replyUrl={(id) => `/api/admin/payment/package-buy-requests/${id}/reply`}
    noun="package request"
    itemHeader="Package"
    renderItem={(row) => (
      <div>
        <p className="font-semibold text-gray-800 flex items-center gap-1"><Package size={13} className="text-gray-400 shrink-0" />{row.package?.name || "—"}</p>
        <p className="text-[11px] text-gray-400 capitalize">{[row.package?.type, row.package?.number != null ? `${row.package.number} items` : null].filter(Boolean).join(" · ")}</p>
      </div>
    )}
    successMsg={{ approve: "Package request approved successfully", reject: "Package request rejected successfully" }}
    confirmText={{
      approve: "Are you sure you want to approve this package purchase?",
      reject: "Are you sure you want to reject this request?",
    }}
  />
);

export default PaymentPackage;
