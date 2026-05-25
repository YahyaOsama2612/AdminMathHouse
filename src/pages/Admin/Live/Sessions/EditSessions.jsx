import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "../../../../components/HierarchicalLessonSelector";
import { toast } from "react-hot-toast";

const EditSessions = () => {
  const navigate = useNavigate();
  const { id } = useParams();


  // 🔹 Update session hook
  const { putData, loading: saving } = usePut(`/api/admin/session/${id}`);

  // 🔹 Get specific session data
  const { data: sessionRes, loading: sessionLoading, error: sessionError } =
    useGet(`/api/admin/session/${id}`);

  // 🔹 Get select options
  const { data: groupData, loading: groupLoading, error: groupError } =
    useGet("/api/admin/session/select/groups");

  const { data: teachersData, loading: teachersLoading, error: teachersError } =
    useGet("/api/admin/session/select/teachers");

    const session = sessionRes?.data?.session || {};
  // تهيئة التاريخ ليناسب حقل إدخال التاريخ (YYYY-MM-DD)
  const formattedDate = session.sessionDate ? session.sessionDate.split("T")[0] : "";
  const groupOptions = useMemo(
    () => groupData?.data?.groups.map((item) => ({ value: item.id, label: item.name })) || [],
    [groupData]
  );

  const teacherOptions = useMemo(
    () => teachersData?.data?.teachers.map((item) => ({ value: item.id, label: item.name })) || [],
    [teachersData]
  );

  const typeOptions = [
    { value: "group", label: "Group" },
    { value: "private", label: "Private" },
  ];

  const sessionRelationalTypeOptions = [
    { value: "Explanation", label: "Explanation" },
    { value: "Re-Explanation", label: "Re-Explanation" },
    { value: "Mistakes", label: "Mistakes" },
    { value: "Exam", label: "Exam" },
  ];

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Session Name",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "sessionRelationalType",
        label: "Session Type",
        options: sessionRelationalTypeOptions,
        type: "select",
        required: true,
        section: "General Information",
      },
      {
        name: "sessionDate",
        label: "Session Date",
        type: "date",
        required: true,
        section: "General Information",
        helperText: "YYYY-MM-DD",
      },
      {
        name: "timeFrom",
        label: "From",
        type: "time",
        required: true,
        section: "General Information",
      },
      {
        name: "timeTo",
        label: "To",
        type: "time",
        required: true,
        section: "General Information",
      },
      {
        name: "session_link",
        label: "Session Link",
        type: "text",
        section: "Links",
      },
      {
        name: "material_link",
        label: "Material Link",
        type: "text",
        section: "Links",
      },
      {
        name: "teacher_material_link",
        label: "Teacher Material Link",
        type: "text",
        section: "Links",
      },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: typeOptions,
        section: "General Information",
      },
      {
        name: "groupId",
        label: "Group",
        type: "select",
        options: groupOptions,
        section: "General Information",
      },
      {
        name: "teacherId",
        label: "Teacher",
        type: "select",
        required: true,
        options: teacherOptions,
        section: "General Information",
      },
      {
        name: "lessonIds",
        label: "Lesson Selection",
        fullWidth: true,
        type: "custom",
        section: "General Information",
        defaultValue: [],
        render: ({ value, onChange, error }) => (
          <HierarchicalLessonSelector 
          
          initialLessons={session?.lessons || []}
          value={value || []} onChange={onChange} />
        ),
      },
      {
        name: "userIds",
        label: "Students",
        fullWidth: true,
        type: "custom",
        render: ({ value, onChange, error }) => (
          <SearchStudents 
          value={value} onChange={onChange} error={error} />
        ),
      },
    ],
    [groupOptions, teacherOptions ,session]
  );

  const onSave = async (formData) => {
    // 1. التأكد من المجموعة لو النوع Group
    if (formData.type === "group" && !formData.groupId)
      return toast.error("Please select a group");

    // 2. التأكد من الطلاب لو النوع Private 
    if (formData.type === "private" && (!formData.userIds || formData.userIds.length === 0)) {
      return toast.error("Please select at least one student");
    }

    // 3. التأكد من اختيار دروس على الأقل
    if (!formData.lessonIds || formData.lessonIds.length === 0) {
      return toast.error("Please select at least one lesson");
    }

    const payload = {
      ...formData,
      studentIds: formData.userIds || [],
      lessonIds: formData.lessonIds || [],
    };

    try {
      await putData(payload, `/api/admin/session/${id}`, "Session updated successfully");
      navigate(-1);
    } catch (e) {
     throw e
    }
  };

  if (sessionLoading || groupLoading || teachersLoading ) return <Loader />;
  if (sessionError || groupError || teachersError) return <Errorpage />;


  return (
    <AddPage
      title="Edit Session"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{
        name: session.name || "",
        sessionRelationalType: session.sessionRelationalType || "",
        sessionDate: formattedDate,
        timeFrom: session.timeFrom || "",
        timeTo: session.timeTo || "",
        session_link: session.session_link || "",
        material_link: session.material_link || "",
        teacher_material_link: session.teacher_material_link || "",
        type: session.type || "",
        groupId: session.groupId || "",
        teacherId: session.teacherId || "",
        // ✅ استخراج الـ IDs من مصفوفة الدروس
        lessonIds: session.lessons?.map((l) => l.id) || [],
        // ✅ استخراج الـ IDs من مصفوفة الطلاب
        userIds: session.students?.map((s) => s.id) || [],
      }}
    />
  );
};

export default EditSessions;