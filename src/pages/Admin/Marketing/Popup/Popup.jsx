import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageOff } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import { toast } from "react-hot-toast";
import api from "@/api/api";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pager } from "@/components/ReusableTable";
import { PageHead, Pill, SkelRows, Stat } from "@/components/admin/kit";
import { AddButton, HeadSkeleton, LoadError, RowButtons, SearchInput, fmtDate } from "@/pages/Admin/Settings/settingsKit";

/* Marketing → Popups (same list style as the Settings pages: KPI row, filter card, table with pages).
   GET /api/admin/popup, DELETE /api/admin/popup/:id */

const DESTS = [
  ["student", "Student"],
  ["parent", "Parent"],
  ["teacher", "Teacher"],
];
const PER = 10;

/* isActive = the admin's on/off switch; status (from the backend) = what that means today:
   inactive (switched off) · scheduled (on, before the start date) · live (on, within the dates) · ended. */
const STATUS = {
  live: ["live", "Showing now", "green"],
  scheduled: ["scheduled", "Scheduled", "blue"],
  ended: ["ended", "Ended", "gray"],
  inactive: ["inactive", "Inactive", "amber"],
};
const statusOf = (p) => {
  if (STATUS[p.status]) return STATUS[p.status];
  if (p.isActive === false) return STATUS.inactive;
  if (p.startDate && new Date(p.startDate) > new Date()) return STATUS.scheduled;
  return new Date(p.endDate) < new Date() ? STATUS.ended : STATUS.live;
};

