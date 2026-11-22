import { useEffect, useMemo, useState } from "react";
import api from "@/api/api";

/* Which teachers can take a session at the chosen time (Phase B — no double-booking, no booking outside
   working hours). POST /api/admin/session/teacher-states with the form's schedule; for a weekly repeat
   every generated date is checked. skipSessionId: the session being edited (it doesn't clash with itself).
   → Map teacherId → { state: "free" | "busy" | "off" | "not_shared", reason } */
export default function useTeacherStates(formData, skipSessionId) {
  const [states, setStates] = useState(null); // null = no full schedule yet
  const [loading, setLoading] = useState(false);

  const schedule = useMemo(() => {
    if (formData.scheduleType === "repeat") {
      const days = (formData.recurringDays || []).filter((d) => d.dayOfWeek && d.timeFrom && d.timeTo);
      if (!formData.startDate || !formData.endDate || !days.length) return null;
      return { scheduleType: "repeat", startDate: formData.startDate, endDate: formData.endDate, recurringDays: days };
    }
    if (!formData.sessionDate || !formData.timeFrom || !formData.timeTo) return null;
    return { scheduleType: "once", sessionDate: formData.sessionDate, timeFrom: formData.timeFrom, timeTo: formData.timeTo };
  }, [formData.scheduleType, formData.sessionDate, formData.timeFrom, formData.timeTo, formData.startDate, formData.endDate, formData.recurringDays]);
  const key = JSON.stringify(schedule);

  useEffect(() => {
    if (!schedule) { setStates(null); return undefined; }
    let live = true;
    const t = setTimeout(() => {
      setLoading(true);
      api.post("/api/admin/session/teacher-states", { ...schedule, ...(skipSessionId ? { skipSessionId } : {}) })
        .then((res) => {
          if (!live) return;
          const list = res?.data?.data?.teachers || [];
          setStates(new Map(list.map((t) => [String(t.id), t])));
        })
        .catch(() => live && setStates(null))
        .finally(() => live && setLoading(false));
    }, 350);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, skipSessionId]);

  return { states, loading, hasSchedule: !!schedule };
}

export const TEACHER_STATE_LABEL = {
  free: { text: "Free", cls: "bg-green-50 text-green-700" },
  not_shared: { text: "No hours set", cls: "bg-gray-100 text-gray-500" },
  busy: { text: "Busy", cls: "bg-red-50 text-red-700" },
  off: { text: "Outside hours", cls: "bg-amber-50 text-amber-700" },
};
