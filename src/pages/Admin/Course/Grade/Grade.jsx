import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pager } from "@/components/ReusableTable";
import { PageHead, SkelRows } from "@/components/admin/kit";
import {
  AddButton, FilterLabel, HeadSkeleton, LoadError, RowButtons, SearchInput,
} from "@/pages/Admin/Settings/settingsKit";

/* Courses → Grades (MathPortal design: one card per category parent, filter card, table with pages).
   GET /api/admin/grade, DELETE /api/admin/grade/:id */

const PALETTE = [
  ["#1d4ed8", "#eff6ff"], ["#0f766e", "#f0fdfa"], ["#7d0a0a", "#fdecec"], ["#b45309", "#fffbeb"],
  ["#7c3aed", "#f5f3ff"], ["#be185d", "#fdf2f8"], ["#475569", "#f1f5f9"],
];
const PER = 10;

const Grade = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/grade");
  const { deleteData } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [parent, setParent] = useState("all");
  const [cat, setCat] = useState("all");
  const [page, setPage] = useState(1);

  const all = useMemo(() => data?.data?.grades || [], [data]);

  /* Category parents (and their categories) that have grades, from the grade rows themselves */
  const tree = useMemo(() => {
    const map = new Map();
    all.forEach((g) => {
      const pid = g.parentCategoryId || "none";
      if (!map.has(pid)) map.set(pid, { id: pid, name: g.parentCategoryName || "No parent", cats: new Map(), count: 0 });
      const p = map.get(pid);
      p.count += 1;
      if (g.categoryId) p.cats.set(g.categoryId, g.categoryName || "—");
    });
    return [...map.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p, i) => ({ ...p, color: PALETTE[i % PALETTE.length], cats: [...p.cats.entries()].map(([id, name]) => ({ id, name })) }));
  }, [all]);
  const colorOf = (pid) => (tree.find((p) => p.id === (pid || "none")) || { color: PALETTE[PALETTE.length - 1] }).color;

  const catOptions = useMemo(
    () => (parent === "all" ? tree.flatMap((p) => p.cats.map((c) => ({ ...c, parent: p.name }))) : (tree.find((p) => p.id === parent)?.cats || [])),
    [tree, parent],
  );

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      (g) =>
        (parent === "all" || (g.parentCategoryId || "none") === parent) &&
        (cat === "all" || g.categoryId === cat) &&
        (!s || `${g.name} ${g.nameAr || ""} ${g.categoryName || ""}`.toLowerCase().includes(s)),
    );
  }, [all, q, parent, cat]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PER, cur * PER);
  const filtered = q || parent !== "all" || cat !== "all";
  const clear = () => { setQ(""); setParent("all"); setCat("all"); setPage(1); };

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/grade/${selectedRow.id}`);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">{[0, 1, 2].map((i) => <div key={i} className="skel h-24"></div>)}</div>
        <div className="skel h-20 mb-4"></div>
        <SkelRows n={6} />
      </div>
    );
  if (error && !data) return <LoadError text="Could not load the grades." onRetry={refetch} />;

  return (
    <div>
      <PageHead title="Grades" sub="School years under each category, in English and Arabic. Students and courses are grouped by these grades.">
        <AddButton onClick={() => navigate("/admin/courses/grade/add")}>Add Grade</AddButton>
      </PageHead>

      {tree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
          {tree.map((p) => {
            const on = parent === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setParent(on ? "all" : p.id); setCat("all"); setPage(1); }}
                className={`text-left bg-white rounded-xl border px-4 py-3 transition-colors shadow-sm ${on ? "border-one ring-2 ring-one/10" : "border-gray-100 hover:border-gray-300"}`}
              >
                <p className="text-[11px] font-extrabold uppercase tracking-wider truncate" style={{ color: p.color[0] }}>{p.name}</p>
                <p className="text-2xl font-extrabold text-gray-900">
                  {p.count} <span className="text-sm font-semibold text-gray-400">grade{p.count === 1 ? "" : "s"}</span>
                </p>
                <p className="text-[11px] text-gray-400 truncate">{p.cats.map((c) => c.name).join(" · ")}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr] gap-3 items-end">
        <FilterLabel label="Category parent">
          <select value={parent} onChange={(e) => { setParent(e.target.value); setCat("all"); setPage(1); }} className="a-inp">
            <option value="all">All</option>
            {tree.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FilterLabel>
        <FilterLabel label="Category">
          <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="a-inp">
            <option value="all">All</option>
            {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}{c.parent ? ` — ${c.parent}` : ""}</option>)}
          </select>
        </FilterLabel>
        <FilterLabel label="Search">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by English or Arabic name…" />
        </FilterLabel>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="a-th w-12">#</th>
                <th className="a-th">Name (EN)</th>
                <th className="a-th">Name (AR)</th>
                <th className="a-th">Category</th>
                <th className="a-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((g, i) => {
                const [c, bg] = colorOf(g.parentCategoryId);
                return (
                  <tr key={g.id} className="a-tr">
                    <td className="a-td text-gray-400 tabular-nums">{(cur - 1) * PER + i + 1}</td>
                    <td className="a-td font-semibold text-gray-900">{g.name}</td>
                    <td className="a-td text-gray-700" dir="rtl" lang="ar" style={{ textAlign: "left" }}>{g.nameAr}</td>
                    <td className="a-td">
                      <span className="inline-flex flex-col leading-tight">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full w-fit whitespace-nowrap" style={{ color: c, background: bg }}>{g.categoryName || "—"}</span>
                        {g.parentCategoryName && <span className="text-[11px] text-gray-400 mt-0.5">{g.parentCategoryName}</span>}
                      </span>
                    </td>
                    <td className="a-td">
                      <RowButtons name={g.name} onEdit={() => navigate(`/admin/courses/grade/edit/${g.id}`)} onDelete={() => handleDelete(g)} />
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="font-bold text-gray-700">No grades found</p>
                    {filtered ? (
                      <button type="button" onClick={clear} className="text-xs font-bold text-one hover:underline mt-1">Clear filters</button>
                    ) : (
                      <p className="text-sm text-gray-400">Add the first grade.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager currentPage={cur} totalPages={pages} setPage={setPage} shown={shown.length} total={list.length} />
      </div>

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete grade"
        description={
          selectedRow
            ? `Delete "${selectedRow.name}"${selectedRow.categoryName ? ` from ${selectedRow.parentCategoryName ? `${selectedRow.parentCategoryName} → ` : ""}${selectedRow.categoryName}` : ""}?`
            : ""
        }
      />
    </div>
  );
};

export default Grade;
