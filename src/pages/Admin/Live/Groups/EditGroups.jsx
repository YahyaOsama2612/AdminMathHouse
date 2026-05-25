import React, { useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "../../../../components/SearchStudents";

const EditGroups = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { putData, loading: saving } = usePut(`/api/admin/groups/${id}`);

  // 🔹 Get group data
  const { data: groupRes, loading: loadingOne, error: errorOne } =
    useGet(`/api/admin/groups/${id}`);

  // 🔹 Get select options
  const { data: selectData, loading: loadingSelect, error: errorSelect } =
    useGet("/api/admin/groups/select");

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
        helperText: "Enter group name",
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
try {
    await putData(payload, `/api/admin/groups/${id}`, "Group updated successfully");
    navigate(-1);
} catch (e) {
    throw e
}
  };

  if (loadingOne || loadingSelect || saving) return <Loader />;
  if (errorOne || errorSelect) return <Errorpage />;

 const group = groupRes?.data || {};

return (
  <AddPage
    title="Edit Group"
    fields={fields}
    onSave={onSave}
    onCancel={() => navigate(-1)}
    initialData={{
      name: group.name || "",
      teacherId: group.teacherId || "",
      days: group.days || [],            // ✅ دلوقتي Array جاهزة
      timeFrom: group.timeFrom || "",
      timeTo: group.timeTo || "",
      studentIds: group.students?.map((s) => s.id) || [],
      isActive: group.isActive ?? true,
    }}
  />
);
};

export default EditGroups;