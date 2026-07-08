import { useNavigate, useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import NavChild from "@/components/NavChild";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import usePost from "@/hooks/usePost";
import { GiTeacher } from "react-icons/gi";
import { PiExamFill } from "react-icons/pi";
import { MdGridView } from "react-icons/md";
import IconButton from "@/components/IconButton";
import { MdAttachMoney } from "react-icons/md";
import PricePlansModal from "@/components/PricePlansModal";
import { Users, ClipboardList, DollarSign } from "lucide-react";
const Courses = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();

  const { data, loading, refetch, error } = useGet(
    `/api/admin/courses/category/${categoryId}`,
  );

  const {
    data: categoryRes,
    loading: loadingOne,
    error: errorOne,
  } = useGet(`/api/admin/category/${categoryId}`);

  const category = categoryRes?.data?.data || {};

  const [optionPopup, setOptionPopup] = useState({ open: false, row: null });

  // ✅ NEW: prices popup
  const [pricePopup, setPricePopup] = useState({
    open: false,
    row: null,
  });

  const { data: teachersData, loading: teachersLoading } =
    useGet("/api/admin/teacher");

  const teachers = teachersData?.data?.teacher || [];

  const { deleteData, loading: deleteLoading } = useDelete();
  const { postData, loading: addTeacherLoading } = usePost();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openTeacherModal, setOpenTeacherModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

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

  const handleRemoveTeacher = async (courseId, teacherId) => {
    await deleteData(`/api/admin/courses/${courseId}/teachers/${teacherId}`);

    setSelectedRow((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.teacherId !== teacherId),
    }));

    refetch();
  };

  const handleAddTeacher = async (courseId, teacherId) => {
    await postData(
      { teacherId },
      `/api/admin/courses/${courseId}/teachers`,
      "Teacher added successfully",
    );

    const addedTeacher = teachers.find((t) => t.id === teacherId);

    if (addedTeacher) {
      setSelectedRow((prev) => ({
        ...prev,
        teachers: [
          ...(prev.teachers || []),
          {
            teacherId: addedTeacher.id,
            name: addedTeacher.name,
            email: addedTeacher.email,
            avatar: addedTeacher.avatar,
          },
        ],
      }));
    }

    setSelectedTeacherId("");
    refetch();
  };

  const columns = [
    {
      header: "Image",
      key: "image",
      render: (value) => (
        <img
          src={value || "/placeholder.png"}
          className="w-12 h-12 object-cover rounded-md"
        />
      ),
    },
    { header: "Name", key: "name" },
    { header: "Description", key: "description" },
    {
      header: "Semester",
      key: "isHaveSemester",
      filterable: true,
      filterType: "select",
    },
  ];

  // ✅ UPDATED: include prices
  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((course) => ({
        id: course.id,
        name: course.name,
        description: course.description,
        image: course.image,
        duration: course.duration,
        isHaveSemester: course.isHaveSemester,

        // 👇 NEW
        prices: course.prices || [],

        teachers: course.teachers,
        raw: course,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/courses/courses/edit/${row.id}`);
  };

  const assignedTeacherIds =
    selectedRow?.teachers?.map((t) => t.teacherId) || [];

  const availableTeachers = teachers.filter(
    (teacher) => !assignedTeacherIds.includes(teacher.id),
  );
  const courseTeachers = useMemo(() => {
    if (!selectedRow) return [];

    return teachers.filter((teacher) =>
      teacher.courses?.some((course) => course.id === selectedRow.id),
    );
  }, [teachers, selectedRow]);
  if (loading || loadingOne) return <Loader />;
  if (error || errorOne) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title={`Courses | ${category.name}`}
        titleAdd="Course"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() =>
          navigate(`/admin/courses/courses/add`, {
            state: { categoryId },
          })
        }
        onEdit={handleEdit}
        onDelete={handleDelete}
        extraActions={(row) => (
          <div className="flex gap-2">
            {/* Semester / Chapters */}
            {row.isHaveSemester ? (
              <NavChild route={`/admin/courses/semester/${row.id}`} />
            ) : (
              <NavChild route={`/admin/courses/chapters/${row.id}`} />
            )}

            {/* Teachers */}
            <button
              onClick={() => {
                setSelectedRow(row);
                setSelectedTeacherId("");
                setOpenTeacherModal(true);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 transition"
              title="Teachers"
            >
              <Users className="w-5 h-5 text-red-900" />
            </button>

            {/* Exams */}
            <button
              onClick={() => setOptionPopup({ open: true, row })}
              className="p-2 rounded-lg hover:bg-slate-100 transition"
              title="Exams"
            >
              <ClipboardList className="w-5 h-5 text-red-900" />
            </button>

            {/* 💰 Prices */}
            <button
              onClick={() => setPricePopup({ open: true, row })}
              className="p-2 rounded-lg hover:bg-slate-100 transition"
              title="Price Plans"
            >
              <DollarSign className="w-5 h-5 text-red-900" />
            </button>
          </div>
        )}
      >
        <IconButton
          icon={MdGridView}
          color="bg-one"
          navigateTo={`/admin/courses/categories`}
          name="Categories"
        />
      </ReusableTable>

      {/* DELETE MODAL */}
      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Course"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />

      <PricePlansModal
        open={pricePopup.open}
        row={pricePopup.row}
        onClose={() => setPricePopup({ open: false, row: null })}
      />
      {optionPopup.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex flex-col p-1.5 bg-white rounded-xl border border-slate-100 shadow-lg min-w-[220px]">
              {/* Exam Button */}
              <button
                onClick={() =>
                  navigate(`/admin/courses/exam/${optionPopup.row.id}`)
                }
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors text-left"
              >
                {/* Exam Icon */}
                <svg
                  className="w-4 h-4 opacity-70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>
                  Exam for{" "}
                  <span className="font-semibold text-slate-900 group-hover:text-indigo-600">
                    {optionPopup.row?.name}
                  </span>
                </span>
              </button>

              {/* Diagnostic Exam Button */}
              <button
                onClick={() =>
                  navigate(
                    `/admin/courses/diagnosticexam/${optionPopup.row.id}`,
                  )
                }
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors text-left"
              >
                {/* Diagnostic/Shield Icon */}
                <svg
                  className="w-4 h-4 opacity-70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                <span>
                  Diagnostic Exam for{" "}
                  <span className="font-semibold text-slate-900">
                    {optionPopup.row?.name}
                  </span>
                </span>
              </button>
            </div>

            <button
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => setOptionPopup({ open: false, row: null })}
            >
              close
            </button>
          </div>
        </div>
      )}
      {openTeacherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <div>
                <h2 className="text-xl font-bold">Course Teachers</h2>
                <p className="text-sm text-slate-500">{selectedRow?.name}</p>
              </div>

              <button
                onClick={() => setOpenTeacherModal(false)}
                className="text-slate-500 hover:text-red-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[500px] overflow-y-auto p-6">
              {courseTeachers.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  No teachers assigned to this course.
                </div>
              ) : (
                <div className="space-y-4">
                  {courseTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center gap-4 border rounded-xl p-4 hover:bg-slate-50"
                    >
                      <img
                        src={
                          teacher.avatar ||
                          "https://ui-avatars.com/api/?name=" +
                            encodeURIComponent(teacher.name)
                        }
                        alt={teacher.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />

                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">
                          {teacher.name}
                        </h3>

                        <p className="text-sm text-slate-500">
                          {teacher.email}
                        </p>

                        <p className="text-sm text-slate-500">
                          {teacher.phoneNumber}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex justify-end">
              <button
                onClick={() => setOpenTeacherModal(false)}
                className="px-5 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
