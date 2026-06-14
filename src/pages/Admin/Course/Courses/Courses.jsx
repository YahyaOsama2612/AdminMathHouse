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
            >
              <GiTeacher className="text-3xl bg-one text-white rounded" />
            </button>

            {/* Exams */}
            <button onClick={() => setOptionPopup({ open: true, row })}>
              <PiExamFill className="text-2xl" />
            </button>

            {/* 💰 Prices */}
            <button
              onClick={() => setPricePopup({ open: true, row })}
              className="px-2 py-1  rounded"
            >
              <MdAttachMoney className="text-3xl text-green-600" />
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
            <h3 className="text-lg font-bold">
              Exams for {optionPopup.row?.name}
            </h3>

            <button
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => setOptionPopup({ open: false, row: null })}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
