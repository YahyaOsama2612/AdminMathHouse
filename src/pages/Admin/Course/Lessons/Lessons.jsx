import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, DollarSign, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePatch from "@/hooks/usePatch";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import LessonIdeasModal from "@/components/LessonIdeasModal";
import Errorpage from "@/components/Errorpage";
import { Chip, EmptyBox, FieldLabel, HeroCard, IconBtn, OrderInput, PageSkeleton, PlansModal, SEL, Thumb, moveBySwaps, plural, useDragRows } from "../parts/catalog";

/* Lessons of a chapter (MathPortal "Categories" design: lesson rows with materials and
   Questions · Quizzes · Ideas buttons).
   Endpoints: GET /api/admin/lessons/chapter/:chapterId, GET /api/admin/chapters/:chapterId,
              DELETE /api/admin/lessons/:id, PATCH /api/admin/lessons/swap-order { lessonIdA, lessonIdB }
   Reordering (drag ⋮⋮, ↑/↓, or typing an order number) only uses the swap-order endpoint. */

const MISSING = {
  pdf: ["No session PDF", (l) => !l.sessionPdf],
  ans: ["No answers PDF", (l) => !l.answersPdf],
  any: ["Missing a PDF", (l) => !l.sessionPdf || !l.answersPdf],
  ideas: ["No ideas", (l) => !l.ideasCount],
  plans: ["No price plan", (l) => !l.prices.length],
};

