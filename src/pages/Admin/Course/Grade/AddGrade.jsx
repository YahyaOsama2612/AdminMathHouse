import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const AddGrade = () => {
  const navigate = useNavigate();

  const { postData, loading: saving } = usePost();
  const {
    data: categoryData,
    loading: loadingCats,
    error,
  } = useGet("/api/admin/category");

  // ✅ state للـ parent المختار
  const [selectedParent, setSelectedParent] = useState("");

  // ✅ parent categories (اللي ملهاش parent)
  const parentCategories = useMemo(() => {
    return (
      categoryData?.data?.data
        ?.filter((cat) => !cat.parentCategoryId)
        .map((cat) => ({
          label: cat.name,
          value: cat.id,
        })) || []
    );
  }, [categoryData]);

  // كل الكاتيجوري
  const allCategories = categoryData?.data?.data || [];

  // ✅ فلترة الكاتيجوري حسب الأب
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
            categoryId: "", // reset child
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
        placeholder: "Enter grade name",
        section: "General Information",
      },
      {
        name: "nameAr",
        label: "Grade Name (AR)",
        type: "text",
        required: true,
        placeholder: "ادخل اسم الصف",
        section: "General Information",
      },
    ],
    [parentCategories, filteredCategories]
  );

  const initialFormValues = useMemo(
    () => ({
      categoryParentId: "",
      categoryId: "",
      name: "",
      nameAr: "",
    }),
    []
  );

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

    try {
      await postData(payload, "/api/admin/grade", "Grade added successfully");
      navigate("/admin/courses/grade");
    } catch (error) {
      throw error;
    }
  };

  if (loadingCats) {
    return <Loader />;
  }

  if (error) {
    return <Errorpage />;
  }

  return (
    <AddPage
      title="Add Grade"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/courses/grade")}
      initialData={initialFormValues}
      loading={saving}
    />
  );
};

export default AddGrade;