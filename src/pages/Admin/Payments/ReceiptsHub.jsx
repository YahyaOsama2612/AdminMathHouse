import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/api/api";
import { PageHead, Tabs } from "@/components/admin/kit";
import PaymentRecharge from "./PaymentRecharge/PaymentRecharge";
import PaymentPackage from "./PaymentPackage/PaymentPackage";
import PaymentContent from "./PaymentContent/PaymentContent";

/* Payment → Receipts & Activation (MathPortal design): every receipt students upload, in one place —
   wallet top-ups, package orders and content orders. Each tab keeps its own URL so old links still work:
   /admin/payment/paymentrecharge · /paymentpackage · /payment-content */

const TABS = [
  { key: "recharge", path: "/admin/payment/paymentrecharge", label: "Wallet top-ups", Comp: PaymentRecharge, endpoint: "/api/admin/payment/recharge-requests" },
  { key: "package", path: "/admin/payment/paymentpackage", label: "Package orders", Comp: PaymentPackage, endpoint: "/api/admin/payment/package-buy-requests" },
  { key: "content", path: "/admin/payment/payment-content", label: "Content orders", Comp: PaymentContent, endpoint: "/api/admin/payment/content-buy-requests" },
];

export default function ReceiptsHub() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = TABS.find((t) => pathname.toLowerCase().startsWith(t.path)) || TABS[0];
  const [counts, setCounts] = useState({});

  useEffect(() => {
    Promise.all(TABS.map((t) => api.get(`${t.endpoint}?limit=100`)
      .then((r) => [t.key, r.data?.data?.data?.pending?.length ?? 0]).catch(() => [t.key, 0])))
      .then((pairs) => setCounts(Object.fromEntries(pairs)));
  }, [pathname]);

  const Comp = tab.Comp;
  return (
    <div>
      <PageHead title="Receipts & Activation" sub="Check each uploaded receipt against the amount, then approve to activate (wallet credit, package or content) — or reject with a reason." />
      <Tabs value={tab.key} onChange={(k) => navigate(TABS.find((t) => t.key === k).path)}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] || 0 }))} />
      <Comp key={tab.key} headless />
    </div>
  );
}