const Material = ({ url, label, tone }) =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      title={`Open ${label.toLowerCase()} PDF`}
      className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap hover:underline ${tone}`}
    >
      {label}
    </a>
  ) : (
    <span title="Missing" className="text-[11px] font-bold px-2 py-0.5 rounded-md border border-dashed border-gray-200 text-gray-300 whitespace-nowrap">{label}</span>
  );

const Lessons = () => {
  const navigate = useNavigate();
  const { chapterId } = useParams();
  const [pricePopup, setPricePopup] = useState({ open: false, row: null });
  const { patchData, loading: loadingPatch } = usePatch("/api/admin/lessons/swap-order");

  const { data, loading, refetch, error } = useGet(`/api/admin/lessons/chapter/${chapterId}`);
  const { data: chapterRes } = useGet(`/api/admin/chapters/${chapterId}`);
  const chapter = chapterRes?.data || {};

  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [ideasRow, setIdeasRow] = useState(null);
  const [q, setQ] = useState("");
  const [teacher, setTeacher] = useState("all");
  const [miss, setMiss] = useState("all");
  const [moving, setMoving] = useState(false);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/lessons/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/courses/lessons/edit/${row.id}`);
  };

  const tableData = useMemo(() => {
    const list = data?.data?.lessons || [];
    return list.map((item, index) => ({
      id: item.lesson.id,
      name: item.lesson.name,
      description: item.lesson.description,
      image: item.lesson.image,
      order: item.lesson.order,
      sessionPdf: item.lesson.session_pdf,
      answersPdf: item.lesson.session_answers_pdf,
      chapterName: item.chapter?.name || "—",
      courseName: item.course?.name || "—",
      categoryName: item.category?.name || "—",
      teacherName: item.teacher?.name || "—",
      prices: item.prices || [],
      ideasCount: item.ideas?.length || 0,
      prevId: list[index - 1]?.lesson.id || null,
      nextId: list[index + 1]?.lesson.id || null,
      isFirst: index === 0,
      isLast: index === list.length - 1,
      raw: item,
    }));
  }, [data]);

  /* ---------- ordering (swap-order only) ---------- */
  const swap = (a, b) => patchData({ lessonIdA: a, lessonIdB: b }, null, null);
  const moveTo = async (fromId, toId) => {
    setMoving(true);
    try {
      const moved = await moveBySwaps(tableData.map((r) => r.id), fromId, toId, swap);
      if (moved) toast.success("Order updated successfully!");
    } catch {
      /* usePatch already showed the error */
    } finally {
      await refetch();
      setMoving(false);
    }
  };
  const swapByNumber = async (row, target) => {
    await patchData({ lessonIdA: row.id, lessonIdB: target.id }, null, "Order updated successfully!");
    refetch();
  };
  const dnd = useDragRows(moveTo);

  const addLesson = () => navigate(`/admin/courses/lessons/add`, { state: { chapterId } });

  if (error) return <Errorpage />;
  if (!data) return <PageSkeleton />;

  const teachers = [...new Set(tableData.map((r) => r.teacherName).filter((t) => t && t !== "—"))].sort();
  const needle = q.trim().toLowerCase();
  const filtering = !!needle || teacher !== "all" || miss !== "all";
  const shown = tableData.filter(
    (r) =>
      (!needle || `${r.name} ${r.description || ""}`.toLowerCase().includes(needle)) &&
      (teacher === "all" || r.teacherName === teacher) &&
      (miss === "all" || MISSING[miss][1](r)),
  );
  const ready = tableData.filter((r) => r.sessionPdf && r.answersPdf).length;
  const withPlans = tableData.filter((r) => r.prices.length).length;
  const busy = loadingPatch || moving;

  const first = data?.data?.lessons?.[0];
  const category = chapter.category?.id ? chapter.category : first?.category;
  const course = chapter.course?.id ? chapter.course : first?.course;
  const semester = chapter.semester?.id ? chapter.semester : first?.semester;
  const chapterName = chapter.chapter?.name || first?.chapter?.name;

  return (
    <div>
      <HeroCard
        crumbs={[
          { label: "Categories", to: "/admin/courses/categories" },
          category?.id && { label: category.name || "Courses", to: `/admin/courses/courses/${category.id}` },
          course?.id && {
            label: course.name || "Course",
            to: semester?.id ? `/admin/courses/semester/${course.id}` : `/admin/courses/chapters/${course.id}`,
            state: { courseId: course.id, courseName: course.name },
          },
          semester?.id && {
            label: semester.name || "Semester",
            to: `/admin/courses/chapters/semester/${semester.id}`,
            state: { courseId: course?.id, semesterId: semester.id, semesterName: semester.name, courseName: course?.name },
          },
          { label: chapterName || "Chapter" },
        ]}
        thumb={<Thumb src={chapter.chapter?.image} name={chapterName || "?"} size={56} />}
        kicker={`Chapter${course?.name ? ` · ${course.name}` : ""}${semester?.name ? ` · ${semester.name}` : ""}`}
        title={chapterName || "Lessons"}
        desc={chapter.chapter?.description}
        chips={chapter.teacher?.name ? <Chip>{chapter.teacher.name}</Chip> : null}
        actions={
          <>
            <button type="button" onClick={addLesson} className="a-btn primary"><Plus size={16} /> Add lesson</button>
            <button type="button" onClick={() => navigate(`/admin/courses/chapters/edit/${chapterId}`)} className="a-btn">Edit chapter</button>
          </>
        }
        stats={[
          { label: "Lessons", value: tableData.length },
          { label: "Both PDFs ready", value: `${ready}/${tableData.length}`, color: ready < tableData.length ? "#b45309" : "#15803d" },
          { label: "Lesson ideas", value: tableData.reduce((a, r) => a + r.ideasCount, 0) },
          { label: "With price plans", value: `${withPlans}/${tableData.length}`, color: withPlans < tableData.length ? "#b45309" : "#15803d" },
        ]}
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[200px]">
            <FieldLabel>Find a lesson</FieldLabel>
            <span className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lesson name…" className={`${SEL} pl-9`} />
            </span>
          </label>
          <label className="block w-full sm:w-48">
            <FieldLabel>Teacher</FieldLabel>
            <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className={`${SEL} ${teacher !== "all" ? "border-[#7d0a0a] text-one font-semibold" : ""}`}>
              <option value="all">All</option>
              {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block w-full sm:w-52">
            <FieldLabel>What’s missing</FieldLabel>
            <select value={miss} onChange={(e) => setMiss(e.target.value)} className={`${SEL} ${miss !== "all" ? "border-[#7d0a0a] text-one font-semibold" : ""}`}>
              <option value="all">All</option>
              {Object.entries(MISSING).map(([k, [label, fn]]) => (
                <option key={k} value={k}>{label} ({tableData.filter(fn).length})</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
          <span className="text-gray-500">
            {filtering
              ? <>Showing <b className="text-gray-900">{shown.length}</b> of {plural(tableData.length, "lesson")} · reordering is off while filtering</>
              : "Drag ⋮⋮ or use ↑ ↓ to reorder lessons · click a lesson to edit it"}
          </span>
          {filtering && (
            <button type="button" onClick={() => { setQ(""); setTeacher("all"); setMiss("all"); }} className="font-bold text-one hover:underline">Clear filters</button>
          )}
        </div>
      </div>

      {!tableData.length ? (
        <EmptyBox title="No lessons yet" text="Add the first lesson of this chapter.">
          <button type="button" onClick={addLesson} className="a-btn primary mt-4"><Plus size={16} /> Add lesson</button>
        </EmptyBox>
      ) : !shown.length ? (
        <EmptyBox title="No lessons match" text="Try other filters." />
      ) : (
        <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${deleteLoading || busy || loading ? "opacity-70" : ""} ${deleteLoading || busy ? "pointer-events-none" : ""}`}>
          <div className="hidden xl:flex items-center gap-3 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50/60">
            <span className="w-[84px]">Order</span>
            <span className="flex-1">Lesson</span>
            <span className="w-32">Teacher</span>
            <span className="w-[130px]">Materials</span>
            <span className="w-[250px]">Questions · Quizzes · Ideas</span>
            <span className="w-[166px] text-right">Actions</span>
          </div>
          {shown.map((row) => (
            <div
              key={row.id}
              {...dnd.row(row.id, !filtering && !busy)}
              role="button"
              tabIndex={0}
              onClick={() => handleEdit(row)}
              onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && handleEdit(row)}
              className={`flex flex-wrap xl:flex-nowrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer transition ${
                dnd.over === row.id ? "bg-red-50/60 ring-2 ring-inset ring-[#7d0a0a]/20" : "hover:bg-gray-50"
              } ${dnd.drag === row.id ? "opacity-45" : ""}`}
            >
              <span className="flex items-center gap-1 shrink-0 xl:w-[84px]">
                {!filtering && (
                  <span {...dnd.handle(row.id)} className="hidden md:inline-flex cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 select-none" title="Drag to reorder lessons">
                    <GripVertical size={16} />
                  </span>
                )}
                <OrderInput row={row} rows={tableData} onSwap={swapByNumber} disabled={loading || busy} />
              </span>
              <span className="min-w-0 flex-1 basis-48 flex items-center gap-3">
                <Thumb src={row.image} name={row.name} size={36} />
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900 leading-snug break-words">{row.name}</span>
                  {row.description && <span className="block text-[11px] text-gray-400 line-clamp-1">{row.description}</span>}
                </span>
              </span>
              <span className="xl:w-32 text-xs text-gray-600 shrink-0 truncate">{row.teacherName}</span>
              <span className="xl:w-[130px] flex flex-wrap gap-1 shrink-0">
                <Material url={row.sessionPdf} label="Session" tone="bg-red-50 text-one" />
                <Material url={row.answersPdf} label="Answers" tone="bg-green-50 text-green-700" />
              </span>
              <span className="xl:w-[250px] flex flex-wrap gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/courses/questions/${row.id}`); }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="h-7 px-2 rounded-md border text-[11px] font-bold whitespace-nowrap bg-red-50 text-one border-red-100 hover:shadow-sm"
                  title={`Open questions for ${row.name}`}
                >
                  Questions
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/courses/quiz/${row.id}`); }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="h-7 px-2 rounded-md border text-[11px] font-bold whitespace-nowrap bg-purple-50 text-purple-700 border-purple-100 hover:shadow-sm"
                  title={`Open quizzes for ${row.name}`}
                >
                  Quizzes
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIdeasRow(row); }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className={`h-7 px-2 rounded-md border text-[11px] font-bold whitespace-nowrap hover:shadow-sm ${row.ideasCount ? "bg-amber-50 text-amber-800 border-amber-100" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}
                  title={`Ideas for ${row.name}`}
                >
                  Ideas <span className="tabular-nums">{row.ideasCount}</span>
                </button>
              </span>
              <span className="flex items-center gap-1.5 ml-auto xl:ml-0 xl:w-[166px] xl:justify-end shrink-0">
                {!filtering && (
                  <>
                    <IconBtn title="Move lesson up" disabled={row.isFirst || busy} onClick={() => moveTo(row.id, row.prevId)}><ArrowUp size={15} /></IconBtn>
                    <IconBtn title="Move lesson down" disabled={row.isLast || busy} onClick={() => moveTo(row.id, row.nextId)}><ArrowDown size={15} /></IconBtn>
                  </>
                )}
                <IconBtn title={`Price plans of ${row.name}`} onClick={() => setPricePopup({ open: true, row })}><DollarSign size={15} /></IconBtn>
                <IconBtn title={`Edit ${row.name}`} onClick={() => handleEdit(row)}><Pencil size={15} /></IconBtn>
                <IconBtn title={`Delete ${row.name}`} danger onClick={() => handleDelete(row)}><Trash2 size={15} /></IconBtn>
              </span>
            </div>
          ))}
        </section>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Lesson"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />

      <PlansModal open={pricePopup.open} row={pricePopup.row} onClose={() => setPricePopup({ open: false, row: null })} />

      {ideasRow && (
        <LessonIdeasModal
          open
          lessonId={ideasRow.id}
          onClose={() => {
            setIdeasRow(null);
            refetch(); // ideas count on the row
          }}
        />
      )}
    </div>
  );
};

export default Lessons;
