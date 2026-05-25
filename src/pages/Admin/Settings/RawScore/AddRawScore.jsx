import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const AddRawScore = () => {
  const navigate = useNavigate();
  const { postData, loading: saving, error } = usePost("/api/admin/rawScore");


  const { data: coursesRes, loading: loadingCourses, error: errorC } =
    useGet("/api/admin/teacher/selectionCourses");

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
        name: "giftingScore",
        label: "Gifting Score",
        type: "number",
        required: true,
        placeholder: "Enter gifting score",
        section: "General Information",
        min: 0,
       
      }, {
        name: "is_giftingScore",
        label: "Include Gifting Score?",
        type: "switch", 
        section: "General Information",
      }
    ],
    [courseOptions]
  );

  const initialFormValues = useMemo(
    () => ({
      name: "",
      courseId: "",
      score: "",
      is_giftingScore: false,
      giftingScore: 0,
    }),
    []
  );

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      courseId: formData.courseId,
      score: Number(formData.score),
      is_giftingScore: Boolean(formData.is_giftingScore),
      giftingScore: Number(formData.giftingScore),
    };

    await postData(payload, "/api/admin/rawScore", "Raw score added successfully");
    navigate("/admin/settings/rawscore");
  };

  if (loadingCourses) return <Loader />;
  if (errorC) return <Errorpage />;

  return (
    <AddPage
      title="Add Raw Score"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/rawscore")}
       
      initialData={initialFormValues}
    />
  );
};

export default AddRawScore;