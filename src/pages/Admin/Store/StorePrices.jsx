// Settings → Store prices (MathPortal "store-prices"), read-only and correct for this business: every price is set
// in EGP per course / chapter / lesson and checkout charges EGP. This page only previews what an EGP price is
// worth in each stored currency, using the rates of /api/admin/currency.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { RefreshCw, Search } from "lucide-react";
import api from "@/api/api";
import { Card, PageHead, SkelRows, Stat, errText, fmtStamp } from "@/components/admin/kit";
import { ErrorCard, Note, egp, useLoad } from "./parts";

const fmtRate = (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 2 : 4 });
const fmtMoney = (v, c) => {
  const n = Number(v).toLocaleString("en-US", { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 });
  return c?.code === "USD" ? `$${n}` : `${n} ${c?.code || ""}`;
};

export default function StorePrices() {
  const cur = useLoad("/api/admin/currency");
  const store = useLoad("/api/admin/store/courses");
  const [refreshing, setRefreshing] = useState(false);
  const [lastLive, setLastLive] = useState(null);
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState("");
  const [planId, setPlanId] = useState("");

  const currencies = useMemo(() => {
    const d = cur.data?.data;
    return (Array.isArray(d) ? d : []).map((c) => ({ ...c, rate: Number(c.exchangeRate) || 0 }));
  }, [cur.data]);
  const base = currencies.find((c) => c.isBase);
  const byCode = (code) => currencies.find((c) => String(c.code).toUpperCase() === code);
  const egpC = byCode("EGP"), usdC = byCode("USD");
  const updated = currencies.reduce((m, c) => (c.updatedAt && (!m || c.updatedAt > m) ? c.updatedAt : m), null);

  const courses = useMemo(() => (store.data?.courses || []).filter((c) => c.plans.length), [store.data]);
  const course = courses.find((c) => c.id === courseId) || courses[0];
  const plan = course?.plans.find((p) => p.id === planId) || course?.plans[0];

  // value of `amountEgp` in currency c: EGP → base → c (same as EGP → USD → c)
  const convert = (amountEgp, c) => (egpC?.rate && c.rate ? (amountEgp / egpC.rate) * c.rate : null);
  const perUsd = (c) => (usdC?.rate && c.rate ? c.rate / usdC.rate : null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await api.get("/api/admin/currency/rates/live");
      const d = r.data?.data?.data || {};
      setLastLive(d.lastUpdated || null);
      toast.success(`Exchange rates updated${d.rates ? ` · ${d.rates.length} currencies` : ""}`);
      cur.reload();
    } catch (e) { toast.error(errText(e)); } finally { setRefreshing(false); }
  };

  const rows = currencies.filter((c) => !q.trim() || `${c.code} ${c.name} ${c.symbol}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.code === "EGP" ? -1 : b.code === "EGP" ? 1 : a.code === "USD" ? -1 : b.code === "USD" ? 1 : String(a.code).localeCompare(b.code)));

  return (
    <div>
      <PageHead title="Store prices" sub="Read-only preview of what an EGP price is worth in other currencies — checkout always charges EGP.">
        <button className="a-btn !py-2 !text-xs" onClick={refresh} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Updating…" : "Refresh rates"}</button>
      </PageHead>

      {cur.loading && !cur.data ? <SkelRows n={6} /> : cur.error ? <ErrorCard text={cur.error} onRetry={cur.reload} /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-2xl p-4 text-white bg-one">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/70">Students pay in</p>
              <p className="text-3xl font-extrabold mt-1">EGP</p>
              <p className="text-xs text-white/75 mt-1">Prices are set in EGP for each course, chapter and lesson (Store → Courses / Packages). USD is stored next to each price as a reference.</p>
            </div>
            <Stat label="Exchange rates" value={`${currencies.length} currencies`}
              sub={`Base ${base ? base.code : "not set"}${updated ? ` · updated ${fmtStamp(updated)}` : ""}`} />
            <Stat label="Last rates published" value={lastLive ? "Just refreshed" : "—"} sub={lastLive ? String(lastLive).replace(/ \+0000$/, " UTC") : "Press Refresh rates to fetch today’s rates"} />
          </div>

          <div className="mb-4"><Note tone="gray">Preview only. Checkout charges the EGP price; nothing on this page changes what students pay. Edit prices in <Link to="/admin/store/courses" className="text-one font-bold hover:underline">Store → Courses</Link>.</Note></div>

          <Card bodyClass="p-0" title="What each currency is worth"
            sub={plan ? `Example: ${course.name} · ${plan.label} = ${egp(plan.totalEgp)}` : "Pick a course plan to see an example."}
            right={
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select className="a-inp !py-2 sm:!w-48" value={course?.id || ""} onChange={(e) => { setCourseId(e.target.value); setPlanId(""); }} aria-label="Course" disabled={!courses.length}>
                  {!courses.length && <option value="">{store.loading ? "Loading courses…" : "No priced course"}</option>}
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="a-inp !py-2 sm:!w-40" value={plan?.id || ""} onChange={(e) => setPlanId(e.target.value)} aria-label="Plan" disabled={!course}>
                  {course?.plans.map((p) => <option key={p.id} value={p.id}>{p.label} · {egp(p.totalEgp)}</option>)}
                </select>
              </div>
            }>
            {store.error && <div className="px-5 pt-4"><Note>{store.error} — the example column needs the courses list.</Note></div>}
            {!egpC && <div className="px-5 pt-4"><Note>EGP isn’t in the currencies list, so EGP prices can’t be converted. Add it in Settings → Currencies.</Note></div>}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search currency…" className="a-inp !pl-9 !py-2" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr>
                    <th className="a-th">Currency</th>
                    <th className="a-th">1 USD =</th>
                    <th className="a-th">{plan ? `${course.name} · ${plan.label}` : "Example"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const r = perUsd(c), v = plan ? convert(plan.totalEgp, c) : null;
                    return (
                      <tr key={c.id} className="a-tr">
                        <td className="a-td">
                          <p className="font-bold text-gray-800">{c.code} <span className="text-gray-400 font-semibold">{c.symbol}</span></p>
                          <p className="text-[11px] text-gray-400">{c.name}{c.isBase ? " · base" : ""}{c.code === "EGP" ? " · charged at checkout" : ""}</p>
                        </td>
                        <td className="a-td tabular-nums text-gray-600">{r != null ? `${fmtRate(r)} ${c.code}` : "—"}</td>
                        <td className={`a-td whitespace-nowrap ${c.code === "EGP" ? "font-extrabold text-one" : "font-extrabold text-gray-900"}`}>{v != null ? fmtMoney(v, c) : "—"}</td>
                      </tr>
                    );
                  })}
                  {!rows.length && <tr><td colSpan={3} className="py-10 text-center text-sm text-gray-400">{currencies.length ? "No currency matches." : "No currencies yet — add them in Settings → Currencies."}</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
