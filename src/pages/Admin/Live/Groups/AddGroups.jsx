import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import GroupForm from "./parts/GroupForm";

const AddGroups = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/groups");

  const onSave = async (formData) => {
    const payload = {
      ...formData,
      studentIds: formData.studentIds || [],
      isActive: formData.isActive ?? true,
    };
    await postData(payload, "/api/admin/groups", "Group added successfully");
    navigate(-1);
  };

  return <GroupForm isNew initial={{ isActive: true, studentIds: [] }} onSave={onSave} onCancel={() => navigate(-1)} />;
};

export default AddGroups;