const Popups = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/popup");
  const { deleteData } = useDelete();
  const [switching, setSwitching] = useState(null);

  // On/off from the list: PUT only { isActive } (name, dates and image stay as they are)
  const toggleActive = async (p) => {
    setSwitching(p.id);
    try {
      await api.put(`/api/admin/popup/${p.id}`, { isActive: !p.isActive });
      // Confirm with the server instead of assuming it saved
      const saved = (await api.get(`/api/admin/popup/${p.id}`))?.data?.data?.popup;
      if (saved && saved.isActive === !p.isActive) toast.success(`${p.name} is now ${saved.isActive ? "active" : "inactive"}`);
      else toast.error("The server didn't save the change — make sure the backend is up to date (restart it)");
      await refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "Could not change the status");
    } finally {
      setSwitching(null);
    }
  };

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [dest, setDest] = useState("all");
  const [status, setStatus] = useState("all");
  const [startOn, setStartOn] = useState("all"); // filter by start date (as in the old list)
  const [endOn, setEndOn] = useState("all"); // filter by end date
  const [page, setPage] = useState(1);

  const all = useMemo(() => (data?.data?.popups || []).map((p) => ({ ...p, st: statusOf(p) })), [data]);
  const count = (k) => all.filter((p) => p.st[0] === k).length;
  // local calendar day (the API sends UTC: a Cairo date of the 14th arrives as the 13th 22:00)
  const dayOf = (v) => {
    const d = v ? new Date(v) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const startDays = useMemo(() => [...new Set(all.map((p) => dayOf(p.startDate)).filter(Boolean))].sort(), [all]);
  const endDays = useMemo(() => [...new Set(all.map((p) => dayOf(p.endDate)).filter(Boolean))].sort(), [all]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      (p) =>
        (dest === "all" || p.destination === dest) &&
        (status === "all" || p.st[0] === status) &&
        (startOn === "all" || dayOf(p.startDate) === startOn) &&
        (endOn === "all" || dayOf(p.endDate) === endOn) &&
        (!s || String(p.name || "").toLowerCase().includes(s)),
    );
  }, [all, q, dest, status, startOn, endOn]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PER, cur * PER);
  const filtered = q || dest !== "all" || status !== "all" || startOn !== "all" || endOn !== "all";
  const clear = () => { setQ(""); setDest("all"); setStatus("all"); setStartOn("all"); setEndOn("all"); setPage(1); };

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/popup/${selectedRow.id}`);
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
  if (error && !data) return <LoadError text="Could not load the popups." onRetry={refetch} />;

  return (
    <div>
      <PageHead title="Popups" sub="Announcements shown to students, parents or teachers between a start and an end date — only while switched on.">
        <AddButton onClick={() => navigate("/admin/marketing/popup/add")}>Add Popup</AddButton>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Popups" value={all.length} />
        <Stat label="Showing now" value={count("live")} color={count("live") ? "#15803d" : undefined} />
        <Stat label="Scheduled" value={count("scheduled")} />
        <Stat label="Inactive / ended" value={`${count("inactive")} / ${count("ended")}`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search popups…" className="flex-1 min-w-[200px]" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="a-inp w-auto" aria-label="Status">
            <option value="all">All statuses</option>
            <option value="live">Showing now</option>
            <option value="scheduled">Scheduled</option>
            <option value="ended">Ended</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={startOn} onChange={(e) => { setStartOn(e.target.value); setPage(1); }} className="a-inp w-auto" aria-label="Start date">
            <option value="all">Any start date</option>
            {startDays.map((d) => <option key={d} value={d}>Starts {fmtDate(`${d}T12:00:00`)}</option>)}
          </select>
          <select value={endOn} onChange={(e) => { setEndOn(e.target.value); setPage(1); }} className="a-inp w-auto" aria-label="End date">
            <option value="all">Any end date</option>
            {endDays.map((d) => <option key={d} value={d}>Ends {fmtDate(`${d}T12:00:00`)}</option>)}
          </select>
          {filtered && <button type="button" onClick={clear} className="text-xs font-bold text-one hover:underline ml-auto">Clear filters</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => { setDest("all"); setPage(1); }} className={`a-chip ${dest === "all" ? "on" : ""}`}>All <span className="opacity-70">{all.length}</span></button>
          {DESTS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setDest(v); setPage(1); }} className={`a-chip ${dest === v ? "on" : ""}`}>
              {l} <span className="opacity-70">{all.filter((p) => p.destination === v).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="a-th">Popup</th>
                <th className="a-th">Destination</th>
                <th className="a-th">Start</th>
                <th className="a-th">End</th>
                <th className="a-th">Status</th>
                <th className="a-th">Active</th>
                <th className="a-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="a-tr">
                  <td className="a-td">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 bg-gray-50 shrink-0" />
                      ) : (
                        <span className="w-12 h-12 rounded-lg bg-gray-100 text-gray-300 flex items-center justify-center shrink-0"><ImageOff size={18} /></span>
                      )}
                      <span className="font-semibold text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="a-td capitalize">{p.destination || "—"}</td>
                  <td className="a-td whitespace-nowrap">{fmtDate(p.startDate)}</td>
                  <td className="a-td whitespace-nowrap">{fmtDate(p.endDate)}</td>
                  <td className="a-td"><Pill tone={p.st[2]}>{p.st[1]}</Pill></td>
                  <td className="a-td">
                    <button type="button" onClick={() => toggleActive(p)} disabled={switching === p.id}
                      className={`a-switch ${p.isActive ? "on" : ""} disabled:opacity-50`} aria-pressed={!!p.isActive}
                      title={p.isActive ? "Active — click to switch off" : "Inactive — click to switch on"} aria-label={`${p.isActive ? "Deactivate" : "Activate"} ${p.name}`}>
                      <span></span>
                    </button>
                  </td>
                  <td className="a-td">
                    <RowButtons name={p.name} onEdit={() => navigate(`/admin/marketing/popup/edit/${p.id}`)} onDelete={() => handleDelete(p)} />
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="font-bold text-gray-700">No popups found</p>
                    {filtered ? (
                      <button type="button" onClick={clear} className="text-xs font-bold text-one hover:underline mt-1">Clear filters</button>
                    ) : (
                      <p className="text-sm text-gray-400">Add the first popup.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager currentPage={cur} totalPages={pages} setPage={setPage} shown={shown.length} total={list.length} label="popups" />
      </div>

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete popup"
        description={`Delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Popups;
