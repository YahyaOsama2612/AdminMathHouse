import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "@/components/HierarchicalLessonSelector";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ArrowLeft, AlertCircle, FileText, Upload, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

// Rendered once per student in the attendance table. Memoized so typing in
// unrelated form fields (name, links, etc.) doesn't re-render every row.
const AttendanceRow = React.memo(function AttendanceRow({
  student,
  index,
  columns,
  completedLessonIds,
}) {
  return (
    <tr className="border-t border-slate-100">
      <td className="p-2 text-slate-500 sticky left-0 bg-white">{index + 1}</td>
      <td className="p-2 font-medium text-slate-700 whitespace-nowrap sticky left-8 bg-white">
        {student.studentName}
      </td>
      {columns.map((col) => (
        <td key={col.id} className="p-2 text-center border-l border-slate-50">
          {completedLessonIds?.has(col.id) ? (
            <span className="text-emerald-500 font-bold">✓</span>
          ) : (
            <span className="text-slate-300 font-bold">✗</span>
          )}
        </td>
      ))}
    </tr>
  );
});

// ================== PDF upload helpers ==================
const MAX_PDF_MB = 10;

// بيرجّع { data: { students: [{ id, name }] } }
const STUDENTS_LOOKUP_URL = "/api/admin/session/select/students";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // "data:application/pdf;base64,...."
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

// value shape: { base64, name, url } | null
//  - base64: ملف جديد اتختار دلوقتي
//  - url: ملف موجود بالفعل جاي من الباك اند (في الـ Edit)
const PdfUploadField = ({ label, hint, value, onChange, compact = false }) => {
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // يسمح باختيار نفس الملف تاني
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
      onChange({ base64, name: file.name, url: null });
    } catch {
      toast.error("Could not read this file, try another one");
    }
  };

  const hasFile = Boolean(value?.base64 || value?.url);

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "" : "w-full"}`}>
      {label && (
        <label className="text-sm font-bold text-slate-700">{label}</label>
      )}
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
          className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-one hover:text-one transition-all ${compact ? "p-2 text-xs" : "p-4 text-sm"}`}
        >
          <Upload size={compact ? 14 : 18} />
          <span className="font-semibold">Upload PDF</span>
        </button>
      )}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
};

// بيحوّل قيمة الـ PdfUploadField لقيمة تتبعت للباك اند:
//  - ملف جديد  → base64
//  - ملف قديم ماتغيرش → undefined (المفتاح مش هيتبعت خالص في JSON)
//  - اتشال     → null
const pdfPayloadValue = (v) => {
  if (v?.base64) return v.base64;
  if (v?.url) return undefined;
  return null;
};
// =========================================================

