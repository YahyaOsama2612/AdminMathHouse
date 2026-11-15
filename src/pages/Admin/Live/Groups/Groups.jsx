import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2, Search } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pill, SkelRows, fmtTime } from "@/components/admin/kit";

/* Live → Groups (MathPortal design "groups"): group classes, their teacher, days and students.
   GET /api/admin/groups/overview — course, teacher, days and usual time come from each group's sessions
   (the last 30 days and upcoming). DELETE /api/admin/groups/:id */

const SEL = "a-inp !h-9 !py-0 text-sm";
const lbl = (t) => <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t}</span>;

export default function Groups() {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/groups/overview");
  const { deleteData } = useDelete();
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");
  const [teacher, setTeacher] = useState("");
  const [day, setDay] = useState("");
  const [status, setStatus] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  const all = useMemo(() => data?.data?.groups || [], [data]);
  const opts = useMemo(() => ({
    courses: [...new Set(all.map((g) => g.course).filter(Boolean))].sort(),
    teachers: [...new Set(all.map((g) => g.teacher).filter(Boolean))].sort(),
  }), [all]);
  const ql = q.trim().toLowerCase();
  const list = all.filter((g) => (!ql || [g.name, g.course, g.teacher, ...g.studentNames].join(" ").toLowerCase().includes(ql))
    && (!course || g.course === course) && (!teacher || g.teacher === teacher) && (!day || g.days.includes(day))
    && (!status || (status === "active" ? g.isActive : !g.isActive)));

  const confirmDelete = async () => {
    try { await deleteData(`/api/admin/groups/${selectedRow.id}`); setSelectedRow(null); refetch(); } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-bold text-xl text-gray-800">Groups</h1>
          <p className="text-xs text-gray-400">Group classes, their teacher, days and students.</p>
        </div>
        <div className="flex gap-2">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all…" className="a-inp !pl-9 !h-10 !w-56" />
          </label>
          <button onClick={() => navigate("/admin/live/groups/add")} className="a-btn primary"><Plus size={16} /> Add Group</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label>{lbl("Course")}<select value={course} onChange={(e) => setCourse(e.target.value)} className={SEL}><option value="">All</option>{opts.courses.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>{lbl("Teacher")}<select value={teacher} onChange={(e) => setTeacher(e.target.value)} className={SEL}><option value="">All</option>{opts.teachers.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>{lbl("Day")}<select value={day} onChange={(e) => setDay(e.target.value)} className={SEL}><option value="">All</option>{["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>{lbl("Status")}<select value={status} onChange={(e) => setStatus(e.target.value)} className={SEL}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </div>

      {loading && !data ? <SkelRows n={5} /> : error && !data ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center"><p className="font-bold text-gray-700">Couldn’t load groups</p><button onClick={refetch} className="a-btn mt-3">Try again</button></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 860 }}>
              <thead><tr>{["#", "Name", "Course", "Teacher", "Days", "From", "To", "Students", "Status", "Actions"].map((h) => <th key={h} className="a-th">{h}</th>)}</tr></thead>
              <tbody>
                {list.map((g, i) => (
                  <tr key={g.id} className="a-tr">
                    <td className="a-td text-gray-400">{i + 1}</td>
                    <td className="a-td font-bold text-gray-800">{g.name}</td>
                    <td className="a-td">{g.course ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">{g.course}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="a-td text-gray-700">{g.teacher || <span className="text-gray-300">—</span>}</td>
                    <td className="a-td text-gray-700 whitespace-nowrap">{g.days.length ? g.days.join(", ") : <span className="text-gray-300">—</span>}</td>
                    <td className="a-td text-gray-700 whitespace-nowrap">{g.timeFrom ? fmtTime(g.timeFrom) : "—"}</td>
                    <td className="a-td text-gray-700 whitespace-nowrap">{g.timeTo ? fmtTime(g.timeTo) : "—"}</td>
                    <td className="a-td" title={g.studentNames.join(", ")}><b className="text-gray-800">{g.students}</b>{g.studentNames.length > 0 && <span className="block text-[11px] text-gray-400 truncate max-w-[160px]">{g.studentNames.slice(0, 2).join(", ")}{g.studentNames.length > 2 ? "…" : ""}</span>}</td>
                    <td className="a-td"><Pill tone={g.isActive ? "green" : "gray"}>{g.isActive ? "Active" : "Inactive"}</Pill></td>
                    <td className="a-td">
                      <div className="flex gap-1.5">
                        <button onClick={() => navigate(`/admin/live/groups/edit/${g.id}`)} className="a-act" title={`Edit ${g.name}`} aria-label={`Edit ${g.name}`}><Pencil size={15} /></button>
                        <button onClick={() => setSelectedRow(g)} className="a-act del" title={`Delete ${g.name}`} aria-label={`Delete ${g.name}`}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={10} className="py-10 text-center text-gray-400">{all.length ? "No groups match." : "No groups yet."}</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-50">Showing {list.length} of {all.length} groups · course, teacher, days and times come from each group’s sessions</p>
        </div>
      )}

      <ConfirmDeleteModal open={!!selectedRow} onClose={() => setSelectedRow(null)} onConfirm={confirmDelete}
        title="Delete Group" description={`Delete "${selectedRow?.name}"? Its students stay; only the group is removed.`} />
    </div>
  );
}
