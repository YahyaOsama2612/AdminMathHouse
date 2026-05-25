import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const {
    data: categoriesRes,
    loading: loadingCats,
    error,
  } = useGet("/api/admin/category");
  const {
    data: categoryRes,
    loading: loadingOne,
    error: errorOne,
  } = useGet(`/api/admin/category/${id}`);
  const { putData, loading: saving } = usePut(`/api/admin/category/${id}`);

  // كل الـ Categories ما عدا الحالية (عشان ما ينفعش تختار نفسها Parent)
  const parentOptions = useMemo(() => {
    const list = categoriesRes?.data?.data || [];
    return list
      .filter((cat) => cat.id !== id)
      .map((cat) => ({
        value: cat.id,
        label: cat.name,
      }));
  }, [categoriesRes, id]);

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Category Name",
        type: "text",
        required: true,
        placeholder: "Enter category name",
        section: "General Information",
      },
      {
        name: "description",
        label: "Description",
        type: "text",
        placeholder: "Optional description",
        section: "General Information",
      },
      {
        name: "parentCategoryId",
        label: "Parent Category (Optional)",
        type: "select",
        options: parentOptions,
        section: "General Information",
        helperText: "Leave empty if this is a main category",
      },
      {
        name: "image",
        label: "Category Image (Optional)",
        type: "file",
        section: "General Information",
      },
    ],
    [parentOptions],
  );

  // تحويل File إلى Base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSave = async (formData) => {
    if (!formData.name?.trim()) {
      toast.error("Category name is required");
      return;
    }

    let imageBase64 = null;

    // لو المستخدم رفع صورة جديدة
    if (formData.image instanceof File) {
      imageBase64 = await fileToBase64(formData.image);
    }
    // لو فيه صورة قديمة (جايه string من initialData)
    else if (
      typeof formData.image === "string" &&
      formData.image.startsWith("data:")
    ) {
      imageBase64 = formData.image;
    }

    const payload = {
      name: formData.name,
      description: formData.description || "",
      image: imageBase64, // ممكن تبقى null لو المستخدم ما غيّرش الصورة
      parentCategoryId: formData.parentCategoryId || null,
    };

    await putData(
      payload,
      `/api/admin/category/${id}`,
      "Category updated successfully",
    );
    navigate("/admin/courses/categories");
  };

  if (loadingCats || loadingOne) {
    return (
      <div className="">
        <Loader />
      </div>
    );
  }

  if (error || errorOne) {
    return <Errorpage />;
  }

  const category = categoryRes?.data?.data;

  return (
    <AddPage
      title="Edit Category"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/courses/categories")}
      initialData={{
        name: category?.name || "",
        description: category?.description || "",
        parentCategoryId: category?.parentCategoryId || "",
        image: category?.image || "", // لو الـ API بيرجع صورة
      }}
    />
  );
};

export default EditCategory;
