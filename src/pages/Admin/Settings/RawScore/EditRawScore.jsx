import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { FormSkeleton, LoadError } from "../settingsKit";
import RawScoreForm from "./RawScoreForm";

const EditRawScore = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const {
    data: coursesRes,
    loading: loadingCourses,
    error: errorC,
    refetch: refetchCourses,
  } = useGet("/api/admin/teacher/selectionCourses");

  const {
    data: rawRes,
    loading: loadingOne,
    error,
    refetch,
  } = useGet(`/api/admin/rawScore/${id}`);

  const { putData } = usePut(`/api/admin/rawScore/${id}`);

  const courseOptions = useMemo(
    () => coursesRes?.data?.courses?.map((c) => ({ value: c.id, label: c.name })) || [],
    [coursesRes],
  );

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      courseId: formData.courseId,
      score: Number(formData.score),
      questionsCount: Number(formData.questionsCount),
      is_giftingScore: Boolean(formData.is_giftingScore),
      giftingScore: Number(formData.giftingScore),
    };

    await putData(payload, `/api/admin/rawScore/${id}`, "Raw score updated successfully");
    navigate("/admin/settings/rawscore");
  };

  if (loadingCourses || loadingOne || ((!coursesRes || !rawRes) && !errorC && !error)) return <FormSkeleton />;
  if (errorC || error)
    return (
      <LoadError
        text="Could not load this raw score."
        onRetry={() => {
          refetch();
          refetchCourses();
        }}
      />
    );

  const raw = rawRes?.data?.rawScore;

  return (
    <RawScoreForm
      key={raw?.id || id}
      initial={{
        name: raw?.name || "",
        courseId: raw?.courseId || "",
        score: raw?.score || "",
        questionsCount: raw?.questionsCount || "",
        is_giftingScore: raw?.is_giftingScore || false,
        giftingScore: raw?.giftingScore || 0,
      }}
      courseOptions={courseOptions}
      onSave={onSave}
    />
  );
};

export default EditRawScore;
