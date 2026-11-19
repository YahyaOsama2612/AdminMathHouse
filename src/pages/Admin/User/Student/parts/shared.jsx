// Small pieces shared by the student-profile sections (MathPortal admin design).
import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import QuestionPhoto from "@/components/QuestionPhoto";

export const MONEY = (n) =>
  `${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;

export const fmtDate = (v) => {
  if (!v) return "N/A";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

export const SearchBox = ({ value, onChange, placeholder, className = "w-full sm:w-64" }) => (
  <div className={`relative ${className}`}>
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="a-inp !pl-9 !py-2"
    />
  </div>
);

/** "Page x of y" with prev/next buttons; renders nothing for one page. */
export const MiniPager = ({ page, totalPages, onChange }) =>
  totalPages > 1 ? (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="a-act disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="a-act disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  ) : null;

/** Count chip next to a card title. */
export const Count = ({ n }) => (
  <span className="ml-1.5 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full align-middle">
    {n}
  </span>
);

/** Lessons to recap + mistakes list, used by quiz and exam reports. */
export const ReportDetails = ({ item, pageSize = 5 }) => {
  const [toShow, setToShow] = useState(pageSize);
  const mistakes = item.mistakes || [];
  const lessonsToRecap = item.lessonsToRecap || [];

  return (
    <div className="bg-gray-50/70 px-4 sm:px-5 py-4 space-y-4 border-t border-gray-100">
      {lessonsToRecap.length > 0 && (
        <div>
          <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">
            Lessons to recap
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lessonsToRecap.map((lesson) => (
              <span
                key={lesson.id}
                className="text-xs font-semibold bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-600"
              >
                {lesson.name} · {lesson.mistakesCount} mistakes
              </span>
            ))}
          </div>
        </div>
      )}

      {mistakes.length > 0 && (
        <div>
          <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">
            Mistakes ({mistakes.length})
          </p>
          <div className="space-y-2">
            {mistakes.slice(0, toShow).map((mistake) => (
              <div key={mistake.questionId} className="bg-white px-3.5 py-3 rounded-xl border border-gray-100 text-sm">
                <QuestionPhoto id={mistake.questionId} image={mistake.questionImage} text={mistake.questionText} />
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs">
                  <span className="text-gray-400">Lesson: {mistake.lesson?.name || "N/A"}</span>
                  <span>
                    <span className="text-gray-400">Correct answer: </span>
                    <span className="font-semibold text-green-700">{mistake.correctOption ?? "N/A"}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {toShow < mistakes.length && (
            <button
              type="button"
              onClick={() => setToShow((prev) => prev + pageSize)}
              className="mt-3 text-xs font-bold text-one hover:underline"
            >
              Show more ({mistakes.length - toShow} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
