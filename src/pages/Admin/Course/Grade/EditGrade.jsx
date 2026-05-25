import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditGrade = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const {
    data: gradeRes,
    loading: loadingGrade,
    error,
  } = useGet(`/api/admin/grade/${id}`);

  const {
    data: categoryData,
    loading: loadingCats,
  } = useGet("/api/admin/category");

  const { putData, loading: saving } = usePut();

  const grade = gradeRes?.data?.grade;
  const allCategories = categoryData?.data?.data || [];

  // ✅ state للـ parent
  const [selectedParent, setSelectedParent] = useState("");

  // ✅ parent categories
  const parentCategories = useMemo(() => {
    return allCategories
      ?.filter((cat) => !cat.parentCategoryId)
      .map((cat) => ({
        label: cat.name,
        value: cat.id,
      }));
  }, [allCategories]);

  // ✅ استخراج parent من الكاتيجوري الحالية
  useEffect(() => {
    if (grade?.categoryId && allCategories.length) {
      const currentCategory = allCategories.find(
        (cat) => cat.id === grade.categoryId
      );

      if (currentCategory?.parentCategoryId) {
        setSelectedParent(currentCategory.parentCategoryId);
      }
    }
  }, [grade, allCategories]);

  // ✅ فلترة child categories
  const filteredCategories = useMemo(() => {
    return allCategories
      ?.filter((cat) => cat.parentCategoryId === selectedParent)
      .map((cat) => ({
        label: cat.name,
        value: cat.id,
      }));
  }, [allCategories, selectedParent]);

  const fields = useMemo(
    () => [
      {
        name: "categoryParentId",
        label: "Category Parent",
        type: "select",
        options: parentCategories,
        required: true,
        section: "General Information",
        onChange: (value, setFormData) => {
          setSelectedParent(value);
          setFormData((prev) => ({
            ...prev,
            categoryParentId: value,
            categoryId: "",
          }));
        },
      },
      {
        name: "categoryId",
        label: "Category",
        type: "select",
        options: filteredCategories,
        required: true,
        section: "General Information",
      },
      {
        name: "name",
        label: "Grade Name (EN)",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "nameAr",
        label: "Grade Name (AR)",
        type: "text",
        required: true,
        section: "General Information",
      },
    ],
    [parentCategories, filteredCategories]
  );

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      nameAr: formData.nameAr,
      categoryId: formData.categoryId,
      categoryParentId: formData.categoryParentId,
    };

    await putData(
      payload,
      `/api/admin/grade/${id}`,
      "Grade updated successfully"
    );

    navigate("/admin/courses/grade");
  };

  if (loadingGrade || loadingCats) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <AddPage
      title="Edit Grade"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/courses/grade")}
      initialData={{
        categoryParentId: selectedParent || "",
        categoryId: grade?.categoryId || "",
        name: grade?.name || "",
        nameAr: grade?.nameAr || "",
      }}
      loading={saving}
    />
  );
};

export default EditGrade;