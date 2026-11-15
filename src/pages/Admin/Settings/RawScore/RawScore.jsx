import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { PageHead, Stat } from "@/components/admin/kit";
import {
  AddButton, CardActions, CardGridSkeleton, FilterLabel, HeadSkeleton, LoadError, NoResults, SearchInput,
} from "../settingsKit";

/* Settings → Raw Scores (MathPortal design: KPI row, filter card, one card per rule with a gifted/earned bar).
   GET /api/admin/rawScore, DELETE /api/admin/rawScore/:id */

const EMPTY = { q: "", gifting: "all", gift: "all", course: "all" };

const RawScore = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/rawScore");
  const { deleteData } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [f, setF] = useState(EMPTY);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const all = useMemo(
    () =>
      (data?.data?.rawScores || []).map((r) => ({
        id: r.id,
        name: r.name,
        score: Number(r.score) || 0,
        is_giftingScore: !!r.is_giftingScore,
        giftingScore: Number(r.giftingScore) || 0,
        courseName: r.courses?.name || "-",
      })),
    [data],
  );

  const gifts = useMemo(() => [...new Set(all.filter((r) => r.is_giftingScore).map((r) => r.giftingScore))].sort((a, b) => a - b), [all]);
  const courses = useMemo(() => [...new Set(all.map((r) => r.courseName))].sort(), [all]);

  const list = useMemo(() => {
    const s = f.q.trim().toLowerCase();
    return all.filter(
      (r) =>
        (f.gifting === "all" || String(r.is_giftingScore) === f.gifting) &&
        (f.gift === "all" || (f.gift === "-" ? !r.is_giftingScore : r.is_giftingScore && String(r.giftingScore) === f.gift)) &&
        (f.course === "all" || r.courseName === f.course) &&
        (!s || `${r.name} ${r.courseName}`.toLowerCase().includes(s)),
    );
  }, [all, f]);

  const active = f.q || f.gifting !== "all" || f.gift !== "all" || f.course !== "all";
  const giftedN = all.filter((r) => r.is_giftingScore).length;

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/rawScore/${selectedRow.id}`);
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
        <div className="grid grid-cols-3 gap-3 mb-4">{[0, 1, 2].map((i) => <div key={i} className="skel h-20"></div>)}</div>
        <div className="skel h-24 mb-5"></div>
        <CardGridSkeleton n={6} h="h-44" cols="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />
      </div>
    );
  if (error && !data) return <LoadError text="Could not load the raw scores." onRetry={refetch} />;

  return (
    <div>
      <PageHead title="Raw Scores" sub="The maximum score of each course, and how many points are gifted to every student before they earn the rest.">
        <AddButton onClick={() => navigate("/admin/settings/rawscore/add")}>Add Raw Score</AddButton>
      </PageHead>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Raw scores" value={all.length} />
        <Stat label="With gifting" value={<>{giftedN}<span className="text-sm text-gray-400 font-semibold"> / {all.length}</span></>} />
        <Stat label="Courses" value={courses.length} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <FilterLabel label="Search">
            <SearchInput value={f.q} onChange={set("q")} placeholder="Name or course…" />
          </FilterLabel>
          <FilterLabel label="Gifting?">
            <select value={f.gifting} onChange={(e) => set("gifting")(e.target.value)} className="a-inp">
              <option value="all">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </FilterLabel>
          <FilterLabel label="Gifting score">
            <select value={f.gift} onChange={(e) => set("gift")(e.target.value)} className="a-inp">
              <option value="all">All</option>
              {gifts.map((g) => <option key={g} value={String(g)}>{g}</option>)}
              <option value="-">None</option>
            </select>
          </FilterLabel>
          <FilterLabel label="Course">
            <select value={f.course} onChange={(e) => set("course")(e.target.value)} className="a-inp">
              <option value="all">All</option>
              {courses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FilterLabel>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <span>{list.length} of {all.length} raw scores</span>
          {active && <button type="button" onClick={() => setF(EMPTY)} className="font-bold text-one hover:underline">Clear filters</button>}
        </div>
      </div>

      {list.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {list.map((r) => {
            const pct = r.is_giftingScore && r.score ? Math.min(100, Math.round((r.giftingScore / r.score) * 100)) : 0;
            return (
              <div key={r.id} className="rs-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 truncate">{r.courseName}</p>
                  </div>
                  <CardActions name={r.name} onEdit={() => navigate(`/admin/settings/rawscore/edit/${r.id}`)} onDelete={() => handleDelete(r)} />
                </div>
                <div className="flex items-end justify-between gap-3 mt-4">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Max score</p>
                    <p className="text-3xl font-extrabold text-gray-900 leading-none mt-1">{r.score.toLocaleString("en-US")}</p>
                  </div>
                  {r.is_giftingScore ? (
                    <span className="rs-gift inline-flex items-center gap-1"><Gift size={12} /> +{r.giftingScore.toLocaleString("en-US")} gifted</span>
                  ) : (
                    <span className="rs-nogift">No gifting</span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
                    {pct > 0 && <span className="h-full" style={{ width: `${pct}%`, background: "#16a34a" }} title={`Gifted ${r.giftingScore}`}></span>}
                    <span className="h-full flex-1" style={{ background: "#7d0a0a", opacity: 0.85 }} title="Earned"></span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 mt-1.5 gap-2">
                    {r.is_giftingScore ? (
                      <>
                        <span><b className="text-green-700">{r.giftingScore}</b> gifted ({pct}%)</span>
                        <span><b className="text-gray-600">{Math.max(0, r.score - r.giftingScore).toLocaleString("en-US")}</b> to earn</span>
                      </>
                    ) : (
                      <span>All <b className="text-gray-600">{r.score}</b> points are earned</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : all.length ? (
        <NoResults title="No raw scores found" text="Try other filters." onClear={() => setF(EMPTY)} />
      ) : (
        <NoResults title="No raw scores yet" text="Add the first raw score rule." />
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete raw score"
        description={selectedRow ? `Delete "${selectedRow.name}" (${selectedRow.courseName}, max ${selectedRow.score})?` : ""}
      />
    </div>
  );
};

export default RawScore;
