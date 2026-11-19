import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ClipboardCheck, FileText, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Errorpage from "@/components/Errorpage";
import { Chip, EmptyBox, HeroCard, IconBtn, PageSkeleton, Thumb, plural } from "../parts/catalog";

/* Semesters of a course (courses with "Has semesters" on). Each semester opens its chapters.
   Endpoints: GET /api/admin/courses/:id, GET /api/admin/semester/course/:id, DELETE /api/admin/semester/:id */

const Semester = () => {
  const navigate = useNavigate();
  const { coursesId } = useParams();
  const { data: courseRes } = useGet(`/api/admin/courses/${coursesId}`);
  const course = courseRes?.data || {};

  const { data, refetch, error } = useGet(`/api/admin/semester/course/${coursesId}`);
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/semester/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((sem) => ({
        id: sem.id,
        name: sem.name,
        course: sem.course?.name || "—",
        raw: sem,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/courses/semester/edit/${row.id}`, { state: coursesId });
  };

  const openChapters = (row) =>
    navigate(`/admin/courses/chapters/semester/${row.id}`, {
      state: {
        courseId: coursesId || row.raw?.courseId,
        semesterId: row.id,
        semesterName: row.name,
        courseName: course?.name,
      },
    });

  const addSemester = () => navigate("/admin/courses/semester/add", { state: coursesId });

  if (error) return <Errorpage />;
  if (!data) return <PageSkeleton cards={3} />;

  return (
    <div>
      <HeroCard
        crumbs={[
          { label: "Categories", to: "/admin/courses/categories" },
          course.categoryId && { label: "Courses", to: `/admin/courses/courses/${course.categoryId}` },
          { label: course.name || "Course" },
        ]}
        thumb={<Thumb src={course.image} name={course.name || "?"} size={56} />}
        kicker="Course · Semesters"
        title={course.name || "Semesters"}
        desc={course.description}
        chips={
          <>
            <Chip tone="blue">Semesters</Chip>
            {course.teachers?.length > 0 && <Chip>{plural(course.teachers.length, "teacher")}</Chip>}
          </>
        }
        actions={
          <>
            <button type="button" onClick={addSemester} className="a-btn primary"><Plus size={16} /> Add semester</button>
            {course.id && (
              <>
                {/* exams of this course — the course goes in the link too, so a page refresh keeps it */}
                <button type="button" onClick={() => navigate(`/admin/courses/exam/add?courseId=${course.id}`, { state: { courseId: course.id } })} className="a-btn"><FileText size={16} /> Add exam</button>
                <button type="button" onClick={() => navigate(`/admin/courses/diagnosticexam/add?courseId=${course.id}`, { state: { courseId: course.id } })} className="a-btn"><ClipboardCheck size={16} /> Add diagnostic exam</button>
                <button type="button" onClick={() => navigate(`/admin/courses/exam/${course.id}`)} className="a-btn">View exams</button>
              </>
            )}
            {course.id && (
              <button type="button" onClick={() => navigate(`/admin/courses/courses/edit/${course.id}`)} className="a-btn">Edit course</button>
            )}
          </>
        }
      />

      {!tableData.length ? (
        <EmptyBox title="No semesters yet" text="Add a semester, then add its chapters.">
          <button type="button" onClick={addSemester} className="a-btn primary mt-4"><Plus size={16} /> Add semester</button>
        </EmptyBox>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 ${deleteLoading ? "opacity-60 pointer-events-none" : ""}`}>
          {tableData.map((row, i) => (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => openChapters(row)}
              onKeyDown={(e) => e.key === "Enter" && openChapters(row)}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-[#7d0a0a]/40 hover:shadow-md transition cursor-pointer flex items-center gap-3"
            >
              <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0"><Layers size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-one">Semester {i + 1}</p>
                <p className="font-bold text-gray-900 leading-snug break-words">{row.name}</p>
                <p className="text-xs font-bold text-one flex items-center gap-0.5 opacity-70 group-hover:opacity-100">Chapters <ChevronRight size={13} /></p>
              </div>
              <span className="flex gap-1">
                <IconBtn title={`Edit ${row.name}`} onClick={() => handleEdit(row)}><Pencil size={15} /></IconBtn>
                <IconBtn title={`Delete ${row.name}`} danger onClick={() => handleDelete(row)}><Trash2 size={15} /></IconBtn>
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Semester"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Semester;
