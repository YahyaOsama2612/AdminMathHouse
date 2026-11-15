// Shared pieces of the MathPortal question-bank design (questions, quizzes, exams).
// Presentation only — no page logic lives here except the read-only question preview.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Film, FolderOpen, Image as ImageIcon, Link2, ScanText, X } from "lucide-react";
import api from "@/api/api";
import { Modal, errText } from "@/components/admin/kit";

/* ---------- difficulty chip ---------- */
export const DIFF_TONE = {
  A: "bg-green-100 text-green-700",
  B: "bg-lime-100 text-lime-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-orange-100 text-orange-700",
  E: "bg-red-100 text-red-700",
};
export const DiffChip = ({ d }) => <span className={`a-pill ${DIFF_TONE[d] || "bg-gray-100 text-gray-500"}`}>{d || "—"}</span>;

/* ---------- rich text (TipTap HTML) ---------- */
const KEEP_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "SUP", "SUB", "BR", "P", "DIV", "SPAN", "UL", "OL", "LI", "MARK", "FONT", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "CODE", "PRE", "HR"]);
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "LINK", "META"]);
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|[a-z]+)$/i;

/** Keep simple formatting only (colour, highlight and alignment survive; everything else is stripped). */
export function cleanHtml(html) {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return "";
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html").body.firstChild;
  if (!root) return "";
  const walk = (n) => {
    [...n.childNodes].forEach((c) => {
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1 || DROP_TAGS.has(c.tagName)) { c.remove(); return; }
      if (!KEEP_TAGS.has(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); return; }
      const color = c.getAttribute("color") || c.style.color;
      const bg = c.style.backgroundColor || c.getAttribute("data-color");
      const align = c.style.textAlign;
      [...c.attributes].forEach((a) => c.removeAttribute(a.name));
      const st = [];
      if (color && COLOR_RE.test(color.trim())) st.push(`color:${color.trim()}`);
      if (bg && COLOR_RE.test(bg.trim())) st.push(`background-color:${bg.trim()}`);
      if (/^(left|right|center|justify)$/.test(align)) st.push(`text-align:${align}`);
      if (st.length) c.setAttribute("style", st.join(";"));
      walk(c);
    });
  };
  walk(root);
  return root.innerHTML.replace(/^(<br>)+$/, "");
}

