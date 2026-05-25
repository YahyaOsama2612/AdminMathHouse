import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "@/components/HierarchicalLessonSelector";
import { toast } from "react-hot-toast";
const AddSessions = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/session");

  const { data: groupData , loading:grouploading ,error:groupError} =
   useGet("/api/admin/session/select/groups");

  const { data: teachersData , loading:teachersloading ,error:teachersError} =
   useGet("/api/admin/session/select/teachers");

  const [lessonOptions, setLessonOptions] = useState([]);

  const groupOptions = useMemo(
    () => groupData?.data?.groups.map((item) => ({ value: item.id, label: item.name })) || [],
    [groupData]
  );


  const teacherOptions = useMemo(
    () => teachersData ?.data?.teachers.map((item) => ({ value: item.id, label: item.name })) || [],
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

  // fetch lessons based on selected course
  const fetchLessons = async (courseId) => {
    if (!courseId) {
      setLessonOptions([]);
      return;
    }

    try {
      const res = await fetch(`/api/admin/lessons/course/${courseId}`);
      const data = await res.json();

      const lessons = data?.data?.lessons || [];

      const formatted = lessons.map((item) => ({
        value: item.lesson.id,
        label: item.lesson.name,
      }));

      setLessonOptions(formatted);
    } catch (err) {
      console.error(err);
      setLessonOptions([]);
    }
  };

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
      value={value || []}
      onChange={onChange}
    />
  ),
},

      {
        name: "userIds",
        label: "Students",
        fullWidth: true,
        type: "custom",
        render: ({ value, onChange, error }) => (
          <SearchStudents
            value={value}
            onChange={onChange}
            error={error}
          />
        ),
      },
    
 ], [groupOptions, teacherOptions])

  const onSave = async (formData) => {
  // 1. التأكد من المجموعة لو النوع Group
  if (formData.type === "group" && !formData.groupId) return toast.error("Please select a group");
  
  // 2. التأكد من الطلاب لو النوع Private (تصحيح formData.userIds)
  if (formData.type === "private" && !formData.studentIds.length === 1 ) {
    return toast.error("Please select at least one student");
  }

  // 3. التأكد من اختيار دروس على الأقل (lessonIds)
  if (!formData.lessonIds || formData.lessonIds.length === 0) {
    return toast.error("Please select at least one lesson");
  }

  const payload = {
    ...formData,
    studentIds: formData.userIds || [],
    lessonIds: formData.lessonIds || [],
  };
 try{

   await postData(payload, "/api/admin/session", "Session added successfully");
   navigate(-1);
  }catch(e){
    throw e
  }
};  
if (grouploading || teachersloading) return <Loader />;
if (groupError || teachersError) return <Errorpage />;

  return (
    <AddPage
      title="Add Session"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{}}
    />
  );
};

export default AddSessions;