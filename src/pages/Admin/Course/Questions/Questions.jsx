import { useNavigate, useParams } from "react-router-dom";
import ReusableTableSearch from "@/components/ReusableTableSearch";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState, useEffect } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { AiFillProduct } from "react-icons/ai";

import { 
MdGridView  ,MdLayers
} from "react-icons/md";
import { 
 FaBook ,FaPlayCircle
} from "react-icons/fa";
import IconButton from "@/components/IconButton";
const Questions = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();

  // 1. States للتحكم في الترقيم والبحث والفلاتر
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // حالة الفلاتر بناءً على الـ API
  const [filters, setFilters] = useState({
    difficulty: "",
    questionType: "",
    answerType: "",
    year: "",
    month: "",
  });
   const {
      data: lessonRes,
      loading: loadingLesson,
      error: errorLesson,
    } = useGet(`/api/admin/lessons/${lessonId}`);
 
    const lessondata = lessonRes?.data || {};
  const handleParallel = (row) => {
    navigate(`/admin/courses/questions/parallel/${row.id}`, {
      state: { lessonId: lessonId },
    });
  };

  // 2. تطبيق الـ Debouncing للبحث (تأخير 2 ثانية)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // إعادة الترقيم للصفحة الأولى عند تغير نص البحث
    }, 2000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 3. بناء الـ URL Query بشكل ديناميكي
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.questionType) params.append("questionType", filters.questionType);
    if (filters.answerType) params.append("answerType", filters.answerType);
    if (filters.year) params.append("year", filters.year);
    if (filters.month) params.append("month", filters.month);
    
    return params.toString();
  };

  const { data, loading, error, refetch } = useGet(
    `/api/admin/questions/lesson/${lessonId}?${buildQueryParams()}`
  );
  
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const paginationData = data?.data?.pagination || {};

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/questions/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const columns = [
    { header: "Question", key: "question" },
    { header: "Type", key: "answerType" },
    { header: "Difficulty", key: "difficulty" },
    { header: "Category", key: "questionType" },
    { header: "Lesson", key: "lessonName" },
    { header: "Exam Code", key: "examCode" },
    { header: "Section", key: "sectionName" },
    { header: "Year", key: "year" },
    { header: "Month", key: "month" },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((q) => ({
        id: q.id , 
        question: q.question,
        answerType: q.answerType,
        difficulty: q.difficulty,
        questionType: q.questionType,
        lessonName: q.lesson?.name || "—",
        examCode: q.examCode?.code || "—",
        sectionName: q.section?.sectionName || "—",
        year: q.year,
        month: q.month,
        raw: q,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/courses/questions/edit/${row.id}`);
  };

  const handleSame = (row) => {
    navigate(`/admin/courses/questions/same/${row.id}`, {
      state: { lessonId: lessonId },
    });
  };

  // إعدادات الفلاتر لكي تُعرض في الجدول
  const filterOptions = [
    { key: "difficulty", label: "Difficulty", options: ["A", "B", "C", "D", "E"] },
    { key: "questionType", label: "Question Type", options: ["Trail", "Extra"] },
    { key: "answerType", label: "Answer Type", options: ["MCQ", "Grid in"] },
    { key: "month", label: "Month", options: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
{
  key: "year",
  label: "Year",
  options: Array.from(
    { length: new Date().getFullYear() - 2000 + 1 },
    (_, i) => 2000 + i
  )
}  ];

  // دالة للتعامل مع تغيير الفلاتر
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // نرجع للصفحة الأولى لما الفلتر يتغير
  };

  if (loading  && loadingLesson) return <Loader />;
  if (error && errorLesson) return <Errorpage />;

  return (
    <div>
      <ReusableTableSearch
        title={`Questions | ${lessondata?.lesson?.name }`}
        titleAdd="Question"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/courses/questions/add" , { state: { lessonId: lessonId } })}
        onEdit={handleEdit}
        onDelete={handleDelete}
        extraActions={(row) => (
          <>
            <button
              onClick={() => handleParallel(row)}
              className="px-3 py-1 rounded bg-one/90 text-white hover:bg-one hover:scale-105 transition"
            >
              Parallel
            </button>
            <button
              onClick={() => handleSame(row)}
              className="px-3 py-1 rounded bg-yellow-700 text-white hover:bg-yellow-500 hover:scale-105 transition"
            >
              Same
            </button>
          </>
        )}
        
        // ربط الفلاتر
        filters={filterOptions}
        filterValues={filters}
        onFilterChange={handleFilterChange}

        // الربط مع الـ Pagination والبحث
        currentPage={page}
        totalPages={paginationData.totalPages || 1}
        totalResults={paginationData.total || 0}
        rowsPerPage={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        searchTerm={searchTerm}
        onSearchChange={(val) => setSearchTerm(val)}
  >

<div className="flex gap-2">
   <IconButton
  icon={MdGridView}
  color="bg-one"
  navigateTo={`/admin/courses/categories`}
  name="Categories"
/>
      <IconButton
  icon={FaBook}
  color="bg-one"
  navigateTo={`/admin/courses/courses/${lessondata?.category?.id}`}
  name="courses"
/>

          <IconButton
  icon={MdLayers}
  color="bg-one"
  navigateTo={`/admin/courses/chapters/${lessondata?.course?.id}`}
  name="chapters"
/>         
          <IconButton
  icon={FaPlayCircle}
  color="bg-one"
  navigateTo={`/admin/courses/lessons/${lessondata?.chapter?.id}`}
  name="lessons"
/>         
              
</div>
      </ReusableTableSearch>
      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Question"
        description={`Are you sure you want to delete this question?`}
      />
    </div>
  );
};

export default Questions;