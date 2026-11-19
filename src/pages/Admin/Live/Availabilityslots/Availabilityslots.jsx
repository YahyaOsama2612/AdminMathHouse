import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Plus, RotateCw, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import useDelete from "@/hooks/useDelete";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import usePut from "@/hooks/usePut";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Card, PageHead, Pill, SkelRows, Stat } from "@/components/admin/kit";

/* Live → Time Slots (MathPortal design "time-slots").
   The weekly times students can pick when they send their availability.
   Endpoints (unchanged): GET|POST /api/admin/availability-slots, PUT …/:id, PUT …/:id/status, DELETE …/:id */

const API_URL = "/api/admin/availability-slots";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Week starts on Saturday (Egypt). Change the order here if needed.
const WEEKDAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// The API may return "03:00" or "03:00:00". Inputs and comparisons use "HH:mm".
const toHM = (value) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
};
const toMin = (hm) => {
  const [h, m] = String(hm || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const formatTime = (value) => {
  const hm = toHM(value);
  if (!hm) return "";
  const [h, m] = hm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatRange = (from, to) => [formatTime(from), formatTime(to)].filter(Boolean).join(" – ");
const lenLabel = (v) => (v < 60 ? `${v} min` : `${Math.floor(v / 60)} h${v % 60 ? ` ${v % 60} min` : ""}`);

const overlaps = (a, b) => a.timeFrom < b.timeTo && b.timeFrom < a.timeTo;

// Accepts: an array, { data: [] }, { data: { items: [] } }, { data: { slots: [] } }
const extractSlots = (response) => {
  const d = response?.data ?? response;
  const list = Array.isArray(d) ? d : (d?.items ?? d?.slots ?? []);
  return Array.isArray(list) ? list : [];
};

const normalizeSlot = (slot) => ({
  id: slot.id,
  dayOfWeek: slot.dayOfWeek,
  timeFrom: toHM(slot.timeFrom),
  timeTo: toHM(slot.timeTo),
  isActive: slot.isActive !== false,
});

let rowCounter = 0;
const newRow = (overrides = {}) => ({
  key: ++rowCounter,
  dayOfWeek: "Saturday",
  timeFrom: "",
  timeTo: "",
  isActive: true,
  ...overrides,
});

/**
 * Validates a list of rows against each other and against existing slots.
 * `ignoreId` is used when editing so a slot doesn't conflict with itself.
 * Returns { [rowKey]: "error message" }.
 */
const validateRows = (rows, existingSlots, ignoreId = null) => {
  const errors = {};
  rows.forEach((row, i) => {
    if (!row.dayOfWeek) return void (errors[row.key] = "Choose a day.");
    if (!row.timeFrom || !row.timeTo) return void (errors[row.key] = "Set both start and end time.");
    if (row.timeFrom >= row.timeTo) return void (errors[row.key] = "End time must be after start time.");

    const clashExisting = existingSlots.find((s) => s.id !== ignoreId && s.dayOfWeek === row.dayOfWeek && overlaps(s, row));
    if (clashExisting) {
      return void (errors[row.key] = `Overlaps an existing slot (${formatRange(clashExisting.timeFrom, clashExisting.timeTo)}).`);
    }
    const clashRow = rows.find(
      (other, j) =>
        j !== i &&
        other.dayOfWeek === row.dayOfWeek &&
        other.timeFrom &&
        other.timeTo &&
        other.timeFrom < other.timeTo &&
        overlaps(other, row)
    );
    if (clashRow) errors[row.key] = "Overlaps another row in this batch.";
  });
  return errors;
};

// Generator options (design: from / to / session length / break / days)
const GEN_TIMES = [];
for (let m = 6 * 60; m <= 23 * 60 + 45; m += 15) GEN_TIMES.push(m);
const GEN_LENGTHS = [45, 60, 90, 120, 150, 180];
const GEN_GAPS = [0, 15, 30, 60];

/* ------------------------------------------------------------------ */
/* Slot form row (used by both Add and Edit)                           */
/* ------------------------------------------------------------------ */

const SlotRow = ({ row, error, disabled, onChange, onDuplicate, onRemove }) => (
  <div className={`rounded-xl border bg-white p-3 ${error ? "border-red-300" : "border-gray-100"}`}>
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
      <label className="col-span-2 sm:col-span-1 min-w-0">
        <span className="a-lbl-f !text-xs">Day</span>
        <select value={row.dayOfWeek} disabled={disabled} onChange={(e) => onChange({ dayOfWeek: e.target.value })} className="a-inp">
          {WEEKDAYS.map((day) => <option key={day} value={day}>{day}</option>)}
        </select>
      </label>
      <label className="min-w-0">
        <span className="a-lbl-f !text-xs">From</span>
        <input type="time" value={row.timeFrom} disabled={disabled} onChange={(e) => onChange({ timeFrom: e.target.value })} className="a-inp" />
      </label>
      <label className="min-w-0">
        <span className="a-lbl-f !text-xs">To</span>
        <input type="time" value={row.timeTo} disabled={disabled} onChange={(e) => onChange({ timeTo: e.target.value })} className="a-inp" />
      </label>
      {(onDuplicate || onRemove) && (
        <div className="col-span-2 sm:col-span-1 flex items-end justify-end gap-1.5">
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} disabled={disabled} title="Duplicate row" aria-label="Duplicate row" className="a-act"><Copy size={15} /></button>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} disabled={disabled} title="Remove row" aria-label="Remove row" className="a-act del"><Trash2 size={15} /></button>
          )}
        </div>
      )}
    </div>
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
      <input type="checkbox" checked={row.isActive} disabled={disabled} onChange={(e) => onChange({ isActive: e.target.checked })} className="h-4 w-4 accent-one" />
      Active (students can choose this slot)
    </label>
    {error && (
      <p className="mt-2 text-xs font-semibold text-red-600">{typeof error === "object" ? error.message || JSON.stringify(error) : String(error)}</p>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const AvailabilitySlots = () => {
  const { data, loading, error, refetch } = useGet(API_URL);
  const { postData, loading: creating } = usePost();
  const { putData, loading: updating } = usePut();
  const { deleteData, loading: deleting } = useDelete();

  const slots = useMemo(() => extractSlots(data).map(normalizeSlot).sort((a, b) => a.timeFrom.localeCompare(b.timeFrom)), [data]);

  const slotsByDay = useMemo(() => {
    const map = Object.fromEntries(WEEKDAYS.map((d) => [d, []]));
    slots.forEach((s) => {
      (map[s.dayOfWeek] ||= []).push(s);
    });
    return map;
  }, [slots]);

  const active = slots.filter((s) => s.isActive);
  const activeCount = active.length;
  const openDays = WEEKDAYS.filter((d) => (slotsByDay[d] || []).some((s) => s.isActive)).length;
  const earliest = active.length ? active.reduce((m, s) => (s.timeFrom < m ? s.timeFrom : m), "99:99") : null;
  const latest = active.length ? active.reduce((m, s) => (s.timeTo > m ? s.timeTo : m), "00:00") : null;

  // Phones show one day at a time (picked from a strip); tablets and up show the whole week.
  const [phoneDay, setPhoneDay] = useState(null);
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const shownPhoneDay = phoneDay || (WEEKDAYS.includes(todayName) ? todayName : WEEKDAYS[0]);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addRows, setAddRows] = useState([]);
  const [addErrors, setAddErrors] = useState({});

  // Edit modal
  const [editSlot, setEditSlot] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  // Delete / toggle
  const [deleteSlot, setDeleteSlot] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Generator (fills the Add form — nothing is saved until "Save")
  const [gen, setGen] = useState({ from: 600, to: 1320, len: 90, gap: 0, days: WEEKDAYS.slice() });
  const genCount = (() => {
    let n = 0;
    for (let s = gen.from; s + gen.len <= gen.to; s += gen.len + gen.gap) n++;
    return n;
  })();

  /* ---------------- Add ---------------- */

  const openAdd = (dayOfWeek = "Saturday") => {
    setAddRows([newRow({ dayOfWeek })]);
    setAddErrors({});
    setAddOpen(true);
  };

  const openGenerated = () => {
    const rows = [];
    gen.days.forEach((day) => {
      for (let s = gen.from; s + gen.len <= gen.to; s += gen.len + gen.gap) {
        rows.push(newRow({ dayOfWeek: day, timeFrom: fromMin(s), timeTo: fromMin(s + gen.len) }));
      }
    });
    if (!rows.length) return;
    setAddRows(rows);
    setAddErrors(validateRows(rows, slots));
    setAddOpen(true);
  };

  const closeAdd = useCallback(() => {
    setAddOpen(false);
    setAddRows([]);
    setAddErrors({});
  }, []);

  const updateAddRow = (key, patch) => {
    setAddRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setAddErrors((errs) => (errs[key] ? { ...errs, [key]: "" } : errs));
  };

  const duplicateAddRow = (row) =>
    setAddRows((rows) => {
      const index = rows.findIndex((r) => r.key === row.key);
      const copy = newRow({ ...row, timeFrom: row.timeTo, timeTo: "" });
      return [...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)];
    });

  const saveAdd = async () => {
    if (creating) return;
    const errors = validateRows(addRows, slots);
    if (Object.keys(errors).length) {
      setAddErrors(errors);
      toast.error("Please fix the highlighted rows.");
      return;
    }
    const payload = addRows.map(({ dayOfWeek, timeFrom, timeTo, isActive }) => ({ dayOfWeek, timeFrom, timeTo, isActive }));
    try {
      await postData(payload, API_URL, payload.length === 1 ? "Slot added successfully" : `${payload.length} slots added successfully`);
      closeAdd();
      await refetch();
    } catch {
      // The shared request hook displays the API error.
    }
  };

  /* ---------------- Edit ---------------- */

  const openEdit = (slot) => {
    setEditSlot(slot);
    setEditRow(newRow({ ...slot }));
    setEditErrors({});
  };

  const closeEdit = useCallback(() => {
    setEditSlot(null);
    setEditRow(null);
    setEditErrors({});
  }, []);

  const saveEdit = async () => {
    if (!editSlot || !editRow || updating) return;
    const errors = validateRows([editRow], slots, editSlot.id);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }
    try {
      await putData(
        { dayOfWeek: editRow.dayOfWeek, timeFrom: editRow.timeFrom, timeTo: editRow.timeTo, isActive: editRow.isActive },
        `${API_URL}/${editSlot.id}`,
        "Slot updated successfully"
      );
      closeEdit();
      await refetch();
    } catch {
      // The shared request hook displays the API error.
    }
  };

  const editUnchanged =
    editSlot &&
    editRow &&
    editRow.dayOfWeek === editSlot.dayOfWeek &&
    editRow.timeFrom === editSlot.timeFrom &&
    editRow.timeTo === editSlot.timeTo &&
    editRow.isActive === editSlot.isActive;

  /* ---------------- Toggle active ---------------- */

  const toggleActive = async (slot) => {
    if (togglingId) return;
    setTogglingId(slot.id);
    try {
      await putData({ isActive: !slot.isActive }, `${API_URL}/${slot.id}/status`, slot.isActive ? "Slot deactivated" : "Slot activated");
      await refetch();
    } catch {
      // The shared request hook displays the API error.
    } finally {
      setTogglingId(null);
    }
  };

  /* ---------------- Delete ---------------- */

  const confirmDelete = async () => {
    if (!deleteSlot || deleting) return;
    try {
      await deleteData(`${API_URL}/${deleteSlot.id}`);
      setDeleteSlot(null);
      await refetch();
    } catch {
      // The shared request hook displays the API error.
    }
  };

  /* ---------------- Modal UX: Escape + scroll lock ---------------- */

  useEffect(() => {
    if (!addOpen && !editSlot) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (editSlot) {
        if (!updating) closeEdit();
      } else if (!creating) {
        closeAdd();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [addOpen, editSlot, creating, updating, closeAdd, closeEdit]);

  /* ---------------- Render ---------------- */

  const sel = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white block mt-1 w-full min-w-0 2xl:w-auto";
  const addErrorCount = Object.values(addErrors).filter(Boolean).length;

  return (
    <div>
      <PageHead
        title="Time Slots"
        sub={`The weekly times students can pick when they send their availability.${slots.length ? ` ${activeCount} of ${slots.length} active.` : ""}`}
      >
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
          <button type="button" onClick={() => refetch()} disabled={loading} className="a-btn justify-center">
            <RotateCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => openAdd()} className="a-btn primary justify-center"><Plus size={16} /> Add slots</button>
        </div>
      </PageHead>

      {loading && !data ? (
        <SkelRows n={6} />
      ) : error && !data ? (
        <div className="bg-white rounded-xl border border-red-100 p-6 text-center text-sm text-red-600">
          Could not load time slots. <button onClick={() => refetch()} className="font-bold underline">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Stat label="Slots offered" value={activeCount} sub="Active across the week" color="#7d0a0a" />
            <Stat label="Open days" value={`${openDays} / 7`} sub="Days with an active slot" />
            {/* Two short lines (from / to) instead of one long value that wrapped badly on phones and laptops */}
            <div className="rs-stat min-w-0">
              <p className="rs-stat-label">Earliest – latest</p>
              {earliest ? (
                <p className="font-extrabold text-gray-900 leading-tight mt-1 text-lg sm:text-xl">
                  <span className="whitespace-nowrap">{formatTime(earliest)}</span>
                  <span className="block text-sm font-semibold text-gray-400 whitespace-nowrap">to {formatTime(latest)}</span>
                </p>
              ) : <p className="rs-stat-value">—</p>}
              <p className="text-[11px] text-gray-400 mt-0.5">Teaching hours</p>
            </div>
            <Stat label="Inactive" value={slots.length - activeCount} sub="Hidden from students" color={slots.length - activeCount ? "#b45309" : "#94a3b8"} />
          </div>

          <Card
            className="mb-4"
            bodyClass="p-4 sm:p-5"
            title="Generate slots"
            sub="Fill a time range with back-to-back slots, e.g. 10 AM to 10 PM in 90-minute sessions. You review them before saving."
          >
            {/* Phones: 2 per row · tablets: 4 per row · wide screens: one line with the days and the button */}
            <div className="grid grid-cols-2 md:grid-cols-4 2xl:flex 2xl:flex-wrap 2xl:items-end gap-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase min-w-0">
                From
                <select className={sel} value={gen.from} onChange={(e) => setGen((g) => ({ ...g, from: +e.target.value, to: Math.max(g.to, +e.target.value + 15) }))}>
                  {GEN_TIMES.slice(0, -1).map((m) => <option key={m} value={m}>{formatTime(fromMin(m))}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-gray-400 uppercase min-w-0">
                To
                <select className={sel} value={gen.to} onChange={(e) => setGen((g) => ({ ...g, to: +e.target.value }))}>
                  {GEN_TIMES.filter((m) => m > gen.from).map((m) => <option key={m} value={m}>{formatTime(fromMin(m))}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-gray-400 uppercase min-w-0">
                Session length
                <select className={sel} value={gen.len} onChange={(e) => setGen((g) => ({ ...g, len: +e.target.value }))}>
                  {GEN_LENGTHS.map((v) => <option key={v} value={v}>{lenLabel(v)}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-gray-400 uppercase min-w-0">
                Break between
                <select className={sel} value={gen.gap} onChange={(e) => setGen((g) => ({ ...g, gap: +e.target.value }))}>
                  {GEN_GAPS.map((v) => <option key={v} value={v}>{v ? `${v} min` : "No break"}</option>)}
                </select>
              </label>
              <div className="col-span-2 md:col-span-3 2xl:col-span-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Days</p>
                <div className="grid grid-cols-7 gap-1 sm:flex sm:flex-wrap">
                  {WEEKDAYS.map((d) => {
                    const on = gen.days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setGen((g) => ({ ...g, days: on ? g.days.filter((x) => x !== d) : WEEKDAYS.filter((x) => x === d || g.days.includes(x)) }))}
                        className={`px-0 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold border text-center ${on ? "bg-one text-white border-one" : "bg-white text-gray-500 border-gray-200"}`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={openGenerated} disabled={!genCount || !gen.days.length} className="a-btn primary col-span-2 md:col-span-1 justify-center self-end w-full 2xl:w-auto">
                Prepare {genCount} slot{genCount === 1 ? "" : "s"} / day
              </button>
            </div>
          </Card>

          {slots.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 px-4 text-center mb-4">
              <p className="font-bold text-gray-700">No time slots yet</p>
              <p className="text-sm text-gray-400">Add the weekly times students are allowed to pick from, or generate them above.</p>
              <button type="button" onClick={() => openAdd()} className="a-btn primary mt-4"><Plus size={16} /> Add your first slots</button>
            </div>
          )}

          {slots.length > 0 && (
            <>
            {/* Phones: pick a day here; the cards below show only that day */}
            <div className="sm:hidden -mx-1 px-1 mb-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Day">
              {WEEKDAYS.map((day) => {
                const n = (slotsByDay[day] || []).filter((x) => x.isActive).length;
                const on = day === shownPhoneDay;
                return (
                  <button key={day} type="button" role="tab" aria-selected={on} onClick={() => setPhoneDay(day)}
                    className={`shrink-0 min-w-[3.6rem] rounded-xl border px-2.5 py-2 text-center ${on ? "bg-one text-white border-one" : "bg-white text-gray-600 border-gray-200"}`}>
                    <span className="block text-xs font-bold">{day.slice(0, 3)}</span>
                    <span className={`block text-[10px] ${on ? "text-white/80" : n ? "text-green-700" : "text-gray-400"}`}>{n ? `${n} open` : "—"}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,265px),1fr))]">
              {WEEKDAYS.map((day) => {
                const daySlots = slotsByDay[day] || [];
                const dayActive = daySlots.filter((s) => s.isActive).length;
                return (
                  <section key={day} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex-col ${day === shownPhoneDay ? "flex" : "hidden sm:flex"} ${dayActive ? "" : "opacity-80"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-gray-800">{day}</p>
                      {daySlots.length > 0 ? (
                        <Pill tone={dayActive ? "green" : "gray"}>{dayActive ? `${dayActive} open` : "Closed"}</Pill>
                      ) : null}
                    </div>
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2 flex-1">No slots — students cannot pick this day.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5 flex-1">
                        {daySlots.map((slot) => (
                          <li
                            key={slot.id}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${slot.isActive ? "border-red-100 bg-red-50/40" : "border-dashed border-gray-200 bg-gray-50"}`}
                          >
                            <span className="min-w-0">
                              <span className={`block text-[13px] sm:text-[12.5px] font-semibold ${slot.isActive ? "text-gray-800" : "text-gray-400 line-through"}`}>
                                <span className="whitespace-nowrap">{formatTime(slot.timeFrom)}</span>{" – "}
                                <span className="whitespace-nowrap">{formatTime(slot.timeTo)}</span>
                              </span>
                              <span className="block text-[10px] text-gray-400">{toMin(slot.timeTo) - toMin(slot.timeFrom)} min{slot.isActive ? "" : " · inactive"}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleActive(slot)}
                                disabled={togglingId === slot.id}
                                role="switch"
                                aria-checked={slot.isActive}
                                title={slot.isActive ? "Deactivate" : "Activate"}
                                aria-label={slot.isActive ? "Deactivate slot" : "Activate slot"}
                                className={`a-switch scale-75 disabled:opacity-50 ${slot.isActive ? "on" : ""}`}
                              >
                                <span />
                              </button>
                              <button type="button" onClick={() => openEdit(slot)} title="Edit" aria-label="Edit slot" className="w-9 h-9 sm:w-7 sm:h-7 rounded-md inline-flex items-center justify-center text-gray-400 hover:text-one hover:bg-white">
                                <Pencil size={14} />
                              </button>
                              <button type="button" onClick={() => setDeleteSlot(slot)} title="Delete" aria-label="Delete slot" className="w-9 h-9 sm:w-7 sm:h-7 rounded-md inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white">
                                <Trash2 size={14} />
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3">
                      <button type="button" onClick={() => openAdd(day)} className="text-xs font-bold text-one hover:underline py-1.5 sm:py-0">+ Add slot to {day}</button>
                    </div>
                  </section>
                );
              })}
            </div>
            </>
          )}
        </>
      )}

      {/* ---------------- Add modal (batch) ---------------- */}
      {addOpen && (
        <div className="a-modal-bg" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) closeAdd(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-slots-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 sm:px-5 py-3 sm:py-4">
              <div>
                <h2 id="add-slots-title" className="text-lg font-bold text-gray-900">Add time slots</h2>
                <p className="text-xs text-gray-400">
                  Add one or several slots — they are saved together.
                  {addErrorCount > 0 && <span className="text-red-600 font-semibold"> {addErrorCount} row{addErrorCount === 1 ? "" : "s"} need fixing.</span>}
                </p>
              </div>
              <button type="button" onClick={closeAdd} disabled={creating} aria-label="Close" className="a-act shrink-0"><X size={18} /></button>
            </header>

            <div className="flex-1 space-y-2.5 overflow-y-auto p-3 sm:p-5 bg-[#fcfafa]">
              {addRows.map((row) => (
                <SlotRow
                  key={row.key}
                  row={row}
                  error={addErrors[row.key]}
                  disabled={creating}
                  onChange={(patch) => updateAddRow(row.key, patch)}
                  onDuplicate={() => duplicateAddRow(row)}
                  onRemove={addRows.length > 1 ? () => setAddRows((rows) => rows.filter((r) => r.key !== row.key)) : undefined}
                />
              ))}
              <button
                type="button"
                onClick={() => setAddRows((rows) => [...rows, newRow({ dayOfWeek: rows[rows.length - 1]?.dayOfWeek })])}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-sm font-bold text-one hover:border-one disabled:opacity-50"
              >
                <Plus size={14} /> Add another slot
              </button>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 px-4 sm:px-5 py-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeAdd} disabled={creating} className="a-btn justify-center">Cancel</button>
              <button type="button" onClick={saveAdd} disabled={creating || addRows.length === 0} className="a-btn primary justify-center">
                {creating ? "Saving…" : `Save ${addRows.length} slot${addRows.length === 1 ? "" : "s"}`}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* ---------------- Edit modal ---------------- */}
      {editSlot && editRow && (
        <div className="a-modal-bg" onMouseDown={(event) => { if (event.target === event.currentTarget && !updating) closeEdit(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-slot-title" className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="edit-slot-title" className="text-lg font-bold text-gray-900">Edit slot</h2>
              <button type="button" onClick={closeEdit} disabled={updating} aria-label="Close" className="a-act"><X size={16} /></button>
            </div>
            <SlotRow
              row={editRow}
              error={editErrors[editRow.key]}
              disabled={updating}
              onChange={(patch) => {
                setEditRow((r) => ({ ...r, ...patch }));
                setEditErrors({});
              }}
            />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEdit} disabled={updating} className="a-btn justify-center">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={updating || editUnchanged} className="a-btn primary justify-center">
                {updating ? "Saving…" : "Save changes"}
              </button>
            </div>
          </section>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteSlot)}
        onClose={() => !deleting && setDeleteSlot(null)}
        onConfirm={confirmDelete}
        title="Delete time slot"
        description={deleteSlot ? `Delete ${deleteSlot.dayOfWeek} ${formatRange(deleteSlot.timeFrom, deleteSlot.timeTo)}? This can't be undone.` : ""}
      />
    </div>
  );
};

export default AvailabilitySlots;