export const plainText = (html) => {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return String(html);
  return (new DOMParser().parseFromString(String(html), "text/html").body.textContent || "").replace(/\s+/g, " ").trim();
};
export const excerpt = (html, n = 110) => {
  const t = plainText(html);
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const RICH = "break-words [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_sup]:text-[.75em] [&_sub]:text-[.75em] [&_mark]:bg-yellow-200 [&_mark]:rounded-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3";
export const RichHtml = ({ html, className = "" }) => <div className={`${RICH} ${className}`} dangerouslySetInnerHTML={{ __html: cleanHtml(html) }} />;

const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
const monthYear = (q) => [q?.month, q?.year].filter(Boolean).join(" ") || "—";

/* ---------- question preview (read-only GET /api/admin/questions/:id) ---------- */
export function QuestionPreview({ id, onClose, onEdit }) {
  const [q, setQ] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    api.get(`/api/admin/questions/${id}`)
      .then((r) => live && setQ(r.data?.data?.data || r.data?.data || null))
      .catch((e) => live && setErr(errText(e, "Couldn’t load this question")));
    return () => { live = false; };
  }, [id]);

  const grid = q?.answerType === "Grid in";
  const opts = [...(q?.options || [])].sort((a, b) => String(a.order || "").localeCompare(String(b.order || "")));
  const sols = (q?.answers || []).filter((m) => plainText(m.answerText) || m.answerImage || m.answerPdf || m.answerVideo);

  return (
    <Modal
      title="Question preview"
      onClose={onClose}
      wide
      actions={<>
        <button onClick={onClose} className="a-btn">Close</button>
        {onEdit && <button onClick={() => { onClose(); onEdit(id); }} className="a-btn primary">Edit question</button>}
      </>}
    >
      {err ? <p className="text-sm text-red-600">{err}</p> : !q ? (
        <div className="space-y-2"><div className="skel h-5 w-1/2"></div><div className="skel h-24"></div><div className="skel h-10"></div><div className="skel h-10"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-5">
          <div className="min-w-0">
            {isUrl(q.image) && <img src={q.image} alt="Question" className="w-full rounded-xl border border-gray-100 mb-3" />}
            {plainText(q.question) ? <RichHtml html={q.question} className="text-[15px] leading-relaxed text-gray-900 mb-3" /> : !q.image && <p className="text-sm text-gray-300 mb-3">No question text.</p>}
            {grid ? (
              <div className="rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500">
                The student types the answer · accepted: {opts.length ? opts.map((o, i) => <b key={i} className="text-green-700">{i ? ", " : ""}{o.answer}</b>) : "—"}
              </div>
            ) : (
              <div className="space-y-1.5">
                {opts.map((o, i) => {
                  const L = o.order || String.fromCharCode(65 + i);
                  return (
                    <div key={o.id || i} className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${o.isCorrect ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${o.isCorrect ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>{L}</span>
                      <span className={`text-sm break-words ${o.answer ? "text-gray-800" : "text-gray-300"}`}>{o.answer || `Choice ${L}`}</span>
                      {o.isCorrect && <span className="ml-auto text-[10px] font-extrabold text-green-700 uppercase">Correct</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {sols.length > 0 && (
              <details className="mt-3 rounded-xl border border-gray-100 px-3 py-2">
                <summary className="text-xs font-bold text-one cursor-pointer">Solution{sols.length > 1 ? `s (${sols.length} methods)` : ""}</summary>
                {sols.map((m, i) => (
                  <div key={m.id || i} className={`mt-2 ${i ? "pt-2 border-t border-gray-100" : ""}`}>
                    {sols.length > 1 && <p className="text-[11px] font-bold text-gray-400">Method {i + 1}</p>}
                    {plainText(m.answerText) && <RichHtml html={m.answerText} className="text-sm text-gray-700" />}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.answerImage && <MediaChip url={m.answerImage} icon={ImageIcon} label="Image" />}
                      {m.answerPdf && <MediaChip url={m.answerPdf} icon={FileText} label="PDF" />}
                      {m.answerVideo && <MediaChip url={m.answerVideo} icon={Film} label="Video" />}
                    </div>
                  </div>
                ))}
              </details>
            )}
          </div>
          <dl className="text-sm space-y-2">
            {[
              ["Answer type", grid ? "Grid-in" : "Multiple choice"],
              ["Question type", q.questionType || "—"],
              ["Difficulty", q.difficulty || "—"],
              ["Lesson", q.lesson?.name || "—"],
              ["Section", q.section?.sectionName || "—"],
              ["Exam code", q.examCode?.code || "—"],
              ["Date", monthYear(q)],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">{k}</dt><dd className="font-semibold text-gray-800">{v}</dd></div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  );
}
const MediaChip = ({ url, icon: Icon, label }) => {
  const cls = "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-one";
  return isUrl(url)
    ? <a href={url} target="_blank" rel="noreferrer" className={`${cls} hover:underline`}><Icon size={12} />{label}</a>
    : <span className={cls} title={String(url)}><Icon size={12} />{label}</span>;
};

/* ---------- breadcrumbs + lesson header with Questions / Quizzes tabs ---------- */
export const Crumbs = ({ items }) => {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-gray-400" aria-label="Breadcrumb">
      {items.map(([label, to], i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {to ? <button type="button" onClick={() => navigate(to)} className="hover:text-one hover:underline">{label}</button> : <span className="text-gray-700">{label}</span>}
          {i < items.length - 1 && <span aria-hidden="true" className="text-gray-300">/</span>}
        </span>
      ))}
    </nav>
  );
};

/** `info` is the data object of GET /api/admin/lessons/:id ({ lesson, chapter, course, category, teacher }). */
export function LessonHead({ lessonId, info, mode, count, actions }) {
  const navigate = useNavigate();
  const l = info?.lesson, ch = info?.chapter, c = info?.course, cat = info?.category;
  const tabs = [["questions", "Questions", `/admin/courses/questions/${lessonId}`], ["quizzes", "Quizzes", `/admin/courses/quiz/${lessonId}`]];
  const trail = [["Categories", "/admin/courses/categories"]];
  if (cat?.id) trail.push([cat.name || "Category", `/admin/courses/courses/${cat.id}`]);
  if (c?.id) trail.push([c.name || "Course", `/admin/courses/chapters/${c.id}`]);
  if (ch?.id) trail.push([ch.name || "Chapter", `/admin/courses/lessons/${ch.id}`]);
  trail.push([mode === "quizzes" ? "Quizzes" : "Questions", null]);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 pt-5 mb-4">
      <Crumbs items={trail} />
      <div className="flex flex-wrap items-start gap-4 mt-3">
        {l?.image ? <img src={l.image} alt="" className="w-[52px] h-[52px] rounded-xl object-cover border border-gray-100 shrink-0" />
          : <span className="w-[52px] h-[52px] rounded-xl bg-red-50 text-one flex items-center justify-center font-extrabold text-lg shrink-0">{(l?.name || "L").charAt(0).toUpperCase()}</span>}
        <div className="min-w-0 flex-1 basis-60">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 truncate">{[c?.name, ch?.name && `Chapter: ${ch.name}`].filter(Boolean).join(" · ") || "Lesson"}</p>
          <h1 className="font-bold text-xl text-gray-800 leading-tight">{l?.name || <span className="skel inline-block h-6 w-48 align-middle"></span>}</h1>
          <p className="text-sm text-gray-500">{info?.teacher?.name || (info ? "No teacher" : "")}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="flex gap-1 mt-4 overflow-x-auto" role="tablist">
        {tabs.map(([k, label, to]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => mode !== k && navigate(to)}
            className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap ${mode === k ? "border-one text-one" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {label}
            {mode === k && count != null && <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-red-50 text-one">{count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Course header with Exams / Diagnostic exams tabs (each tab is its own page). */
export function CourseExamHead({ courseId, courseName, mode, actions, count }) {
  const navigate = useNavigate();
  const tabs = [["exams", "Exams", `/admin/courses/exam/${courseId}`], ["diagnostic", "Diagnostic exams", `/admin/courses/diagnosticexam/${courseId}`]];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 pt-5 mb-4">
      <Crumbs items={[["Categories", "/admin/courses/categories"], ...(courseName ? [[courseName, null]] : []), [mode === "exams" ? "Exams" : "Diagnostic exams", null]]} />
      <div className="flex flex-wrap items-start gap-4 mt-3">
        <div className="min-w-0 flex-1 basis-60">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 truncate">{courseName ? `Course · ${courseName}` : "Course"}</p>
          <h1 className="font-bold text-xl text-gray-800 leading-tight">Exams &amp; diagnostics</h1>
          <p className="text-sm text-gray-500">{mode === "exams" ? "Full timed papers with sections, built from this course’s questions." : "Trial papers that find the student’s level."}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="flex gap-1 mt-4 overflow-x-auto" role="tablist">
        {tabs.map(([k, label, to]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => mode !== k && navigate(to)}
            className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap ${mode === k ? "border-one text-one" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {label}
            {mode === k && count != null && <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-red-50 text-one">{count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- small controls ---------- */
export const Switch = ({ on, onClick, label, disabled }) => (
  <button type="button" role="switch" aria-checked={!!on} aria-label={label} title={label} onClick={onClick} disabled={disabled}
    className={`relative w-10 h-6 rounded-full shrink-0 transition disabled:opacity-50 ${on ? "bg-green-600" : "bg-gray-300"}`}>
    <span className={`absolute top-0.5 ${on ? "left-[18px]" : "left-0.5"} w-5 h-5 rounded-full bg-white shadow transition-all`}></span>
  </button>
);

/** Filter select with the design's "active" look when a value is chosen. */
export const FilterSelect = ({ label, value, onChange, options, className = "w-full sm:w-36", allLabel = "All" }) => (
  <label className={`block ${className}`}>
    <span className="block text-[11px] font-bold text-gray-500 mb-1">{label}</span>
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}
      className={`a-inp !py-2 cursor-pointer ${value ? "!border-one text-one font-semibold" : ""}`}>
      <option value="">{allLabel}</option>
      {(options || []).map((o, i) => {
        const v = typeof o === "object" ? o.value : o;
        const l = typeof o === "object" ? o.label : o;
        return <option key={`${v}-${i}`} value={v}>{l}</option>;
      })}
    </select>
  </label>
);

/** Correct-answer letter picker (MCQ). */
export const LetterPicker = ({ letters, value, onChange, error }) => (
  <div>
    <div className="flex flex-wrap gap-2">
      {letters.map((l) => {
        const on = value === l;
        return (
          <button key={l} type="button" onClick={() => onChange(l)} aria-pressed={on} title={`Mark ${l} as the correct answer`}
            className={`w-10 h-10 rounded-xl border-2 font-extrabold text-sm shrink-0 transition ${on ? "border-green-600 bg-green-600 text-white" : `${error ? "border-red-300" : "border-gray-200"} bg-white text-gray-500 hover:border-green-600 hover:text-green-700`}`}>
            {l}
          </button>
        );
      })}
    </div>
    <p className="text-[11px] text-gray-400 mt-1.5">Click a letter to mark the correct answer.</p>
  </div>
);

/** "Extract text" (OCR) button shown next to the question image. */
export const OcrButton = ({ onClick, disabled, loading }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="a-btn primary w-full md:w-auto h-full">
    {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>Extracting…</span></> : <><ScanText size={16} /> Extract text</>}
  </button>
);

/** Drive file field used by the solution methods (image / PDF / video). */
const KIND = {
  image: [ImageIcon, "Answer image"],
  pdf: [FileText, "Answer PDF"],
  video: [Film, "Answer video"],
};
export const DrivePickerField = ({ label, value, allowedTypes = [], onOpen, onClear }) => {
  const [Icon, fallback] = KIND[allowedTypes[0]] || [Link2, "File"];
  const name = label || fallback;
  return (
    <div className={`flex items-center gap-2 rounded-xl border ${value ? "border-gray-200 bg-white" : "border-dashed border-gray-300 bg-white"} px-3 py-2 min-w-0`}>
      <button type="button" onClick={value ? undefined : onOpen} className={`flex items-center gap-2 min-w-0 flex-1 text-left ${value ? "cursor-default" : "cursor-pointer"}`}>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${value ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}><Icon size={16} /></span>
        <span className="min-w-0">
          <span className="block text-xs font-bold text-gray-700">{name}</span>
          <span className={`block text-[11px] truncate ${value ? "text-gray-500" : "text-gray-400"}`}>
            {value ? String(value).split("/").pop() : <span className="inline-flex items-center gap-1"><FolderOpen size={11} /> Select from Drive</span>}
          </span>
        </span>
      </button>
      {value && (
        <button type="button" onClick={onClear} className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0 inline-flex items-center justify-center" aria-label={`Remove ${name}`} title="Remove">
          <X size={14} />
        </button>
      )}
    </div>
  );
};

/** Card around one solution method. */
export const MethodCard = ({ index, canRemove, onRemove, children }) => (
  <div className="rounded-xl border border-gray-100 p-3 flex flex-col gap-3">
    <div className="flex items-center">
      <p className="text-xs font-extrabold text-gray-700">Method {index + 1}</p>
      {canRemove && <button type="button" onClick={onRemove} className="ml-auto text-xs font-bold text-red-600 hover:underline">Remove method</button>}
    </div>
    {children}
  </div>
);

export const AddMethodButton = ({ onClick }) => (
  <button type="button" onClick={onClick} className="self-start h-9 px-3 rounded-lg text-xs font-bold bg-red-50 text-one hover:bg-red-100">+ Add another method</button>
);

/* ---------- pager with page-size select ---------- */
export const PagerBar = ({ page, totalPages, total, limit, onPage, onLimit, label = "questions" }) => {
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm">
      <span className="text-gray-500">Showing <b className="text-gray-900">{from}–{to}</b> of {total} {label}</span>
      <div className="flex items-center gap-2">
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="h-9 border border-gray-200 rounded-lg px-2 text-sm bg-white outline-none focus:border-one" aria-label="Rows per page">
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-9 w-9 rounded-lg border border-gray-200 disabled:opacity-40" aria-label="Previous page">‹</button>
        <span className="tabular-nums text-gray-600">{page} / {totalPages || 1}</span>
        <button disabled={page >= (totalPages || 1)} onClick={() => onPage(page + 1)} className="h-9 w-9 rounded-lg border border-gray-200 disabled:opacity-40" aria-label="Next page">›</button>
      </div>
    </div>
  );
};
