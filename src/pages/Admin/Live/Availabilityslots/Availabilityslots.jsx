import { useCallback, useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    Clock3,
    Copy,
    Pencil,
    Plus,
    Power,
    RotateCw,
    Trash2,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import useDelete from "@/hooks/useDelete";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import usePut from "@/hooks/usePut";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Errorpage from "@/components/Errorpage";
import Loader from "@/components/Loader";

const API_URL = "/api/admin/availability-slots";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Week starts on Saturday (Egypt). Change the order here if needed.
const WEEKDAYS = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
];

// The API may return "03:00" or "03:00:00". Inputs and comparisons use "HH:mm".
const toHM = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
};

const formatTime = (value) => {
    const hm = toHM(value);
    if (!hm) return "";
    const [h, m] = hm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

const formatRange = (from, to) =>
    [formatTime(from), formatTime(to)].filter(Boolean).join(" – ");

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
        if (!row.timeFrom || !row.timeTo)
            return void (errors[row.key] = "Set both start and end time.");
        if (row.timeFrom >= row.timeTo)
            return void (errors[row.key] = "End time must be after start time.");

        const clashExisting = existingSlots.find(
            (s) => s.id !== ignoreId && s.dayOfWeek === row.dayOfWeek && overlaps(s, row),
        );
        if (clashExisting) {
            return void (errors[row.key] =
                `Overlaps an existing slot (${formatRange(clashExisting.timeFrom, clashExisting.timeTo)}).`);
        }
        const clashRow = rows.find(
            (other, j) =>
                j !== i &&
                other.dayOfWeek === row.dayOfWeek &&
                other.timeFrom &&
                other.timeTo &&
                other.timeFrom < other.timeTo &&
                overlaps(other, row),
        );
        if (clashRow) errors[row.key] = "Overlaps another row in this batch.";
    });
    return errors;
};

const inputClass =
    "w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-one focus:ring-2 focus:ring-one/20 disabled:opacity-60";

/* ------------------------------------------------------------------ */
/* Slot form row (used by both Add and Edit)                           */
/* ------------------------------------------------------------------ */

