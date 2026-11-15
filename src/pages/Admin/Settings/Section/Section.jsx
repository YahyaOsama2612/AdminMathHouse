import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Timer } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { PageHead } from "@/components/admin/kit";
import {
  AddButton, CardActions, CardGridSkeleton, HeadSkeleton, LoadError, NoResults, SearchInput,
} from "../settingsKit";

/* Settings → Sections (MathPortal design: KPI row, search + time filter, one card per section).
   GET /api/admin/sections, DELETE /api/admin/sections/:id */

const COLORS = ["#7d0a0a", "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#475569"];
const secDur = (m) => {
  const n = Math.round(Number(m) || 0);
  const h = Math.floor(n / 60);
  const r = n % 60;
  return h ? `${h} h${r ? ` ${r} min` : ""}` : `${r} min`;
};

const Section = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/sections");
  const { deleteData } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [time, setTime] = useState("all");

  const all = useMemo(() => data?.data?.sections || [], [data]);
  const times = useMemo(() => [...new Set(all.map((s) => Number(s.sectionTime) || 0))].sort((a, b) => a - b), [all]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      (x) =>
        (time === "all" || String(Number(x.sectionTime) || 0) === time) &&
        (!s || `${x.sectionName} ${x.sectionDescription || ""}`.toLowerCase().includes(s)),
    );
  }, [all, q, time]);
  const filtered = q || time !== "all";
  const total = all.reduce((a, s) => a + (Number(s.sectionTime) || 0), 0);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/sections/${selectedRow.id}`);
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
        <div className="skel h-28 mb-4"></div>
        <div className="skel h-16 mb-5"></div>
        <CardGridSkeleton n={8} h="h-40" />
      </div>
    );
  if (error && !data) return <LoadError text="Could not load the sections." onRetry={refetch} />;

  return (
    <div>
      <PageHead title="Sections" sub="Exam sections with each section’s time limit — exams are built from these.">
        <AddButton onClick={() => navigate("/admin/settings/section/add")}>Add Section</AddButton>
      </PageHead>

      {/* Design "Exam timeline": every section as a block sized by its time limit, with running time marks. */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Exam timeline</p>
            <p className="text-2xl font-extrabold text-gray-900">{secDur(total)} <span className="text-sm font-semibold text-gray-400">· {all.length} section{all.length === 1 ? "" : "s"}</span></p>
          </div>
          <p className="text-xs text-gray-400">Average {all.length ? Math.round(total / all.length) : 0} min per section{times.length > 1 ? ` · ${times[0]}–${times[times.length - 1]} min` : ""}</p>
        </div>
        {all.length && total > 0 ? (() => {
          let start = 0;
          const marks = all.map((s, i) => { const m = { s, i, from: start, min: Number(s.sectionTime) || 0 }; start += m.min; return m; });
          return (
            <>
              <div className="flex h-11 rounded-xl overflow-hidden gap-0.5">
                {marks.map((m) => (
                  <button key={m.s.id} type="button" onClick={() => navigate(`/admin/settings/section/edit/${m.s.id}`)}
                    className="flex flex-col justify-center items-start min-w-0 px-2.5 text-white text-[11px] font-bold leading-tight text-left hover:brightness-110 transition"
                    style={{ flex: Math.max(m.min, 1), background: COLORS[m.i % COLORS.length] }} title={`${m.s.sectionName} · ${m.min} min — click to edit`}>
                    <span className="truncate max-w-full">{m.s.sectionName}</span><span className="opacity-80">{m.min}m</span>
                  </button>
                ))}
              </div>
              <div className="relative h-4 mt-1 text-[10px] text-gray-400">
                {marks.map((m, k) => <span key={m.s.id} className={`absolute ${k ? "-translate-x-1/2" : ""}`} style={{ left: `${(m.from / total) * 100}%` }}>{m.from ? secDur(m.from) : "0"}</span>)}
                <span className="absolute right-0">{secDur(total)}</span>
              </div>
            </>
          );
        })() : <p className="text-sm text-gray-400">No sections yet.</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-5 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search sections…" className="flex-1 min-w-[200px]" />
        <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
          Time
          <select value={time} onChange={(e) => setTime(e.target.value)} className="a-inp w-auto normal-case font-normal">
            <option value="all">All</option>
            {times.map((t) => <option key={t} value={String(t)}>{t} min</option>)}
          </select>
        </label>
        <span className="text-xs text-gray-400 ml-auto">
          {list.length} of {all.length}
          {filtered && (
            <>
              {" · "}
              <button type="button" onClick={() => { setQ(""); setTime("all"); }} className="font-bold text-one hover:underline">Clear</button>
            </>
          )}
        </span>
      </div>

      {list.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {list.map((s, i) => (
            <div key={s.id} className="rs-card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                  <Timer size={17} />
                </span>
                <CardActions name={s.sectionName} onEdit={() => navigate(`/admin/settings/section/edit/${s.id}`)} onDelete={() => handleDelete(s)} />
              </div>
              <p className="font-bold text-gray-900 mt-3 break-words">{s.sectionName}</p>
              <p className={`text-sm break-words ${s.sectionDescription ? "text-gray-500" : "text-gray-300"}`}>{s.sectionDescription || "No description"}</p>
              <div className="mt-auto pt-4">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                  <Clock size={14} className="text-gray-400" /> {s.sectionTime} min
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : all.length ? (
        <NoResults title="No sections found" text="Try another search or time." onClear={() => { setQ(""); setTime("all"); }} />
      ) : (
        <NoResults title="No sections yet" text="Add the first section." />
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete section"
        description={selectedRow ? `Delete "${selectedRow.sectionName}" (${selectedRow.sectionTime} min)?` : ""}
      />
    </div>
  );
};

export default Section;
