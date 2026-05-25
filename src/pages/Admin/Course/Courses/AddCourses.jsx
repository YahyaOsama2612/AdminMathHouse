import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import PricePlansField from "@/components/PricePlansField";
const AddCourses = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { categoryId } = location.state || {};

  const { postData, loading: saving } = usePost("/api/admin/courses");
  const { data: teachersRes, loading: loadingTeachers, error: errorTeachers } =
    useGet("/api/admin/teacher");
  const { data: categoriesRes, loading: loadingCats, error } =
    useGet("/api/admin/teacher/selectionCategories");

  const teacherOptions = useMemo(() => {
    return (
      teachersRes?.data?.teacher?.map((t) => ({
        value: t.id,
        label: t.name,
      })) || []
    );
  }, [teachersRes]);

  const categoryOptions = useMemo(() => {
    return (
      categoriesRes?.data?.data?.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })) || []
    );
  }, [categoriesRes]);

  const fields = useMemo(
    () => [
      { name: "name", label: "Course Name", type: "text", required: true },
      { name: "description", label: "Description", type: "text" },

      {
        name: "categoryId",
        label: "Category",
        type: "select",
        options: categoryOptions,
        defaultValue: categoryId || "",
      },

      {
        name: "teacherIds",
        label: "Teacher",
        type: "multipleSelect",
        options: teacherOptions,
                helperText: "You can select more than one teacher",

      },

      { name: "isHaveSemester", label: "Semester", type: "switch",
                helperText: "leave empty for no what you will gain",

       },

      {
        name: "pricePlans",
        label: "Price Plans",
        type: "custom",
        fullWidth: true,
        render: ({ value, onChange }) => (
          <PricePlansField value={value || []} onChange={onChange} />
        ),
      },

      { name: "image", label: "Image", type: "file",
                        helperText: "leave empty for no image",

       },
    ],
    [teacherOptions, categoryOptions, categoryId]
  );

  const initialFormValues = {
    name: "",
    description: "",
    categoryId: categoryId || "",
    teacherIds: [],
    duration: "",
    isHaveSemester: false,
    pricePlans: [],
  };

  const fileToBase64 = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });


  
  const onSave = async (formData) => {
  let imageBase64 = null;

  if (formData.image instanceof File) {
    imageBase64 = await fileToBase64(formData.image);
  }

  // ❌ منع الإرسال لو مفيش plans
  if (!formData.pricePlans || formData.pricePlans.length === 0) {
    toast.error("You must add at least one price plan");
    return;
  }

  // ❌ validation لكل plan
  for (let i = 0; i < formData.pricePlans.length; i++) {
    const plan = formData.pricePlans[i];

    if (!plan.label || !plan.days || !plan.priceEgp || !plan.priceUsd) {
      toast.error(`Plan ${i + 1}: all fields are required`);
      return;
    }

    if (plan.hasDiscount) {
      if (!plan.discountEgp || !plan.discountUsd) {
        toast.error(`Plan ${i + 1}: discount fields are required`);
        return;
      }

      if (
        Number(plan.discountEgp) > Number(plan.priceEgp) ||
        Number(plan.discountUsd) > Number(plan.priceUsd)
      ) {
        toast.error(`Plan ${i + 1}: discount can't be greater than price`);
        return;
      }
    }
  }

  const payload = {
    ...formData,
    image: imageBase64,
    pricePlans: formData.pricePlans.map((p) => ({
      ...p,
      days: Number(p.days),
      priceEgp: Number(p.priceEgp),
      priceUsd: Number(p.priceUsd),
      discountEgp: p.hasDiscount ? Number(p.discountEgp) : undefined,
      discountUsd: p.hasDiscount ? Number(p.discountUsd) : undefined,
    })),
  };

  await postData(payload, "/api/admin/courses", "Course added successfully");

  navigate(`/admin/courses/courses/${formData.categoryId}`);
};

  if (loadingTeachers || loadingCats) return <Loader />;
  if (error || errorTeachers) return <Errorpage />;

  return (
    <AddPage
      title="Add Course"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialFormValues}
    />
  );
};

export default AddCourses;