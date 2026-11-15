import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { PageHead, Stat } from "@/components/admin/kit";
import {
  AddButton,
  HeadSkeleton,
  LoadError,
  NoResults,
  SearchInput,
} from "../settingsKit";

/* Settings → Rating questions (MathPortal design: KPI row, numbered question cards, preview of the active set).
   GET /api/admin/rating-questions, PUT /api/admin/rating-questions/:id/toggle, DELETE /api/admin/rating-questions/:id */

const RQ_CATEGORIES = [
  { value: "academic", label: "Academic", cls: "bg-blue-50 text-blue-700" },
  {
    value: "behavioral",
    label: "Behavioral",
    cls: "bg-amber-50 text-amber-700",
  },
  { value: "general", label: "General", cls: "bg-gray-100 text-gray-600" },
];
const catOf = (v) =>
  RQ_CATEGORIES.find((c) => c.value === v) || {
    label: v || "—",
    cls: "bg-gray-100 text-gray-600",
  };

const RatingQuestions = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet(
    "/api/admin/rating-questions",
  );
  const { deleteData } = useDelete();
  const { putData } = usePut();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");

  const all = useMemo(() => {
    const questions = data?.data?.data || [];
    return Array.isArray(questions) ? questions : [];
  }, [data]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      (x) =>
        (cat === "all" || x.category === cat) &&
        (status === "all" ||
          (status === "active" ? x.isActive : !x.isActive)) &&
        (!s || `${x.title} ${x.description || ""}`.toLowerCase().includes(s)),
    );
  }, [all, q, cat, status]);
  const activeList = all.filter((x) => x.isActive);
  const filtered = q || cat !== "all" || status !== "all";

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/rating-questions/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      // toast already shown by useDelete
    }
  };

  const handleToggleStatus = async (row) => {
    setToggling(row.id);
    try {
      await putData(
        {},
        `/api/admin/rating-questions/${row.id}/toggle`,
        "Status updated successfully",
      );
      refetch();
    } catch (e) {
      // toast already shown by usePut
    } finally {
      setToggling(null);
    }
  };

  if (loading && !data)
    return (
      <div>
        <HeadSkeleton />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel h-20"></div>
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel h-20"></div>
          ))}
        </div>
      </div>
    );
  if (error && !data)
    return (
      <LoadError
        text="Could not load the rating questions."
        onRetry={refetch}
      />
    );

  const chip = (on, onClick, label, n) => (
    <button
      type="button"
      onClick={onClick}
      className={`a-chip ${on ? "on" : ""}`}
    >
      {label} <span className="opacity-70">{n}</span>
    </button>
  );

  return (
    <div>
      <PageHead
        title="Rating questions"
        sub="Questions students answer when they rate a session. Only active questions are asked, in display order."
      >
        <AddButton
          onClick={() => navigate("/admin/settings/rating-questions/add")}
        >
          Add Rating Question
        </AddButton>
      </PageHead>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Questions" value={all.length} />
        <Stat
          label="Active"
          value={activeList.length}
          sub="asked to students"
          color={activeList.length ? "#15803d" : undefined}
        />
        <Stat
          label="Inactive"
          value={all.length - activeList.length}
          sub="hidden from students"
        />
        <Stat
          label="Categories"
          value={new Set(all.map((x) => x.category).filter(Boolean)).size}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search questions…"
            className="flex-1 min-w-[200px]"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="a-inp w-auto"
            aria-label="Status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">
            {list.length} of {all.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chip(cat === "all", () => setCat("all"), "All", all.length)}
          {RQ_CATEGORIES.map((c) =>
            chip(
              cat === c.value,
              () => setCat(c.value),
              c.label,
              all.filter((x) => x.category === c.value).length,
            ),
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 space-y-2">
          {list.length ? (
            list.map((x) => {
              const c = catOf(x.category);
              return (
                <div
                  key={x.id}
                  className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap sm:flex-nowrap items-start gap-3 ${x.isActive ? "" : "opacity-70"}`}
                >
                  <span
                    className="w-9 h-9 rounded-lg bg-red-50 text-one flex items-center justify-center font-extrabold shrink-0"
                    title="Display order"
                  >
                    {x.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 break-words">
                      {x.title}
                    </p>
                    {x.description && (
                      <p className="text-sm text-gray-500 break-words">
                        {x.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${c.cls}`}
                      >
                        {c.label}
                      </span>
                      {x.isActive ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-50 text-gray-400">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(x)}
                      disabled={toggling === x.id}
                      className="p-1.5 disabled:opacity-50"
                      title={x.isActive ? "Deactivate" : "Activate"}
                      aria-label={`${x.isActive ? "Deactivate" : "Activate"} ${x.title}`}
                    >
                      <span
                        className={`a-switch block ${x.isActive ? "on" : ""}`}
                      >
                        <span></span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/settings/rating-questions/edit/${x.id}`,
                        )
                      }
                      className="a-act"
                      title="Edit"
                      aria-label={`Edit ${x.title}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(x)}
                      className="a-act del"
                      title="Delete"
                      aria-label={`Delete ${x.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : all.length ? (
            <NoResults
              title="No questions found"
              text="Try another search, category or status."
              onClear={() => {
                setQ("");
                setCat("all");
                setStatus("all");
              }}
            />
          ) : (
            <NoResults
              title="No rating questions yet"
              text="Add the first question students answer when they rate a session."
            />
          )}
          {filtered && list.length > 0 && (
            <p className="text-xs text-gray-400 px-1">
              Filters on ·{" "}
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCat("all");
                  setStatus("all");
                }}
                className="font-bold text-one hover:underline"
              >
                Clear
              </button>
            </p>
          )}
        </div>

        <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 xl:sticky xl:top-4">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">
            Asked to students
          </p>
          {activeList.length ? (
            <ol className="rounded-xl border border-gray-100 p-4 space-y-3">
              {[...activeList]
                .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
                .map((x, i) => (
                  <li key={x.id} className="flex gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5 shrink-0 pt-0.5">
                      {i + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 break-words">
                        {x.title}
                      </p>
                      {x.description && (
                        <p className="text-xs text-gray-400 break-words">
                          {x.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">No active questions.</p>
          )}
        </aside>
      </div>

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete rating question"
        description={`Delete "${selectedRow?.title}"?`}
      />
    </div>
  );
};

export default RatingQuestions;
