// Quiz and exam reports (GET /api/admin/reports/:id/quizzes | /exams) with Excel export.
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ChevronDown, ChevronUp, Clock, Download } from "lucide-react";
import { Card, Pill } from "@/components/admin/kit";
import { exportLessonProgressReport, exportExamReport } from "@/utils/Reportexport";
import { ExtendLessonDurationModal } from "./Modals";
import { Count, MiniPager, ReportDetails, SearchBox, fmtDate } from "./shared";

const PAGE_SIZE = 8;

const cap = (s) => String(s || "").replace(/^./, (c) => c.toUpperCase());

/** Shared state: search, paging, expand and the "mistakes count" selection. */
function useReportList(items, idKey, match) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((x) => match(x, term));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchTerm]);

  const selectedMistakesCount = useMemo(
    () => items.filter((x) => selected.has(x[idKey])).reduce((sum, x) => sum + (x.mistakes?.length || 0), 0),
    [items, selected, idKey],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));
  const onSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  return { searchTerm, onSearch, filtered, paged, page, setPage, totalPages, expandedId, toggleExpand, selected, toggleSelect, selectedMistakesCount };
}

const Toolbar = ({ list, exporting, onExport, placeholder }) => (
  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
    {list.selected.size > 0 && (
      <span className="text-xs font-bold text-one bg-red-50 px-3 py-2 rounded-xl whitespace-nowrap">
        Mistakes count: {list.selectedMistakesCount}
      </span>
    )}
    <button type="button" onClick={onExport} disabled={exporting} className="a-btn !py-2">
      <Download size={15} /> {exporting ? "Exporting..." : "Export report"}
    </button>
    <SearchBox value={list.searchTerm} onChange={list.onSearch} placeholder={placeholder} />
  </div>
);

const ReportRow = ({ checked, onCheck, hasDetails, expanded, onToggle, title, sub, pill, score, extra }) => (
  <div className={`flex items-center gap-3 px-4 sm:px-5 py-3 ${hasDetails ? "hover:bg-gray-50/80 cursor-pointer" : ""}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onCheck}
      aria-label="Select for mistakes count"
      className="w-4 h-4 rounded border-gray-300 accent-[#7d0a0a] cursor-pointer shrink-0"
    />
    <div onClick={() => hasDetails && onToggle()} className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-bold text-sm text-gray-800 truncate">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {pill}
        <span className="text-sm font-extrabold text-gray-800 tabular-nums whitespace-nowrap w-16 text-right">{score}</span>
        {extra}
        <span className="w-[18px] text-gray-400">
          {hasDetails && (expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
        </span>
      </div>
    </div>
  </div>
);

export const QuizReportsSection = ({ quizzes, studentId, studentName, grade, courses }) => {
  const [extendLessonTarget, setExtendLessonTarget] = useState(null);
  const [exporting, setExporting] = useState(false);
  const list = useReportList(
    quizzes,
    "quizId",
    (quiz, term) => quiz.quizName?.toLowerCase().includes(term) || quiz.lesson?.name?.toLowerCase().includes(term),
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportLessonProgressReport({ studentName, grade, courseId: courses?.[0]?.id, quizzes });
    } catch (err) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card
      title={
        <>
          Quiz reports
          <Count n={list.filtered.length} />
        </>
      }
      sub="Tick quizzes to count their mistakes"
      right={<Toolbar list={list} exporting={exporting} onExport={handleExport} placeholder="Search quizzes or lessons..." />}
      bodyClass=""
    >
      {list.paged.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">No quizzes found.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {list.paged.map((quiz) => {
            const isExpanded = list.expandedId === quiz.quizId;
            const hasDetails = quiz.mistakes?.length > 0 || quiz.lessonsToRecap?.length > 0;
            return (
              <div key={quiz.quizId} className={isExpanded ? "bg-gray-50/40" : ""}>
                <ReportRow
                  checked={list.selected.has(quiz.quizId)}
                  onCheck={(e) => list.toggleSelect(quiz.quizId, e)}
                  hasDetails={hasDetails}
                  expanded={isExpanded}
                  onToggle={() => list.toggleExpand(quiz.quizId)}
                  title={quiz.quizName}
                  sub={`Lesson: ${quiz.lesson?.name || "N/A"}`}
                  pill={<Pill tone={quiz.status === "absent" ? "red" : "green"}>{cap(quiz.status)}</Pill>}
                  score={quiz.score !== null && quiz.score !== undefined ? `${quiz.score}/${quiz.totalScore}` : "N/A"}
                  extra={
                    quiz.lesson?.id ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExtendLessonTarget(quiz.lesson);
                        }}
                        title="Extend lesson duration"
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:border-[#7d0a0a] hover:text-one"
                      >
                        <Clock size={13} /> Extend
                      </button>
                    ) : null
                  }
                />
                {isExpanded && hasDetails && <ReportDetails item={quiz} />}
              </div>
            );
          })}
        </div>
      )}
      <MiniPager page={list.page} totalPages={list.totalPages} onChange={list.setPage} />

      {extendLessonTarget && (
        <ExtendLessonDurationModal studentId={studentId} lesson={extendLessonTarget} onClose={() => setExtendLessonTarget(null)} />
      )}
    </Card>
  );
};

export const ExamReportsSection = ({ exams, studentName, grade }) => {
  const [exporting, setExporting] = useState(false);
  const list = useReportList(exams, "examId", (exam, term) => exam.examName?.toLowerCase().includes(term));

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportExamReport({ studentName, grade, exams });
    } catch (err) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card
      title={
        <>
          Exam reports
          <Count n={list.filtered.length} />
        </>
      }
      sub="Tick exams to count their mistakes"
      right={<Toolbar list={list} exporting={exporting} onExport={handleExport} placeholder="Search exams..." />}
      bodyClass=""
    >
      {list.paged.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">No exam reports found.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {list.paged.map((exam) => {
            const isExpanded = list.expandedId === exam.examId;
            const passed = exam.score >= exam.passScore;
            const hasDetails = exam.mistakes?.length > 0 || exam.lessonsToRecap?.length > 0;
            return (
              <div key={exam.examId} className={isExpanded ? "bg-gray-50/40" : ""}>
                <ReportRow
                  checked={list.selected.has(exam.examId)}
                  onCheck={(e) => list.toggleSelect(exam.examId, e)}
                  hasDetails={hasDetails}
                  expanded={isExpanded}
                  onToggle={() => list.toggleExpand(exam.examId)}
                  title={exam.examName}
                  sub={`${exam.date ? fmtDate(exam.date) : "N/A"} · ${exam.mistakesCount || 0} mistakes`}
                  pill={
                    <Pill tone={exam.status === "absent" ? "red" : passed ? "green" : "amber"}>{cap(exam.status)}</Pill>
                  }
                  score={`${exam.score}/${exam.totalScore}`}
                />
                {isExpanded && hasDetails && <ReportDetails item={exam} />}
              </div>
            );
          })}
        </div>
      )}
      <MiniPager page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
    </Card>
  );
};
