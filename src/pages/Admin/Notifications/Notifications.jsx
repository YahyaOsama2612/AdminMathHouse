import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Link2, Pencil, Trash2, Type } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Empty, Modal, PageHead, Pill, SkelRows } from "@/components/admin/kit";
import Composer from "./parts/Composer";

/* Notifications (design: RepPages['notifications']): composer on the left, sent log on the right.
   GET /api/admin/notification pages 10 rows by default and returns no total, so we ask for a large page.
   The log has no delivery status in the API, so the design's Status column is left out. */

const fmtWhen = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

const AUDIENCES = [["students", "student"], ["parents", "parent"], ["teachers", "teacher"]];
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** "To" cell: who received it (from GET /api/admin/notification → recipients) — click for the full list. */
function Recipients({ n, onOpen }) {
  const r = n.recipients || {};
  const parts = AUDIENCES.map(([k, w]) => [k, w, r[k] || { count: 0, read: 0, names: [] }]).filter(([, , x]) => x.count > 0);
  const total = parts.reduce((a, [, , x]) => a + x.count, 0);
  const read = parts.reduce((a, [, , x]) => a + x.read, 0);
  if (!total) return <span className="text-xs text-gray-400">No recipients</span>;
  return (
    <button type="button" onClick={onOpen} className="text-left group min-w-[150px]" title="See everyone who received it">
      {n.sendToAll && <Pill tone="green">Everyone</Pill>}
      <span className="block mt-1 space-y-0.5">
        {parts.map(([k, w, x]) => (
          <span key={k} className="block text-xs text-gray-700 group-hover:text-one">
            <b>{plural(x.count, w)}</b>
            {!n.sendToAll && x.names.length > 0 && <span className="text-gray-500">: {x.names.join(", ")}{x.count > x.names.length ? ` +${x.count - x.names.length}` : ""}</span>}
          </span>
        ))}
      </span>
      <span className="block text-[11px] text-gray-400 mt-0.5">{read} of {total} read · <span className="text-one font-semibold group-hover:underline">View all</span></span>
    </button>
  );
}

/** Full recipient list for one notification (GET /api/admin/notification/:id). */
function RecipientsModal({ n, onClose }) {
  const { data, loading, error } = useGet(`/api/admin/notification/${n.id}`);
  const d = data?.data || {};
  return (
    <Modal wide title="Sent to" onClose={onClose} actions={<button type="button" onClick={onClose} className="a-btn">Close</button>}>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">“{n.notification || n.text}”</p>
      {loading && !data ? <SkelRows n={3} /> : error ? <p className="text-sm text-red-600">Could not load the recipients.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AUDIENCES.map(([k, w]) => {
            const people = Array.isArray(d[k]) ? d[k] : [];
            const x = n.recipients?.[k];
            return (
              <div key={k} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 min-w-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{w}s · {people.length}</p>
                {x?.count ? <p className="text-[11px] text-gray-400">{x.read} read</p> : null}
                {people.length ? (
                  <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto pr-1">
                    {people.map((p) => <li key={p.value} className="text-sm text-gray-800 truncate" title={p.label}>{p.label}</li>)}
                  </ul>
                ) : <p className="text-sm text-gray-400 mt-2">None</p>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

const Notifications = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/notification?limit=500");
  const { data: optionsData, loading: optionsLoading } = useGet("/api/admin/notification/select-options");
  const { postData } = usePost("/api/admin/notification");
  const { deleteData, loading: deleteLoading } = useDelete();
  const [selectedRow, setSelectedRow] = useState(null);
  const [viewing, setViewing] = useState(null); // notification whose recipients are shown
  const [q, setQ] = useState("");

  const options = optionsData?.data;
  const log = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);
  const ql = q.trim().toLowerCase();
  // search also matches the recipients' names
  const list = log.filter((n) => !ql || [n.notification, n.materialLink, ...AUDIENCES.flatMap(([k]) => n.recipients?.[k]?.names || [])].join(" ").toLowerCase().includes(ql));

  const create = async (payload) => {
    await postData(payload, "/api/admin/notification", "Notification sent successfully");
    refetch();
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/notification/${selectedRow.id}`);
      setSelectedRow(null);
      refetch();
    } catch {
      /* useDelete already shows the error */
    }
  };

  const typeOf = (n) => (n.materialFile ? ["File", FileText] : n.materialLink ? ["Link", Link2] : ["Text", Type]);

  return (
    <div>
      <PageHead title="Notifications" sub="Send a message to everyone or to chosen students, parents and teachers." />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 xl:col-span-2 min-w-0">
          <h3 className="font-bold text-gray-800 text-[15px] mb-1">Compose</h3>
          <p className="text-xs text-gray-400 mb-3">A text message, optionally with a link.</p>
          {optionsLoading && !options ? <SkelRows n={4} /> : <Composer options={options} onSubmit={create} resetAfter compact />}
        </section>

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm xl:col-span-3 min-w-0">
          <div className="px-5 pt-5 pb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-800 text-[15px] mb-1">Sent log</h3>
              <p className="text-xs text-gray-400">Newest first · {log.length} notification{log.length === 1 ? "" : "s"}</p>
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search message, link or name…" className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white w-full sm:w-56" />
          </div>
          {loading && !data ? <div className="px-5 pb-5"><SkelRows n={5} /></div> : error ? (
            <div className="px-5 pb-5"><Empty title="Could not load notifications" text={String(error)} /></div>
          ) : (
            // One card per notification (no table) so it fits the column at every width — nothing hidden off to the side.
            <ul className="border-t border-gray-100 divide-y divide-gray-100 max-h-[75vh] overflow-y-auto">
              {list.map((n) => {
                const [tl, TIcon] = typeOf(n);
                return (
                  <li key={n.id} className="px-5 py-4 hover:bg-gray-50/60">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 break-words" title={n.notification}>{n.notification || n.text}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span className="whitespace-nowrap">{fmtWhen(n.dateTime)}</span>
                          <span className="text-gray-300">·</span>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap"><TIcon size={13} /> {tl}</span>
                          {n.materialLink && <><span className="text-gray-300">·</span><a href={n.materialLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-one hover:underline break-all">{n.materialLink.replace(/^https?:\/\//, "")}</a></>}
                          {n.materialFile && <><span className="text-gray-300">·</span><a href={n.materialFile} target="_blank" rel="noopener noreferrer" className="font-semibold text-one hover:underline">Open file</a></>}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button onClick={() => navigate(`/admin/notifications/edit/${n.id}`)} className="a-act" title="Edit" aria-label="Edit notification"><Pencil size={15} /></button>
                        <button onClick={() => setSelectedRow(n)} disabled={deleteLoading} className="a-act del" title="Delete" aria-label="Delete notification"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5 shrink-0">To</span>
                      <Recipients n={n} onOpen={() => setViewing(n)} />
                    </div>
                  </li>
                );
              })}
              {!list.length && <li className="py-12 text-center text-sm text-gray-400">{log.length ? "Nothing matches." : "No notifications sent yet."}</li>}
            </ul>
          )}
        </section>
      </div>

      {viewing && <RecipientsModal n={viewing} onClose={() => setViewing(null)} />}

      <ConfirmDeleteModal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        onConfirm={confirmDelete}
        title="Delete notification?"
        description={`Delete "${selectedRow?.text || selectedRow?.notification || ""}"? Recipients will no longer see it.`}
      />
    </div>
  );
};

export default Notifications;
