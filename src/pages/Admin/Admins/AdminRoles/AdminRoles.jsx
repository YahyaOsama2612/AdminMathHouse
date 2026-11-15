import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { PageHead, Pill, SkelRows, Stat } from "@/components/admin/kit";
import { CARD_BTN, CARD_BTN_RED, LoadError, SearchInput, initials, statusLabel, statusTone } from "@/pages/Admin/User/parts/people";
import { accessSummary, ACCESS_TAG, ALL_ACTIONS, countPerms, parsePerms } from "./parts/access";

/* Admin Roles list (MathPortal "admin-roles" screen).
   GET /api/admin/roles · DELETE /api/admin/roles/:id
   Read quietly for extra numbers (each part is left out when it can't be read):
   GET /api/admin/roles/available-permissions (module/permission totals) and GET /api/admin/admin (who has each role). */

const AdminRoles = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/roles");
  const { deleteData, loading: deleteLoading } = useDelete();
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");

  const [schema, setSchema] = useState(null); // { modules, actions, labels }
  const [admins, setAdmins] = useState(null);
  useEffect(() => {
    let live = true;
    api.get("/api/admin/roles/available-permissions")
      .then((r) => {
        const d = r.data?.data || r.data || {};
        const labels = {};
        (d.permissions || []).forEach((p) => { if (p.module && p.label) labels[p.module] = p.label; });
        if (live && Array.isArray(d.modules)) setSchema({ modules: d.modules, actions: d.actions?.length ? d.actions : ALL_ACTIONS, labels });
      })
      .catch(() => {});
    api.get("/api/admin/admin")
      .then((r) => { if (live) setAdmins(r.data?.data?.data || []); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const roles = useMemo(
    () =>
      (data?.data?.roles || data?.roles || []).map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        perms: parsePerms(r.permissions),
      })),
    [data],
  );
  const total = schema ? schema.modules.length * schema.actions.length : null;
  const members = (id) => (admins || []).filter((a) => a.role?.id === id);
  const withRole = admins ? admins.filter((a) => a.role?.id && roles.some((r) => r.id === a.role.id)).length : null;

  const ql = q.trim().toLowerCase();
  const list = roles.filter((r) => !ql || String(r.name || "").toLowerCase().includes(ql));

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/roles/${selectedRow.id}`);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const first = loading && !data;
  const activeRoles = roles.filter((r) => r.status === "active").length;

  return (
    <div>
      <PageHead title="Admin Roles" sub="A role is a set of permissions. Give each admin one role — change the role and everyone in it changes too.">
        <button type="button" onClick={() => navigate("/admin/admin-roles/add")} className="a-btn primary"><Plus className="w-4 h-4" /> Create role</button>
      </PageHead>

      {!first && !(error && !data) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Roles" value={roles.length} />
          <Stat label="Active roles" value={activeRoles} color="#15803d" sub={roles.length - activeRoles ? `${roles.length - activeRoles} inactive` : undefined} />
          {withRole != null && (
            <Stat label="Admins with a role" value={withRole}>
              {admins.length - withRole > 0 && <p className="text-[11px] font-bold text-red-600">{admins.length - withRole} without a role</p>}
            </Stat>
          )}
          {schema && <Stat label="Modules" value={schema.modules.length} sub={`${total} permissions`} />}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <SearchInput className="flex-1 min-w-[200px]" label="Search roles" value={q} onChange={setQ} placeholder="Search roles…" />
        <span className="text-xs text-gray-400 ml-auto">
          {list.length} of {roles.length} roles
          {(loading || deleteLoading) && !first && <span className="ml-2">Updating…</span>}
        </span>
      </div>

      {first ? (
        <SkelRows n={6} />
      ) : error && !data ? (
        <LoadError text={error} onRetry={refetch} />
      ) : list.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {list.map((r) => {
            const n = countPerms(r.perms);
            const acc = accessSummary(r.perms, schema?.actions, schema?.labels);
            const mem = members(r.id);
            return (
              <article key={r.id} className="rs-card flex flex-col min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-one bg-red-50"><ShieldCheck className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate" title={r.name}>{r.name}</p>
                    <p className="text-xs text-gray-500">{acc.length} module{acc.length === 1 ? "" : "s"} · {n} permission{n === 1 ? "" : "s"}</p>
                  </div>
                  {r.status && <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill>}
                </div>
                {total ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-gray-400 uppercase tracking-wider">Permissions</span>
                      <b className="text-gray-800">{n} of {total}</b>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full bg-one" style={{ width: `${Math.min(100, (n / total) * 100)}%` }} /></div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {acc.length ? (
                    <>
                      {acc.slice(0, 8).map((x) => <span key={x.module} className={`text-[11px] font-semibold px-2 py-1 rounded-md ${ACCESS_TAG[x.tag]}`}>{x.label} · {x.tag}</span>)}
                      {acc.length > 8 && <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-500" title={acc.slice(8).map((x) => x.label).join(", ")}>+{acc.length - 8}</span>}
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400">No access yet — edit the permissions.</span>
                  )}
                </div>
                {admins && (
                  <div className="flex items-center gap-2 mt-4 min-w-0">
                    <div className="flex -space-x-2 shrink-0">
                      {mem.slice(0, 4).map((a) => (
                        <span key={a.id} title={a.name} className={`w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-extrabold text-white ${a.status === "active" ? "bg-one" : "bg-slate-400"}`}>{initials(a.name)}</span>
                      ))}
                    </div>
                    {mem.length ? (
                      <button type="button" onClick={() => navigate("/admin/admin", { state: { role: r.id } })} className="text-xs font-semibold text-gray-500 hover:text-one truncate">
                        {mem.length} admin{mem.length === 1 ? "" : "s"} →
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400">No admins yet</span>
                    )}
                  </div>
                )}
                <div className="mt-auto pt-4 grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => navigate(`/admin/admin-roles/edit/${r.id}`)} className={`${CARD_BTN} text-white border-transparent bg-one hover:bg-one/90`} title="Edit role"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button type="button" onClick={() => setSelectedRow(r)} className={CARD_BTN_RED} title="Delete role"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center">
          <p className="font-bold text-gray-700">{ql ? "No roles match" : "No roles yet"}</p>
          <p className="text-sm text-gray-400">{ql ? "Try another search." : "Create a role, then give it to your admins."}</p>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        onConfirm={confirmDelete}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${selectedRow?.name}"?${selectedRow && members(selectedRow.id).length ? ` ${members(selectedRow.id).length} admin(s) have this role.` : " This might affect admins assigned to it."}`}
      />
    </div>
  );
};

export default AdminRoles;
