import { useMemo } from "react";
import Select from "react-select";
import useGet from "@/hooks/useGet";
import { FileText } from "lucide-react";
import { FieldError, SELECT_STYLES } from "./parts/formKit";

const EXAM_TYPES = ["static", "adaptive", "extra", "trail"];

const SessionExamSelect = ({ value, onChange, error }) => {
  const {
    data: examsResponse,
    loading: examsLoading,
    error: examsError,
  } = useGet("/api/admin/exams");
  const {
    data: selectedExamResponse,
    loading: selectedExamLoading,
    error: selectedExamError,
  } = useGet(value ? `/api/admin/exams/${value}` : "");

  const selectedExam =
    selectedExamResponse?.data?.data || selectedExamResponse?.data?.exam;

  const exams = useMemo(() => {
    const responseData = examsResponse?.data?.data;
    const containers = [
      responseData,
      responseData?.data,
      responseData?.exams,
      responseData?.data?.exams,
    ];
    const examsFromList = containers.flatMap((container) =>
      EXAM_TYPES.flatMap((type) =>
        Array.isArray(container?.[type]) ? container[type] : [],
      ),
    );
    if (
      selectedExam?.id &&
      !examsFromList.some((exam) => String(exam.id) === String(selectedExam.id))
    ) {
      examsFromList.push(selectedExam);
    }
    return [...new Map(examsFromList.map((exam) => [exam.id, exam])).values()];
  }, [examsResponse, selectedExam]);

  const options = useMemo(
    () =>
      exams.map((exam) => ({
        value: exam.id,
        label: exam.title || "Untitled exam",
      })),
    [exams],
  );

  const sessionPdf = selectedExam?.session_pdf;
  const answersPdf = selectedExam?.session_answers_pdf;

  return (
    <div>
      <label className="a-lbl-f">Exam <span className="text-red-500">*</span></label>
      <Select
        options={options}
        value={options.find((option) => String(option.value) === String(value)) || null}
        onChange={(option) => onChange(option?.value || "")}
        isLoading={examsLoading}
        isDisabled={examsLoading || Boolean(examsError)}
        isClearable
        placeholder="Choose the exam for this session…"
        styles={SELECT_STYLES}
      />
      <FieldError msg={error} />
      {examsError && <p className="text-xs font-semibold text-red-600 mt-1">Could not load exams.</p>}
      {value && selectedExamError && <p className="text-xs font-semibold text-red-600 mt-1">Could not load the selected exam.</p>}
      {value && selectedExamLoading && <div className="skel h-9 mt-2"></div>}
      {value && !selectedExamLoading && !selectedExamError && (
        <div className="flex flex-wrap gap-2 mt-2">
          {[["Session PDF", sessionPdf], ["Answers PDF", answersPdf]].map(([label, url]) =>
            url ? (
              <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-one hover:bg-red-50/50">
                <FileText size={14} /> View {label}
              </a>
            ) : (
              <span key={label} className="inline-flex items-center rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-400">No {label.toLowerCase()} on this exam</span>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default SessionExamSelect;
