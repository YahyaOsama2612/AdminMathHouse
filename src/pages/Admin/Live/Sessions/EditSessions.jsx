import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import usePut from "@/hooks/usePut";
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

const EditSessions = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { putData } = usePut(`/api/admin/session/${id}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // 🔹 Fetch existing data and configuration options
  const {
    data: sessionRes,
    loading: sessionLoading,
    error: sessionError,
  } = useGet(`/api/admin/session/${id}`);
  const {
    data: groupData,
    loading: groupLoading,
    error: groupError,
  } = useGet("/api/admin/session/select/groups");
  const {
    data: teachersData,
    loading: teachersLoading,
    error: teachersError,
  } = useGet("/api/admin/session/select/teachers");

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
    lessonsFullDetails: [], // Used to track interactive grid shifts dynamically
    userIds: [],
    session_link: "",
    material_link: "",
    teacher_material_link: "",
    // 💾 Fallback structural fields to preserve loaded categories securely
    initialCategoryId: null,
    initialSubCategoryId: null,
    initialCourseId: null,
  });

  const [errors, setErrors] = useState({});

  // 🔹 Sync database session data carefully to localized state hooks
  useEffect(() => {
    if (sessionRes?.data?.session) {
      const session = sessionRes.data.session;

      const assignmentType = session.type === "private" ? "students" : "group";
      const mappedGroupId = session.groupIds?.[0] || session.groupId || "";

      // Fallback extraction safely parsing details from either root properties or embedded nested items
      const backupLesson = session.lessons?.[0] || {};
      const targetCategoryId =
        session.categoryId || backupLesson.categoryId || null;
      const targetSubCategoryId =
        session.subCategoryId || backupLesson.subCategoryId || targetCategoryId;
      const targetCourseId = session.courseId || backupLesson.courseId || null;

      setFormData({
        name: session.name || "",
        scheduleType: session.scheduleType || "once",
        sessionRelationalType: session.sessionRelationalType || "Explanation",
        assignmentType: assignmentType,
        groupId: mappedGroupId,
        teacherId: session.teacherId || "",
        sessionDate: session.sessionDate
          ? session.sessionDate.split("T")[0]
          : "",
        timeFrom: session.timeFrom || "",
        timeTo: session.timeTo || "",
        startDate: session.startDate ? session.startDate.split("T")[0] : "",
        endDate: session.endDate ? session.endDate.split("T")[0] : "",
        recurringDays: session.recurringDays?.length
          ? session.recurringDays
          : [{ dayOfWeek: "", timeFrom: "", timeTo: "" }],
        lessonIds: session.lessons?.map((l) => l.id) || [],
        lessonsFullDetails: [], // Starts blank, populates cleanly if client alters row selections
        userIds: session.students?.map((s) => s.id) || [],
        session_link: session.session_link || "",
        material_link: session.material_link || "",
        teacher_material_link: session.teacher_material_link || "",
        // Save initial parameters securely so updates do not override blindly to null
        initialCategoryId: targetCategoryId,
        initialSubCategoryId: targetSubCategoryId,
        initialCourseId: targetCourseId,
      });
    }
  }, [sessionRes]);

  // 🔹 Configuration selections mapping arrays
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

  // 🔹 Field change event mutators
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

    if (formData.assignmentType === "group" && !formData.groupId)
      tempErrors.groupId = "Group selection is required";
    if (
      formData.assignmentType === "students" &&
      (!formData.userIds || formData.userIds.length === 0)
    ) {
      tempErrors.userIds = "At least one student must be selected";
    }
    if (!formData.lessonIds || formData.lessonIds.length === 0)
      tempErrors.lessonIds = "At least one lesson must be selected";

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

    // Check if the user interacted/updated lessons to find an updated primary row context
    const dynamicRow =
      formData.lessonsFullDetails?.find((r) => r.categoryId || r.courseId) ||
      {};
    const allChapterIds = Array.from(
      new Set(
        formData.lessonsFullDetails
          ?.flatMap((row) => row.chapterIds || [])
          .filter(Boolean),
      ),
    );

    // 💥 CRITICAL RECONCILIATION: Use newly tracked selector options if available, otherwise preserve loaded parameters!
    const finalCategoryId =
      dynamicRow.categoryId || formData.initialCategoryId || null;
    const finalSubCategoryId =
      dynamicRow.subCategoryId ||
      dynamicRow.categoryId ||
      formData.initialSubCategoryId ||
      finalCategoryId;
    const finalCourseId =
      dynamicRow.courseId || formData.initialCourseId || null;

    const payload = {
      name: formData.name,
      scheduleType: formData.scheduleType,
      teacherId: formData.teacherId,
      type: formData.assignmentType === "group" ? "group" : "private",
      groupIds:
        formData.assignmentType === "group" && formData.groupId
          ? [formData.groupId]
          : [],
      studentIds:
        formData.assignmentType === "students" ? formData.userIds : [],

      // Verified Safe Keys mapping safely back to the database backend API
      categoryId: finalCategoryId,
      subCategoryId: finalSubCategoryId,
      courseId: finalCourseId,
      chapterIds: allChapterIds.length
        ? allChapterIds
        : sessionRes?.data?.session?.chapterIds || [],
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
      await putData(
        payload,
        `/api/admin/session/${id}`,
        "Session updated successfully",
      );
      navigate(-1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading || groupLoading || teachersLoading) return <Loader />;
  if (sessionError || groupError || teachersError) return <Errorpage />;

  return (
    <div className="p-4 bg-[#f8fafc] min-h-screen text-left" dir="ltr">
      {/* Header Banner */}
      <div className="mx-auto mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Edit Session Config
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
        {/* Navigation Tabs bar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
            {["info", "schedule", "content", "links"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`font-bold text-sm py-2 rounded-md transition-all capitalize ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                {tab === "info" && "📝 General Info"}
                {tab === "schedule" && "📅 Schedule"}
                {tab === "content" && "📚 Content & Users"}
                {tab === "links" && "🔗 External Links"}
              </button>
            ))}
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
                  (o) => o.value === formData.scheduleType,
                )}
                onChange={(s) => handleSelectChange("scheduleType", s.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Session Type <span className="text-red-500">*</span>
              </label>
              <Select
                options={sessionRelationalTypeOptions}
                value={sessionRelationalTypeOptions.find(
                  (o) => o.value === formData.sessionRelationalType,
                )}
                onChange={(s) =>
                  handleSelectChange("sessionRelationalType", s.value)
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
                  teacherOptions.find((o) => o.value === formData.teacherId) ||
                  null
                }
                onChange={(s) =>
                  handleSelectChange("teacherId", s ? s.value : "")
                }
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
          {formData.scheduleType === "once" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">
                  Session Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={
                    formData.sessionDate ? new Date(formData.sessionDate) : null
                  }
                  onChange={(d) =>
                    handleSelectChange(
                      "sessionDate",
                      d ? d.toISOString().split("T")[0] : "",
                    )
                  }
                  dateFormat="yyyy-MM-dd"
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
                  From Time <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={parseHMSToDate(formData.timeFrom)}
                  onChange={(d) =>
                    handleSelectChange("timeFrom", formatTimeToHMS(d))
                  }
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeFormat="hh:mm a"
                  dateFormat="hh:mm a"
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
                  To Time <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={parseHMSToDate(formData.timeTo)}
                  onChange={(d) =>
                    handleSelectChange("timeTo", formatTimeToHMS(d))
                  }
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeFormat="hh:mm a"
                  dateFormat="hh:mm a"
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
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={
                      formData.startDate ? new Date(formData.startDate) : null
                    }
                    onChange={(d) =>
                      handleSelectChange(
                        "startDate",
                        d ? d.toISOString().split("T")[0] : "",
                      )
                    }
                    dateFormat="yyyy-MM-dd"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={
                      formData.endDate ? new Date(formData.endDate) : null
                    }
                    onChange={(d) =>
                      handleSelectChange(
                        "endDate",
                        d ? d.toISOString().split("T")[0] : "",
                      )
                    }
                    dateFormat="yyyy-MM-dd"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                  />
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
                          {dayOfWeekOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Time From
                        </label>
                        <DatePicker
                          selected={parseHMSToDate(item.timeFrom)}
                          onChange={(d) => {
                            const next = [...formData.recurringDays];
                            next[idx].timeFrom = formatTimeToHMS(d);
                            handleSelectChange("recurringDays", next);
                          }}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeFormat="hh:mm a"
                          dateFormat="hh:mm a"
                          className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            Time To
                          </label>
                          <DatePicker
                            selected={parseHMSToDate(item.timeTo)}
                            onChange={(d) => {
                              const next = [...formData.recurringDays];
                              next[idx].timeTo = formatTimeToHMS(d);
                              handleSelectChange("recurringDays", next);
                            }}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={15}
                            timeFormat="hh:mm a"
                            dateFormat="hh:mm a"
                            className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none"
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
                (o) => o.value === formData.assignmentType,
              )}
              onChange={(s) => handleSelectChange("assignmentType", s.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 pt-2">
            {formData.assignmentType === "group" ? (
              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-sm font-bold text-slate-700">
                  Select Group <span className="text-red-500">*</span>
                </label>
                <Select
                  options={groupOptions}
                  value={
                    groupOptions.find((o) => o.value === formData.groupId) ||
                    null
                  }
                  onChange={(s) =>
                    handleSelectChange("groupId", s ? s.value : "")
                  }
                />
                {errors.groupId && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.groupId}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-bold text-slate-700">
                  Search & Select Students{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SearchStudents
                  value={formData.userIds}
                  onChange={(val) => handleSelectChange("userIds", val)}
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
                initialLessons={sessionRes?.data?.session?.lessons || []}
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
            {["session_link", "material_link", "teacher_material_link"].map(
              (field) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700 capitalize">
                    {field.replace(/_/g, " ")}
                  </label>
                  <input
                    type="text"
                    name={field}
                    value={formData[field]}
                    onChange={handleInputChange}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/30 outline-none focus:border-one"
                  />
                </div>
              ),
            )}
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
                {" "}
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                <span>Updating Configuration...</span>{" "}
              </>
            ) : (
              <span>Update Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSessions;
