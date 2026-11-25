import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarClock, X } from "lucide-react";
import api from "@/api/api";
import { PageHead, Tabs } from "@/components/admin/kit";
import TimetableTab from "./TimetableTab";
import AddSessionTab from "./AddSessionTab";
import BuildPlanTab from "./BuildPlanTab";

/* Live → Planner (MathPortal design hub): students send free times → add sessions or build a plan
   in those times → follow everything on the timetable and dispatch it. Tabs via ?tab=schedule|add|build. */

const TABS = ["schedule", "add", "build"];

const PLAN_URL = (planId) => `/admin/live/availability-plans?plan=${planId}`;

// plans already alerted today (per browser), so the alert shows once a day, not on every visit
const seenKey = (date) => `planner-alerts-${date}`;
const readSeen = (date) => { try { return new Set(JSON.parse(localStorage.getItem(seenKey(date)) || "[]")); } catch { return new Set(); } };
const writeSeen = (date, set) => { try { localStorage.setItem(seenKey(date), JSON.stringify([...set])); } catch { /* storage off — alerts just repeat */ } };

/** One toast per active student whose free times on today's weekday (or today's date) wait for approval. */
function useWaitingAlerts(onChanged) {
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    api.get("/api/admin/planner/waiting").then((r) => {
      if (!alive) return;
      const d = r.data?.data || {};
      const seen = readSeen(d.date);
      const list = (d.waiting || []).filter((p) => !seen.has(p.planId));
      list.forEach((p) => seen.add(p.planId));
      writeSeen(d.date, seen);
      const mute = async (p, t) => {
        try {
          await api.put(`/api/admin/planner/students/${p.studentId}/active`, { active: false });
          toast.dismiss(t.id);
          toast.success(`${p.name} is inactive — no more planner alerts for this student`);
          onChanged?.();
        } catch { toast.error("Could not change the student's status"); }
      };
      list.slice(0, 3).forEach((p) => toast.custom((t) => (
        <div className={`${t.visible ? "opacity-100" : "opacity-0"} transition-opacity w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl border border-amber-200 p-3.5 flex gap-3`} role="status">
          <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0"><CalendarClock size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">{p.name} is waiting for you</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {p.declinedBefore ? "Declined the last plan and sent free times again" : "Sent free times"} for {d.weekday}: <b>{p.times.join(", ")}</b>. Approve a time or build the plan.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={() => { toast.dismiss(t.id); navigate(PLAN_URL(p.planId)); }} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-one text-white">Open study plan</button>
              <button onClick={() => mute(p, t)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Inactive students don't raise this alert">Mark inactive</button>
            </div>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-gray-700 self-start" aria-label="Dismiss"><X size={15} /></button>
        </div>
      ), { id: `waiting-${p.planId}`, duration: 12000, position: "top-right" }));
      if (list.length > 3) {
        toast(`${list.length - 3} more student${list.length - 3 === 1 ? " is" : "s are"} waiting for approval today`, { id: "waiting-more", icon: "⏳", duration: 12000, position: "top-right" });
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [navigate, onChanged]);
}

export default function PlannerHub() {
  const [plansVersion, setPlansVersion] = useState(0);
  const bumpPlans = useCallback(() => setPlansVersion((v) => v + 1), []);
  useWaitingAlerts(bumpPlans);
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
  }, [tab, plansVersion]);

  const steps = [
    ["build", "Students send free times", waiting ? `${waiting} student${waiting === 1 ? "" : "s"} waiting for a plan` : "Nobody is waiting for a plan"],
    ["add", "Add sessions or build a plan", "Only free teachers are offered"],
    ["schedule", "Timetable & dispatch", "Confirm sessions and notify everyone"],
  ];

  return (
    <div>
      <PageHead title="Planner" sub="Students send their free times — you add sessions or build a plan in those times, then follow everything on the timetable.">
        <Link to="/admin/live/availability-plans?status=pending_admin_review" className="a-btn"><CalendarClock size={15} /> Study plans{waiting ? ` (${waiting} waiting)` : ""}</Link>
      </PageHead>
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
      {tab === "build" && <BuildPlanTab refreshKey={plansVersion} />}
    </div>
  );
}
