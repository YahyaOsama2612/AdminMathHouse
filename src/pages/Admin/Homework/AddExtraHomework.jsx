import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Select from "react-select";
import SearchStudents from "@/components/SearchStudents";

const AddExtraHomework = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/extra-homework");

  const [targetType, setTargetType] = useState("individual");
  const [pdfFile, setPdfFile] = useState(null);

  // 🔥 استدعاء الجروبات
  const {
    data: groupData,
    loading: groupLoading,
    error: groupError,
  } = useGet("/api/admin/session/select/groups");

  // 🔥 تحويل الجروبات إلى options
  const groupOptions = useMemo(
    () =>
      groupData?.data?.groups?.map((item) => ({
        value: item.id,
        label: item.name,
      })) || [],
    [groupData],
  );

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

      // ✅ استخدام custom type لـ textarea
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

      // ✅ استخدام custom type لـ datetime-local
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

      // 🔥 Conditional: Group target type مع استدعاء الجروبات
      targetType === "group" && {
        name: "targetGroupId",
        label: "Select Group",
        type: "custom",
        required: true,
        section: "Target",
        fullWidth: true,
        render: ({ value, onChange, error }) => (
          <div className="flex flex-col gap-1.5">
            <Select
              options={groupOptions}
              value={groupOptions.find((opt) => opt.value === value) || null}
              onChange={(option) => onChange(option?.value || "")}
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
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                {error}
              </p>
            )}
          </div>
        ),
      },

      // 🔥 حقل الملفات المحسّن يقبل صور و PDF
      {
        name: "pdf",
        label: "Upload File (Optional)",
        type: "custom",
        section: "Resources",
        helperText: "Upload PDF, images (PNG, JPG, JPEG) or documents",
        render: ({ value, onChange, error, field }) => (
          <div className="flex flex-col gap-1.5">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setPdfFile(e.target.files[0]);
                  onChange(e.target.files[0].name);
                }
              }}
              className={`p-3 rounded-xl border bg-slate-50/30 cursor-pointer focus:ring-4 focus:ring-one/10 outline-none transition-all file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-one/10 file:text-one hover:file:bg-one/20 ${
                error ? "border-red-400" : "border-slate-200 focus:border-one"
              }`}
            />
            {value && (
              <p className="text-xs text-slate-500">
                📄 {value}
              </p>
            )}
            {field.helperText && (
              <p className="text-xs text-slate-400">{field.helperText}</p>
            )}
          </div>
        ),
      },

      {
        name: "link",
        label: "External Link (Optional)",
        type: "text",
        section: "Resources",
        placeholder: "e.g., https://example.com/homework",
      },
    ],
    [targetType, groupOptions, groupLoading],
  ).filter(Boolean);

  const onSave = async (formData) => {
    try {
      // Convert file to base64 if provided
      let fileBase64 = null;
      if (pdfFile) {
        fileBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(pdfFile);
        });
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        targetType: formData.targetType,
        ...(formData.targetType === "individual" && {
          studentIds: formData.studentIds || [],
        }),
        ...(formData.targetType === "group" && {
          targetGroupId: formData.targetGroupId,
        }),
        ...(fileBase64 && { pdf: fileBase64 }),
        ...(formData.link && { link: formData.link }),
      };

      await postData(
        payload,
        "/api/admin/extra-homework",
        "Homework added successfully",
      );
      navigate(-1);
    } catch (e) {
      throw e;
    }
  };

  return (
    <AddPage
      title="Add Extra Homework"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{
        targetType: "individual",
        studentIds: [],
      }}
    />
  );
};

export default AddExtraHomework;