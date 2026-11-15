import { useNavigate } from "react-router-dom";
import { API_URL } from "@/api/api";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Errorpage from "@/components/Errorpage";
import { PageHead } from "@/components/admin/kit";
import { getToken } from "../../../../utils/auth";
import { FilterSelect, QuestionPreview } from "./parts/qb";
import QuestionsTable from "./parts/QuestionsTable";

/* Question bank — every question, with cascading category → course → semester → chapter → lesson filters.
   GET /api/admin/questions?page&limit&search&filters, DELETE /api/admin/questions/:id. */

const EMPTY_FILTERS = {
  difficulty: "", questionType: "", answerType: "", year: "", month: "",
  categoryId: "", courseId: "", semesterId: "", chapterId: "", lessonId: "",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => 2000 + i).reverse();

const AllQuestions = () => {
  const navigate = useNavigate();
  const token = getToken();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [previewId, setPreviewId] = useState(null);

  // Options for the cascading filters
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);

  // dataKey = the array name inside `data` (data.data, data.chapters, data.lessons…)
  const fetchFilterData = async (endpoint, setter, dataKey = "data") => {
    try {
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      setter(result?.data?.[dataKey] || []);
    } catch (error) {
      console.error("Error fetching data for", endpoint, error);
      setter([]);
    }
  };

  useEffect(() => {
    fetchFilterData(`${API_URL}/api/admin/category`, setCategories, "data");
  }, []);

  useEffect(() => {
    if (filters.categoryId) fetchFilterData(`${API_URL}/api/admin/courses/category/${filters.categoryId}`, setCourses, "data");
    else setCourses([]);
  }, [filters.categoryId]);

  useEffect(() => {
    if (filters.courseId) fetchFilterData(`${API_URL}/api/admin/semester/course/${filters.courseId}`, setSemesters, "data");
    else setSemesters([]);
  }, [filters.courseId]);

  useEffect(() => {
    if (filters.courseId) fetchFilterData(`${API_URL}/api/admin/chapters/course/${filters.courseId}`, setChapters, "chapters");
    else setChapters([]);
  }, [filters.courseId]);

  useEffect(() => {
    if (filters.chapterId) fetchFilterData(`${API_URL}/api/admin/lessons/chapter/${filters.chapterId}`, setLessons, "lessons");
    else setLessons([]);
  }, [filters.chapterId]);

  // Search is debounced (2 s) before it reaches the server.
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 2000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    if (debouncedSearch) params.append("search", debouncedSearch);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const { data, loading, error, refetch } = useGet(`/api/admin/questions?${buildQueryParams()}`);
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const paginationData = data?.data?.pagination || {};
  const rows = useMemo(() => data?.data?.data || [], [data]);
  const total = paginationData.total || 0;

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

  // Changing a parent filter clears everything below it.
  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "categoryId") Object.assign(next, { courseId: "", semesterId: "", chapterId: "", lessonId: "" });
      else if (key === "courseId") Object.assign(next, { semesterId: "", chapterId: "", lessonId: "" });
      else if (key === "semesterId") Object.assign(next, { chapterId: "", lessonId: "" });
      else if (key === "chapterId") next.lessonId = "";
      return next;
    });
    setPage(1);
  };
  const filtering = !!debouncedSearch || Object.values(filters).some(Boolean);
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setSearchTerm(""); setDebouncedSearch(""); setPage(1); };

  const handleEdit = (row) => navigate(`/admin/courses/questions/edit/${row.id}`);

  if (error && !rows.length) return <Errorpage />;

  return (
    <div>
      <PageHead title="Question bank" sub="Every question in every lesson. Narrow it down by course, chapter and lesson." />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <label className="block sm:col-span-2 md:col-span-3 lg:col-span-5">
            <span className="block text-[11px] font-bold text-gray-500 mb-1">Search</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Question text, exam code or section…" className="a-inp !py-2 !pl-9" />
            </span>
          </label>
          <FilterSelect className="w-full" label="Category" value={filters.categoryId} onChange={(v) => handleFilterChange("categoryId", v)} options={categories.map((c) => ({ label: c.name || "—", value: c.id }))} />
          <FilterSelect className="w-full" label="Course" value={filters.courseId} onChange={(v) => handleFilterChange("courseId", v)} options={courses.map((c) => ({ label: c.name || "—", value: c.id }))} />
          <FilterSelect className="w-full" label="Semester" value={filters.semesterId} onChange={(v) => handleFilterChange("semesterId", v)} options={semesters.map((s) => ({ label: s.name || "—", value: s.id }))} />
          <FilterSelect className="w-full" label="Chapter" value={filters.chapterId} onChange={(v) => handleFilterChange("chapterId", v)} options={chapters.map((ch) => ({ label: ch?.chapter?.name || "—", value: ch?.chapter?.id }))} />
          <FilterSelect className="w-full" label="Lesson" value={filters.lessonId} onChange={(v) => handleFilterChange("lessonId", v)} options={lessons.map((l) => ({ label: l?.lesson?.name || "—", value: l?.lesson?.id }))} />
          <FilterSelect className="w-full" label="Difficulty" value={filters.difficulty} onChange={(v) => handleFilterChange("difficulty", v)} options={["A", "B", "C", "D", "E"]} />
          <FilterSelect className="w-full" label="Question type" value={filters.questionType} onChange={(v) => handleFilterChange("questionType", v)} options={["Trail", "Extra", "Parallel"]} />
          <FilterSelect className="w-full" label="Answer type" value={filters.answerType} onChange={(v) => handleFilterChange("answerType", v)} options={[{ value: "MCQ", label: "Multiple choice" }, { value: "Grid in", label: "Grid-in" }]} />
          <FilterSelect className="w-full" label="Month" value={filters.month} onChange={(v) => handleFilterChange("month", v)} options={MONTHS} />
          <FilterSelect className="w-full" label="Year" value={filters.year} onChange={(v) => handleFilterChange("year", v)} options={YEARS} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
          <span className="text-gray-500">
            {filtering ? <>Showing <b className="text-gray-900">{total}</b> matching question{total === 1 ? "" : "s"}</> : <><b className="text-gray-900">{total}</b> question{total === 1 ? "" : "s"}</>}
            {searchTerm !== debouncedSearch && <span className="text-gray-400"> · searching…</span>}
          </span>
          {filtering && <button onClick={clearFilters} className="font-bold text-one hover:underline">Clear filters</button>}
        </div>
      </div>

      <QuestionsTable
        rows={rows}
        loading={loading || deleteLoading}
        showLesson
        onPreview={setPreviewId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        pager={{
          page,
          totalPages: paginationData.totalPages || 1,
          total,
          limit,
          onPage: (p) => setPage(p),
          onLimit: (n) => { setLimit(n); setPage(1); },
        }}
        empty={<>
          <p className="font-bold text-gray-700">{filtering ? "No questions match" : "No questions yet"}</p>
          <p className="text-sm text-gray-400">{filtering ? "Try other filters." : "Questions are added inside each lesson."}</p>
          {filtering && <button onClick={clearFilters} className="mt-3 text-sm font-bold text-one hover:underline">Clear filters</button>}
        </>}
      />

      {previewId && <QuestionPreview id={previewId} onClose={() => setPreviewId(null)} onEdit={(id) => navigate(`/admin/courses/questions/edit/${id}`)} />}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete question"
        description="Are you sure you want to delete this question? This can’t be undone."
      />
    </div>
  );
};

export default AllQuestions;