const AddSessions = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/session");
  const { postData: generateAttendance } = usePost(
    "/api/admin/session/students/attendance",
  );
  const [attendanceData, setAttendanceData] = useState(null);
  const [courseColumns, setCourseColumns] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

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
    assignToGroup: true,
    assignToStudents: false,
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

  // Fetch the members of the currently selected group so they can be displayed
  const {
    data: groupMembersData,
    loading: groupMembersLoading,
    error: groupMembersError,
  } = useGet(
    formData.assignToGroup && formData.groupId
      ? `/api/admin/groups/${formData.groupId}`
      : "",
  );

  const groupMembers = useMemo(() => {
    return (
      groupMembersData?.data?.group?.students ||
      groupMembersData?.data?.students ||
      []
    );
  }, [groupMembersData]);

  // The attendance API sometimes returns studentName: null. Fall back to the
  // name we already have from the group members list, if available.
  const attendanceNameMap = useMemo(() => {
    const map = new Map();
    groupMembers.forEach((s) => {
      const sid = s.id || s.studentId;
      const sname = s.name || s.studentName || s.fullName;
      if (sid && sname) map.set(sid, sname);
    });
    return map;
  }, [groupMembers]);

  // ================== Session PDFs ==================
  const isMistakes = formData.sessionRelationalType === "Mistakes";

  // لأي تايب غير Mistakes: PDF بدون حل + PDF بالحل
  const [sessionPdfs, setSessionPdfs] = useState({
    withoutSolution: null,
    withSolution: null,
  });

  // لتايب Mistakes: PDF لكل طالب → { [studentId]: { base64, name, url } }
  const [mistakesPdfs, setMistakesPdfs] = useState({});

  // أسماء الطلاب اللي اتختاروا من SearchStudents { [id]: name }
  const [searchedStudentNames, setSearchedStudentNames] = useState({});

  // SearchStudents بيبعت الـ ids في أول argument، والطلاب نفسهم (بأساميهم) في التاني
  const handleStudentsChange = (ids, selectedStudents) => {
    handleSelectChange("userIds", ids);
    if (Array.isArray(selectedStudents) && selectedStudents.length) {
      setSearchedStudentNames((prev) => {
        const next = { ...prev };
        selectedStudents.forEach((s) => {
          const sid = s?.id ?? s?.value ?? s?.studentId;
          const sname = s?.name ?? s?.studentName ?? s?.fullName ?? s?.label;
          if (sid && sname) next[sid] = String(sname).trim();
        });
        return next;
      });
    }
  };

  const studentNameMap = useMemo(() => {
    const map = new Map(attendanceNameMap);
    Object.entries(searchedStudentNames).forEach(([sid, sname]) =>
      map.set(sid, sname),
    );
    attendanceData?.forEach((s) => {
      if (s.studentId && s.studentName && s.studentName !== "Unnamed Student")
        map.set(s.studentId, s.studentName);
    });
    return map;
  }, [attendanceNameMap, searchedStudentNames, attendanceData]);

  // كل الطلاب اللي في السيشن (طلاب الجروب + الطلاب المختارين) بدون تكرار
  const mistakesStudents = useMemo(() => {
    const ids = [];
    if (formData.assignToGroup && formData.groupId)
      groupMembers.forEach((s) => ids.push(s.id || s.studentId));
    if (formData.assignToStudents) ids.push(...(formData.userIds || []));
    return [...new Set(ids.filter(Boolean))].map((id) => ({
      id,
      name: studentNameMap.get(id) || "Unknown student",
    }));
  }, [
    formData.assignToGroup,
    formData.groupId,
    formData.assignToStudents,
    formData.userIds,
    groupMembers,
    studentNameMap,
  ]);

  const uploadedMistakesCount = mistakesStudents.filter(
    (s) => mistakesPdfs[s.id]?.base64 || mistakesPdfs[s.id]?.url,
  ).length;

  const buildMistakesPayload = () => {
    const list = [];
    mistakesStudents.forEach((s) => {
      const v = mistakesPdfs[s.id];
      if (v?.base64) list.push({ studentId: s.id, pdf: v.base64 });
    });
    return list;
  };

  // 🔎 لو فيه طلاب في list الـ Mistakes من غير اسم، بنجيب أساميهم من
  // endpoint البحث عن الطلاب ونقارن الـ value (id) بالـ id المختار
  const lookedUpIdsRef = useRef(new Set());
  useEffect(() => {
    if (!isMistakes) return;
    const missing = mistakesStudents
      .map((s) => s.id)
      .filter(
        (sid) => !studentNameMap.has(sid) && !lookedUpIdsRef.current.has(sid),
      );
    if (!missing.length) return;
    missing.forEach((sid) => lookedUpIdsRef.current.add(sid));

    (async () => {
      const pending = new Set(missing);
      const found = {};
      try {
        let page = 1;
        let totalPages = 1;
        do {
          const res = await api.get(STUDENTS_LOOKUP_URL, {
            params: { page, limit: 100 },
          });
          const payload = res?.data?.data || {};
          // الـ endpoint بيرجّع { students: [{ id, name }] }
          const list = payload.students || payload.data || [];
          list.forEach((st) => {
            const sid = st.id ?? st.value;
            const sname = st.name ?? st.label ?? st.nickname ?? "";
            if (pending.has(sid)) {
              found[sid] = String(sname).replace(/\s+/g, " ").trim();
              pending.delete(sid);
            }
          });
          totalPages = payload.pagination?.totalPages || 1;
          page += 1;
        } while (pending.size && page <= totalPages);
      } catch (err) {
        console.error("Failed to load student names", err);
      }
      if (Object.keys(found).length) {
        setSearchedStudentNames((prev) => ({ ...prev, ...found }));
      }
    })();
  }, [isMistakes, mistakesStudents, studentNameMap]);

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

  const handleGenerateAttendance = async () => {
    if (!formData.userIds || formData.userIds.length === 0) {
      toast.error("Please select at least one student first");
      return;
    }

    const primaryRow =
      formData.lessonsFullDetails.find((r) => r.courseId) || {};
    const courseId = primaryRow.courseId || null;

    if (!courseId) {
      toast.error(
        "Please select a course from the lesson hierarchy before generating",
      );
      return;
    }

    try {
      setAttendanceLoading(true);

      // Pull the full curriculum for this course (every chapter and every
      // lesson under it), independent of who attended what, so the table
      // always shows the complete set of lesson columns.
      const chaptersRes = await api.get(
        `/api/admin/session/select/chapter/${courseId}`,
      );
      const chapterList = chaptersRes.data?.data?.chapters || [];

      const lessonResults = await Promise.all(
        chapterList.map((chapter) =>
          api.get(`/api/admin/session/select/lesson/${chapter.id}`),
        ),
      );

      const orderedColumns = chapterList.flatMap((chapter, idx) => {
        const lessons = lessonResults[idx]?.data?.data?.lessons || [];
        return lessons.map((lesson) => ({
          id: lesson.id,
          name: lesson.name,
          chapterId: chapter.id,
          chapterName: chapter.name,
        }));
      });
      setCourseColumns(orderedColumns);

      const res = await generateAttendance(
        {
          studentIds: formData.userIds,
          courseId,
        },
        "/api/admin/session/students/attendance",
        "",
      );

      const students = res?.data?.students || [];
      const normalized = students.map((student) => ({
        ...student,
        studentName:
          student.studentName ||
          attendanceNameMap.get(student.studentId) ||
          "Unnamed Student",
        chapters: student.chapters || [],
      }));

      setAttendanceData(normalized);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to load attendance data",
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Which lessons each student has completed, built from the attendance
  // response. Columns come from courseColumns (the full curriculum fetched
  // for this course), not from this response, so every lesson always shows
  // up even with zero attendance.
  const attendanceByStudent = useMemo(() => {
    const byStudent = {};
    attendanceData?.forEach((student) => {
      const completed = new Set();
      student.chapters?.forEach((chapter) => {
        chapter.lessons?.forEach((lesson) => completed.add(lesson.id));
      });
      byStudent[student.studentId] = completed;
    });
    return byStudent;
  }, [attendanceData]);

  const formatTimeToHMS = (dateObj) => {
    if (!dateObj) return "";
    // بنستخدم UTC هنا عشان الوقت اللي بيتبعت للباك اند يكون دايماً UTC
    // مهما كان التوقيت المحلي بتاع جهاز اليوزر
    const hours = String(dateObj.getUTCHours()).padStart(2, "0");
    const minutes = String(dateObj.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}:00`;
  };

  const parseHMSToDate = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":");
    const d = new Date();
    // القيمة المخزنة (سواء جاية من الباك اند أو اتحطت لسه) بتبقى UTC دايماً،
    // فبنحطها كـ UTC هنا؛ وأي عرض للـ Date ده بتوقيت محلي (زي DatePicker)
    // هيترجمها تلقائي لتوقيت جهاز اليوزر
    d.setUTCHours(parseInt(hours, 10));
    d.setUTCMinutes(parseInt(minutes, 10));
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    return d;
  };

  const validateForm = () => {
    const tempErrors = {};
    if (!formData.name.trim()) tempErrors.name = "Session name is required";
    if (!formData.teacherId) tempErrors.teacherId = "Teacher is required";

    if (!formData.assignToGroup && !formData.assignToStudents) {
      tempErrors.assignmentTarget = "Select at least one of Group or Students";
    }
    if (formData.assignToGroup && !formData.groupId) {
      tempErrors.groupId = "Group selection is required";
    }
    if (
      formData.assignToStudents &&
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

  // 🔹 Step-by-step navigation
  const TABS = ["info", "schedule", "content", "links"];

  const validateStep = (tab) => {
    const tempErrors = {};

    if (tab === "info") {
      if (!formData.name.trim()) tempErrors.name = "Session name is required";
      if (!formData.teacherId) tempErrors.teacherId = "Teacher is required";
    }

    if (tab === "schedule") {
      if (formData.scheduleType === "once") {
        if (!formData.sessionDate)
          tempErrors.sessionDate = "Session date is required";
        if (!formData.timeFrom) tempErrors.timeFrom = "From time is required";
        if (!formData.timeTo) tempErrors.timeTo = "To time is required";
      } else {
        if (!formData.startDate)
          tempErrors.startDate = "Start date is required";
        if (!formData.endDate) tempErrors.endDate = "End date is required";
      }
    }

    if (tab === "content") {
      if (!formData.assignToGroup && !formData.assignToStudents) {
        tempErrors.assignmentTarget =
          "Select at least one of Group or Students";
      }
      if (formData.assignToGroup && !formData.groupId) {
        tempErrors.groupId = "Group selection is required";
      }
      if (
        formData.assignToStudents &&
        (!formData.userIds || formData.userIds.length === 0)
      ) {
        tempErrors.userIds = "At least one student must be selected";
      }
      if (!formData.lessonIds || formData.lessonIds.length === 0) {
        tempErrors.lessonIds = "At least one lesson must be selected";
      }
    }

    setErrors((prev) => ({ ...prev, ...tempErrors }));
    return Object.keys(tempErrors).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!validateStep(activeTab)) {
      toast.error("Please fill all required fields before continuing");
      return;
    }
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1]);
    }
  };

  const handlePrevious = (e) => {
    e.preventDefault();
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1]);
    }
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
        formData.assignToGroup && formData.groupId ? [formData.groupId] : [],
      studentIds: formData.assignToStudents ? formData.userIds : [],

      categoryId: primaryRow.categoryId || null,
      subCategoryId: primaryRow.subCategoryId || primaryRow.categoryId || null,
      courseId: primaryRow.courseId || null,
      chapterIds: allChapterIds,
      lessonIds: formData.lessonIds,

      session_link: formData.session_link || null,
      material_link: formData.material_link || null,
      teacher_material_link: formData.teacher_material_link || null,

      // 📄 PDFs
      ...(isMistakes
        ? { studentMistakesPdfs: buildMistakesPayload() }
        : {
          pdf_without_solution: pdfPayloadValue(sessionPdfs.withoutSolution),
          pdf_with_solution: pdfPayloadValue(sessionPdfs.withSolution),
        }),

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

  if (groupLoading || teachersLoading) return <Loader />;
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
              🔗 Links & PDFs
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
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.assignToGroup}
                  onChange={(e) =>
                    handleSelectChange("assignToGroup", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 text-one focus:ring-one"
                />
                Group
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.assignToStudents}
                  onChange={(e) =>
                    handleSelectChange("assignToStudents", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 text-one focus:ring-one"
                />
                Specific Students
              </label>
            </div>
            {errors.assignmentTarget && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.assignmentTarget}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 pt-2">
            {formData.assignToGroup && (
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

                {formData.groupId && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-xs font-bold text-slate-500 mb-2">
                      Students in this group
                    </p>
                    {groupMembersLoading ? (
                      <p className="text-xs text-slate-400">
                        Loading group students...
                      </p>
                    ) : groupMembersError ? (
                      <p className="text-xs text-red-500">
                        Could not load group students
                      </p>
                    ) : groupMembers.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No students found in this group
                      </p>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              groupMembers.length > 0 &&
                              groupMembers.every((s) =>
                                formData.userIds.includes(s.id || s.studentId),
                              )
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSelectChange("userIds", [
                                  ...new Set([
                                    ...formData.userIds,
                                    ...groupMembers.map(
                                      (s) => s.id || s.studentId,
                                    ),
                                  ]),
                                ]);
                              } else {
                                handleSelectChange(
                                  "userIds",
                                  formData.userIds.filter(
                                    (id) =>
                                      !groupMembers.some(
                                        (s) => (s.id || s.studentId) === id,
                                      ),
                                  ),
                                );
                              }
                            }}
                            className="w-4 h-4"
                          />
                          Select All
                        </label>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                          {groupMembers.map((s) => {
                            const sid = s.id || s.studentId;
                            const sname =
                              s.name || s.studentName || s.fullName || "";
                            const checked = formData.userIds.includes(sid);
                            return (
                              <label
                                key={sid}
                                className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...new Set([...formData.userIds, sid])]
                                      : formData.userIds.filter(
                                        (uid) => uid !== sid,
                                      );
                                    handleSelectChange("userIds", next);
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-one focus:ring-one"
                                />
                                {sname}
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Student search table is always visible so it can be combined with a group */}
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-sm font-bold text-slate-700">
                  Search & Select Students{" "}
                  {formData.assignToStudents && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAttendance}
                  disabled={attendanceLoading || !formData.userIds?.length}
                  className="text-xs font-bold px-3 py-1.5 bg-one/10 text-one rounded-lg hover:bg-one/20 disabled:opacity-50 transition-all"
                >
                  {attendanceLoading ? "Generating..." : "Generate Attendance"}
                </button>
              </div>
              <SearchStudents
                value={formData.userIds}
                onChange={handleStudentsChange}
                error={errors.userIds}
              />

              {attendanceData?.length > 0 && (
                <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                  <p className="text-xs font-bold text-slate-500 px-3 pt-3">
                    Student Attendance / Progress
                  </p>
                  <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-xs border-collapse">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-2 text-left font-bold text-slate-600 whitespace-nowrap sticky left-0 bg-slate-50 z-10">
                            #
                          </th>
                          <th className="p-2 text-left font-bold text-slate-600 whitespace-nowrap sticky left-8 bg-slate-50 z-10">
                            Student Name
                          </th>
                          {courseColumns.map((col) => (
                            <th
                              key={col.id}
                              className="p-2 text-center font-bold text-slate-600 whitespace-nowrap min-w-[115px] border-l border-slate-100"
                            >
                              {/* Render the chapter name styled elegantly directly above the lesson name */}
                              <div className="text-[10px] text-slate-400 font-normal leading-tight mb-0.5 uppercase tracking-wider">
                                Ch: {col.chapterName || "General"}
                              </div>
                              <div className="text-xs text-slate-700 font-bold">
                                {col.name}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {courseColumns.length === 0 ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="p-4 text-center text-sm text-slate-400 italic"
                            >
                              No attendance data available yet for the selected
                              students.
                            </td>
                          </tr>
                        ) : (
                          attendanceData.map((student, idx) => (
                            <AttendanceRow
                              key={student.studentId}
                              student={student}
                              index={idx}
                              columns={courseColumns}
                              completedLessonIds={
                                attendanceByStudent[student.studentId]
                              }
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

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

        {/* Tab 4 (cont.): Session PDFs */}
        <div
          className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 ${activeTab !== "links" ? "hidden" : ""}`}
        >
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-700">
              {isMistakes ? "Mistakes PDF for each student" : "Session PDFs"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isMistakes
                ? "Upload a separate PDF with each student's own mistakes."
                : "Upload the session sheet twice: one without solutions and one with solutions."}
            </p>
          </div>

          {isMistakes ? (
            mistakesStudents.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Choose a group or students in "Content & Users" first, then
                upload each student's PDF here.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500">
                  {uploadedMistakesCount} of {mistakesStudents.length} students
                  have a PDF
                </p>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {mistakesStudents.map((s, idx) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-1 md:grid-cols-[2rem_1fr_minmax(0,22rem)] items-center gap-3 p-3"
                    >
                      <span className="text-xs text-slate-400">{idx + 1}</span>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {s.name}
                      </span>
                      <PdfUploadField
                        compact
                        value={mistakesPdfs[s.id] || null}
                        onChange={(v) =>
                          setMistakesPdfs((prev) => ({ ...prev, [s.id]: v }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PdfUploadField
                label="PDF without solutions"
                value={sessionPdfs.withoutSolution}
                onChange={(v) =>
                  setSessionPdfs((prev) => ({ ...prev, withoutSolution: v }))
                }
              />
              <PdfUploadField
                label="PDF with solutions"
                value={sessionPdfs.withSolution}
                onChange={(v) =>
                  setSessionPdfs((prev) => ({ ...prev, withSolution: v }))
                }
              />
            </div>
          )}
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
          {activeTab !== TABS[0] && (
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="px-8 py-3 text-slate-600 font-bold border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
            >
              Previous
            </button>
          )}

          {activeTab !== TABS[TABS.length - 1] ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-12 py-3 bg-one text-white rounded-xl font-bold shadow-xl shadow-one/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 flex items-center gap-3"
            >
              Next
            </button>
          ) : (
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
          )}
        </div>
      </form>
    </div>
  );
};

export default AddSessions;