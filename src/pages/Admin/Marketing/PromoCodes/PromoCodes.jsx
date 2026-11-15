import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import PromoCodeDetailsModal from "@/components/PromoCodeDetailsModal";
import { Pager } from "@/components/ReusableTable";
import { PageHead, Pill, SkelRows, Stat } from "@/components/admin/kit";
import { AddButton, HeadSkeleton, LoadError, RowButtons, SearchInput, fmtDate } from "@/pages/Admin/Settings/settingsKit";

/* Marketing → Promo codes (same list style as the Settings pages: KPI row, filter card, table with pages).
   GET /api/admin/promoCodes, GET /api/admin/promoCodes/:id (details modal), DELETE /api/admin/promoCodes/:id */

const PER = 10;
const dayStart = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d; };
const dayEnd = (v) => { const d = new Date(v); d.setHours(23, 59, 59, 999); return d; };
/* Validity from the dates only (the list has no separate on/off flag) */
const stateOf = (p) => {
  const now = new Date();
  if (p.startDate && dayStart(p.startDate) > now) return ["upcoming", "Upcoming", "blue"];
  if (p.endDate && dayEnd(p.endDate) < now) return ["expired", "Expired", "gray"];
  return ["active", "Active", "green"];
};

const PromoCodes = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/promoCodes");
  const { deleteData } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [state, setState] = useState("all");
  const [page, setPage] = useState(1);

  const {
    data: detailRes,
    loading: loadingDetail,
    error: detailError,
  } = useGet(viewModalOpen && viewingId ? `/api/admin/promoCodes/${viewingId}` : null);

  const handleView = (row) => {
    setViewingId(row.id);
    setViewModalOpen(true);
  };
  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingId(null);
  };

  const all = useMemo(() => (data?.data?.data || []).map((p) => ({ ...p, st: stateOf(p) })), [data]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      (p) =>
        (type === "all" || p.type === type) &&
        (state === "all" || p.st[0] === state) &&
        (!s || `${p.promoName} ${p.code}`.toLowerCase().includes(s)),
    );
  }, [all, q, type, state]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PER, cur * PER);
  const filtered = q || type !== "all" || state !== "all";
  const clear = () => { setQ(""); setType("all"); setState("all"); setPage(1); };
  const activeN = all.filter((p) => p.st[0] === "active").length;
  const uses = all.reduce((a, p) => a + (Number(p.numberOfUsers) || 0), 0);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/promoCodes/${selectedRow.id}`);
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-20"></div>)}</div>
        <div className="skel h-24 mb-4"></div>
        <SkelRows n={6} />
      </div>
    );
  if (error && !data) return <LoadError text="Could not load the promo codes." onRetry={refetch} />;

  const typeChip = (v, l, n) => (
    <button key={v} type="button" onClick={() => { setType(v); setPage(1); }} className={`a-chip ${type === v ? "on" : ""}`}>
      {l} <span className="opacity-70">{n}</span>
    </button>
  );

  return (
    <div>
      <PageHead title="Promo codes" sub="Discount codes students can use at checkout — for everyone or for chosen students only.">
        <AddButton onClick={() => navigate("/admin/marketing/promocodes/add")}>Add Promo Code</AddButton>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Promo codes" value={all.length} />
        <Stat label="Active now" value={activeN} color={activeN ? "#15803d" : undefined} sub="within their dates" />
        <Stat label="Restricted" value={all.filter((p) => p.type === "restricted").length} sub="chosen students only" />
        <Stat label="Times used" value={uses.toLocaleString("en-US")} sub="across all codes" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name or code…" className="flex-1 min-w-[200px]" />
          <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }} className="a-inp w-auto" aria-label="Validity">
            <option value="all">Any validity</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="expired">Expired</option>
          </select>
          {filtered && <button type="button" onClick={clear} className="text-xs font-bold text-one hover:underline ml-auto">Clear filters</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {typeChip("all", "All", all.length)}
          {typeChip("generic", "Generic", all.filter((p) => p.type === "generic").length)}
          {typeChip("restricted", "Restricted", all.filter((p) => p.type === "restricted").length)}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="a-th">Promo</th>
                <th className="a-th">Type</th>
                <th className="a-th">Discount</th>
                <th className="a-th">Valid</th>
                <th className="a-th">Usage</th>
                <th className="a-th">Status</th>
                <th className="a-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const used = Number(p.numberOfUsers) || 0;
                return (
                  <tr key={p.id} className="a-tr">
                    <td className="a-td">
                      <p className="font-semibold text-gray-900">{p.promoName}</p>
                      <span className="inline-flex font-mono font-bold text-[12px] text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5 mt-1">{p.code}</span>
                    </td>
                    <td className="a-td"><Pill tone={p.type === "restricted" ? "purple" : "gray"}>{p.type === "restricted" ? "Restricted" : "Generic"}</Pill></td>
                    <td className="a-td font-bold text-gray-900 whitespace-nowrap">{p.discountAmount}%</td>
                    <td className="a-td whitespace-nowrap text-gray-600">
                      {fmtDate(p.startDate)}
                      <span className="block text-[11px] text-gray-400">to {fmtDate(p.endDate)}</span>
                    </td>
                    <td className="a-td whitespace-nowrap">
                      <p className="text-gray-900"><b>{used}</b> <span className="text-gray-400 text-xs">time{used === 1 ? "" : "s"}</span></p>
                      <p className="text-[11px] text-gray-400">limit {p.numberOfUsagesAllowed} per student</p>
                    </td>
                    <td className="a-td"><Pill tone={p.st[2]}>{p.st[1]}</Pill></td>
                    <td className="a-td">
                      <RowButtons name={p.promoName} onEdit={() => navigate(`/admin/marketing/promocodes/edit/${p.id}`)} onDelete={() => handleDelete(p)}>
                        <button type="button" onClick={() => handleView(p)} className="a-act" title="View" aria-label={`View ${p.promoName}`}><Eye size={15} /></button>
                      </RowButtons>
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="font-bold text-gray-700">No promo codes found</p>
                    {filtered ? (
                      <button type="button" onClick={clear} className="text-xs font-bold text-one hover:underline mt-1">Clear filters</button>
                    ) : (
                      <p className="text-sm text-gray-400">Add the first promo code.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager currentPage={cur} totalPages={pages} setPage={setPage} shown={shown.length} total={list.length} label="promo codes" />
      </div>

      <PromoCodeDetailsModal
        open={viewModalOpen}
        onClose={closeViewModal}
        promo={detailRes?.data?.data}
        loading={loadingDetail}
        error={detailError}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete promo code"
        description={`Delete "${selectedRow?.promoName}"?`}
      />
    </div>
  );
};

export default PromoCodes;
