import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HardDrive, Plus, Pencil, Trash2, Mail, Phone, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { errText } from "@/components/admin/kit";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Pager } from "@/components/ReusableTable";
import { PageHead, Pill, SkelRows, Stat } from "@/components/admin/kit";
import { Avatar, CARD_BTN_GRAY, CARD_BTN_RED, LoadError, SearchInput, SELECT, statusLabel, statusTone } from "@/pages/Admin/User/parts/people";
import { accessSummary, ACCESS_TAG, countPerms, parsePerms } from "../AdminRoles/parts/access";

/* Admins (MathPortal "admin-list" screen).
   GET /api/admin/admin (all rows, each with its role) · DELETE /api/admin/admin/:id
   GET /api/admin/roles is read quietly for the "Roles" count; it is left out when this admin can't view roles.
   location.state.role (a role id) pre-selects the role filter — the roles page links here with it. */

const PAGE = 12;

const fmtAdded = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
};

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { data, loading, refetch, error } = useGet("/api/admin/admin");
  const { deleteData, loading: deleteLoading } = useDelete();
  const [selectedRow, setSelectedRow] = useState(null);

  const [q, setQ] = useState("");
  const [role, setRole] = useState(location.state?.role || "all");
  const [st, setSt] = useState("all");
  const [page, setPage] = useState(1);

  const [roleCount, setRoleCount] = useState(null);
  useEffect(() => {
    let live = true;
    api.get("/api/admin/roles")
      .then((r) => { if (live) setRoleCount((r.data?.data?.roles || r.data?.roles || []).length); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const all = useMemo(
    () =>
      data?.data?.data?.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phoneNumber,
        status: a.status,
        createdAt: a.createdAt,
        roleId: a.role?.id || null,
        roleName: a.role?.name || "",
        perms: parsePerms(a.role?.permissions),
      })) || [],
    [data],
  );
  const roles = useMemo(() => {
    const m = new Map();
    all.forEach((a) => a.roleId && m.set(a.roleId, a.roleName));
    return [...m.entries()].sort((x, y) => String(x[1]).localeCompare(String(y[1])));
  }, [all]);

  const ql = q.trim().toLowerCase();
  const list = all.filter(
    (a) =>
      (role === "all" || (role === "none" ? !a.roleId : a.roleId === role)) &&
      (st === "all" || a.status === st) &&
      (!ql || [a.name, a.email, a.phone, a.roleName].join(" ").toLowerCase().includes(ql)),
  );
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE));
  useEffect(() => setPage(1), [ql, role, st]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const shown = list.slice((page - 1) * PAGE, page * PAGE);
  const filtering = !!ql || role !== "all" || st !== "all";

  const active = all.filter((a) => a.status === "active").length;
  const inactive = all.length - active;

  // Suspend / activate — PATCH /api/admin/admin/:id/toggle (flips active ⇄ inactive)
  const [toggling, setToggling] = useState(null);
  const toggleStatus = async (a) => {
    setToggling(a.id);
    try {
      await api.patch(`/api/admin/admin/${a.id}/toggle`);
      toast.success(a.status === "active" ? `${a.name} is suspended` : `${a.name} is active again`);
      refetch();
    } catch (err) { toast.error(errText(err)); } finally { setToggling(null); }
  };
  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/admin/${selectedRow.id}`);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  // Opens the drive sign-in page of this site in a new tab.
  const handleGoToDrive = () => {
    const driveUrl = `${window.location.origin}/logindrive`;
    window.open(driveUrl, "_blank", "noopener,noreferrer");
  };

  const first = loading && !data;

  return (
    <div>
      <PageHead title="Admins" sub="Everyone who can sign in to this admin panel and the role that decides what they can do.">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleGoToDrive} className="a-btn"><HardDrive className="w-4 h-4" /> Go to Drive</button>
          <button type="button" onClick={() => navigate("/admin/admin-roles")} className="a-btn">Manage roles</button>
          <button type="button" onClick={() => navigate("/admin/admin/add")} className="a-btn primary"><Plus className="w-4 h-4" /> Add admin</button>
        </div>
      </PageHead>

      {!first && !(error && !data) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Admins" value={all.length} />
          <Stat label="Active" value={active} color="#15803d" />
          <Stat label="Inactive" value={inactive} color={inactive ? "#b45309" : "#94a3b8"} />
          {roleCount != null ? (
            <Stat label="Roles" value={roleCount} sub={`${roles.length} in use`} />
          ) : (
            <Stat label="Roles in use" value={roles.length} />
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
        <SearchInput className="col-span-2 md:flex-1 md:min-w-[240px]" label="Search admins" value={q} onChange={setQ} placeholder="Search name, email, phone or role…" />
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className={SELECT}>
          <option value="all">All roles</option>
          {roles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          {all.some((a) => !a.roleId) && <option value="none">No role</option>}
          {role !== "all" && role !== "none" && !roles.some(([id]) => id === role) && <option value={role}>Selected role</option>}
        </select>
        <select aria-label="Account" value={st} onChange={(e) => setSt(e.target.value)} className={SELECT}>
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-gray-400 col-span-2 md:col-span-1 md:ml-auto">
          {list.length} of {all.length} admins
          {filtering && <button type="button" onClick={() => { setQ(""); setRole("all"); setSt("all"); }} className="ml-2 font-bold text-one hover:underline">Clear</button>}
          {(loading || deleteLoading) && !first && <span className="ml-2">Updating…</span>}
        </span>
      </div>

      {first ? (
        <SkelRows n={6} />
      ) : error && !data ? (
        <LoadError text={error} onRetry={refetch} />
      ) : shown.length ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {shown.map((a) => {
              const off = a.status !== "active";
              const acc = accessSummary(a.perms);
              const n = countPerms(a.perms);
              return (
                <article key={a.id} className={`rs-card flex flex-col min-w-0 ${off ? "!bg-gray-50" : ""}`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar name={a.name} size="w-12 h-12" shape="rounded-full" solid={!off} muted={off} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate" title={a.name}>{a.name}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400 shrink-0" />{a.email || "—"}</p>
                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{a.phone || "—"}</p>
                    </div>
                    <Pill tone={statusTone(a.status)}>{statusLabel(a.status)}</Pill>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 min-w-0">
                    {a.roleId ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 font-bold rounded-md max-w-full text-one bg-red-50 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-one" /><span className="truncate">{a.roleName || "Role"}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500">No role</span>
                    )}
                    {a.roleId && <span className="text-[11px] font-semibold text-gray-400 shrink-0">{n} permission{n === 1 ? "" : "s"}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {acc.length ? (
                      <>
                        {acc.slice(0, 5).map((x) => <span key={x.module} className={`text-[11px] font-semibold px-2 py-1 rounded-md ${ACCESS_TAG[x.tag]}`}>{x.label} · {x.tag}</span>)}
                        {acc.length > 5 && <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-500" title={acc.slice(5).map((x) => x.label).join(", ")}>+{acc.length - 5}</span>}
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400">{a.roleId ? "This role has no permissions yet." : "Give this admin a role to set what they can open."}</span>
                    )}
                  </div>
                  {fmtAdded(a.createdAt) && <p className="text-[11px] text-gray-400 mt-3 truncate">Added {fmtAdded(a.createdAt)}</p>}
                  <div className="mt-auto pt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button type="button" onClick={() => navigate(`/admin/admin/edit/${a.id}`)} className={CARD_BTN_GRAY} title="Edit details"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button type="button" onClick={() => navigate(`/admin/admin/edit/${a.id}`)} className={CARD_BTN_GRAY} title="Change the password on the edit page"><KeyRound className="w-3.5 h-3.5" /> Password</button>
                    <button type="button" onClick={() => toggleStatus(a)} disabled={toggling === a.id}
                      className={`${CARD_BTN_GRAY} ${a.status === "active" ? "!border-amber-200 !text-amber-700 hover:!bg-amber-50" : "!border-green-200 !text-green-700 hover:!bg-green-50"}`}
                      title={a.status === "active" ? "Suspend: the admin can't sign in" : "Activate this account again"}>
                      {a.status === "active" ? <><Ban className="w-3.5 h-3.5" /> Suspend</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Activate</>}
                    </button>
                    <button type="button" onClick={() => setSelectedRow(a)} className={CARD_BTN_RED} title="Delete account"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
              <Pager currentPage={page} totalPages={totalPages} setPage={setPage} shown={shown.length} total={list.length} label="admins" />
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center">
          <p className="font-bold text-gray-700">{filtering ? "No admins match" : "No admins yet"}</p>
          <p className="text-sm text-gray-400">{filtering ? "Try another search or filter." : "Add the first admin to get started."}</p>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        onConfirm={confirmDelete}
        title="Delete Admin"
        description={`Are you sure you want to delete "${selectedRow?.name}"? This removes the admin account for good.`}
      />
    </div>
  );
};

export default Admin;
