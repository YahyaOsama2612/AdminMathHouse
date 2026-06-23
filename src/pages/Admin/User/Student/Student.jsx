import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReusableTableSearch from "@/components/ReusableTableSearch";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const Student = () => {
  const navigate = useNavigate();

  // 1. حالات الـ State للتنفيذ (تؤثر على الـ API)
  const [query, setQuery] = useState({
    search: "",
    grade: "",
    category: "",
    course: "",
  });
  const [page, setPage] = useState(1);

  // 2. حالات الـ State المؤقتة (للـ Inputs فقط)
  const [tempFilters, setTempFilters] = useState({
    search: "",
    grade: "",
    category: "",
    course: "",
  });

  // 🔹 جلب الداتا من الـ API
  const { data, loading, error, refetch } = useGet(
    `/api/admin/student?search=${query.search}&grade=${query.grade}&category=${query.category}&course=${query.course}&page=${page}`,
  );
  const { deleteData, loading: deleteLoading } = useDelete();

  // 🔹 إدارة حذف الطالب
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/student/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  // دالة الـ Submit
  const handleSearchSubmit = () => {
    setQuery(tempFilters);
    setPage(1);
  };

  const columns = [
    {
      header: "Full Name",
      key: "name",
      render: (value, row) => (
        <button
          onClick={() => navigate(`/admin/users/students/attend/${row.id}`)}
          className="text-blue-600 hover:underline font-medium text-left cursor-pointer"
        >
          {row.name}
        </button>
      ),
    },
    { header: "Email", key: "email" },
    { header: "Nickname", key: "nickname" },
    { header: "Grade", key: "grade" },
    { header: "Parent Phone", key: "parentphone" },
    {
      header: "Package",
      key: "package",
      render: (value, row) => (
        <button
          onClick={() => navigate(`/admin/users/packages/${row.id}`)}
          className="text-blue-600 hover:underline font-medium text-left cursor-pointer"
        >
          View Packages
        </button>
      ),
    },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((student) => ({
        id: student.id,
        name: `${student.firstname} ${student.lastname}`,
        nickname: student.nickname,
        email: student.email,
        grade: student.grade?.name,
        parentphone: student.parentPhone,
        raw: student,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/users/students/edit/${row.id}`);
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="p-6">
      <ReusableTableSearch
        title="Students Management"
        titleAdd="Student"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        // البحث والفلترة
        searchTerm={tempFilters.search}
        onSearchChange={(val) =>
          setTempFilters((prev) => ({ ...prev, search: val }))
        }
        filterValues={tempFilters}
        onFilterChange={(key, val) =>
          setTempFilters((prev) => ({ ...prev, [key]: val }))
        }
        // إعدادات الفلاتر (الكورس والكاتيجوري)
        filters={[
          { key: "grade", label: "Grade", options: [] }, // يمكنك ملء الخيارات هنا
          { key: "category", label: "Category", options: [] },
          { key: "course", label: "Course", options: [] },
        ]}
        onAddClick={() => navigate("/admin/users/students/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        // Pagination
        currentPage={page}
        totalPages={data?.data?.last_page || 1}
        totalResults={data?.data?.total || 0}
        onPageChange={setPage}
      >
        {/* زر الـ Submit */}
        <button
          onClick={handleSearchSubmit}
          className="bg-one text-white px-5 py-2 rounded-lg font-bold hover:bg-one/90 transition-all text-sm"
        >
          Submit
        </button>
      </ReusableTableSearch>

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Student"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Student;
