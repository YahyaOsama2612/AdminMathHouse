import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ClipboardCheck, ClipboardList, DollarSign, FileText, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Errorpage from "@/components/Errorpage";
import { Modal } from "@/components/admin/kit";
import { Avatars, Chip, EmptyBox, HeroCard, IconBtn, PageSkeleton, PlansModal, Thumb, plural } from "../parts/catalog";

/* Courses of one category (MathPortal "Categories" design: course cards).
   Endpoints: GET /api/admin/courses/category/:categoryId, GET /api/admin/category/:categoryId,
              GET /api/admin/teacher, DELETE /api/admin/courses/:id
   A card opens courses/semester/:id (courses with semesters) or courses/chapters/:id. */

const Courses = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();

  const { data, loading, refetch, error } = useGet(`/api/admin/courses/category/${categoryId}`);
  const { data: categoryRes, loading: loadingOne, error: errorOne } = useGet(`/api/admin/category/${categoryId}`);
  const category = categoryRes?.data?.data || {};

  const [optionPopup, setOptionPopup] = useState({ open: false, row: null });
  const [pricePopup, setPricePopup] = useState({ open: false, row: null });

  const { data: teachersData } = useGet("/api/admin/teacher");
  const teachers = teachersData?.data?.teacher || [];

  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openTeacherModal, setOpenTeacherModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [q, setQ] = useState("");
  const [sem, setSem] = useState("all");

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    await deleteData(`/api/admin/courses/${selectedRow.id}`);
    setOpenDeleteModal(false);
    setSelectedRow(null);
    refetch();
  };

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((course) => ({
        id: course.id,
        name: course.name,
        description: course.description,
        image: course.image,
        duration: course.duration,
        isHaveSemester: course.isHaveSemester,
        prices: course.prices || [],
        teachers: course.teachers || [],
        semesters: course.semesters || [],
        raw: course,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/courses/courses/edit/${row.id}`);
  };

  const openCourse = (row) => {
    navigate(row.isHaveSemester ? `/admin/courses/semester/${row.id}` : `/admin/courses/chapters/${row.id}`, {
      state: { courseId: row.id, courseName: row.name },
    });
  };

  const courseTeachers = useMemo(() => {
    if (!selectedRow) return [];
    return teachers.filter((teacher) => teacher.courses?.some((course) => course.id === selectedRow.id));
  }, [teachers, selectedRow]);

  const needle = q.trim().toLowerCase();
  const shown = tableData.filter(
    (c) =>
      (!needle || `${c.name} ${c.description || ""} ${c.teachers.map((t) => t.name).join(" ")}`.toLowerCase().includes(needle)) &&
      (sem === "all" || (sem === "yes" ? !!c.isHaveSemester : !c.isHaveSemester)),
  );
  const filtered = !!needle || sem !== "all";

  const teacherCount = new Set(tableData.flatMap((c) => c.teachers.map((t) => t.teacherId))).size;
  const noPlan = tableData.filter((c) => !c.prices.length).length;
  const ancestors = [...(category.ancestors || [])].reverse();

  if (error || errorOne) return <Errorpage />;
  if (!data || !categoryRes) return <PageSkeleton />;

  return (
    <div>
      <HeroCard
        crumbs={[
          { label: "Categories", to: "/admin/courses/categories" },
          ...ancestors.map((a) => ({ label: a.name, to: "/admin/courses/categories" })),
          { label: category.name || "Courses" },
        ]}
        thumb={<Thumb src={category.image} name={category.name || "?"} size={56} />}
        kicker={`Category${ancestors.length ? ` · ${ancestors[ancestors.length - 1].name}` : ""}`}
        title={category.name || "Courses"}
        desc={category.description}
        actions={
          <button type="button" onClick={() => navigate(`/admin/courses/courses/add`, { state: { categoryId } })} className="a-btn primary">
            <Plus size={16} /> Add course
          </button>
        }
        stats={[
          { label: "Courses", value: tableData.length },
          { label: "With semesters", value: tableData.filter((c) => c.isHaveSemester).length },
          { label: "Teachers", value: teacherCount },
          { label: "No price plan", value: noPlan, color: noPlan ? "#b45309" : "#15803d" },
        ]}
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses or teachers…" className="a-inp h-10 py-0 pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[["all", "All"], ["yes", "With semesters"], ["no", "No semesters"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSem(v)} className={`a-chip ${sem === v ? "on" : ""}`}>{l}</button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {plural(shown.length, "course")}
          {filtered && (
            <>
              {" · "}
              <button type="button" onClick={() => { setQ(""); setSem("all"); }} className="font-bold text-one hover:underline">Clear filters</button>
            </>
          )}
        </span>
      </div>

      {!tableData.length ? (
        <EmptyBox title="No courses yet" text="Add the first course to this category.">
          <button type="button" onClick={() => navigate(`/admin/courses/courses/add`, { state: { categoryId } })} className="a-btn primary mt-4">
            <Plus size={16} /> Add course
          </button>
        </EmptyBox>
      ) : !shown.length ? (
        <EmptyBox title="No courses match" text="Try another search or filter." />
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 ${deleteLoading ? "opacity-60 pointer-events-none" : ""}`}>
          {shown.map((row) => (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => openCourse(row)}
              onKeyDown={(e) => e.key === "Enter" && openCourse(row)}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-[#7d0a0a]/40 hover:shadow-md transition cursor-pointer flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <Thumb src={row.image} name={row.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 leading-snug break-words">{row.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{row.description || "No description"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {row.isHaveSemester ? <Chip tone="blue">Semesters · {row.semesters.length}</Chip> : <Chip tone="faint">No semesters</Chip>}
                {row.prices.length ? <Chip tone="green">{plural(row.prices.length, "price plan")}</Chip> : <Chip tone="amber">No price plan</Chip>}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <IconBtn title={`Exams & diagnostics for ${row.name}`} onClick={() => setOptionPopup({ open: true, row })}><ClipboardList size={15} /></IconBtn>
                <IconBtn title={`Price plans of ${row.name}`} onClick={() => setPricePopup({ open: true, row })}><DollarSign size={15} /></IconBtn>
                <IconBtn title={`Edit ${row.name}`} onClick={() => handleEdit(row)}><Pencil size={15} /></IconBtn>
                <IconBtn title={`Delete ${row.name}`} danger onClick={() => handleDelete(row)}><Trash2 size={15} /></IconBtn>
              </div>

              <div className="flex items-center justify-between gap-3 mt-auto pt-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedRow(row); setOpenTeacherModal(true); }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-lg hover:bg-gray-100 px-1.5 py-0.5 -ml-1.5"
                  title="Course teachers"
                >
                  {row.teachers.length ? <Avatars people={row.teachers} /> : <Users size={15} className="text-gray-400" />}
                  <span className="text-xs text-gray-500">{plural(row.teachers.length, "teacher")}</span>
                </button>
                <span className="text-xs font-bold text-one flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                  {row.isHaveSemester ? "Semesters" : "Chapters"} <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Course"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />

      <PlansModal open={pricePopup.open} row={pricePopup.row} onClose={() => setPricePopup({ open: false, row: null })} />

      {optionPopup.open && (
        <Modal
          title="Exams & diagnostics"
          onClose={() => setOptionPopup({ open: false, row: null })}
          actions={<button type="button" onClick={() => setOptionPopup({ open: false, row: null })} className="a-btn">Close</button>}
        >
          <p className="text-xs text-gray-400 -mt-1 mb-3">{optionPopup.row?.name}</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate(`/admin/courses/exam/${optionPopup.row.id}`)}
              className="w-full flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 text-left hover:border-[#7d0a0a]/40 hover:bg-red-50/40"
            >
              <span className="w-9 h-9 rounded-lg bg-red-50 text-one flex items-center justify-center shrink-0"><FileText size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-gray-900">Exams</span>
                <span className="block text-xs text-gray-400">Exam for {optionPopup.row?.name}</span>
              </span>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/courses/diagnosticexam/${optionPopup.row.id}`)}
              className="w-full flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 text-left hover:border-[#7d0a0a]/40 hover:bg-red-50/40"
            >
              <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0"><ClipboardCheck size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-gray-900">Diagnostic exams</span>
                <span className="block text-xs text-gray-400">Diagnostic exam for {optionPopup.row?.name}</span>
              </span>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>
        </Modal>
      )}

      {openTeacherModal && (
        <Modal
          title="Course teachers"
          wide
          onClose={() => setOpenTeacherModal(false)}
          actions={<button type="button" onClick={() => setOpenTeacherModal(false)} className="a-btn primary">Close</button>}
        >
          <p className="text-xs text-gray-400 -mt-1 mb-3">{selectedRow?.name}</p>
          {courseTeachers.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No teachers assigned to this course.</p>
          ) : (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {courseTeachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                  {teacher.avatar ? (
                    <img src={teacher.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100" />
                  ) : (
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0 bg-one">
                      {String(teacher.name || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{teacher.name}</p>
                    <p className="text-xs text-gray-500 break-all">{[teacher.email, teacher.phoneNumber].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Courses;
