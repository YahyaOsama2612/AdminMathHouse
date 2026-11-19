import { useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, ChevronRight, ClipboardCheck, DollarSign, FileText, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePatch from "@/hooks/usePatch";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Errorpage from "@/components/Errorpage";
import { Chip, EmptyBox, FieldLabel, HeroCard, IconBtn, OrderInput, PageSkeleton, PlansModal, SEL, Thumb, moveBySwaps, plural, useDragRows } from "../parts/catalog";

/* Chapters of a course — or of one semester (MathPortal "Categories" design: course page with chapter cards).
   Endpoints: GET /api/admin/chapters/course/:courseId | /api/admin/chapters/semester/:semesterId,
              GET /api/admin/semester/:id, GET /api/admin/courses/:id, DELETE /api/admin/chapters/:id,
              PATCH /api/admin/chapters/swap-order { chapterIdA, chapterIdB }
   Reordering (drag ⋮⋮, ↑/↓, or typing an order number) only uses the swap-order endpoint. */

const Chapters = () => {
  const { patchData, loading: loadingPatch } = usePatch("/api/admin/chapters/swap-order");
  const { courseId, semesterId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateData = location.state || {};
  const finalCourseId = courseId || stateData.courseId;
  const finalSemesterId = semesterId || stateData.semesterId;

  const apiEndpoint = finalSemesterId
    ? `/api/admin/chapters/semester/${finalSemesterId}`
    : `/api/admin/chapters/course/${finalCourseId}`;

  const { data, loading, refetch, error } = useGet(apiEndpoint);
  const { deleteData, loading: deleteLoading } = useDelete();

  const { data: semesterRes } = useGet(finalSemesterId ? `/api/admin/semester/${finalSemesterId}` : null);

  const fetchedSemester =
    semesterRes?.data?.data?.[0] ||
    (Array.isArray(semesterRes?.data?.data) ? semesterRes?.data?.data[0] : semesterRes?.data?.data) ||
    semesterRes?.data?.semester ||
    (semesterRes?.data && typeof semesterRes?.data === "object" && semesterRes?.data?.name ? semesterRes?.data : null);

  const semester =
    fetchedSemester ||
    data?.data?.chapters?.[0]?.semester ||
    (stateData.semesterName ? { name: stateData.semesterName, id: finalSemesterId } : {});

  const effectiveCourseId =
    finalCourseId ||
    semester?.courseId ||
    semester?.course?.id ||
    data?.data?.chapters?.[0]?.course?.id ||
    stateData?.courseId;

  const { data: courseRes } = useGet(effectiveCourseId ? `/api/admin/courses/${effectiveCourseId}` : null);

  const [pricePopup, setPricePopup] = useState({ open: false, row: null });

  const fetchedCourse =
    courseRes?.data?.course ||
    courseRes?.data?.data ||
    (courseRes?.data && typeof courseRes?.data === "object" && courseRes?.data?.name ? courseRes?.data : null);

  const course =
    fetchedCourse ||
    semester?.course ||
    data?.data?.chapters?.[0]?.course ||
    (stateData.courseName ? { name: stateData.courseName, id: effectiveCourseId } : {});

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [teacher, setTeacher] = useState("all");
  const [moving, setMoving] = useState(false);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/chapters/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/courses/chapters/edit/${row.id}`);
  };

  const openLessons = (row) => navigate(`/admin/courses/lessons/${row.id}`);

  const tableData = useMemo(() => {
    const list = data?.data?.chapters || [];
    return list.map((item, index) => ({
      id: item.chapter.id,
      name: item.chapter.name,
      description: item.chapter.description,
      image: item.chapter.image,
      order: item.chapter.order,
      courseName: item.course?.name || "—",
      categoryName: item.category?.name || "—",
      teacherName: item.teacher?.name || "—",
      teacher: item.teacher,
      prevId: list[index - 1]?.chapter.id || null,
      nextId: list[index + 1]?.chapter.id || null,
      isFirst: index === 0,
      prices: item.prices || [],
      isLast: index === list.length - 1,
      raw: item,
    }));
  }, [data]);

  /* ---------- ordering (swap-order only) ---------- */
  const swap = (a, b) => patchData({ chapterIdA: a, chapterIdB: b }, null, null);
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
    await patchData({ chapterIdA: row.id, chapterIdB: target.id }, null, "Order updated successfully!");
    await refetch();
  };
  const dnd = useDragRows(moveTo);

  const addChapter = () => {
    const targetCourseId =
      effectiveCourseId || course?.id || semester?.courseId || semester?.course?.id || stateData?.courseId;

    if (finalSemesterId) {
      navigate(`/admin/courses/chapters/semester/${finalSemesterId}/add`, {
        state: {
          courseId: targetCourseId,
          semesterId: finalSemesterId,
          semesterName: semester?.name,
          courseName: course?.name,
        },
      });
    } else {
      navigate(`/admin/courses/chapters/add`, {
        state: { courseId: targetCourseId, courseName: course?.name },
      });
    }
  };

  if (error) return <Errorpage />;
  if (!data) return <PageSkeleton />;

  const first = data?.data?.chapters?.[0];
  const categoryId = course.categoryId || first?.category?.id;
  const categoryName = first?.category?.name;
  const courseIdForLinks = effectiveCourseId || course?.id;
  const semesterTitleName = semester?.name || stateData?.semesterName;
  const courseTitleName = course?.name || stateData?.courseName;
  const hasSemesters = !!finalSemesterId || (course.semesters && course.semesters.length > 0);

  const teachers = [...new Set(tableData.map((r) => r.teacherName).filter((t) => t && t !== "—"))].sort();
  const needle = q.trim().toLowerCase();
  const filtering = !!needle || teacher !== "all";
  const shown = tableData.filter(
    (r) =>
      (!needle || `${r.name} ${r.description || ""}`.toLowerCase().includes(needle)) &&
      (teacher === "all" || r.teacherName === teacher),
  );
  const noPlan = tableData.filter((r) => !r.prices.length).length;
  const busy = loadingPatch || moving;

  return (
    <div>
      <HeroCard
        crumbs={[
          { label: "Categories", to: "/admin/courses/categories" },
          categoryId && { label: categoryName || "Courses", to: `/admin/courses/courses/${categoryId}` },
          finalSemesterId
            ? courseIdForLinks && { label: courseTitleName || "Course", to: `/admin/courses/semester/${courseIdForLinks}` }
            : { label: courseTitleName || "Course" },
          finalSemesterId && { label: semesterTitleName || "Semester" },
        ]}
        thumb={<Thumb src={course.image} name={courseTitleName || semesterTitleName || "?"} size={56} />}
        kicker={finalSemesterId ? `Semester · ${courseTitleName || "Course"}` : `Course${categoryName ? ` · ${categoryName}` : ""}`}
        title={finalSemesterId ? semesterTitleName || "Semester" : courseTitleName || "Course"}
        desc={finalSemesterId ? null : course.description}
        chips={
          <>
            {hasSemesters && <Chip tone="blue">Semesters</Chip>}
            {course.teachers?.length > 0 && <Chip>{plural(course.teachers.length, "course teacher")}</Chip>}
          </>
        }
        actions={
          <>
            <button type="button" onClick={addChapter} className="a-btn primary"><Plus size={16} /> Add chapter</button>
            {courseIdForLinks && (
              <>
                {/* exams of this course — the course goes in the link too, so a page refresh keeps it */}
                <button type="button" onClick={() => navigate(`/admin/courses/exam/add?courseId=${courseIdForLinks}`, { state: { courseId: courseIdForLinks } })} className="a-btn"><FileText size={16} /> Add exam</button>
                <button type="button" onClick={() => navigate(`/admin/courses/diagnosticexam/add?courseId=${courseIdForLinks}`, { state: { courseId: courseIdForLinks } })} className="a-btn"><ClipboardCheck size={16} /> Add diagnostic exam</button>
                <button type="button" onClick={() => navigate(`/admin/courses/exam/${courseIdForLinks}`)} className="a-btn">View exams</button>
              </>
            )}
            {courseIdForLinks && (
              <button type="button" onClick={() => navigate(`/admin/courses/courses/edit/${courseIdForLinks}`)} className="a-btn">Edit course</button>
            )}
          </>
        }
        stats={[
          { label: "Chapters", value: tableData.length },
          { label: "Teachers", value: teachers.length },
          { label: "With price plans", value: `${tableData.length - noPlan}/${tableData.length}`, color: noPlan ? "#b45309" : "#15803d" },
          { label: "With image", value: `${tableData.filter((r) => r.image).length}/${tableData.length}` },
        ]}
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[200px]">
            <FieldLabel>Find a chapter</FieldLabel>
            <span className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chapter name…" className={`${SEL} pl-9`} />
            </span>
          </label>
          <label className="block w-full sm:w-52">
            <FieldLabel>Teacher</FieldLabel>
            <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className={`${SEL} ${teacher !== "all" ? "border-[#7d0a0a] text-one font-semibold" : ""}`}>
              <option value="all">All</option>
              {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
          <span className="text-gray-500">
            {filtering
              ? <>Showing <b className="text-gray-900">{shown.length}</b> of {plural(tableData.length, "chapter")} · reordering is off while filtering</>
              : "Drag ⋮⋮ or use ↑ ↓ to reorder chapters · click a chapter to open its lessons"}
          </span>
          {filtering && (
            <button type="button" onClick={() => { setQ(""); setTeacher("all"); }} className="font-bold text-one hover:underline">Clear filters</button>
          )}
        </div>
      </div>

      {!tableData.length ? (
        <EmptyBox title="No chapters yet" text="Add the first chapter, then its lessons.">
          <button type="button" onClick={addChapter} className="a-btn primary mt-4"><Plus size={16} /> Add chapter</button>
        </EmptyBox>
      ) : !shown.length ? (
        <EmptyBox title="No chapters match" text="Try another search or teacher." />
      ) : (
        <div className={`space-y-3 ${deleteLoading || busy || loading ? "opacity-70" : ""} ${deleteLoading || busy ? "pointer-events-none" : ""}`}>
          {shown.map((row) => {
            const idx = tableData.indexOf(row);
            return (
              <section
                key={row.id}
                {...dnd.row(row.id, !filtering && !busy)}
                role="button"
                tabIndex={0}
                onClick={() => openLessons(row)}
                onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && openLessons(row)}
                className={`group bg-white rounded-2xl border shadow-sm px-3 sm:px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 cursor-pointer transition hover:shadow-md ${
                  dnd.over === row.id ? "border-[#7d0a0a] ring-2 ring-[#7d0a0a]/15" : "border-gray-100 hover:border-[#7d0a0a]/40"
                } ${dnd.drag === row.id ? "opacity-45" : ""}`}
              >
                {!filtering && (
                  <span {...dnd.handle(row.id)} className="hidden md:inline-flex cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 select-none" title="Drag to reorder chapters">
                    <GripVertical size={18} />
                  </span>
                )}
                <OrderInput row={row} rows={tableData} onSwap={swapByNumber} disabled={loading || busy} />
                <Thumb src={row.image} name={row.name} size={44} />
                <div className="min-w-0 flex-1 basis-48">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-one">Chapter {idx + 1}</span>
                  <span className="block font-bold text-gray-900 leading-snug break-words">{row.name}</span>
                  <span className="block text-[11px] text-gray-400">
                    {row.teacherName !== "—" ? row.teacherName : "No teacher"} · {row.prices.length ? plural(row.prices.length, "price plan") : <span className="text-amber-700 font-semibold">No price plan</span>}
                  </span>
                </div>
                <span className="flex flex-wrap items-center gap-1.5">
                  {!filtering && (
                    <>
                      <IconBtn title="Move chapter up" disabled={row.isFirst || busy} onClick={() => moveTo(row.id, row.prevId)}><ArrowUp size={15} /></IconBtn>
                      <IconBtn title="Move chapter down" disabled={row.isLast || busy} onClick={() => moveTo(row.id, row.nextId)}><ArrowDown size={15} /></IconBtn>
                    </>
                  )}
                  <IconBtn title={`Price plans of ${row.name}`} onClick={() => setPricePopup({ open: true, row })}><DollarSign size={15} /></IconBtn>
                  <IconBtn title={`Edit ${row.name}`} onClick={() => handleEdit(row)}><Pencil size={15} /></IconBtn>
                  <IconBtn title={`Delete ${row.name}`} danger onClick={() => handleDelete(row)}><Trash2 size={15} /></IconBtn>
                  <span className="hidden sm:flex items-center gap-0.5 pl-1 text-xs font-bold text-one opacity-70 group-hover:opacity-100">
                    Lessons <ChevronRight size={14} />
                  </span>
                </span>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
      <PlansModal open={pricePopup.open} row={pricePopup.row} onClose={() => setPricePopup({ open: false, row: null })} />
    </div>
  );
};

export default Chapters;
