import React, { useEffect, useMemo, useState } from "react";
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
  const [limit, setLimit] = useState(10);

  // 2. حالات الـ State المؤقتة (للـ Inputs فقط)
  const [tempFilters, setTempFilters] = useState({
    search: "",
    grade: "",
    category: "",
    course: "",
  });

  // 🔹 جلب خيارات الفلاتر (categories و grades)
  const { data: selectData } = useGet("/api/admin/student/select");

  const categoriesOptions = useMemo(() => {
    return (
      selectData?.data?.data?.categories?.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })) || []
    );
  }, [selectData]);

  const gradesOptions = useMemo(() => {
    return (
      selectData?.data?.data?.grades?.map((g) => ({
        value: g.id,
        label: g.name,
      })) || []
    );
  }, [selectData]);

  // 🔹 جلب الداتا من الـ API
  const { data, loading, error, refetch } = useGet(
    `/api/admin/student?search=${query.search}&grade=${query.grade}&category=${query.category}&course=${query.course}&page=${page}&limit=${limit}`,
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

  // ⌨️ Enter في أي input جوه الـ search/filters = Submit
  const handleKeyDown = (e) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    if (e.target.tagName !== "INPUT") return; // مش على الأزرار أو الـ textarea
    e.preventDefault();
    handleSearchSubmit();
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
          onClick={() => navigate(`/admin/users/student-information/${row.id}`)}
          className="text-blue-600 hover:underline font-medium text-left cursor-pointer"
        >
          View
        </button>
      ),
    },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((student) => ({
        id: student.id,
        name: student.name || `${student.firstname || ""} ${student.lastname || ""}`.trim(),
        nickname: student.nickname,
        email: student.email,
        grade: student.grade?.name,
        parentphone: student.parentPhone || student.parentphone,
        raw: student,
      })) || []
    );
  }, [data]);

  // حساب معلومات الترقيم (Pagination)
  const pagination = data?.data?.pagination || data?.pagination || {};
  const serverTotalPages =
    pagination.totalPages ||
    pagination.last_page ||
    pagination.pages ||
    data?.data?.totalPages ||
    data?.data?.last_page ||
    data?.data?.pages ||
    data?.totalPages ||
    data?.last_page;

  const serverTotal =
    pagination.total ??
    pagination.totalCount ??
    data?.data?.total ??
    data?.data?.totalCount ??
    data?.total ??
    data?.totalCount;

  const totalPages = useMemo(() => {
    if (serverTotalPages) return Math.max(1, Number(serverTotalPages));
    if (serverTotal != null && !isNaN(serverTotal)) {
      return Math.max(1, Math.ceil(Number(serverTotal) / limit));
    }
    // في حال عدم إرجاع بيانات ترقيم من السيرفر:
    // إذا كانت الصفحة الحالية ممتلئة بالكامل (10 عناصر)، فهناك صفحة تالية على الأقل
    if (tableData.length >= limit) {
      return page + 1;
    }
    return Math.max(page, 1);
  }, [serverTotalPages, serverTotal, limit, tableData.length, page]);

  const totalResults = useMemo(() => {
    if (serverTotal != null && !isNaN(serverTotal)) {
      return Number(serverTotal);
    }
    if (tableData.length >= limit) {
      return `${(page - 1) * limit + tableData.length}+`;
    }
    return (page - 1) * limit + tableData.length;
  }, [serverTotal, tableData.length, limit, page]);

  // إذا كانت الصفحة فارغة بعد الحذف وكان رقم الصفحة > 1، نرجع صفحة للخلف
  useEffect(() => {
    if (!loading && data && tableData.length === 0 && page > 1) {
      setPage((prev) => Math.max(1, prev - 1));
    }
  }, [loading, data, tableData.length, page]);

  const handleEdit = (row) => {
    navigate(`/admin/users/students/edit/${row.id}`);
  };

  if (loading && !data) return <Loader />;
  if (error && !data) return <Errorpage />;

  return (
    <div className="p-6" onKeyDown={handleKeyDown}>
      <ReusableTableSearch
        title="Students Management"
        titleAdd="Student"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}

        searchTerm={tempFilters.search}
        onSearchChange={(val) =>
          setTempFilters((prev) => ({ ...prev, search: val }))
        }
        filterValues={tempFilters}
        onFilterChange={(key, val) =>
          setTempFilters((prev) => ({ ...prev, [key]: val }))
        }

        filters={[
          { key: "grade", label: "Grade", options: gradesOptions },
          { key: "category", label: "Category", options: categoriesOptions },
          { key: "course", label: "Course", options: [] },
        ]}
        onAddClick={() => navigate("/admin/users/students/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        // Pagination
        currentPage={page}
        totalPages={totalPages}
        totalResults={totalResults}
        rowsPerPage={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      >
        {/* زر الـ Submit */}
        <button
          type="button"
          onClick={handleSearchSubmit}
          className="bg-one text-white px-5 py-2 rounded-lg font-bold hover:bg-one/90 transition-all text-sm cursor-pointer"
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