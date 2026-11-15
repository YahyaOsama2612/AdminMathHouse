import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, Coins, Wallet, XCircle } from "lucide-react";
import { PageHead, Pill } from "@/components/admin/kit";
import { CsvButton, Kpi, RCard, RangePicker, ReportState, dayStr, downloadCsv, money, presetRange, useReport } from "./parts";

/* Reports → Payments (design: rep-payments) from the payments the system already records.
   GET /api/admin/reports/payments?from&to
   Left out (no backend yet, part of the Finance area): contract value, installments, unmatched receipts,
   expenses, cash-flow forecast, program margin, sales per employee. */

const COLORS = ["#7d0a0a", "#1d4ed8", "#0d9488", "#d97706", "#7e22ce", "#64748b"];
const STATUS = { completed: ["Paid", "green"], pending: ["Waiting", "amber"], rejected: ["Rejected", "red"] };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const tip = { background: "#0f172a", border: 0, borderRadius: 8, color: "#fff", fontSize: 12 };

export default function ReportsPayments() {
  const navigate = useNavigate();
  const [range, setRange] = useState({ key: "this_month", ...presetRange("this_month") });
  const { data, loading, error, reload } = useReport(`/api/admin/reports/payments?from=${range.from}&to=${range.to}`);
  const [status, setStatus] = useState("");

  const t = data?.totals || {};
  const byMethod = data?.byMethod || [];
  const months = (data?.months || []).map((m) => ({ ...m, label: `${MON[Number(m.month.slice(5)) - 1]} ${m.month.slice(2, 4)}` }));
  const tx = (data?.transactions || []).filter((x) => !status || x.status === status);
  const low = data?.lowBalance || [];
  const decided = t.collected + t.rejected;

  const exportCsv = () => downloadCsv(`payments-report-${range.from}-to-${range.to}.csv`, [
    ["Date", "Student", "Type", "Package", "Method", "Amount (EGP)", "Status", "Reason"],
    ...(data?.transactions || []).map((x) => [x.createdAt, x.studentName || "", x.purpose, x.packageName || "", x.method, x.amount, x.status, x.reason || ""]),
  ]);

  return (
    <div>
      <PageHead title="Payments report" sub="Money collected, what is still waiting for review, and students about to run out of live sessions.">
        {data && <CsvButton onClick={exportCsv} />}
      </PageHead>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4"><RangePicker value={range} onChange={setRange} /></div>
      <ReportState loading={loading && !data} error={error} onRetry={reload}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Kpi label="Collected" value={money(t.collected)} sub={`${t.collectedCount} paid orders in this period`} bg="#f0fdf4" fg="#15803d" icon={Coins} />
          <Kpi label="Waiting for review" value={money(t.pendingNow)} sub={`${t.pendingNowCount} receipts right now`} bg="#fef3c7" fg="#b45309" icon={Clock} />
          <Kpi label="Rejected" value={money(t.rejected)} sub={`${t.rejectedCount} orders · ${decided ? Math.round((t.collected / decided) * 100) : 0}% of money accepted`} icon={XCircle} />
          <Kpi label="Wallet balances" value={money(t.walletBalances)} sub={`${t.walletsWithBalance || 0} students hold money`} bg="#eff6ff" fg="#1d4ed8" icon={Wallet} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-4">
          <RCard title="Collected by payment method" sub="Paid orders in this period" className="xl:col-span-2">
            {byMethod.length ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-44 h-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byMethod} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="100%" stroke="#fff" strokeWidth={3}>
                        {byMethod.map((m, i) => <Cell key={m.name} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tip} itemStyle={{ color: "#fff" }} formatter={(v) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 w-full space-y-2 text-sm">
                  {byMethod.map((m, i) => (
                    <li key={m.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }}></span>
                      <span className="flex-1 truncate text-gray-700">{m.name} <span className="text-gray-400">· {m.count}</span></span>
                      <b className="text-gray-800 whitespace-nowrap">{money(m.amount)}</b>
                    </li>
                  ))}
                  {(data?.byPurpose || []).length > 0 && (
                    <li className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-500">
                      {data.byPurpose.map((p) => `${p.name}: ${money(p.amount)}`).join(" · ")}
                    </li>
                  )}
                </ul>
              </div>
            ) : <p className="text-sm text-gray-400 py-10 text-center">No paid orders in this period</p>}
          </RCard>
          <RCard title="Collected per month" sub="Last 12 months, paid orders only" className="xl:col-span-3">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={tip} labelStyle={{ color: "#fff", fontWeight: 700 }} itemStyle={{ color: "#fff" }} formatter={(v) => [money(v), "Collected"]} />
                  <Bar dataKey="amount" fill="#15803d" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </RCard>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          <RCard title={`Transactions (${tx.length})`} sub="Every order in this period, newest first"
            right={(
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="a-inp !w-auto !py-1.5 text-xs">
                <option value="">All statuses</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}>
            <div className="overflow-x-auto -mx-5 max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr>{["Date", "Student", "Type", "Method", "Amount", "Status"].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
                <tbody>
                  {tx.map((x) => (
                    <tr key={x.id} className={`a-tr ${x.studentId ? "cursor-pointer" : ""}`} onClick={() => x.studentId && navigate(`/admin/users/student-information/${x.studentId}`)}>
                      <td className="a-td text-gray-600 whitespace-nowrap">{dayStr(x.createdAt)}</td>
                      <td className="a-td font-semibold text-gray-700">{x.studentName || <span className="text-gray-400">No student</span>}</td>
                      <td className="a-td text-gray-600">{x.purpose}{x.packageName && <span className="block text-[11px] text-gray-400">{x.packageName}</span>}</td>
                      <td className="a-td text-gray-600">{x.method}</td>
                      <td className="a-td font-bold text-gray-800 whitespace-nowrap">{money(x.amount)}</td>
                      <td className="a-td"><Pill tone={STATUS[x.status]?.[1]}>{STATUS[x.status]?.[0] || x.status}</Pill></td>
                    </tr>
                  ))}
                  {!tx.length && <tr><td colSpan={6} className="py-10 text-center text-gray-400">No orders in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </RCard>
          <RCard title={`0-1-2-3 countdown (${low.length})`} sub="Students who use live sessions and have 3 or fewer left. Renew before zero.">
            <div className="overflow-x-auto -mx-5 max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr>{["Student", "Courses", "Left", "Last attended"].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
                <tbody>
                  {low.map((s) => (
                    <tr key={s.id} className="a-tr cursor-pointer" onClick={() => navigate(`/admin/users/student-information/${s.id}`)}>
                      <td className="a-td"><p className="font-bold text-gray-800">{s.name}</p>{s.nickname && <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{s.nickname}</p>}</td>
                      <td className="a-td text-gray-600 max-w-[200px]"><span className="line-clamp-2">{s.courses.join(", ") || "—"}</span></td>
                      <td className={`a-td font-extrabold ${s.liveBalance <= 1 ? "text-red-600" : "text-amber-600"}`}>{s.liveBalance}</td>
                      <td className="a-td text-gray-600 whitespace-nowrap">{dayStr(s.lastAttended)}</td>
                    </tr>
                  ))}
                  {!low.length && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Nobody is running low.</td></tr>}
                </tbody>
              </table>
            </div>
          </RCard>
        </div>
      </ReportState>
    </div>
  );
}
