import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Errorpage from "@/components/Errorpage";
import { SkelRows } from "@/components/admin/kit";
import HomeworkForm from "./parts/HomeworkForm";
import Submissions from "./parts/Submissions";

const toBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

/** ISO date from the API → "YYYY-MM-DDTHH:mm" in the admin's local time (what the form sends back). */
const toLocalInput = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const EditExtraHomework = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { putData } = usePut(`/api/admin/extra-homework/${id}`);
  const { data: homeworkRes, loading: loadingOne, error: errorOne } = useGet(`/api/admin/extra-homework/${id}`);
  const { data: groupData, loading: groupLoading } = useGet("/api/admin/session/select/groups");

  const groupOptions = useMemo(
    () => groupData?.data?.groups?.map((item) => ({ value: item.id, label: item.name })) || [],
    [groupData],
  );
  const homework = homeworkRes?.data?.data;
  const known = useMemo(
    () => (homework?.students || []).map((x) => ({ id: x.student?.id, name: x.student?.name, nickname: x.student?.nickname, email: x.student?.email })).filter((x) => x.id),
    [homework],
  );

  const onSave = async (formData, { pdfFile, removePdf }) => {
    const fileBase64 = pdfFile ? await toBase64(pdfFile) : null;
    const payload = {
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      targetType: formData.targetType,
      ...(formData.targetType === "individual" && { studentIds: formData.studentIds || [] }),
      ...(formData.targetType === "group" && { targetGroupId: formData.targetGroupId }),
      ...(fileBase64 && { pdf: fileBase64 }),
      // the API removes the stored file when pdf is null; removePdf kept as before
      ...(removePdf && !fileBase64 && { pdf: null, removePdf: true }),
      ...(formData.link && { link: formData.link }),
    };
    await putData(payload, `/api/admin/extra-homework/${id}`, "Homework updated successfully");
    navigate(-1);
  };

  if (errorOne) return <Errorpage />;
  if (loadingOne || !homework || groupLoading) return <div><div className="skel h-10 w-64 mb-4" /><SkelRows n={6} /></div>;

  const targetGroupId = homework.targetGroupId || groupOptions.find((g) => g.label === homework.groupName)?.value || "";

  return (
    <div>
      <HomeworkForm
        key={homework.id}
        initial={{
          title: homework.title || "",
          description: homework.description || "",
          dueDate: homework.dueDate ? toLocalInput(homework.dueDate) : "",
          targetType: homework.targetType || "individual",
          studentIds: known.map((s) => s.id),
          targetGroupId,
          link: homework.link || "",
        }}
        knownStudents={known}
        groupOptions={groupOptions}
        groupsLoading={groupLoading}
        existingPdfUrl={homework.pdfUrl}
        requireStudents
        onSave={onSave}
        onCancel={() => navigate(-1)}
      />

      <section className="mt-6">
        <h3 className="font-bold text-gray-800 mb-1">Assigned students</h3>
        <p className="text-xs text-gray-400 mb-3">Who has it, who submitted, and their grades.</p>
        <Submissions id={id} embedded />
      </section>
    </div>
  );
};

export default EditExtraHomework;
