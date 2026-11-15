import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import HomeworkForm from "./parts/HomeworkForm";

const toBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

const AddExtraHomework = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/extra-homework");
  const { data: groupData, loading: groupLoading } = useGet("/api/admin/session/select/groups");

  const groupOptions = useMemo(
    () => groupData?.data?.groups?.map((item) => ({ value: item.id, label: item.name })) || [],
    [groupData],
  );

  const onSave = async (formData, { pdfFile }) => {
    const fileBase64 = pdfFile ? await toBase64(pdfFile) : null;
    const payload = {
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      targetType: formData.targetType,
      ...(formData.targetType === "individual" && { studentIds: formData.studentIds || [] }),
      ...(formData.targetType === "group" && { targetGroupId: formData.targetGroupId }),
      ...(fileBase64 && { pdf: fileBase64 }),
      ...(formData.link && { link: formData.link }),
    };
    await postData(payload, "/api/admin/extra-homework", "Homework added successfully");
    navigate(-1);
  };

  return (
    <HomeworkForm
      isNew
      initial={{ targetType: "individual", studentIds: [] }}
      groupOptions={groupOptions}
      groupsLoading={groupLoading}
      onSave={onSave}
      onCancel={() => navigate(-1)}
    />
  );
};

export default AddExtraHomework;
