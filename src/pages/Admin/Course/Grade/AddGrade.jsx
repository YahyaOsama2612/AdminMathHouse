import React from "react";
import { useNavigate } from "react-router-dom";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import { FormSkeleton, LoadError } from "@/pages/Admin/Settings/settingsKit";
import GradeForm from "./GradeForm";

const AddGrade = () => {
  const navigate = useNavigate();

  const { postData } = usePost();
  const { data: categoryData, loading: loadingCats, error, refetch } = useGet("/api/admin/category");

  const onSave = async (formData) => {
    const payload = {
      categoryId: formData.categoryId,
      parentCategoryId: formData.categoryParentId,
      gradesList: [
        {
          name: formData.name,
          nameAr: formData.nameAr,
        },
      ],
    };
    await postData(payload, "/api/admin/grade", "Grade added successfully");
    navigate("/admin/courses/grade");
  };

  if (loadingCats || (!categoryData && !error)) return <FormSkeleton />;
  if (error) return <LoadError text="Could not load the categories." onRetry={refetch} />;

  return (
    <GradeForm
      isNew
      categories={categoryData?.data?.data || []}
      initial={{ categoryParentId: "", categoryId: "", name: "", nameAr: "" }}
      onSave={onSave}
    />
  );
};

export default AddGrade;