const SlotRow = ({ row, error, disabled, onChange, onDuplicate, onRemove }) => (
    <div
        className={`rounded-xl border p-3 ${error ? "border-red-300 dark:border-red-500/40" : "border-border"
            }`}
    >
        <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
            <label className="text-xs font-semibold">
                Day
                <select
                    value={row.dayOfWeek}
                    disabled={disabled}
                    onChange={(e) => onChange({ dayOfWeek: e.target.value })}
                    className={`mt-1 ${inputClass}`}
                >
                    {WEEKDAYS.map((day) => (
                        <option key={day} value={day}>
                            {day}
                        </option>
                    ))}
                </select>
            </label>
            <label className="text-xs font-semibold">
                From
                <input
                    type="time"
                    value={row.timeFrom}
                    disabled={disabled}
                    onChange={(e) => onChange({ timeFrom: e.target.value })}
                    className={`mt-1 ${inputClass}`}
                />
            </label>
            <label className="text-xs font-semibold">
                To
                <input
                    type="time"
                    value={row.timeTo}
                    disabled={disabled}
                    onChange={(e) => onChange({ timeTo: e.target.value })}
                    className={`mt-1 ${inputClass}`}
                />
            </label>
            <div className="flex items-end gap-1">
                {onDuplicate && (
                    <button
                        type="button"
                        onClick={onDuplicate}
                        disabled={disabled}
                        title="Duplicate row"
                        aria-label="Duplicate row"
                        className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                        <Copy size={16} />
                    </button>
                )}
                {onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        title="Remove row"
                        aria-label="Remove row"
                        className="rounded-lg p-2.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
                type="checkbox"
                checked={row.isActive}
                disabled={disabled}
                onChange={(e) => onChange({ isActive: e.target.checked })}
                className="h-4 w-4 accent-one"
            />
            Active (students can choose this slot)
        </label>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
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

    const slots = useMemo(
        () =>
            extractSlots(data)
                .map(normalizeSlot)
                .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom)),
        [data],
    );

    const slotsByDay = useMemo(() => {
        const map = Object.fromEntries(WEEKDAYS.map((d) => [d, []]));
        slots.forEach((s) => {
            (map[s.dayOfWeek] ||= []).push(s);
        });
        return map;
    }, [slots]);

    const activeCount = slots.filter((s) => s.isActive).length;

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

    /* ---------------- Add ---------------- */

    const openAdd = (dayOfWeek = "Saturday") => {
        setAddRows([newRow({ dayOfWeek })]);
        setAddErrors({});
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
        const payload = addRows.map(({ dayOfWeek, timeFrom, timeTo, isActive }) => ({
            dayOfWeek,
            timeFrom,
            timeTo,
            isActive,
        }));
        try {
            await postData(
                payload,
                API_URL,
                payload.length === 1 ? "Slot added successfully" : `${payload.length} slots added successfully`,
            );
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
                {
                    dayOfWeek: editRow.dayOfWeek,
                    timeFrom: editRow.timeFrom,
                    timeTo: editRow.timeTo,
                    isActive: editRow.isActive,
                },
                `${API_URL}/${editSlot.id}`,
                "Slot updated successfully",
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
            await putData(
                { isActive: !slot.isActive },
                `${API_URL}/${slot.id}/status`,
                slot.isActive ? "Slot deactivated" : "Slot activated",
            );
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

    if (loading && !data) return <Loader />;
    if (error && !data) return <Errorpage />;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-one">Availability Slots</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Weekly time slots students can choose from when building their availability plan.
                        {slots.length > 0 && ` ${activeCount} of ${slots.length} active.`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                    >
                        <RotateCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => openAdd()}
                        className="inline-flex items-center gap-2 rounded-lg bg-one px-4 py-2 text-sm font-semibold text-white hover:bg-one/90"
                    >
                        <Plus size={16} /> Add slots
                    </button>
                </div>
            </div>

            {slots.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                    <CalendarDays className="mx-auto mb-3 text-muted-foreground" size={32} />
                    <p className="font-semibold">No availability slots yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Add the weekly time ranges students are allowed to pick from.
                    </p>
                    <button
                        type="button"
                        onClick={() => openAdd()}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-one px-4 py-2 text-sm font-semibold text-white hover:bg-one/90"
                    >
                        <Plus size={16} /> Add your first slots
                    </button>
                </div>
            )}

            {/* Week grid */}
            {slots.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {WEEKDAYS.map((day) => {
                        const daySlots = slotsByDay[day] || [];
                        return (
                            <section key={day} className="rounded-2xl border border-border bg-card p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="font-bold">{day}</h2>
                                    <button
                                        type="button"
                                        onClick={() => openAdd(day)}
                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-one hover:bg-one/10"
                                    >
                                        <Plus size={14} /> Add
                                    </button>
                                </div>
                                {daySlots.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-muted-foreground">No slots</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {daySlots.map((slot) => (
                                            <li
                                                key={slot.id}
                                                className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${slot.isActive ? "border-border" : "border-dashed border-border opacity-60"
                                                    }`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <Clock3 size={14} className="shrink-0 text-one" />
                                                        <span className="truncate">{formatRange(slot.timeFrom, slot.timeTo)}</span>
                                                    </div>
                                                    <span
                                                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${slot.isActive
                                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                                                                : "bg-muted text-muted-foreground"
                                                            }`}
                                                    >
                                                        {slot.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleActive(slot)}
                                                        disabled={togglingId === slot.id}
                                                        title={slot.isActive ? "Deactivate" : "Activate"}
                                                        aria-label={slot.isActive ? "Deactivate slot" : "Activate slot"}
                                                        className={`rounded-lg p-2 hover:bg-muted disabled:opacity-50 ${slot.isActive ? "text-emerald-600" : "text-muted-foreground"
                                                            }`}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(slot)}
                                                        title="Edit"
                                                        aria-label="Edit slot"
                                                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteSlot(slot)}
                                                        title="Delete"
                                                        aria-label="Delete slot"
                                                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}

            {/* ---------------- Add modal (batch) ---------------- */}
            {addOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !creating) closeAdd();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-slots-title"
                        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
                    >
                        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                            <div>
                                <h2 id="add-slots-title" className="text-lg font-bold text-one">
                                    Add availability slots
                                </h2>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Add one or several slots — they are saved together.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeAdd}
                                disabled={creating}
                                aria-label="Close"
                                className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 space-y-3 overflow-y-auto p-5">
                            {addRows.map((row) => (
                                <SlotRow
                                    key={row.key}
                                    row={row}
                                    error={addErrors[row.key]}
                                    disabled={creating}
                                    onChange={(patch) => updateAddRow(row.key, patch)}
                                    onDuplicate={() => duplicateAddRow(row)}
                                    onRemove={
                                        addRows.length > 1
                                            ? () => setAddRows((rows) => rows.filter((r) => r.key !== row.key))
                                            : undefined
                                    }
                                />
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    setAddRows((rows) => [
                                        ...rows,
                                        newRow({ dayOfWeek: rows[rows.length - 1]?.dayOfWeek }),
                                    ])
                                }
                                disabled={creating}
                                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-one hover:bg-one/10 disabled:opacity-50"
                            >
                                <Plus size={14} /> Add another slot
                            </button>
                        </div>

                        <footer className="flex flex-col-reverse gap-3 border-t border-border px-5 py-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeAdd}
                                disabled={creating}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveAdd}
                                disabled={creating || addRows.length === 0}
                                className="rounded-lg bg-one px-4 py-2 text-sm font-semibold text-white hover:bg-one/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating
                                    ? "Saving…"
                                    : `Save ${addRows.length} slot${addRows.length === 1 ? "" : "s"}`}
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            {/* ---------------- Edit modal ---------------- */}
            {editSlot && editRow && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !updating) closeEdit();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-slot-title"
                        className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-2xl"
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <h2 id="edit-slot-title" className="text-lg font-bold text-one">
                                Edit slot
                            </h2>
                            <button
                                type="button"
                                onClick={closeEdit}
                                disabled={updating}
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
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
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeEdit}
                                disabled={updating}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveEdit}
                                disabled={updating || editUnchanged}
                                className="rounded-lg bg-one px-4 py-2 text-sm font-semibold text-white hover:bg-one/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
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
                title="Delete availability slot"
                description={
                    deleteSlot
                        ? `Delete ${deleteSlot.dayOfWeek} ${formatRange(deleteSlot.timeFrom, deleteSlot.timeTo)}? This can't be undone.`
                        : ""
                }
            />
        </div>
    );
};

export default AvailabilitySlots;