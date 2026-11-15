// Question list table in the MathPortal question-bank design (used by the lesson page and the all-questions page).
import { Copy, GitBranch, Pencil, Trash2 } from "lucide-react";
import { DiffChip, PagerBar, excerpt } from "./qb";

const TH = "a-th";

export default function QuestionsTable({ rows, loading, showLesson = false, onPreview, onEdit, onDelete, onParallel, onSame, pager, empty }) {
  if (loading && !rows.length) {
    return <div className="a-card p-4 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skel h-12"></div>)}</div>;
  }
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity ${loading ? "opacity-60 pointer-events-none" : ""}`}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>#</th>
                <th className={TH}>Question</th>
                <th className={TH}>Answer</th>
                <th className={TH}>Type</th>
                <th className={TH}>Difficulty</th>
                {showLesson && <th className={TH}>Lesson</th>}
                <th className={TH}>Exam code</th>
                <th className={TH}>Section</th>
                <th className={TH}>Date</th>
                <th className={`${TH} text-right`} data-keep>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q, i) => {
                const text = excerpt(q.question);
                return (
                  <tr key={q.id} className="a-tr align-top">
                    <td className="a-td font-bold text-gray-400 tabular-nums">{pager ? (pager.page - 1) * pager.limit + i + 1 : i + 1}</td>
                    <td className="a-td min-w-[240px] max-w-[420px]">
                      <button type="button" onClick={() => onPreview?.(q.id)} className="text-left group" title="Preview">
                        <span className="text-sm text-gray-800 line-clamp-2 group-hover:text-one">{text || <i className="text-gray-400">Image only</i>}</span>
                      </button>
                    </td>
                    <td className="a-td whitespace-nowrap">
                      <span className="text-xs text-gray-500">{q.answerType === "Grid in" ? "Grid-in" : q.answerType || "—"}</span>
                    </td>
                    <td className="a-td text-gray-700 whitespace-nowrap">{q.questionType || "—"}</td>
                    <td className="a-td"><DiffChip d={q.difficulty} /></td>
                    {showLesson && <td className="a-td text-gray-700 min-w-[140px]">{q.lesson?.name || "—"}</td>}
                    <td className="a-td text-gray-700 whitespace-nowrap">{q.examCode?.code || "—"}</td>
                    <td className="a-td text-gray-700 whitespace-nowrap">{q.section?.sectionName || "—"}</td>
                    <td className="a-td text-gray-700 whitespace-nowrap">{[q.month, q.year].filter(Boolean).join(" ") || "—"}</td>
                    <td className="a-td">
                      <div className="flex items-center justify-end gap-1">
                        {onParallel && (
                          <button onClick={() => onParallel(q)} title="Parallel questions — same skill, new numbers"
                            className="h-8 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap bg-purple-50 text-purple-700 hover:bg-purple-100 inline-flex items-center gap-1">
                            <GitBranch size={13} /> Parallel
                          </button>
                        )}
                        {onSame && (
                          <button onClick={() => onSame(q)} title="Copy this question"
                            className="h-8 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap bg-amber-50 text-amber-800 hover:bg-amber-100 inline-flex items-center gap-1">
                            <Copy size={13} /> Same
                          </button>
                        )}
                        {onEdit && <button onClick={() => onEdit(q)} className="a-act" title="Edit" aria-label="Edit question"><Pencil className="w-4 h-4" /></button>}
                        {onDelete && <button onClick={() => onDelete(q)} className="a-act del" title="Delete" aria-label="Delete question"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-14 text-center px-4">{empty}</div>
      )}
      {pager && (rows.length > 0 || pager.page > 1) && <PagerBar {...pager} />}
    </div>
  );
}
