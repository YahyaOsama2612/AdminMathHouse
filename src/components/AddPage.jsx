import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X, Upload, AlertCircle, Info } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import toast from "react-hot-toast";
import { FaPlusSquare } from "react-icons/fa";

const AddPage = ({ title, fields, onSave, onCancel, initialData }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [previews, setPreviews] = useState({});

  // Initialize default data
  

  const [formData, setFormData] = useState(() =>
    fields.reduce(
      (acc, field) => ({ ...acc, [field.name]: field.defaultValue ?? "" }),
      {},
    ),
  );

  // Dirty Check (to detect unsaved changes)
  const isDirty =
    JSON.stringify(formData) !==
    JSON.stringify(
      initialData ||
        fields.reduce(
          (acc, field) => ({ ...acc, [field.name]: field.defaultValue ?? "" }),
          {},
        ),
    );
useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));

      const newPreviews = {};
      Object.keys(initialData).forEach((key) => {
        if (typeof initialData[key] === "string" && initialData[key].includes("http")) {
          newPreviews[key] = initialData[key];
        }
      });
      setPreviews(newPreviews);
    }
    // 👇🔥 استخدمنا JSON.stringify عشان الكومبوننت ميعملش إعادة تعيين (Reset) للفورم فجأة
  }, [JSON.stringify(initialData)]);
  

  // --- Validation Logic (Translated) ---
  const validateField = useCallback(
    (field, value) => {
      let error = "";
      if (field.required && (!value || value.toString().trim() === "")) {
        error = field.requiredMessage || "This field is required";
      } else if (value && field.type === "number" && isNaN(value)) {
        error = "Must be a valid number";
      } else if (value && field.pattern && !field.pattern.test(value)) {
        error = field.patternMessage || "Invalid format";
      } else if (field.customValidator) {
        const customError = field.customValidator(value, formData);
        if (customError) error = customError;
      }
      if (
        field.required &&
        (value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0))
      ) {
        error = field.requiredMessage || "This field is required";
      }

      return error;
    },
    [formData],
  );

  const validateForm = () => {
    const newErrors = {};
    fields.forEach((field) => {
      if (typeof field.hidden === "function" && field.hidden(formData)) return;
      const error = validateField(field, formData[field.name]);
      if (error) newErrors[field.name] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e, name) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [name]: file }));
      setPreviews((prev) => ({ ...prev, [name]: URL.createObjectURL(file) }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to exit?",
        )
      ) {
        onCancel();
      }
    } else {
      // إظهار الرسالة
      toast("No changes were made", {
        icon: "📝",
      });
      // العودة للصفحة السابقة
      onCancel();
    }
  };

  // Group fields by section
  const sections = fields.reduce((acc, field) => {
    const sectionName = field.section || "General Information";
    if (!acc[sectionName]) acc[sectionName] = [];
    acc[sectionName].push(field);
    return acc;
  }, {});

  return (
    <div className=" md:p-1 bg-[#f8fafc] min-h-screen text-left" dir="ltr">
      {/* Header */}
      <div className=" mx-auto mb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {title}
          </h1>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center w-fit gap-2 px-4 py-2 bg-white
           border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!validateForm()) return;

          try {
            setIsSubmitting(true);
            await onSave(formData);
          } catch (err) {
            console.error(err);
          } finally {
            setIsSubmitting(false);
          }
        }}
        className=" mx-auto space-y-2"
      >
        {Object.entries(sections).map(([sectionTitle, sectionFields]) => (
          <div
            key={sectionTitle}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 "
          >
            <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-700">
                {sectionTitle}
              </h2>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-left">
              {sectionFields.map((field) => {
                if (
                  typeof field.hidden === "function" &&
                  field.hidden(formData)
                )
                  return null;

                return (
                  <div
                    key={field.name}
                    className={`flex flex-col gap-1.5 ${field.fullWidth ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}
                  >
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1 justify-start">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                      {field.tooltip && (
                        <Info
                          size={14}
                          className="text-slate-400 cursor-help"
                          title={field.tooltip}
                        />
                      )}
                    </label>

                    {/* Inputs logic */}
                    {["text", "email", "password"].includes(field.type) && (
                      <input
                        type={field.type}
                        name={field.name}
                        value={formData[field.name] || ""}
                        placeholder={field.placeholder}
                        className={`p-3 rounded-xl border bg-slate-50/30 focus:ring-4 focus:ring-one/10 outline-none transition-all ${errors[field.name] ? "border-red-400" : "border-slate-200 focus:border-one"}`}
                        onChange={handleChange}
                      />
                    )}

                    {["number"].includes(field.type) && (
                      <input
                        min={0}
                        type={field.type}
                        name={field.name}
                        value={formData[field.name] || ""}
                        placeholder={field.placeholder}
                        className={`
      appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none 
      no-spinner p-3 rounded-xl border bg-slate-50/30 focus:ring-4 focus:ring-one/10 outline-none transition-all ${
        errors[field.name]
          ? "border-red-400"
          : "border-slate-200 focus:border-one"
      }`}
                        onChange={handleChange}
                      />
                    )}
                    {["numberdecimal"].includes(field.type) && (
                      <input
                        min={0}
                        step="any" // هنا
                        type="number" // type لازم يكون "number"
                        name={field.name}
                        value={formData[field.name] || ""}
                        placeholder={field.placeholder}
                        className={`
      appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none 
      no-spinner p-3 rounded-xl border bg-slate-50/30 focus:ring-4 focus:ring-one/10 outline-none transition-all ${
        errors[field.name]
          ? "border-red-400"
          : "border-slate-200 focus:border-one"
      }`}
                        onChange={handleChange}
                      />
                    )}

                    {field.type === "multipleSelect" && (
                      <Select
                        isMulti
                        name={field.name}
                        options={field.options} // [{ value: '1', label: 'Option 1' }]
                        value={
                          Array.isArray(formData[field.name])
                            ? field.options.filter((opt) =>
                                formData[field.name].includes(opt.value),
                              )
                            : []
                        }
                        onChange={(selected) => {
                          const values = selected
                            ? selected.map((opt) => opt.value)
                            : [];
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: values,
                          }));
                          if (errors[field.name])
                            setErrors((prev) => ({
                              ...prev,
                              [field.name]: "",
                            }));
                        }}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            backgroundColor: "var(--color-two)", // خلفية الصندوق
                            borderColor: "var(--color-one)", // لون الحدود
                            borderRadius: "0.75rem",
                            padding: "0.25rem",
                          }),
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isFocused
                              ? "var(--color-three)" // عند المرور بالماوس
                              : "var(--color-two)", // الخلفية العادية
                            color: "var(--color-one)", // لون النص
                          }),
                          multiValue: (provided) => ({
                            ...provided,
                            backgroundColor: "var(--color-four)", // خلفية القيمة المختارة
                          }),
                          multiValueLabel: (provided) => ({
                            ...provided,
                            color: "var(--color-two)", // نص القيمة المختارة
                          }),
                          multiValueRemove: (provided) => ({
                            ...provided,
                            color: "var(--color-two)", // لون علامة الإزالة
                            ":hover": {
                              backgroundColor: "var(--color-one)",
                              color: "var(--color-two)",
                            },
                          }),
                        }}
                      />
                    )}

                    {field.type === "datetime" && (
                      <DatePicker
                        selected={
                          formData[field.name]
                            ? new Date(formData[field.name])
                            : null
                        }
                        onChange={(date) =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: date
                              ? new Date(
                                  date.getTime() -
                                    date.getTimezoneOffset() * 60000,
                                )
                                  .toISOString()
                                  .slice(0, 19) // yyyy-MM-ddTHH:mm:ss
                              : "",
                          }))
                        }
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={5}
                        dateFormat="yyyy-MM-dd HH:mm"
                        minDate={new Date()}
                        placeholderText={
                          field.placeholder || "Select date & time"
                        }
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:border-one focus:ring-4 focus:ring-one/10 outline-none"
                      />
                    )}
                    {field.type === "time" && (
                      <DatePicker
                        selected={
                          formData[field.name]
                            ? new Date(`1970-01-01T${formData[field.name]}`)
                            : null
                        }
                        onChange={(date) =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: date
                              ? new Date(
                                  date.getTime() -
                                    date.getTimezoneOffset() * 60000,
                                )
                                  .toISOString()
                                  .slice(11, 19) // HH:mm:ss
                              : "",
                          }))
                        }
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={5}
                        timeFormat="HH:mm"
                        dateFormat="HH:mm"
                        placeholderText={field.placeholder || "Select time"}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:border-one focus:ring-4 focus:ring-one/10 outline-none"
                      />
                    )}

                    {field.type === "datemin" && (
                      <DatePicker
                        selected={
                          formData[field.name]
                            ? new Date(formData[field.name])
                            : null
                        }
                        onChange={(date) =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: date ? date.toISOString() : "",
                          }))
                        }
                        dateFormat="yyyy-MM-dd"
                        minDate={new Date()}
                        placeholderText={field.placeholder}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:border-one focus:ring-4 focus:ring-one/10 outline-none"
                      />
                    )}
                    {field.type === "date" && (
                      <DatePicker
                        minDate={new Date()}
                        selected={
                          formData[field.name]
                            ? new Date(formData[field.name])
                            : null
                        }
                        onChange={(date) =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: date ? date.toISOString() : "",
                          }))
                        }
                        dateFormat="yyyy-MM-dd"
                        placeholderText={field.placeholder}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:border-one focus:ring-4 focus:ring-one/10 outline-none"
                      />
                    )}

                    {field.type === "select" && (
                      <Select
                        options={field.options}
                        value={
                          field.options?.find(
                            (opt) =>
                              String(opt.value) ===
                              String(formData[field.name]),
                          ) || null
                        }
                        isLoading={field.isLoading || false}
                        isDisabled={field.isDisabled || false}
                        onChange={(selected) => {
                          const selectedValue = selected ? selected.value : "";

                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: selectedValue,
                          }));

                          if (errors[field.name])
                            setErrors((prev) => ({ ...prev, [field.name]: "" }));

                          // تمرير setFormData للأب عند الحاجة
                          if (field.onChange) {
                            field.onChange(selectedValue, setFormData);
                          }
                        }}
                        placeholder="Select..."
                      />
                    )}
                    {field.type === "file" && (
                      <div
                        className={`relative group border-2 border-dashed rounded-xl p-4 transition-all ${previews[field.name] ? "border-one bg-one/5" : "border-slate-200 hover:border-one/50"}`}
                      >
                        <input
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          type="file"
                          onChange={(e) => handleFileChange(e, field.name)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center gap-4 text-left">
                          {previews[field.name] ? (
                            <img
                              src={previews[field.name]}
                              alt="preview"
                              className="w-16 h-16 rounded-lg object-cover ring-2 ring-white shadow-md"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-one transition-colors">
                              <Upload size={24} />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-600">
                              Click to upload or drag and drop
                            </span>
                            <span className="text-xs text-slate-400">
                              PNG, JPG up to 5MB
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {field.type === "pdf" && (
  <div
    className={`relative group border-2 border-dashed rounded-xl p-4 transition-all ${previews[field.name] ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-red-300"}`}
  >
    <input
      accept="application/pdf"
      type="file"
      onChange={(e) => handleFileChange(e, field.name)}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
    />
    <div className="flex items-center gap-4 text-left">
      {previews[field.name] ? (
        /* شكل الـ Preview لما يتم اختيار ملف PDF */
        <div className="w-16 h-16 bg-red-100 rounded-lg flex flex-col items-center justify-center text-red-600 ring-2 ring-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="text-[10px] font-bold mt-1">PDF</span>
        </div>
      ) : (
        /* الشكل الافتراضي قبل الرفع */
        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
          <Upload size={24} />
        </div>
      )}
      
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-600">
          {previews[field.name] ? "PDF Selected Successfully" : "Click to upload or drag and drop"}
        </span>
        <span className="text-xs text-slate-400">
          PDF file up to 5MB
        </span>
      </div>
    </div>
  </div>
)}

                    {field.type === "dynamic-list" && (
                      <div className="flex flex-col gap-3">
                        {(formData[field.name] || []).map((val, index) => {
                          const orderLabel = String.fromCharCode(65 + index); // تحويل 0 لـ A و 1 لـ B وهكذا
                          return (
                            <div
                              key={index}
                              className="flex gap-2 items-center"
                            >
                              <span className="font-bold text-slate-500 w-6">
                                {orderLabel}-
                              </span>
                              <input
                                type="text"
                                value={val}
                                placeholder={`Enter Option ${orderLabel}`}
                                className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:border-one focus:ring-4 focus:ring-one/10 outline-none transition-all"
                                onChange={(e) => {
                                  const newValues = [
                                    ...(formData[field.name] || []),
                                  ];
                                  newValues[index] = e.target.value;
                                  setFormData((prev) => ({
                                    ...prev,
                                    [field.name]: newValues,
                                  }));
                                }}
                              />
                              {/* زر الحذف - يظهر فقط إذا كان هناك أكثر من اختيارين */}
                              {(formData[field.name] || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newValues = (
                                      formData[field.name] || []
                                    ).filter((_, i) => i !== index);
                                    setFormData((prev) => ({
                                      ...prev,
                                      [field.name]: newValues,
                                    }));
                                  }}
                                  className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                  <X size={20} />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: [...(prev[field.name] || []), ""],
                            }));
                          }}
                          className="flex items-center justify-center gap-2 p-3 mt-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-one hover:text-one hover:bg-one/5 transition-all font-medium"
                        >
                          <FaPlusSquare size={18} />
                          <span>Add Option</span>
                        </button>
                      </div>
                    )}

                    {field.type === "switch" && (
                      <div className="flex items-center gap-3 py-2 justify-start">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: !prev[field.name],
                            }))
                          }
                          className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${formData[field.name] ? "bg-one" : "bg-slate-300"}`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${formData[field.name] ? "translate-x-6" : "translate-x-0"}`}
                          />
                        </button>
                        <span className="text-sm text-slate-600 font-medium">
                          {formData[field.name] ? "Active" : "Inactive"}
                        </span>
                      </div>
                    )}
{field.type === "fileWithOCR" && (
  <div className="flex flex-col md:flex-row gap-4 w-full items-stretch">
    {/* صندوق رفع الصورة */}
    <div
      className={`relative flex-1 group border-2 border-dashed rounded-xl p-4 transition-all ${
        previews[field.name] ? "border-one bg-one/5" : "border-slate-200 hover:border-one/50"
      }`}
    >
      <input
        accept="image/png, image/jpeg, image/jpg, image/webp"
        type="file"
        onChange={(e) => handleFileChange(e, field.name)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="flex items-center gap-4 text-left">
        {previews[field.name] ? (
          <img
            src={previews[field.name]}
            alt="preview"
            className="w-16 h-16 rounded-lg object-cover ring-2 ring-white shadow-md"
          />
        ) : (
          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-one transition-colors">
            <Upload size={24} />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-600">
            Click to upload or drag and drop
          </span>
          <span className="text-xs text-slate-400">
            PNG, JPG up to 5MB
          </span>
        </div>
      </div>
    </div>

    {/* الزرار الإضافي */}
    {field.actionButton && (
      <div className="flex md:w-auto w-full">
        {field.actionButton({ formData, setFormData })}
      </div>
    )}
  </div>
)}
                  {field.type === "custom" && field.render && (
  <div className="w-full">
    {field.render({
      value: formData[field.name], // القيمة الحالية
      
      onChange: (newValue) => {
        setFormData((prev) => ({
          ...prev,
          [field.name]: newValue,
        }));
        if (errors[field.name])
          setErrors((prev) => ({
            ...prev,
            [field.name]: "",
          }));
      },

      error: errors[field.name], 
      formData: formData, 
      field: field, 
      
      // 👇 التعديل هنا: لازم نمرر setFormData عشان تقدر تستخدمها في الـ OCR
      setFormData: setFormData, 
    })}

    {errors[field.name] && (
      <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
        <AlertCircle size={14} /> {errors[field.name]}
      </p>
    )}
  </div>
)}
                    {/* Helper Text & Errors */}
                    {field.helperText && !errors[field.name] && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-start">
                        <Info size={12} /> {field.helperText}
                      </p>
                    )}
                    {errors[field.name] && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1 justify-start">
                        <AlertCircle size={14} /> {errors[field.name]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-4 pb-12">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-12 py-3 bg-one text-white rounded-xl font-bold shadow-xl shadow-one/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center gap-3"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPage;
