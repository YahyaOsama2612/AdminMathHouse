import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { FormSkeleton, LoadError } from "@/pages/Admin/Settings/settingsKit";
import GradeForm from "./GradeForm";

const EditGrade = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: gradeRes, loading: loadingGrade, error, refetch } = useGet(`/api/admin/grade/${id}`);
  const { data: categoryData, loading: loadingCats, error: catError } = useGet("/api/admin/category");

  const { putData } = usePut();

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      nameAr: formData.nameAr,
      categoryId: formData.categoryId,
      categoryParentId: formData.categoryParentId,
    };
    await putData(payload, `/api/admin/grade/${id}`, "Grade updated successfully");
    navigate("/admin/courses/grade");
  };

  if (loadingGrade || loadingCats || (!gradeRes && !error) || (!categoryData && !catError)) return <FormSkeleton />;
  if (error) return <LoadError text="Could not load this grade." onRetry={refetch} />;

  const grade = gradeRes?.data?.grade;
  const allCategories = categoryData?.data?.data || [];
  // The parent comes from the grade's current category (falls back to the parent saved on the grade).
  const currentCategory = allCategories.find((cat) => cat.id === grade?.categoryId);
  const parentId = currentCategory?.parentCategoryId || grade?.parentCategoryId || "";

  return (
    <GradeForm
      key={grade?.id || id}
      categories={allCategories}
      initial={{
        categoryParentId: parentId,
        categoryId: grade?.categoryId || "",
        name: grade?.name || "",
        nameAr: grade?.nameAr || "",
      }}
      onSave={onSave}
    />
  );
};

export default EditGrade;
