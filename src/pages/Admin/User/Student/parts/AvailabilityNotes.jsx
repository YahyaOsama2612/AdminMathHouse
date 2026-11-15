// "Available times" (from the student record) and admin notes
// (GET/POST /api/admin/notes/:studentId, PUT/DELETE /api/admin/notes/:studentId/:noteId).
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Clock, Pencil, Pin, Trash2 } from "lucide-react";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { SkelRows } from "@/components/admin/kit";

/* ------------------------------------------------------------------ */
/* Available times                                                     */
/* ------------------------------------------------------------------ */

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const SRC_META = {
  live: ["Sent by the student", "text-green-700"],
  teacher: ["Shared by the teacher", "text-green-700"],
  admin: ["Set by admin", "text-blue-700"],
  sample: ["Sample times", "text-gray-400"],
  missing: ["Not set yet", "text-red-600"],
};

const parseTimeToMinutes = (t) => {
  if (typeof t === "number") return t;
  if (!t || typeof t !== "string") return 0;
  const match = t.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return (parseInt(match[1], 10) || 0) * 60 + (parseInt(match[2], 10) || 0);
};

const formatMinuteTime = (m) => {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 && h < 24 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${ap}`;
};

const formatHours = (h) => (h % 1 ? h.toFixed(1) : h) + "h";

const stamp = (rawDate) => {
  if (!rawDate) return "";
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const slotsOf = (student) => {
  const list = student?.availabilitySlots || student?.availabilityPlans?.[0]?.slots || student?.slots || [];
  return Array.isArray(list) ? list : [];
};

const buildDaysMap = (slots) => {
  const map = Object.fromEntries(DAYS.map((d) => [d, []]));
  slots.forEach((s) => {
    const dayName = DAYS.find((d) => d.toLowerCase() === String(s.dayOfWeek || "").trim().toLowerCase());
    if (dayName && s.timeFrom && s.timeTo) map[dayName].push([parseTimeToMinutes(s.timeFrom), parseTimeToMinutes(s.timeTo)]);
  });
  DAYS.forEach((d) => map[d].sort((a, b) => a[0] - b[0]));
  return map;
};

/** Number of days in the week the student has free times (for "At a glance"). */
export const availableDaysCount = (student) => {
  const map = buildDaysMap(slotsOf(student));
  return DAYS.filter((d) => map[d].length > 0).length;
};

export const AvailableTimesCard = ({ student, studentName, onEdit }) => {
  const slots = useMemo(() => slotsOf(student), [student]);
  const activePlan = student?.availabilityPlans?.[0] || null;
  const daysMap = useMemo(() => buildDaysMap(slots), [slots]);

  const totalHours = useMemo(
    () => DAYS.reduce((acc, d) => acc + (daysMap[d] || []).reduce((x, r) => x + Math.max(0, r[1] - r[0]) / 60, 0), 0),
    [daysMap],
  );
  const activeDaysCount = DAYS.filter((d) => (daysMap[d] || []).length > 0).length;

  const srcKey = !slots.length ? "missing" : slots.some((s) => s.adminSlotId) ? "admin" : "live";
  const [srcLabel, srcColor] = SRC_META[srcKey] || SRC_META.missing;
  const timestamp = stamp(activePlan?.createdAt || activePlan?.proposedAt || slots[0]?.createdAt || null);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex flex-wrap items-start gap-2 mb-4">
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900">Available times</h2>
          <p className={`text-xs ${srcColor} font-semibold`}>
            {srcLabel}
            {timestamp ? ` · ${timestamp}` : ""}
          </p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto h-9 px-3 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:border-[#7d0a0a] hover:text-one inline-flex items-center gap-1.5"
          >
            <Clock size={14} /> Edit times
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          ["Days / week", activeDaysCount],
          ["Hours / week", formatHours(totalHours)],
          ["Avg / day", activeDaysCount ? formatHours(Math.round((totalHours / activeDaysCount) * 10) / 10) : "—"],
        ].map(([l, v]) => (
          <div key={l} className="bg-gray-50 rounded-xl px-3 py-2 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{l}</p>
            <p className="text-lg font-extrabold text-gray-900 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-gray-50">
        {DAYS.map((d) => {
          const r = daysMap[d] || [];
          const dh = r.reduce((x, y) => x + Math.max(0, y[1] - y[0]) / 60, 0);
          return (
            <li key={d} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className={`w-24 text-sm font-bold ${r.length ? "text-gray-900" : "text-gray-400"}`}>{d}</span>
              <span className="flex-1 flex flex-wrap gap-1 min-w-0">
                {r.length ? (
                  r.map((x, idx) => (
                    <span key={idx} className="text-xs font-semibold px-2 py-1 rounded-md bg-red-50 text-one whitespace-nowrap">
                      {formatMinuteTime(x[0])} – {formatMinuteTime(x[1])}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">Not available</span>
                )}
              </span>
              <span className={`text-xs font-bold tabular-nums ${r.length ? "text-gray-700" : "text-gray-300"}`}>
                {r.length ? formatHours(dh) : "—"}
              </span>
            </li>
          );
        })}
      </ul>

      {srcKey === "sample" ? (
        <p className="text-[11px] text-gray-400 mt-3">
          These are sample times{studentName ? ` — use Edit times to set ${studentName}’s real times` : ""}.
        </p>
      ) : srcKey === "missing" ? (
        <p className="text-[11px] text-red-600 mt-3">No times yet{onEdit ? " — use Edit times to add them" : ""}.</p>
      ) : null}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Admin notes                                                         */
/* ------------------------------------------------------------------ */

const NOTE_TAGS = {
  general: ["General", "bg-gray-100 text-gray-700"],
  academic: ["Academic", "bg-blue-50 text-blue-700"],
  payment: ["Payment", "bg-green-50 text-green-700"],
  behaviour: ["Behaviour", "bg-amber-50 text-amber-800"],
  follow: ["Follow up", "bg-red-50 text-one"],
};

// The backend keeps title + content only, so the tag travels as the note title.
const resolveTagKey = (note) => {
  if (note?.tag && NOTE_TAGS[note.tag.toLowerCase()]) return note.tag.toLowerCase();
  const title = String(note?.title || "").toLowerCase();
  for (const [k, [label]] of Object.entries(NOTE_TAGS)) {
    if (title === k || title === label.toLowerCase() || title.includes(k) || title.includes(label.toLowerCase())) return k;
  }
  return "general";
};

const formatNoteAt = (dateVal) => {
  if (!dateVal) return "";
  const s = stamp(dateVal);
  return s || String(dateVal);
};

const errMsg = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return typeof msg === "string" ? msg : JSON.stringify(msg);
};

export const StudentNotesCard = ({ studentId, plan }) => {
  const { data: notesRes, loading: loadingNotes, error: notesError, refetch: refetchNotes } = useGet(
    studentId ? `/api/admin/notes/${studentId}` : null,
  );

  const [text, setText] = useState("");
  const [selectedTag, setSelectedTag] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Pins are kept in this browser only (the notes API has no pin field).
  const [pinnedMap, setPinnedMap] = useState(() => {
    try {
      const saved = localStorage.getItem(`pinned_notes_${studentId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const rawList = useMemo(() => {
    const d = notesRes?.data?.data ?? notesRes?.data ?? notesRes;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.notes)) return d.notes;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }, [notesRes]);

  const sortedList = useMemo(() => {
    const list = rawList.map((n, idx) => {
      const id = String(n?.id || n?._id || `note-${idx}`);
      let noteText = "";
      if (Array.isArray(n?.content)) noteText = n.content.join("\n");
      else if (typeof n?.content === "string") {
        try {
          const parsed = JSON.parse(n.content);
          noteText = Array.isArray(parsed) ? parsed.join("\n") : n.content;
        } catch {
          noteText = n.content;
        }
      } else noteText = n?.text || n?.note || "";

      return {
        id,
        text: noteText,
        tag: resolveTagKey(n),
        at: formatNoteAt(n?.createdAt || n?.at || n?.date),
        by: n?.by || n?.createdBy?.name || n?.creator?.name || n?.admin?.name || n?.adminName || "Super Admin",
        pin: pinnedMap[id] !== undefined ? Boolean(pinnedMap[id]) : Boolean(n?.pin || n?.isPinned),
        raw: n,
      };
    });
    return list.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || String(b.at || "").localeCompare(String(a.at || "")));
  }, [rawList, pinnedMap]);

  const togglePin = (noteId) => {
    setPinnedMap((prev) => {
      const next = { ...prev, [noteId]: !prev[noteId] };
      try {
        localStorage.setItem(`pinned_notes_${studentId}`, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  const handleAddOrUpdate = async () => {
    const cleanText = text.trim();
    if (!cleanText) {
      toast.error("Write the note first");
      return;
    }
    const tagLabel = NOTE_TAGS[selectedTag]?.[0] || "General";
    const contentArray = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);

    try {
      setSubmitting(true);
      if (editingNoteId) {
        await api.put(`/api/admin/notes/${studentId}/${editingNoteId}`, {
          title: tagLabel,
          content: contentArray.length > 0 ? contentArray : [cleanText],
          tag: selectedTag,
        });
        toast.success("Note updated");
        setEditingNoteId(null);
      } else {
        await api.post(`/api/admin/notes/${studentId}`, {
          studentId,
          title: tagLabel,
          content: contentArray.length > 0 ? contentArray : [cleanText],
          tag: selectedTag,
        });
        toast.success("Note added");
      }
      setText("");
      setSelectedTag("general");
      refetchNotes();
    } catch (err) {
      toast.error(errMsg(err, "Failed to save note. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (n) => {
    setEditingNoteId(n.id);
    setText(n.text || "");
    setSelectedTag(n.tag || "general");
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setText("");
    setSelectedTag("general");
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      await api.delete(`/api/admin/notes/${studentId}/${noteToDelete.id}`);
      toast.success("Note deleted");
      setNoteToDelete(null);
      refetchNotes();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete note. Please try again."));
    }
  };

  const planNotes = plan?.notes;
  const iconBtn = "w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0 transition-colors";

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-bold text-gray-900">Notes</h2>
        <span className="text-xs text-gray-400">{sortedList.length} · only admins see them</span>
        {editingNoteId && <span className="ml-auto text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Editing a note</span>}
      </div>

      <label className="block">
        <span className="sr-only">New note</span>
        <textarea
          rows={3}
          maxLength={600}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note… (Ctrl + Enter to add)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleAddOrUpdate();
            }
          }}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:border-[#7d0a0a] focus:ring-2 focus:ring-[#7d0a0a]/10"
        />
      </label>

      <div className="flex flex-wrap items-center gap-1.5 mt-2" role="group" aria-label="Note type">
        {Object.entries(NOTE_TAGS).map(([k, [l, tone]]) => (
          <button
            key={k}
            type="button"
            aria-pressed={selectedTag === k}
            onClick={() => setSelectedTag(k)}
            className={`h-7 px-2.5 rounded-full text-[11px] font-bold ring-[#7d0a0a]/40 ${tone} ${selectedTag === k ? "ring-2" : ""}`}
          >
            {l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {editingNoteId && (
            <button type="button" onClick={handleCancelEdit} className="h-9 px-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleAddOrUpdate}
            disabled={submitting}
            className="h-9 px-4 rounded-xl text-sm font-bold text-white bg-one hover:bg-[#5a0707] disabled:opacity-50"
          >
            {submitting ? "Saving..." : editingNoteId ? "Update note" : "Add note"}
          </button>
        </div>
      </div>

      {loadingNotes ? (
        <div className="mt-4">
          <SkelRows n={2} />
        </div>
      ) : notesError ? (
        <div className="px-4 py-3 mt-4 bg-red-50 rounded-xl text-red-600 text-xs font-medium flex items-center justify-between">
          <span>Failed to load notes.</span>
          <button type="button" onClick={refetchNotes} className="underline font-bold text-red-700">
            Retry
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
          {sortedList.length > 0 ? (
            sortedList.map((n) => {
              const [l, tone] = NOTE_TAGS[n.tag] || NOTE_TAGS.general;
              return (
                <li
                  key={n.id}
                  className={`rounded-xl border ${n.pin ? "border-amber-200 bg-amber-50/40" : editingNoteId === n.id ? "border-blue-200 bg-blue-50/30" : "border-gray-100"} px-3 py-2.5`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{l}</span>
                    {n.pin && (
                      <span className="text-[10px] font-bold text-amber-700 inline-flex items-center gap-0.5">
                        <Pin size={11} /> Pinned
                      </span>
                    )}
                    <span className="ml-auto flex">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(n)}
                        className={`${iconBtn} text-gray-400 hover:text-blue-600 hover:bg-blue-50`}
                        title="Edit note"
                        aria-label="Edit note"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePin(n.id)}
                        className={`${iconBtn} ${n.pin ? "text-amber-700 hover:bg-amber-100" : "text-gray-400 hover:bg-gray-100"}`}
                        title={n.pin ? "Unpin note" : "Pin note"}
                        aria-label={n.pin ? "Unpin note" : "Pin note"}
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteToDelete(n)}
                        className={`${iconBtn} text-red-600 hover:bg-red-50`}
                        title="Delete note"
                        aria-label="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{n.text}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {n.by ? `${n.by} · ` : ""}
                    {n.at}
                  </p>
                </li>
              );
            })
          ) : (
            <li className="text-sm text-gray-400 py-4 text-center">No notes yet.</li>
          )}
        </ul>
      )}

      {planNotes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs">
            <span className="font-bold text-amber-900 block mb-0.5">Availability plan request ({plan.status || "Pending"}):</span>
            <p className="text-amber-800 whitespace-pre-wrap break-words">{planNotes}</p>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete note"
        description="Are you sure you want to delete this note? This action cannot be undone."
      />
    </section>
  );
};
