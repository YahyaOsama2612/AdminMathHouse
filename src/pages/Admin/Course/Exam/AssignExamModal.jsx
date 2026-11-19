import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Users, UserRound, Check } from "lucide-react";
import api from "@/api/api";
import { Modal, SkelRows, errText } from "@/components/admin/kit";
import StudentPicker from "@/pages/Admin/Live/Groups/parts/StudentPicker";

/* Course → Exams → Assign.
   GET /api/admin/exams/:id/assignments → { exam, allGroups, students, groups }
   PUT /api/admin/exams/:id/assignments  { studentIds, groupIds }
   Assigned students (directly or through a group) always see the exam on the student site,
   even with 0 exam balance, and start it without using balance. */

export default function AssignExamModal({ exam, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allGroups, setAllGroups] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [studentIds, setStudentIds] = useState([]);
  const [known, setKnown] = useState([]);
  const [tab, setTab] = useState("groups");
  const [gq, setGq] = useState("");

  useEffect(() => {
    let live = true;
    api.get(`/api/admin/exams/${exam.id}/assignments`)
      .then((res) => {
        if (!live) return;
        const d = res?.data?.data || {};
        setAllGroups(d.allGroups || []);
        setGroupIds((d.groups || []).map((g) => g.id));
        setStudentIds((d.students || []).map((s) => s.id));
        setKnown(d.students || []);
      })
      .catch((err) => toast.error(errText(err, "Could not load the assignment")))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [exam.id]);

  const toggleGroup = (id) => setGroupIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const shownGroups = allGroups.filter((g) => g.name?.toLowerCase().includes(gq.trim().toLowerCase()));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/api/admin/exams/${exam.id}/assignments`, { studentIds, groupIds });
      const d = res?.data?.data || {};
      toast.success(d.reach ? `“${exam.title}” assigned — ${d.reach} student${d.reach === 1 ? "" : "s"} can take it` : "Assignment cleared");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(errText(err, "Could not save the assignment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      wide
      title={`Assign “${exam.title}”`}
      onClose={onClose}
      actions={[
        <button key="c" type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>,
        <button key="s" type="button" onClick={save} disabled={saving || loading} className="px-4 py-2 rounded-lg bg-one text-white text-sm font-bold disabled:opacity-60">
          {saving ? "Saving…" : "Save assignment"}
        </button>,
      ]}
    >
      <p className="mb-4 text-gray-500">
        Assigned students see this exam on the student site even with 0 exam balance, and starting it doesn't use their balance.
        Other students still see it by their category, as before.
      </p>

      <div className="flex gap-1.5 mb-3" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "groups"} onClick={() => setTab("groups")} className={`a-chip ${tab === "groups" ? "on" : ""}`}>
          <Users size={13} className="inline mr-1" /> Groups ({groupIds.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "students"} onClick={() => setTab("students")} className={`a-chip ${tab === "students" ? "on" : ""}`}>
          <UserRound size={13} className="inline mr-1" /> Students ({studentIds.length})
        </button>
      </div>

      {loading ? (
        <SkelRows n={4} />
      ) : tab === "groups" ? (
        <div>
          <input value={gq} onChange={(e) => setGq(e.target.value)} placeholder="Search groups..." className="a-inp mb-2" />
          {shownGroups.length === 0 ? (
            <p className="text-gray-400 py-4 text-center">{allGroups.length ? "No group matches your search." : "No groups yet."}</p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-xl">
              {shownGroups.map((g) => {
                const on = groupIds.includes(g.id);
                return (
                  <button key={g.id} type="button" onClick={() => toggleGroup(g.id)} aria-pressed={on}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${on ? "bg-red-50/40" : "hover:bg-gray-50"}`}>
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-one border-transparent text-white" : "border-gray-300"}`}>
                      {on && <Check size={13} />}
                    </span>
                    <span className="flex-1 font-semibold text-gray-800">{g.name}</span>
                    <span className="text-xs text-gray-400">{g.members} student{g.members === 1 ? "" : "s"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <StudentPicker value={studentIds} known={known} onChange={(ids) => setStudentIds(ids)} />
      )}
    </Modal>
  );
}
