import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { SkelRows } from "@/components/admin/kit";
import Errorpage from "@/components/Errorpage";
import GroupForm from "./parts/GroupForm";

const EditGroups = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { putData } = usePut(`/api/admin/groups/${id}`);
  const { data: groupRes, loading, error } = useGet(`/api/admin/groups/${id}`);

  const group = groupRes?.data;
  const known = useMemo(() => (group?.students || []).map((s) => ({ id: s.id, name: s.name, nickname: s.nickname })), [group]);

  const onSave = async (formData) => {
    const payload = {
      ...formData,
      studentIds: formData.studentIds || [],
      isActive: formData.isActive ?? true,
    };
    await putData(payload, `/api/admin/groups/${id}`, "Group updated successfully");
    navigate(-1);
  };

  if (error) return <Errorpage />;
  if (loading || !group) return <div><div className="skel h-10 w-64 mb-4" /><SkelRows n={6} /></div>;

  return (
    <GroupForm
      key={group.id}
      initial={{ name: group.name || "", isActive: group.isActive ?? true, studentIds: group.students?.map((s) => s.id) || [] }}
      knownStudents={known}
      onSave={onSave}
      onCancel={() => navigate(-1)}
    />
  );
};

export default EditGroups;
