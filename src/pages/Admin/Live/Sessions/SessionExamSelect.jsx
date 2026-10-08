import { useMemo } from "react";
import Select from "react-select";
import useGet from "@/hooks/useGet";

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
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-slate-700">
        Select Exam <span className="text-red-500">*</span>
      </label>
      <Select
        options={options}
        value={
          options.find(
            (option) => String(option.value) === String(value),
          ) || null
        }
        onChange={(option) => onChange(option?.value || "")}
        isLoading={examsLoading}
        isDisabled={examsLoading || Boolean(examsError)}
        isClearable
        placeholder="Choose the exam for this session..."
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {examsError && (
        <p className="text-xs text-red-500">Could not load exams.</p>
      )}
      {value && selectedExamError && (
        <p className="text-xs text-red-500">Could not load the selected exam.</p>
      )}
      {value && selectedExamLoading && (
        <p className="text-xs text-slate-400">Loading exam PDFs...</p>
      )}
      {value && !selectedExamLoading && !selectedExamError && (
        <div className="flex flex-wrap gap-4 text-sm">
          {sessionPdf ? (
            <a
              href={sessionPdf}
              target="_blank"
              rel="noreferrer"
              className="text-one underline"
            >
              View Session PDF
            </a>
          ) : (
            <span className="text-slate-400">No session PDF on this exam</span>
          )}
          {answersPdf ? (
            <a
              href={answersPdf}
              target="_blank"
              rel="noreferrer"
              className="text-one underline"
            >
              View Answers PDF
            </a>
          ) : (
            <span className="text-slate-400">No answers PDF on this exam</span>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionExamSelect;
