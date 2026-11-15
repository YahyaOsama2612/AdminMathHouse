import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import usePut from "@/hooks/usePut";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import api from "@/api/api";
import Errorpage from "@/components/Errorpage";
import { PageHead } from "@/components/admin/kit";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import ManualAttendanceModal from "./ManualAttendanceModal";
import SessionForm from "./parts/SessionForm";
import { FormSkeleton, scrollToFirstError } from "./parts/formKit";

const NO_LESSONS = [];

const EditSessions = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { putData } = usePut(`/api/admin/session/${id}`);
  const { postData: postAttendance } = usePost(
    "/api/admin/session/students/attendance",
  );
  const [commonLessonsData, setCommonLessonsData] = useState(null);
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [openManualAttendance, setOpenManualAttendance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [clearInitialLessons, setClearInitialLessons] = useState(false);
  const manualSession = useMemo(() => ({ id, name: formData.name }), [id, formData.name]);

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

  const handleStudentsChange = (ids) => {
    handleSelectChange("userIds", ids);
    setCommonLessonsData(null);
    setAttendanceStudents([]);
  };

  // 🔹 Sync database session data carefully to localized state hooks
  useEffect(() => {
    if (!sessionRes?.data?.session) return;
    let cancelled = false;
    (async () => {
      const session = sessionRes.data.session;
      // GET /api/admin/session/:id returns groups as [{ id, name }]. The session's students include the
      // group's members, so only students outside the group count as "specific students".
      const loadedGroupIds = session.groupIds?.length
        ? session.groupIds
        : session.groups?.length ? session.groups.map((g) => g.id) : session.groupId ? [session.groupId] : [];
      let groupMemberIds = new Set();
      if (loadedGroupIds.length) {
        try {
          const res = await Promise.all(loadedGroupIds.map((gid) => api.get(`/api/admin/groups/${gid}`)));
          res.forEach((r) => (r.data?.data?.group?.students || r.data?.data?.students || [])
            .forEach((s) => groupMemberIds.add(s.id || s.studentId)));
        } catch { groupMemberIds = new Set((session.students || []).map((s) => s.id)); }
      }
      if (cancelled) return;
      const directStudents = (session.students || []).filter((s) => !groupMemberIds.has(s.id));
      const linkedExam = session.materials?.find(
        (material) => material.source === "exam",
      );
      const sessionExamId =
        session.examId || session.exam?.id || linkedExam?.sourceId || "";
      const sessionType =
        session.sessionRelationalType ||
        (sessionExamId ? "Exam" : "Explanation");
      const sessionIsExam = sessionType === "Exam";

      const hasGroup = loadedGroupIds.length > 0;
      const hasStudents = directStudents.length > 0;
      const mappedGroupId = loadedGroupIds[0] || "";

      // The lessons the session API returns nest course/category/chapter as
      // objects (e.g. lesson.course.id), not flat lesson.courseId fields.
      const backupLesson = session.lessons?.[0] || {};
      const targetCategoryId =
        session.categoryId || session.category?.id || backupLesson.category?.id || null;
      const targetSubCategoryId =
        session.subCategoryId ||
        session.subCategory?.id ||
        backupLesson.subcategory?.id ||
        (sessionIsExam ? null : targetCategoryId);
      const targetCourseId =
        session.courseId || session.course?.id || backupLesson.course?.id || null;

      // Build an initial hierarchy "row" from the loaded lessons so the
      // course/category context is available right away, without requiring
      // the user to re-touch the Lesson Hierarchy selector before generating
      // attendance or saving.
      const initialChapterIds = Array.from(
        new Set(
          (session.lessons || []).map((l) => l.chapter?.id).filter(Boolean),
        ),
      );
      const initialLessonsFullDetails =
        !sessionIsExam && (targetCourseId || targetCategoryId)
          ? [
            {
              categoryId: targetCategoryId,
              subCategoryId: targetSubCategoryId,
              courseId: targetCourseId,
              chapterIds: initialChapterIds,
              lessonIds: sessionIsExam
                ? []
                : session.lessons?.map((l) => l.id) || [],
            },
          ]
          : [];

      setFormData({
        name: session.name || "",
        scheduleType: session.scheduleType || "once",
        sessionRelationalType: sessionType,
        examId: sessionExamId,
        examCategoryId: targetCategoryId || "",
        examSubCategoryId: targetSubCategoryId || "",
        examCourseId: targetCourseId || "",
        // Default to Group when neither is present, matching prior behavior
        assignToGroup: hasGroup || !hasStudents,
        assignToStudents: hasStudents,
        groupId: mappedGroupId,
        teacherId: session.teacherId || "",
        sessionDate: session.sessionDate
          ? session.sessionDate.split("T")[0]
          : "",
        // الوقت جاي صح من الباك اند، فبيتحط في الفورم زي ما هو
        timeFrom: session.timeFrom || "",
        timeTo: session.timeTo || "",
        startDate: session.startDate ? session.startDate.split("T")[0] : "",
        endDate: session.endDate ? session.endDate.split("T")[0] : "",
        recurringDays: session.recurringDays?.length
          ? session.recurringDays
          : [{ dayOfWeek: "", timeFrom: "", timeTo: "" }],
        lessonIds: session.lessons?.map((l) => l.id) || [],
        lessonsFullDetails: initialLessonsFullDetails, // pre-filled from loaded session data
        userIds: directStudents.map((s) => s.id),
        session_link: session.session_link || "",
        material_link: session.material_link || "",
        teacher_material_link: session.teacher_material_link || "",
        // Save initial parameters securely so updates do not override blindly to null
        initialCategoryId: targetCategoryId,
        initialSubCategoryId: targetSubCategoryId,
        initialCourseId: targetCourseId,
      });
    })();
    return () => { cancelled = true; };
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

  const handleSessionTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      sessionRelationalType: value,
      ...(value === "Exam" ? { lessonIds: [], lessonsFullDetails: [] } : {}),
    }));
    setCommonLessonsData(null);
    setAttendanceStudents([]);
    setErrors((prev) => ({ ...prev, examId: "", lessonIds: "" }));
    if (value === "Exam") setClearInitialLessons(true);
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

    const dynamicRow =
      formData.lessonsFullDetails?.find((r) => r.courseId) || {};
    const courseId = dynamicRow.courseId || formData.initialCourseId || null;

    if (!courseId) {
      toast.error(
        "Please select a course from the lesson hierarchy before generating",
      );
      return;
    }

    try {
      setAttendanceLoading(true);

      const res = await postAttendance(
        { studentIds: formData.userIds, courseId },
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
    if (formData.assignToGroup && !formData.groupId)
      tempErrors.groupId = "Group selection is required";
    if (
      formData.assignToStudents &&
      (!formData.userIds || formData.userIds.length === 0)
    ) {
      tempErrors.userIds = "At least one student must be selected";
    }
    if (
      !isExamSession &&
      (!formData.lessonIds || formData.lessonIds.length === 0)
    )
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
      toast.error("Please fill all required fields correctly");
      scrollToFirstError();
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
      sessionRelationalType: formData.sessionRelationalType,
      ...(formData.sessionRelationalType === "Exam"
        ? { examId: formData.examId }
        : {}),
      // 🔹 type reflects which audiences are assigned; backend accepts groupIds/studentIds together
      type:
        formData.assignToGroup && formData.assignToStudents
          ? "mixed"
          : formData.assignToGroup
            ? "group"
            : "private",
      groupIds:
        formData.assignToGroup && formData.groupId ? [formData.groupId] : [],
      studentIds: formData.assignToStudents ? formData.userIds : [],

      // Verified Safe Keys mapping safely back to the database backend API
      categoryId: isExamSession
        ? formData.examCategoryId || null
        : finalCategoryId,
      subCategoryId: isExamSession
        ? formData.examSubCategoryId || null
        : finalSubCategoryId,
      courseId: isExamSession
        ? formData.examCourseId || null
        : finalCourseId,
      chapterIds: isExamSession
        ? []
        : allChapterIds.length
          ? allChapterIds
          : sessionRes?.data?.session?.chapterIds || [],
      lessonIds: isExamSession ? [] : formData.lessonIds,

      session_link: formData.session_link || null,
      material_link: formData.material_link || null,
      teacher_material_link: formData.teacher_material_link || null,

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
      await putData(
        payload,
        `/api/admin/session/${id}`,
        "Session updated successfully",
      );
      navigate("/admin/live/sessions");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionError || groupError || teachersError) return <Errorpage />;

  const head = (
    <PageHead title="Edit session" sub={formData.name ? `Changing “${formData.name}”. Students see the changes on their schedule.` : "Change the type, time, students and lessons of this session."}>
      <button type="button" onClick={() => navigate(-1)} className="a-btn">
        <ArrowLeft size={16} /> Back
      </button>
    </PageHead>
  );
  if (sessionLoading || groupLoading || teachersLoading) return <div>{head}<FormSkeleton /></div>;

  return (
    <div>
      {head}

      <SessionForm
        mode="edit"
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
        groupMembers={groupMembers}
        groupMembersLoading={groupMembersLoading}
        groupMembersError={groupMembersError}
        groupMembersSelectable={false}
        onGenerateAttendance={handleGenerateAttendance}
        attendanceLoading={attendanceLoading}
        commonLessonsData={commonLessonsData}
        attendanceStudents={attendanceStudents}
        attendanceNameMap={attendanceNameMap}
        onManualAttendance={() => setOpenManualAttendance(true)}
        initialLessons={clearInitialLessons ? NO_LESSONS : sessionRes?.data?.session?.lessons || NO_LESSONS}
        isSubmitting={isSubmitting}
        onSubmit={onSave}
        onCancel={() => navigate(-1)}
      />

      <ManualAttendanceModal
        open={openManualAttendance}
        onClose={() => setOpenManualAttendance(false)}
        initialSession={manualSession}
      />
    </div>
  );
};

export default EditSessions;
