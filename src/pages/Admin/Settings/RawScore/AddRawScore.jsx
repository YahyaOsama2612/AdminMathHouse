import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import { FormSkeleton, LoadError } from "../settingsKit";
import RawScoreForm from "./RawScoreForm";

const AddRawScore = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/rawScore");

  const {
    data: coursesRes,
    loading: loadingCourses,
    error: errorC,
    refetch,
  } = useGet("/api/admin/teacher/selectionCourses");

  const courseOptions = useMemo(
    () => coursesRes?.data?.courses?.map((c) => ({ value: c.id, label: c.name })) || [],
    [coursesRes],
  );

  const initialFormValues = useMemo(
    () => ({
      name: "",
      courseId: "",
      score: "",
      questionsCount: "",
      is_giftingScore: false,
      giftingScore: "",
    }),
    [],
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

    await postData(payload, "/api/admin/rawScore", "Raw score added successfully");
    navigate("/admin/settings/rawscore");
  };

  if (loadingCourses || (!coursesRes && !errorC)) return <FormSkeleton />;
  if (errorC) return <LoadError text="Could not load the courses." onRetry={refetch} />;

  return <RawScoreForm isNew initial={initialFormValues} courseOptions={courseOptions} onSave={onSave} />;
};

export default AddRawScore;
