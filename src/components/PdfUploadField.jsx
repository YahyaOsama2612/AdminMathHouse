import { useRef } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "react-hot-toast";

const MAX_PDF_MB = 10;

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export const pdfUploadPayload = (value) =>
  value?.base64 || value?.url || null;

const PdfUploadField = ({ value, onChange }) => {
  const inputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      toast.error(`PDF must be smaller than ${MAX_PDF_MB}MB`);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      onChange({ base64, name: file.name });
    } catch {
      toast.error("Could not read this file, try another one");
    }
  };

  const hasFile = Boolean(value?.base64 || value?.url);

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      {hasFile ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
          <FileText size={18} className="text-emerald-600 shrink-0" />
          {value.base64 ? (
            <span className="text-xs font-medium text-slate-700 truncate flex-1">
              {value.name}
            </span>
          ) : (
            <a
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-one underline truncate flex-1"
            >
              View current PDF
            </a>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-bold px-2 py-1 rounded-lg text-slate-600 hover:bg-white"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 rounded-lg text-red-500 hover:bg-red-50"
            aria-label="Remove PDF"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-one hover:text-one transition-all p-4 text-sm"
        >
          <Upload size={18} />
          <span className="font-semibold">Upload PDF</span>
        </button>
      )}
    </div>
  );
};

export default PdfUploadField;
