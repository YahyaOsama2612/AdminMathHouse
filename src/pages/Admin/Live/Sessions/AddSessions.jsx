import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/api";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Errorpage from "@/components/Errorpage";
import { PageHead } from "@/components/admin/kit";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import SessionForm from "./parts/SessionForm";
import { FormSkeleton, scrollToFirstError } from "./parts/formKit";

const AddSessions = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/session");
  const { postData: generateAttendance } = usePost(
    "/api/admin/session/students/attendance",
  );
  const [commonLessonsData, setCommonLessonsData] = useState(null);
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [formData, setFormData] = useState({
    name: "",
    scheduleType: "once",
    sessionRelationalType: "Explanation",
    examId: "",
    examCategoryId: "",
    examSubCategoryId: "",
    examCourseId: "",
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

  const isExamSession = formData.sessionRelationalType === "Exam";

  // ── Lessons the students have in common (group or 2+ students) — no course / chapter to pick ──
  // the students the lessons are matched for: the group members you ticked (none ticked = the whole
  // group) plus the students picked by name
  const audienceIds = useMemo(() => {
    const ids = new Set();
    if (formData.assignToGroup && formData.groupId) {
      const members = groupMembers.map((s) => s.id || s.studentId).filter(Boolean);
      const ticked = members.filter((id) => formData.userIds.includes(id));
      (ticked.length ? ticked : members).forEach((id) => ids.add(id));
    }
    if (formData.assignToStudents) formData.userIds.forEach((id) => ids.add(id));
    return [...ids].filter(Boolean);
  }, [formData.assignToGroup, formData.groupId, formData.assignToStudents, formData.userIds, groupMembers]);
  const audienceKey = [...audienceIds].sort().join("|");
  const sharedAvailable = !isExamSession && audienceIds.length >= 2;
  const [commonOn, setCommonOn] = useState(true);
  const [common, setCommon] = useState({ data: null, loading: false, error: "" });
  useEffect(() => {
    if (!sharedAvailable) { setCommon({ data: null, loading: false, error: "" }); return undefined; }
    let alive = true;
    setCommon((c) => ({ ...c, loading: true, error: "" }));
    const t = setTimeout(() => {
      api.post("/api/admin/session/common-lessons", { studentIds: audienceIds })
        .then((r) => alive && setCommon({ data: r.data?.data || null, loading: false, error: "" }))
        .catch((e) => alive && setCommon({ data: null, loading: false, error: e?.response?.data?.error?.message || e.message }));
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [audienceKey, sharedAvailable]); // audienceKey stands for the group + picked students
  // a new audience → back to its common lessons (lessons picked for the old one may not be shared)
  useEffect(() => {
    if (!sharedAvailable) return;
    setCommonOn(true);
    setFormData((prev) => (prev.lessonIds.length ? { ...prev, lessonIds: [], lessonsFullDetails: [] } : prev));
  }, [audienceKey, sharedAvailable]);
  const setCommonMode = (on) => {
    setCommonOn(on);
    setFormData((prev) => ({ ...prev, lessonIds: [], lessonsFullDetails: [] }));
  };

  const handleStudentsChange = (ids) => {
    handleSelectChange("userIds", ids);
    setCommonLessonsData(null);
    setAttendanceStudents([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSessionTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      sessionRelationalType: value,
      ...(value === "Exam" ? { lessonIds: [], lessonsFullDetails: [] } : {}),
    }));
    setCommonLessonsData(null);
    setAttendanceStudents([]);
    setErrors((prev) => ({ ...prev, examId: "", lessonIds: "" }));
  };

  const handleExamCourseChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "examCategoryId"
        ? { examSubCategoryId: "", examCourseId: "" }
        : field === "examSubCategoryId"
          ? { examCourseId: "" }
          : {}),
    }));
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

      const res = await generateAttendance(
        {
          studentIds: formData.userIds,
          courseId,
        },
        "/api/admin/session/students/attendance",
        "",
      );

      const common = res?.data?.commonLessons || res?.commonLessons || [];
      const students = res?.data?.students || res?.students || [];

      setCommonLessonsData(common);
      setAttendanceStudents(students);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to load attendance data",
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  const validateForm = () => {
    const tempErrors = {};
    if (!formData.name.trim()) tempErrors.name = "Session name is required";
    if (!formData.teacherId) tempErrors.teacherId = "Teacher is required";
    if (formData.sessionRelationalType === "Exam" && !formData.examId) {
      tempErrors.examId = "Select an exam for this session";
    }

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

    if (
      !isExamSession &&
      (!formData.lessonIds || formData.lessonIds.length === 0)
    ) {
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
      toast.error("Please fill all required fields correctly");
      scrollToFirstError();
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
      sessionRelationalType: formData.sessionRelationalType,
      ...(formData.sessionRelationalType === "Exam"
        ? { examId: formData.examId }
        : {}),
      groupIds:
        formData.assignToGroup && formData.groupId ? [formData.groupId] : [],
      studentIds: formData.assignToStudents ? formData.userIds : [],

      categoryId: isExamSession
        ? formData.examCategoryId || null
        : primaryRow.categoryId || null,
      subCategoryId: isExamSession
        ? formData.examSubCategoryId || null
        : primaryRow.subCategoryId || primaryRow.categoryId || null,
      courseId: isExamSession
        ? formData.examCourseId || null
        : primaryRow.courseId || null,
      chapterIds: isExamSession ? [] : allChapterIds,
      lessonIds: isExamSession ? [] : formData.lessonIds,
      session_link: formData.session_link.trim() || null,

      ...(formData.scheduleType === "once"
        ? {
          sessionDate: formData.sessionDate,
          timeFrom: formData.timeFrom,
          timeTo: formData.timeTo,
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
      navigate("/admin/live/sessions");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (groupError || teachersError) return <Errorpage />;

  const head = (
    <PageHead title="Add session" sub="Pick the type, time, students and lessons — the students see it on their schedule.">
      <button type="button" onClick={() => navigate(-1)} className="a-btn">
        <ArrowLeft size={16} /> Back
      </button>
    </PageHead>
  );
  if (groupLoading || teachersLoading) return <div>{head}<FormSkeleton /></div>;

  return (
    <div>
      {head}

      <SessionForm
        mode="add"
        formData={formData}
        errors={errors}
        teacherOptions={teacherOptions}
        groupOptions={groupOptions}
        onInput={handleInputChange}
        onSelect={handleSelectChange}
        onSessionType={handleSessionTypeChange}
        onExamCourse={handleExamCourseChange}
        onHierarchy={handleHierarchyChange}
        onStudents={handleStudentsChange}
        isExamSession={isExamSession}
        minDate={new Date()}
        groupMembers={groupMembers}
        groupMembersLoading={groupMembersLoading}
        groupMembersError={groupMembersError}
        groupMembersSelectable
        onGenerateAttendance={handleGenerateAttendance}
        attendanceLoading={attendanceLoading}
        commonLessonsData={commonLessonsData}
        attendanceStudents={attendanceStudents}
        attendanceNameMap={attendanceNameMap}
        commonLessons={{ on: sharedAvailable && commonOn, setOn: setCommonMode, available: sharedAvailable, ...common }}
        isSubmitting={isSubmitting}
        onSubmit={onSave}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};

export default AddSessions;
