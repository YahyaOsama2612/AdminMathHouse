import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "../../../../components/SearchStudents";

const AddGroups = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/groups");

  const { data: selectData, loading, error } = useGet("/api/admin/groups/select");

  const teacherOptions = useMemo(
    () => selectData?.data?.teachers || [],
    [selectData]
  );

  const studentOptions = useMemo(
    () => selectData?.data?.students || [],
    [selectData]
  );

  const dayOptions = [
    { value: "Sun", label: "Sunday" },
    { value: "Mon", label: "Monday" },
    { value: "Tue", label: "Tuesday" },
    { value: "Wed", label: "Wednesday" },
    { value: "Thu", label: "Thursday" },
    { value: "Fri", label: "Friday" },
    { value: "Sat", label: "Saturday" },
  ];

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Group Name",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "teacherId",
        label: "Teacher",
        type: "select",
        required: true,
        options: teacherOptions,
        section: "General Information",
        helperText: "Select a teacher",
      },
      {
        name: "days",
        label: "Days",
        type: "multipleSelect",
        required: true,
        options: dayOptions,
        section: "General Information",
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
        name: "isActive",
        label: "Active",
        type: "switch",
        section: "General Information",
        defaultValue: true,
      },
      {
        name: "studentIds",
        label: "Students",
        fullWidth: true,
          type: "custom",

        render: ({ value, onChange, error }) => (
    <SearchStudents
      value={value}
      onChange={onChange}
      error={error}
    />
  )
      },
    
    ],
    [teacherOptions, studentOptions]
  );

  const onSave = async (formData) => {
    const payload = {
      ...formData,
      days: formData.days || [],
      studentIds: formData.studentIds || [],
      isActive: formData.isActive ?? true,
    };

    await postData(payload, "/api/admin/groups", "Group added successfully");
    navigate(-1);
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <AddPage
      title="Add Group"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{ }}
    />
  );
};

export default AddGroups;