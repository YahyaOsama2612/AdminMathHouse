import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FolderTree, Pencil, Plus, Search, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Errorpage from "@/components/Errorpage";
import { PageHead, Stat } from "@/components/admin/kit";
import { Chip, EmptyBox, IconBtn, Thumb, plural } from "../parts/catalog";

/* Courses → Categories (MathPortal "Categories" design): category cards with thumbnails, grouped under their
   main category. A category without sub-categories holds courses and opens courses/courses/:categoryId.
   Endpoints: GET /api/admin/category, DELETE /api/admin/category/:id */

const Category = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/category");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [main, setMain] = useState("all");

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/category/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/courses/categories/edit/${row.id}`);
  };

  const openCourses = (row) => {
    if (row.isLeaf) navigate(`/admin/courses/courses/${row.id}`);
  };

  // ancestors come nearest-parent first, so the last one is the main category
  const cats = useMemo(() => {
    const list = data?.data?.data || [];
    const byId = new Map(list.map((c) => [c.id, c]));
    return list.map((cat) => {
      const anc = cat.ancestors || [];
      const rootId = anc.length ? anc[anc.length - 1].id : cat.id;
      const parent = cat.parentCategoryId ? byId.get(cat.parentCategoryId) : null;
      return {
        id: cat.id,
        name: cat.name || "",
        description: cat.description || "",
        image: cat.image,
        isLeaf: cat.isLeaf,
        level: anc.length,
        rootId,
        parentName: parent?.name || (anc[0]?.name ?? ""),
        path: [...anc].reverse().map((a) => a.name),
        kids: list.filter((c) => c.parentCategoryId === cat.id).length,
        raw: cat,
      };
    });
  }, [data]);

  const roots = useMemo(() => {
    const ids = [...new Set(cats.map((c) => c.rootId))];
    return ids
      .map((id) => cats.find((c) => c.id === id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cats]);

  const needle = q.trim().toLowerCase();
  const hit = (c) => !needle || `${c.name} ${c.description} ${c.path.join(" ")}`.toLowerCase().includes(needle);

  const sections = roots
    .filter((r) => main === "all" || r.id === main)
    .map((root) => {
      const all = cats
        .filter((c) => c.rootId === root.id && c.id !== root.id)
        .sort((a, b) => [...a.path, a.name].join("/").localeCompare([...b.path, b.name].join("/")));
      const rootHit = needle && hit(root);
      const list = rootHit ? all : all.filter(hit);
      return { root, all, list, show: !needle || rootHit || list.length > 0 };
    })
    .filter((s) => s.show);

  const leafCount = cats.filter((c) => c.isLeaf).length;
  const filtered = !!needle || main !== "all";

  if (error) return <Errorpage />;

  return (
    <div>
      <button type="button" onClick={() => navigate("/admin/courses/categories")} className="text-xs font-bold text-gray-500 hover:text-one mb-2">← Courses &amp; content</button>
      <PageHead title="Categories" sub="Open a category to manage its courses, chapters and lessons.">
        <button type="button" onClick={() => navigate("/admin/courses/categories/add")} className="a-btn primary">
          <Plus size={16} /> Add category
        </button>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Categories" value={!data ? "…" : cats.length} />
        <Stat label="Main categories" value={!data ? "…" : roots.length} />
        <Stat label="Sub-categories" value={!data ? "…" : cats.length - roots.length} />
        <Stat label="Hold courses" value={!data ? "…" : leafCount} sub="Categories with no sub-categories" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-5">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" className="a-inp h-10 py-0 pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[{ id: "all", name: "All categories" }, ...roots].map((r) => (
            <button key={r.id} type="button" onClick={() => setMain(r.id)} className={`a-chip ${main === r.id ? "on" : ""}`}>
              {r.name}
            </button>
          ))}
          {filtered && (
            <button type="button" onClick={() => { setQ(""); setMain("all"); }} className="ml-auto text-xs font-bold text-one hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {!data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel h-28 rounded-2xl" />)}
        </div>
      ) : !cats.length ? (
        <EmptyBox title="No categories yet" text="Add a main category, then sub-categories that hold courses.">
          <button type="button" onClick={() => navigate("/admin/courses/categories/add")} className="a-btn primary mt-4"><Plus size={16} /> Add category</button>
        </EmptyBox>
      ) : !sections.length ? (
        <EmptyBox title="Nothing matches" text="Try another search or category.">
          <button type="button" onClick={() => { setQ(""); setMain("all"); }} className="mt-3 text-sm font-bold text-one hover:underline">Clear filters</button>
        </EmptyBox>
      ) : (
        <div className={deleteLoading ? "opacity-60 pointer-events-none" : ""}>
          {sections.map(({ root, all, list }) => (
            <section key={root.id} className="mb-6">
              <div className="flex flex-wrap items-center gap-3 mb-2.5">
                <Thumb src={root.image} name={root.name} size={36} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-gray-800 leading-tight">{root.name}</h2>
                  <p className="text-xs text-gray-400 truncate">
                    {root.description ? `${root.description} · ` : ""}
                    {root.isLeaf ? "Holds courses" : plural(all.length, "sub-category", "sub-categories")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {root.isLeaf && (
                    <button type="button" onClick={() => openCourses(root)} className="a-btn py-1.5 px-3 text-xs">
                      Open courses <ChevronRight size={14} />
                    </button>
                  )}
                  <IconBtn title={`Edit ${root.name}`} onClick={() => handleEdit(root)}><Pencil size={15} /></IconBtn>
                  <IconBtn title={`Delete ${root.name}`} danger onClick={() => handleDelete(root)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>

              {list.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {list.map((c) => (
                    <div
                      key={c.id}
                      role={c.isLeaf ? "button" : undefined}
                      tabIndex={c.isLeaf ? 0 : undefined}
                      onClick={() => openCourses(c)}
                      onKeyDown={(e) => e.key === "Enter" && openCourses(c)}
                      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 transition ${c.isLeaf ? "cursor-pointer hover:border-[#7d0a0a]/40 hover:shadow-md" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <Thumb src={c.image} name={c.name} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 leading-snug break-words">{c.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{c.description || "No description"}</p>
                        </div>
                        <span className="flex gap-1 opacity-80 group-hover:opacity-100">
                          <IconBtn title={`Edit ${c.name}`} onClick={() => handleEdit(c)}><Pencil size={15} /></IconBtn>
                          <IconBtn title={`Delete ${c.name}`} danger onClick={() => handleDelete(c)}><Trash2 size={15} /></IconBtn>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-auto">
                        {c.level > 1 && <Chip tone="faint" title="Parent category">{c.path.slice(1).join(" › ")}</Chip>}
                        {c.isLeaf ? <Chip tone="brand">Holds courses</Chip> : <Chip tone="amber"><FolderTree size={11} className="inline -mt-0.5 mr-1" />{plural(c.kids, "sub-category", "sub-categories")}</Chip>}
                        {c.isLeaf && (
                          <span className="ml-auto text-xs font-bold text-one flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                            Courses <ChevronRight size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !root.isLeaf && <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-400">No sub-categories match.</p>
              )}
            </section>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Category"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Category;
