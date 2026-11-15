import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pager } from "@/components/ReusableTable";
import { PageHead, Pill, SkelRows } from "@/components/admin/kit";
import { ActionMenu, Avatar, LoadError, SearchInput, ViewSwitch, statusLabel, statusTone, useStoredState } from "../parts/people";

/* Users → Parents (no design screen; styled like the students list).
   GET /api/admin/parent (all rows) · PUT /api/admin/parent/:id/status · DELETE /api/admin/parent/:id
   Search, status filter and paging run on the loaded list. */

const PAGE = 12;

const fmtAdded = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
};

const Parent = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/parent");
  const { deleteData, loading: deleteLoading } = useDelete();
  const { putData, loading: usePutLoading } = usePut();

  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useStoredState("admin.parents.view", "cards");

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/parent/${selectedRow.id}`);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (row) => {
    await putData(
      { status: row.status === "active" ? "inactive" : "active" },
      `/api/admin/parent/${row.id}/status`,
      "Status updated successfully",
    );
    refetch();
  };
  const handleEdit = (row) => navigate(`/admin/users/parents/edit/${row.id}`);

  const all = useMemo(
    () =>
      data?.data?.data?.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phoneNumber: p.phoneNumber,
        status: p.status,
        createdAt: p.createdAt,
      })) || [],
    [data],
  );

  const ql = q.trim().toLowerCase();
  const list = all.filter(
    (p) => (st === "all" || p.status === st) && (!ql || [p.name, p.email, p.phoneNumber].join(" ").toLowerCase().includes(ql)),
  );
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE));
  useEffect(() => setPage(1), [ql, st]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const shown = list.slice((page - 1) * PAGE, page * PAGE);
  const filtering = !!ql || st !== "all";
  const count = (s) => all.filter((p) => p.status === s).length;

  const busy = loading || deleteLoading || usePutLoading;
  const first = loading && !data;

  const Switch = ({ p }) => (
    <button
      type="button"
      disabled={usePutLoading}
      onClick={(e) => { e.stopPropagation(); handleToggleStatus(p); }}
      className={`a-switch ${p.status === "active" ? "on" : ""} disabled:opacity-60`}
      title={p.status === "active" ? "Active — click to deactivate" : "Inactive — click to activate"}
      aria-label={`${p.status === "active" ? "Deactivate" : "Activate"} ${p.name}`}
    >
      <span></span>
    </button>
  );
  const menu = (p) => [
    { label: "Edit details", icon: Pencil, onClick: () => handleEdit(p) },
    "sep",
    { label: "Delete account", icon: Trash2, tone: "text-red-600", onClick: () => setSelectedRow(p) },
  ];

  const cards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
      {shown.map((p) => {
        const off = p.status !== "active";
        return (
          <article key={p.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-one/30 transition flex flex-col p-4 min-w-0 ${off ? "opacity-80" : ""}`}>
            <div className="flex items-start gap-3 min-w-0">
              <Avatar name={p.name} muted={off} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 truncate">{p.name}</p>
                <p className="text-[11px] text-gray-400 truncate">Parent{fmtAdded(p.createdAt) ? ` · added ${fmtAdded(p.createdAt)}` : ""}</p>
              </div>
              <Pill tone={statusTone(p.status)}>{statusLabel(p.status)}</Pill>
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-600 min-w-0">
              <p className="flex items-center gap-2 min-w-0"><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span className="truncate">{p.email || "—"}</span></p>
              <p className="flex items-center gap-2 min-w-0"><Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span className="truncate">{p.phoneNumber || "—"}</span></p>
            </div>
            <div className="mt-auto pt-4 flex items-center gap-1.5">
              <button type="button" onClick={() => handleEdit(p)} className="flex-1 h-9 rounded-lg text-xs font-bold text-white bg-one hover:bg-one/90">Edit details</button>
              <div className="h-9 px-3 rounded-lg border border-gray-200 bg-white inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                <span className="hidden sm:inline">Active</span>
                <Switch p={p} />
              </div>
              <ActionMenu label={`More actions for ${p.name}`} items={menu(p)} />
            </div>
          </article>
        );
      })}
    </div>
  );

  const table = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>{["Parent", "Email", "Phone", "Added", "Status", ""].map((h) => <th key={h} className={`a-th ${h ? "" : "text-right"}`}>{h || <span className="sr-only">Actions</span>}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="a-tr">
                <td className="a-td min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} size="w-9 h-9" shape="rounded-lg" text="text-xs" muted={p.status !== "active"} />
                    <p className="font-bold text-gray-900 truncate">{p.name}</p>
                  </div>
                </td>
                <td className="a-td text-xs text-gray-600">{p.email || "—"}</td>
                <td className="a-td text-xs text-gray-600 whitespace-nowrap">{p.phoneNumber || "—"}</td>
                <td className="a-td text-xs text-gray-500 whitespace-nowrap">{fmtAdded(p.createdAt) || "—"}</td>
                <td className="a-td"><div className="flex items-center gap-2"><Switch p={p} /><Pill tone={statusTone(p.status)}>{statusLabel(p.status)}</Pill></div></td>
                <td className="a-td">
                  <div className="flex items-center justify-end gap-1.5">
                    <button type="button" onClick={() => handleEdit(p)} className="a-act" title="Edit" aria-label={`Edit ${p.name}`}><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setSelectedRow(p)} className="a-act del" title="Delete" aria-label={`Delete ${p.name}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <PageHead title="Parents" sub="Parent accounts and their contact details. Turn an account off to stop them signing in.">
        <button type="button" onClick={() => navigate("/admin/users/parents/add")} className="a-btn primary"><Plus className="w-4 h-4" /> Add parent</button>
      </PageHead>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <SearchInput className="w-full sm:flex-1 sm:min-w-[220px]" label="Search parents" value={q} onChange={setQ} placeholder="Search name, email or phone…" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Account status">
          {[["all", "All", all.length], ["active", "Active", count("active")], ["inactive", "Inactive", count("inactive")]].map(([v, l, n]) => (
            <button key={v} type="button" onClick={() => setSt(v)} aria-pressed={st === v} className={`a-chip ${st === v ? "on" : ""}`}>{l} · {n}</button>
          ))}
        </div>
        <div className="sm:ml-auto"><ViewSwitch value={view} onChange={setView} /></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <span className="text-gray-500">
          <b className="text-gray-900">{list.length}</b> of {all.length} parents
          {busy && !first && <span className="ml-2 text-gray-400">Updating…</span>}
        </span>
        {filtering && <button type="button" onClick={() => { setQ(""); setSt("all"); }} className="font-bold text-one hover:underline">Clear filters</button>}
      </div>

      {first ? (
        <SkelRows n={6} />
      ) : error && !data ? (
        <LoadError text={error} onRetry={refetch} />
      ) : shown.length ? (
        <>
          {view === "table" ? table() : cards()}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
              <Pager currentPage={page} totalPages={totalPages} setPage={setPage} shown={shown.length} total={list.length} label="parents" />
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <p className="font-bold text-gray-700">{filtering ? "No parents match" : "No parents yet"}</p>
          <p className="text-sm text-gray-400">{filtering ? "Try another search or filter." : "Add the first parent to get started."}</p>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        onConfirm={confirmDelete}
        title="Delete Parent"
        description={`Are you sure you want to delete "${selectedRow?.name}"? This can’t be undone.`}
      />
    </div>
  );
};

export default Parent;
