import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/api/api";
import { PageHead, Tabs } from "@/components/admin/kit";
import TimetableTab from "./TimetableTab";
import AddSessionTab from "./AddSessionTab";
import BuildPlanTab from "./BuildPlanTab";

/* Live → Planner (MathPortal design hub): students send free times → add sessions or build a plan
   in those times → follow everything on the timetable and dispatch it. Tabs via ?tab=schedule|add|build. */

const TABS = ["schedule", "add", "build"];

export default function PlannerHub() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "schedule";
  const go = (t) => setParams(t === "schedule" ? {} : { tab: t }, { replace: true });
  const [waiting, setWaiting] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Students whose free times are waiting for a plan (step 1 → 2)
  useEffect(() => {
    api.get("/api/admin/availability-plans?status=pending_admin_review&limit=1")
      .then((r) => setWaiting(r.data?.data?.pagination?.total ?? 0))
      .catch(() => {});
  }, [tab]);

  const steps = [
    ["build", "Students send free times", waiting ? `${waiting} student${waiting === 1 ? "" : "s"} waiting for a plan` : "Nobody is waiting for a plan"],
    ["add", "Add sessions or build a plan", "Only free teachers are offered"],
    ["schedule", "Timetable & dispatch", "Confirm sessions and notify everyone"],
  ];

  return (
    <div>
      <PageHead title="Planner" sub="Students send their free times — you add sessions or build a plan in those times, then follow everything on the timetable." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {steps.map(([k, t, sub], i) => (
          <button key={k} onClick={() => go(k)}
            className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${tab === k ? "border-[#7d0a0a] bg-red-50/60" : "border-gray-100 bg-white hover:border-gray-300"}`}>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Step {i + 1}</p>
            <p className="text-sm font-bold text-gray-800 leading-snug">{t}</p>
            <p className="text-[11px] text-gray-500">{sub}</p>
          </button>
        ))}
      </div>
      <Tabs value={tab} onChange={go} tabs={[
        { key: "add", label: "+ Add session" },
        { key: "build", label: "Build a plan", count: waiting },
        { key: "schedule", label: "Timetable" },
      ]} />
      {tab === "schedule" && <TimetableTab refreshKey={refreshKey} onAdd={() => go("add")} />}
      {tab === "add" && <AddSessionTab onCreated={() => { setRefreshKey((k) => k + 1); go("schedule"); }} />}
      {tab === "build" && <BuildPlanTab />}
    </div>
  );
}
