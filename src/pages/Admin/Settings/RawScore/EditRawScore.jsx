import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditRawScore = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const {
    data: coursesRes,
    loading: loadingCourses,
    error: errorC,
  } = useGet("/api/admin/teacher/selectionCourses");

  const {
    data: rawRes,
    loading: loadingOne,
    error,
  } = useGet(`/api/admin/rawScore/${id}`);

  const { putData, loading: saving } = usePut(`/api/admin/rawScore/${id}`);

  const courseOptions = useMemo(() => {
    return (
      coursesRes?.data?.courses?.map((c) => ({
        value: c.id,
        label: c.name,
      })) || []
    );
  }, [coursesRes]);

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Rule Name",
        type: "text",
        required: true,
        placeholder: "Enter raw score rule name",
        section: "General Information",
      },
      {
        name: "courseId",
        label: "Course",
        type: "select",
        required: true,
        options: courseOptions,
        section: "General Information",
      },
      {
        name: "score",
        label: "Score",
        type: "number",
        required: true,
        placeholder: "Enter total score (e.g. 100)",
        section: "General Information",
        min: 0,
      },
      {
        name: "questionsCount", // الحقل الجديد لعدد الأسئلة
        label: "Questions Count",
        type: "number",
        required: true,
        placeholder: "Enter number of questions",
        section: "General Information",
        min: 1,
      },
      {
        name: "giftingScore",
        label: "Gifting Score",
        type: "number",
        required: true,
        placeholder: "Enter gifting score",
        section: "General Information",
        min: 0,
      },
      {
        name: "is_giftingScore",
        label: "Include Gifting Score?",
        type: "switch",
        section: "General Information",
      },
    ],
    [courseOptions],
  );

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      courseId: formData.courseId,
      score: Number(formData.score),
      questionsCount: Number(formData.questionsCount), // إرسال التعديل للـ API
      is_giftingScore: Boolean(formData.is_giftingScore),
      giftingScore: Number(formData.giftingScore),
    };

    await putData(
      payload,
      `/api/admin/rawScore/${id}`,
      "Raw score updated successfully",
    );
    navigate("/admin/settings/rawscore");
  };

  if (loadingCourses || loadingOne) return <Loader />;
  if (errorC || error) return <Errorpage />;

  const raw = rawRes?.data?.rawScore;

  return (
    <AddPage
      title="Edit Raw Score Rule"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/rawscore")}
      initialData={{
        name: raw?.name || "",
        courseId: raw?.courseId || "",
        score: raw?.score || "",
        questionsCount: raw?.questionsCount || "", // عرض القيمة الراجع من الـ API عند التعديل
        is_giftingScore: raw?.is_giftingScore || false,
        giftingScore: raw?.giftingScore || 0,
      }}
    />
  );
};

export default EditRawScore;
