import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { PageHead } from "@/components/admin/kit";
import {
  AddButton, CardActions, CardGridSkeleton, HeadSkeleton, LoadError, NoResults, SearchInput, fmtDate,
} from "../settingsKit";

/* Settings → Exam Codes (MathPortal design: searchable card grid, add / edit on its own page).
   GET /api/admin/examCodes, DELETE /api/admin/examCodes/:id */

const SORTS = [
  ["order", "Default order"],
  ["az", "A → Z"],
  ["recent", "Recently updated"],
];

// Design groups (ecGuessGroup): worked out from the code text — no field is stored for it.
const GROUPS = [
  ["US", "US", "#1d4ed8", "#eff6ff"], ["International", "International", "#0f766e", "#f0fdfa"], ["Version", "Version", "#7c3aed", "#f5f3ff"],
  ["Form", "Form", "#b45309", "#fffbeb"], ["Board", "Exam board", "#be185d", "#fdf2f8"], ["Program", "Program", "#7d0a0a", "#fdf2f2"], ["Generic", "Generic", "#475569", "#f1f5f9"],
];
const groupOf = (code) => {
  const c = String(code || "").toUpperCase();
  if (/^US(-|$)/.test(c)) return "US";
  if (/^INT(-|$)/.test(c)) return "International";
  if (/^V\d+$/.test(c)) return "Version";
  if (/^FORM\b/.test(c)) return "Form";
  if (/CAMBRIDGE|EDEXCEL|AQA|OCR/.test(c)) return "Board";
  if (/SAT|EST|ACT|IGCSE|NATIONAL/.test(c)) return "Program";
  return "Generic";
};

const Exam = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/examCodes");
  const { deleteData } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("grouped");
  const [group, setGroup] = useState("all");

  const all = useMemo(() => data?.data?.data || [], [data]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = all.filter((x) => (!s || String(x.code || "").toLowerCase().includes(s)) && (group === "all" || groupOf(x.code) === group));
    if (sort === "az") out.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    if (sort === "recent")
      out.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    return out;
  }, [all, q, sort, group]);
  const counts = useMemo(() => Object.fromEntries(GROUPS.map(([k]) => [k, all.filter((x) => groupOf(x.code) === k).length])), [all]);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/examCodes/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      // toast already shown by useDelete
    }
  };

  if (loading && !data)
    return (
      <div>
        <HeadSkeleton />
        <div className="skel h-16 mb-5"></div>
        <CardGridSkeleton n={12} h="h-28" cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6" />
      </div>
    );
  if (error && !data) return <LoadError text="Could not load the exam codes." onRetry={refetch} />;

  return (
    <div>
      <PageHead title="Exam Codes" sub="Labels for exam forms and versions — exams and questions are tagged with these codes.">
        <AddButton onClick={() => navigate("/admin/settings/examcode/add")}>Add Exam Code</AddButton>
      </PageHead>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-5 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search codes…" className="flex-1 min-w-[200px]" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="a-inp w-auto" aria-label="Sort">
          <option value="grouped">Grouped</option>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{list.length} of {all.length} codes</span>
        <div className="w-full flex flex-wrap gap-1.5 pt-1">
          <button type="button" onClick={() => setGroup("all")} className={`a-chip ${group === "all" ? "on" : ""}`}>All {all.length}</button>
          {GROUPS.filter(([k]) => counts[k]).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setGroup(k)} className={`a-chip ${group === k ? "on" : ""}`}>{l} {counts[k]}</button>
          ))}
        </div>
      </div>

      {list.length ? (
        (sort === "grouped" ? GROUPS.map(([k, l, c, bg]) => [k, l, c, bg, list.filter((x) => groupOf(x.code) === k)]).filter((g) => g[4].length) : [[null, null, "#7d0a0a", "#fdf2f2", list]]).map(([k, l, c, bg, items]) => (
        <section key={k || "all"} className="mb-5">
          {k && (
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-extrabold text-gray-800 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: c }}></span>{l} <span className="text-xs font-semibold text-gray-400">{items.length}</span></p>
              <button type="button" onClick={() => navigate("/admin/settings/examcode/add")} className="text-xs font-bold text-one hover:underline">+ Add {l.toLowerCase()} code</button>
            </div>
          )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-3">
          {items.map((x) => (
            <div key={x.id} className="ec-card" style={{ "--ec": c, "--ec-bg": bg }}>
              <div className="flex items-start justify-between gap-2">
                <span className="ec-code">{x.code}</span>
                <CardActions
                  name={x.code}
                  onEdit={() => navigate(`/admin/settings/examcode/edit/${x.id}`)}
                  onDelete={() => handleDelete(x)}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-auto pt-3">
                {x.updatedAt ? `Updated ${fmtDate(x.updatedAt)}` : x.createdAt ? `Added ${fmtDate(x.createdAt)}` : ""}
              </p>
            </div>
          ))}
        </div>
        </section>
        ))
      ) : all.length ? (
        <NoResults title="No exam codes found" text="Try another search." onClear={() => setQ("")} />
      ) : (
        <NoResults title="No exam codes yet" text="Add the first exam code." />
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete exam code"
        description={`Delete "${selectedRow?.code}"? Exams and questions that use this code are deleted with it.`}
      />
    </div>
  );
};

export default Exam;
