import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "@/components/HierarchicalLessonSelector";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const AddSessions = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/session");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const {
    data: groupData,
    loading: grouploading,
    error: groupError,
  } = useGet("/api/admin/session/select/groups");

  const {
    data: teachersData,
    loading: teachersloading,
    error: teachersError,
  } = useGet("/api/admin/session/select/teachers");

  const groupOptions = useMemo(
    () =>
      groupData?.data?.groups.map((item) => ({
        value: item.id,
        label: item.name,
      })) || [],
    [groupData],
  );

  const teacherOptions = useMemo(
    () =>
      teachersData?.data?.teachers.map((item) => ({
        value: item.id,
        label: item.name,
      })) || [],
    [teachersData],
  );

  const scheduleTypeOptions = [
    { value: "once", label: "Once" },
    { value: "repeat", label: "Repeat" },
  ];

  const assignmentTypeOptions = [
    { value: "group", label: "Assign to Group" },
    { value: "students", label: "Assign to Specific Students" },
  ];

  const sessionRelationalTypeOptions = [
    { value: "Explanation", label: "Explanation" },
    { value: "Re-Explanation", label: "Re-Explanation" },
    { value: "Mistakes", label: "Mistakes" },
    { value: "Exam", label: "Exam" },
  ];

  const dayOfWeekOptions = [
    { value: "Sunday", label: "Sunday" },
    { value: "Monday", label: "Monday" },
    { value: "Tuesday", label: "Tuesday" },
    { value: "Wednesday", label: "Wednesday" },
    { value: "Thursday", label: "Thursday" },
    { value: "Friday", label: "Friday" },
    { value: "Saturday", label: "Saturday" },
  ];

  const [formData, setFormData] = useState({
    name: "",
    scheduleType: "once",
    sessionRelationalType: "Explanation",
    assignmentType: "group",
    groupId: "",
    teacherId: "",
    sessionDate: "",
    timeFrom: "",
    timeTo: "",
    startDate: "",
    endDate: "",
    recurringDays: [{ dayOfWeek: "", timeFrom: "", timeTo: "" }],
    lessonIds: [],
    lessonsFullDetails: [],
    userIds: [],
    session_link: "",
    material_link: "",
    teacher_material_link: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleHierarchyChange = (ids, fullDetails) => {
    setFormData((prev) => ({
      ...prev,
      lessonIds: ids || [],
      lessonsFullDetails: fullDetails || [],
    }));
    // تم تصحيح الخطأ هنا بتحويل lessonIds إلى دلالة نصية سليمة داخل الـ Check
    if (errors.lessonIds) setErrors((prev) => ({ ...prev, lessonIds: "" }));
  };

  const formatTimeToHMS = (dateObj) => {
    if (!dateObj) return "";
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}:00`;
  };

  const parseHMSToDate = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(hours, 10));
    d.setMinutes(parseInt(minutes, 10));
    d.setSeconds(0);
    return d;
  };

  const validateForm = () => {
    const tempErrors = {};
    if (!formData.name.trim()) tempErrors.name = "Session name is required";
    if (!formData.teacherId) tempErrors.teacherId = "Teacher is required";

    if (formData.assignmentType === "group" && !formData.groupId) {
      tempErrors.groupId = "Group selection is required";
    }
    if (
      formData.assignmentType === "students" &&
      (!formData.userIds || formData.userIds.length === 0)
    ) {
      tempErrors.userIds = "At least one student must be selected";
    }

    if (!formData.lessonIds || formData.lessonIds.length === 0) {
      tempErrors.lessonIds = "At least one lesson must be selected";
    }

    if (formData.scheduleType === "once") {
      if (!formData.sessionDate)
        tempErrors.sessionDate = "Session date is required";
      if (!formData.timeFrom) tempErrors.timeFrom = "From time is required";
      if (!formData.timeTo) tempErrors.timeTo = "To time is required";
    } else {
      if (!formData.startDate) tempErrors.startDate = "Start date is required";
      if (!formData.endDate) tempErrors.endDate = "End date is required";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill all required fields correctly across tabs");
      return;
    }

    const primaryRow =
      formData.lessonsFullDetails.find((r) => r.categoryId || r.courseId) || {};

    const allChapterIds = Array.from(
      new Set(
        formData.lessonsFullDetails
          .flatMap((row) => row.chapterIds || [])
          .filter(Boolean),
      ),
    );

    const payload = {
      name: formData.name,
      scheduleType: formData.scheduleType,
      teacherId: formData.teacherId,
      groupIds:
        formData.assignmentType === "group" && formData.groupId
          ? [formData.groupId]
          : [],
      studentIds:
        formData.assignmentType === "students" ? formData.userIds : [],

      categoryId: primaryRow.categoryId || null,
      subCategoryId: primaryRow.subCategoryId || primaryRow.categoryId || null,
      courseId: primaryRow.courseId || null,
      chapterIds: allChapterIds,
      lessonIds: formData.lessonIds,

      session_link: formData.session_link || null,
      material_link: formData.material_link || null,
      teacher_material_link: formData.teacher_material_link || null,

      ...(formData.scheduleType === "once"
        ? {
            sessionDate: formData.sessionDate,
            timeFrom: formData.timeFrom,
            timeTo: formData.timeTo,
            sessionRelationalType: formData.sessionRelationalType,
          }
        : {
            startDate: formData.startDate,
            endDate: formData.endDate,
            recurringDays: formData.recurringDays.filter(
              (d) => d.dayOfWeek && d.timeFrom && d.timeTo,
            ),
          }),
    };

    try {
      setIsSubmitting(true);
      await postData(
        payload,
        "/api/admin/session",
        "Session saved successfully",
      );
      navigate(-1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (grouploading || teachersloading) return <Loader />;
  if (groupError || teachersError) return <Errorpage />;

  return (
    <div className="p-4 bg-[#f8fafc] min-h-screen text-left" dir="ltr">
      {/* Header */}
      <div className="mx-auto mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Add Session Config
        </h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center w-fit gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        {/* Navigation Tabs */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`font-bold text-sm py-2 rounded-md transition-all ${activeTab === "info" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              📝 General Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className={`font-bold text-sm py-2 rounded-md transition-all ${activeTab === "schedule" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              📅 Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`font-bold text-sm py-2 rounded-md transition-all ${activeTab === "content" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              📚 Content & Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("links")}
              className={`font-bold text-sm py-2 rounded-md transition-all ${activeTab === "links" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              🔗 External Links
            </button>
          </div>
        </div>

        {/* Tab 1: General Info */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 ${activeTab !== "info" ? "hidden" : ""}`}
        >
          <h2 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-2">
            Session Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Session Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`p-3 rounded-xl border bg-slate-50/30 outline-none transition-all ${errors.name ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-one"}`}
                placeholder="e.g. Algebra Intensive Review"
              />
              {errors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Schedule Type <span className="text-red-500">*</span>
              </label>
              <Select
                options={scheduleTypeOptions}
                value={scheduleTypeOptions.find(
                  (opt) => opt.value === formData.scheduleType,
                )}
                onChange={(selected) =>
                  handleSelectChange("scheduleType", selected.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Session Type <span className="text-red-500">*</span>
              </label>
              <Select
                options={sessionRelationalTypeOptions}
                value={sessionRelationalTypeOptions.find(
                  (opt) => opt.value === formData.sessionRelationalType,
                )}
                onChange={(selected) =>
                  handleSelectChange("sessionRelationalType", selected.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Teacher <span className="text-red-500">*</span>
              </label>
              <Select
                options={teacherOptions}
                value={
                  teacherOptions.find(
                    (opt) => opt.value === formData.teacherId,
                  ) || null
                }
                onChange={(selected) =>
                  handleSelectChange(
                    "teacherId",
                    selected ? selected.value : "",
                  )
                }
                placeholder="Select Teacher..."
              />
              {errors.teacherId && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.teacherId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab 2: Schedule */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 ${activeTab !== "schedule" ? "hidden" : ""}`}
        >
          <h2 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-2">
            Timing Configuration
          </h2>

          {formData.scheduleType === "once" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">
                  Session Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  minDate={new Date()}
                  selected={
                    formData.sessionDate ? new Date(formData.sessionDate) : null
                  }
                  onChange={(date) =>
                    handleSelectChange(
                      "sessionDate",
                      date ? date.toISOString().split("T")[0] : "",
                    )
                  }
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select Date"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                />
                {errors.sessionDate && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.sessionDate}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">
                  From Time (AM/PM) <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={parseHMSToDate(formData.timeFrom)}
                  onChange={(date) =>
                    handleSelectChange("timeFrom", formatTimeToHMS(date))
                  }
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeFormat="hh:mm a"
                  dateFormat="hh:mm a"
                  placeholderText="Select start time"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                />
                {errors.timeFrom && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.timeFrom}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">
                  To Time (AM/PM) <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={parseHMSToDate(formData.timeTo)}
                  onChange={(date) =>
                    handleSelectChange("timeTo", formatTimeToHMS(date))
                  }
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeFormat="hh:mm a"
                  dateFormat="hh:mm a"
                  placeholderText="Select end time"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                />
                {errors.timeTo && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.timeTo}
                  </p>
                )}
              </div>
            </div>
          )}

          {formData.scheduleType === "repeat" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    minDate={new Date()}
                    selected={
                      formData.startDate ? new Date(formData.startDate) : null
                    }
                    onChange={(date) =>
                      handleSelectChange(
                        "startDate",
                        date ? date.toISOString().split("T")[0] : "",
                      )
                    }
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Recurring start date"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                  />
                  {errors.startDate && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    minDate={new Date()}
                    selected={
                      formData.endDate ? new Date(formData.endDate) : null
                    }
                    onChange={(date) =>
                      handleSelectChange(
                        "endDate",
                        date ? date.toISOString().split("T")[0] : "",
                      )
                    }
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Recurring end date"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                  />
                  {errors.endDate && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-slate-700">
                  Recurring Days Setup
                </label>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {formData.recurringDays.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white p-3 rounded-lg border border-slate-100 shadow-sm"
                    >
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Day of Week
                        </label>
                        <select
                          value={item.dayOfWeek}
                          onChange={(e) => {
                            const next = [...formData.recurringDays];
                            next[idx].dayOfWeek = e.target.value;
                            handleSelectChange("recurringDays", next);
                          }}
                          className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-sm outline-none"
                        >
                          <option value="">Select Day...</option>
                          {dayOfWeekOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Time From (AM/PM)
                        </label>
                        <DatePicker
                          selected={parseHMSToDate(item.timeFrom)}
                          onChange={(date) => {
                            const next = [...formData.recurringDays];
                            next[idx].timeFrom = formatTimeToHMS(date);
                            handleSelectChange("recurringDays", next);
                          }}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeFormat="hh:mm a"
                          dateFormat="hh:mm a"
                          placeholderText="Select time"
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white text-sm outline-none"
                        />
                      </div>

                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            Time To (AM/PM)
                          </label>
                          <DatePicker
                            selected={parseHMSToDate(item.timeTo)}
                            onChange={(date) => {
                              const next = [...formData.recurringDays];
                              next[idx].timeTo = formatTimeToHMS(date);
                              handleSelectChange("recurringDays", next);
                            }}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={15}
                            timeFormat="hh:mm a"
                            dateFormat="hh:mm a"
                            placeholderText="Select time"
                            className="w-full p-2 rounded-lg border border-slate-200 bg-white text-sm outline-none"
                          />
                        </div>
                        {formData.recurringDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = formData.recurringDays.filter(
                                (_, i) => i !== idx,
                              );
                              handleSelectChange("recurringDays", next);
                            }}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg mt-5"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectChange("recurringDays", [
                        ...formData.recurringDays,
                        { dayOfWeek: "", timeFrom: "", timeTo: "" },
                      ])
                    }
                    className="text-xs font-bold text-one hover:underline mt-1"
                  >
                    + Add Another Day
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab 3: Content and Audience */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 ${activeTab !== "content" ? "hidden" : ""}`}
        >
          <h2 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-2">
            Target & Study Scope
          </h2>

          <div className="flex flex-col gap-1.5 max-w-md">
            <label className="text-sm font-bold text-slate-700">
              Assign Session To <span className="text-red-500">*</span>
            </label>
            <Select
              options={assignmentTypeOptions}
              value={assignmentTypeOptions.find(
                (opt) => opt.value === formData.assignmentType,
              )}
              onChange={(selected) =>
                handleSelectChange("assignmentType", selected.value)
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 pt-2">
            {formData.assignmentType === "group" && (
              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-sm font-bold text-slate-700">
                  Select Group <span className="text-red-500">*</span>
                </label>
                <Select
                  options={groupOptions}
                  value={
                    groupOptions.find(
                      (opt) => opt.value === formData.groupId,
                    ) || null
                  }
                  onChange={(selected) =>
                    handleSelectChange(
                      "groupId",
                      selected ? selected.value : "",
                    )
                  }
                  placeholder="Choose Target Group..."
                />
                {errors.groupId && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.groupId}
                  </p>
                )}
              </div>
            )}

            {formData.assignmentType === "students" && (
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-bold text-slate-700">
                  Search & Select Students{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SearchStudents
                  value={formData.userIds}
                  onChange={(value) => handleSelectChange("userIds", value)}
                  error={errors.userIds}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5 w-full border-t border-slate-100 pt-4">
              <label className="text-sm font-bold text-slate-700 mb-2">
                Lesson Hierarchy Selection{" "}
                <span className="text-red-500">*</span>
              </label>
              <HierarchicalLessonSelector
                value={formData.lessonIds}
                onChange={handleHierarchyChange}
              />
              {errors.lessonIds && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle size={14} />
                  {errors.lessonIds}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab 4: External Links */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 ${activeTab !== "links" ? "hidden" : ""}`}
        >
          <h2 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-2">
            Virtual Integration & Materials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Live Session Link
              </label>
              <input
                type="text"
                name="session_link"
                value={formData.session_link}
                onChange={handleInputChange}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                placeholder="https://zoom.us/j/..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Student Material Link
              </label>
              <input
                type="text"
                name="material_link"
                value={formData.material_link}
                onChange={handleInputChange}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Teacher Material Link
              </label>
              <input
                type="text"
                name="teacher_material_link"
                value={formData.teacher_material_link}
                onChange={handleInputChange}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-4 pt-4 pb-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-12 py-3 bg-one text-white rounded-xl font-bold shadow-xl shadow-one/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 flex items-center gap-3"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving Configuration...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSessions;
