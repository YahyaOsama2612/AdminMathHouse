import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import Select from "react-select";
import SearchStudents from "@/components/SearchStudents";
import { FileText, ExternalLink, X } from "lucide-react";

const EditExtraHomework = () => {
  // 🔧 جميع الـ hooks في الأول
  const navigate = useNavigate();
  const { id } = useParams();

  // ✅ STATE MANAGEMENT
  const [targetType, setTargetType] = useState("individual");
  const [selectedGroupName, setSelectedGroupName] = useState(""); // 📝 للعرض فقط (Display only)
  const [pdfFile, setPdfFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [existingPdfUrl, setExistingPdfUrl] = useState(null);
  const [removePdf, setRemovePdf] = useState(false);

  // ✅ API CALLS
  const { putData } = usePut(`/api/admin/extra-homework/${id}`);

  const {
    data: homeworkRes,
    loading: loadingOne,
    error: errorOne,
  } = useGet(`/api/admin/extra-homework/${id}`);

  const {
    data: groupData,
    loading: groupLoading,
    error: groupError,
  } = useGet("/api/admin/session/select/groups");

  // ✅ MEMOS
  const groupOptions = useMemo(
    () =>
      groupData?.data?.groups?.map((item) => ({
        value: item.id,
        label: item.name,
      })) || [],
    [groupData],
  );

  const homework = useMemo(() => {
    if (!homeworkRes?.data?.data) return {};
    return homeworkRes.data.data;
  }, [homeworkRes]);

  const studentIds = useMemo(() => {
    if (!homework.students?.length) return [];
    return homework.students.map((item) => item.student?.id).filter(Boolean);
  }, [homework.students]);

  const studentsInfo = useMemo(() => {
    if (!homework.students?.length) return [];
    return homework.students.map((item) => ({
      id: item.student?.id,
      name: item.student?.name,
      status: item.status,
      email: item.student?.email,
    }));
  }, [homework.students]);

  const targetGroupId = useMemo(() => {
    if (!homework.groupName || !groupOptions.length) return "";
    const found = groupOptions.find((g) => g.label === homework.groupName);
    return found?.value || "";
  }, [homework.groupName, groupOptions]);

  // ✅ EFFECTS
  useEffect(() => {
    if (homework.pdfUrl) {
      setExistingPdfUrl(homework.pdfUrl);
    }
  }, [homework.pdfUrl]);

  useEffect(() => {
    if (homework.targetType) {
      setTargetType(homework.targetType);
    }
  }, [homework.targetType]);

  // ✅ جديد: تعيين اسم الجروب الأولي عند التحميل
  useEffect(() => {
    if (homework.groupName) {
      setSelectedGroupName(homework.groupName);
    }
  }, [homework.groupName]);

  // ✅ FIELDS
  const fields = useMemo(
    () => [
      {
        name: "title",
        label: "Homework Title",
        type: "text",
        required: true,
        section: "General Information",
        placeholder: "e.g., 'Math Revision Assignment'",
      },

      {
        name: "description",
        label: "Description",
        type: "custom",
        required: true,
        section: "General Information",
        fullWidth: true,
        placeholder: "Detailed description of the homework",
        render: ({ value, onChange, error, field }) => (
          <div className="flex flex-col gap-1.5">
            <textarea
              name={field.name}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={`p-3 rounded-xl border bg-slate-50/30 focus:ring-4 focus:ring-one/10 outline-none transition-all resize-none ${
                error ? "border-red-400" : "border-slate-200 focus:border-one"
              }`}
            />
          </div>
        ),
      },

      {
        name: "dueDate",
        label: "Due Date",
        type: "custom",
        required: true,
        section: "General Information",
        fullWidth: true,
        render: ({ value, onChange, error, field }) => (
          <div className="flex flex-col gap-1.5">
            <input
              type="datetime-local"
              name={field.name}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              className={`p-3 rounded-xl border bg-slate-50/30 focus:ring-4 focus:ring-one/10 outline-none transition-all ${
                error ? "border-red-400" : "border-slate-200 focus:border-one"
              }`}
            />
          </div>
        ),
      },

      {
        name: "targetType",
        label: "Target Type",
        type: "select",
        required: true,
        section: "Target",
        options: [
          { value: "individual", label: "Individual Students" },
          { value: "group", label: "Group" },
        ],
        onChange: (value) => setTargetType(value),
      },

      // Conditional: Individual target type
      targetType === "individual" && {
        name: "studentIds",
        label: "Select Students",
        fullWidth: true,
        type: "custom",
        section: "Target",
        render: ({ value, onChange, error }) => (
          <SearchStudents
            value={value}
            onChange={onChange}
            error={error}
            limit={50}
          />
        ),
      },

      // ✅ Conditional: Group target type - إرسال targetGroupId UUID فقط
      targetType === "group" && {
        name: "targetGroupId",
        label: "Select Group",
        type: "custom",
        required: true,
        section: "Target",
        fullWidth: true,
        render: ({ value, onChange, error }) => (
          <div className="flex flex-col gap-1.5">
            {homework.groupName && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-sm text-blue-700 font-bold">
                  📌 Current Group:
                </span>
                <span className="text-sm font-bold text-blue-900">
                  {homework.groupName}
                </span>
              </div>
            )}

            <Select
              options={groupOptions}
              value={groupOptions.find((opt) => opt.value === value) || null}
              onChange={(option) => {
                onChange(option?.value || ""); // ✅ يُرسل UUID فقط
                setSelectedGroupName(option?.label || ""); // 📝 للعرض فقط (display only)
              }}
              isLoading={groupLoading}
              isClearable
              isSearchable
              placeholder="Select a group..."
              className={error ? "border-red-400" : ""}
              styles={{
                control: (base) => ({
                  ...base,
                  borderRadius: "0.75rem",
                  borderColor: error ? "#f87171" : "#cbd5e1",
                  backgroundColor: "rgb(241 245 249 / 0.3)",
                  padding: "2px",
                  boxShadow: error ? "none" : "none",
                  "&:hover": {
                    borderColor: error ? "#f87171" : "#94a3b8",
                  },
                  "&:focus": {
                    borderColor: "#3b82f6",
                  },
                }),
              }}
            />
          </div>
        ),
      },

      {
        name: "pdfFile",
        label: "Upload File (PDF, Word, etc.)",
        type: "custom",
        required: false,
        section: "Resources",
        fullWidth: true,
        render: ({ value, onChange, error, field }) => (
          <div className="flex flex-col gap-1.5">
            {existingPdfUrl && !removePdf && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                <a
                  href={existingPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-800 font-bold"
                >
                  <FileText size={16} />
                  📄 Current File
                </a>
                <button
                  type="button"
                  onClick={() => setRemovePdf(true)}
                  className="p-1 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                  title="Remove current file"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {removePdf && (
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                <span className="text-sm text-red-700 font-bold">
                  ❌ Current file will be removed
                </span>
                <button
                  type="button"
                  onClick={() => setRemovePdf(false)}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded transition-all"
                >
                  Undo
                </button>
              </div>
            )}

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setPdfFile(e.target.files[0]);
                  setFileName(e.target.files[0].name);
                  onChange(e.target.files[0].name);
                }
              }}
              className={`p-3 rounded-xl border bg-slate-50/30 cursor-pointer focus:ring-4 focus:ring-one/10 outline-none transition-all file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-one/10 file:text-one hover:file:bg-one/20 ${
                error ? "border-red-400" : "border-slate-200 focus:border-one"
              }`}
            />
            {fileName && (
              <p className="text-xs text-slate-500">📄 New File: {fileName}</p>
            )}
            {field.helperText && (
              <p className="text-xs text-slate-400">{field.helperText}</p>
            )}
          </div>
        ),
      },

      // External link field
      {
        name: "link",
        label: "External Link (Optional)",
        type: "custom",
        section: "Resources",
        render: ({ value, onChange, error, field }) => (
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g., https://example.com/homework"
              className={`p-3 rounded-xl border bg-slate-50/30 focus:ring-4 focus:ring-one/10 outline-none transition-all ${
                error ? "border-red-400" : "border-slate-200 focus:border-one"
              }`}
            />
            {value && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs font-bold"
              >
                <ExternalLink size={14} />
                Open Link
              </a>
            )}
          </div>
        ),
      },

      // Display assigned students
      {
        name: "studentsInfo",
        label: "Assigned Students",
        type: "custom",
        section: "Students",
        fullWidth: true,
        render: () => (
          <div className="flex flex-col gap-2">
            {studentsInfo.length > 0 ? (
              studentsInfo.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-bold text-slate-700">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      student.status === "assigned"
                        ? "bg-blue-100 text-blue-700"
                        : student.status === "submitted"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {student.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">
                No students assigned yet
              </p>
            )}
          </div>
        ),
      },

      // Display statistics
      homework.stats && {
        name: "stats",
        label: "Statistics",
        type: "custom",
        section: "Stats",
        fullWidth: true,
        render: () => (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-bold">Assigned</p>
              <p className="text-2xl font-bold text-blue-700">
                {homework.stats?.totalAssigned || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-600 font-bold">Submitted</p>
              <p className="text-2xl font-bold text-green-700">
                {homework.stats?.totalSubmitted || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-600 font-bold">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">
                {homework.stats?.pendingSubmissions || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-600 font-bold">Graded</p>
              <p className="text-2xl font-bold text-purple-700">
                {homework.stats?.totalGraded || 0}
              </p>
            </div>
          </div>
        ),
      },
    ],
    [
      targetType,
      groupOptions,
      groupLoading,
      existingPdfUrl,
      removePdf,
      studentsInfo,
      homework.stats,
      homework.groupName,
    ],
  ).filter(Boolean);

  // ✅ SAVE FUNCTION WITH VALIDATION
  const onSave = async (formData) => {
    try {
      // Validation
      if (formData.targetType === "group" && !formData.targetGroupId) {
        throw new Error("❌ Please select a group");
      }

      if (
        formData.targetType === "individual" &&
        !formData.studentIds?.length
      ) {
        throw new Error("❌ Please select at least one student");
      }

      // Convert PDF to base64
      let fileBase64 = null;
      if (pdfFile) {
        fileBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(pdfFile);
        });
      }

      // ✅ الـ Payload مع targetGroupId UUID فقط (بدون groupName)
      const payload = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        targetType: formData.targetType,
        ...(formData.targetType === "individual" && {
          studentIds: formData.studentIds || [],
        }),
        ...(formData.targetType === "group" && {
          targetGroupId: formData.targetGroupId, // ✅ UUID فقط (الـ backend يحصل على groupName من الـ ID)
        }),
        ...(fileBase64 && { pdf: fileBase64 }),
        ...(removePdf && { removePdf: true }),
        ...(formData.link && { link: formData.link }),
      };

      // Debug log
      console.log("📤 Sending payload:", payload);

      await putData(
        payload,
        `/api/admin/extra-homework/${id}`,
        "✅ Homework updated successfully",
      );
      navigate(-1);
    } catch (e) {
      console.error("❌ Error saving data:", e);
      throw e;
    }
  };

  // Early returns AFTER all hooks
  if (loadingOne) return <Loader />;
  if (errorOne) return <Errorpage />;

  // Render component
  return (
    <AddPage
      title="Edit Extra Homework"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{
        title: homework.title || "",
        description: homework.description || "",
        dueDate: homework.dueDate
          ? new Date(homework.dueDate).toISOString().slice(0, 16)
          : "",
        targetType: homework.targetType || "individual",
        studentIds: studentIds,
        targetGroupId: targetGroupId,
        link: homework.link || "",
      }}
    />
  );
};

export default EditExtraHomework;
