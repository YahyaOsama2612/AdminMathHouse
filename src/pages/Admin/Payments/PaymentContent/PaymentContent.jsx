import { Tag } from "lucide-react";
import PaymentRequests from "../parts/PaymentRequests";

/* Payments → Content purchase requests (MathPortal "Receipts & Activation" look). */
const PaymentContent = ({ headless = false }) => (
  <PaymentRequests
    headless={headless}
    title="Content Requests"
    sub="Students who bought a course, chapter or lesson with a transfer. Check the receipt before unlocking the content."
    endpoint="/api/admin/payment/content-buy-requests"
    replyUrl={(id) => `/api/admin/payment/content-buy-requests/${id}/reply`}
    noun="content request"
    itemHeader="Purpose / Source"
    renderItem={(row) => (
      <div>
        <p className="font-semibold text-gray-800 flex items-center gap-1 capitalize"><Tag size={13} className="text-gray-400 shrink-0" />{row.purpose || "—"}</p>
        <p className="text-[11px] text-gray-400 capitalize">Source: {row.source || "—"}</p>
      </div>
    )}
    successMsg={{ approve: "Content request approved successfully", reject: "Content request rejected successfully" }}
    confirmText={{
      approve: "Are you sure you want to approve this content purchase?",
      reject: "Are you sure you want to reject this request?",
    }}
  />
);

export default PaymentContent;
