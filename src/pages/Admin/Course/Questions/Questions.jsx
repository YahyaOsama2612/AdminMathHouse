import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Errorpage from "@/components/Errorpage";
import { FilterSelect, LessonHead, QuestionPreview } from "./parts/qb";
import QuestionsTable from "./parts/QuestionsTable";

/* Lesson → Questions (MathPortal question-bank design).
   GET /api/admin/lessons/:id (header), GET /api/admin/questions/lesson/:id?page&limit&search&filters,
   DELETE /api/admin/questions/:id. Preview opens GET /api/admin/questions/:id. */

const EMPTY_FILTERS = { difficulty: "", questionType: "", answerType: "", year: "", month: "" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => 2000 + i).reverse();

const Questions = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [previewId, setPreviewId] = useState(null);

  const { data: lessonRes, error: errorLesson } = useGet(`/api/admin/lessons/${lessonId}`);
  const lessondata = lessonRes?.data || null;

  const handleParallel = (row) => {
    navigate(`/admin/courses/questions/parallel/${row.id}`, { state: { lessonId: lessonId } });
  };

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
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.questionType) params.append("questionType", filters.questionType);
    if (filters.answerType) params.append("answerType", filters.answerType);
    if (filters.year) params.append("year", filters.year);
    if (filters.month) params.append("month", filters.month);
    return params.toString();
  };

  const { data, loading, error, refetch } = useGet(`/api/admin/questions/lesson/${lessonId}?${buildQueryParams()}`);
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

  const handleEdit = (row) => navigate(`/admin/courses/questions/edit/${row.id}`);
  const handleSame = (row) => navigate(`/admin/courses/questions/same/${row.id}`, { state: { lessonId: lessonId } });
  const goAdd = () => navigate("/admin/courses/questions/add", { state: { lessonId: lessonId } });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const filtering = !!debouncedSearch || Object.values(filters).some(Boolean);
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setSearchTerm(""); setDebouncedSearch(""); setPage(1); };

  if (error && errorLesson) return <Errorpage />;

  const addBtn = <button onClick={goAdd} className="a-btn primary"><Plus className="w-4 h-4" /> Add question</button>;

  return (
    <div>
      <LessonHead lessonId={lessonId} info={lessondata} mode="questions" count={data ? total : null} actions={addBtn} />

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[200px]">
            <span className="block text-[11px] font-bold text-gray-500 mb-1">Search</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Question text, exam code or section…" className="a-inp !py-2 !pl-9" />
            </span>
          </label>
          <FilterSelect label="Difficulty" value={filters.difficulty} onChange={(v) => handleFilterChange("difficulty", v)} options={["A", "B", "C", "D", "E"]} />
          <FilterSelect label="Question type" value={filters.questionType} onChange={(v) => handleFilterChange("questionType", v)} options={["Trail", "Extra"]} />
          <FilterSelect label="Answer type" value={filters.answerType} onChange={(v) => handleFilterChange("answerType", v)} options={[{ value: "MCQ", label: "Multiple choice" }, { value: "Grid in", label: "Grid-in" }]} />
          <FilterSelect label="Year" value={filters.year} onChange={(v) => handleFilterChange("year", v)} options={YEARS} />
          <FilterSelect label="Month" value={filters.month} onChange={(v) => handleFilterChange("month", v)} options={MONTHS} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
          <span className="text-gray-500">
            {filtering ? <>Showing <b className="text-gray-900">{total}</b> matching question{total === 1 ? "" : "s"}</> : <><b className="text-gray-900">{total}</b> question{total === 1 ? "" : "s"} in this lesson</>}
            {searchTerm !== debouncedSearch && <span className="text-gray-400"> · searching…</span>}
          </span>
          {filtering && <button onClick={clearFilters} className="font-bold text-one hover:underline">Clear filters</button>}
        </div>
      </div>

      <QuestionsTable
        rows={rows}
        loading={loading || deleteLoading}
        onPreview={setPreviewId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onParallel={handleParallel}
        onSame={handleSame}
        pager={{
          page,
          totalPages: paginationData.totalPages || 1,
          total,
          limit,
          onPage: (p) => setPage(p),
          onLimit: (n) => { setLimit(n); setPage(1); },
        }}
        empty={filtering ? (
          <>
            <p className="font-bold text-gray-700">No questions match</p>
            <p className="text-sm text-gray-400">Try other filters.</p>
            <button onClick={clearFilters} className="mt-3 text-sm font-bold text-one hover:underline">Clear filters</button>
          </>
        ) : (
          <>
            <p className="font-bold text-gray-700">No questions in this lesson yet</p>
            <p className="text-sm text-gray-400">Questions you add here are used for this lesson’s quizzes and for the course’s exams.</p>
            <button onClick={goAdd} className="a-btn primary mt-4"><Plus className="w-4 h-4" /> Add the first question</button>
          </>
        )}
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

export default Questions;
