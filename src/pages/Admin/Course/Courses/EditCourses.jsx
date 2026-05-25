import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import PricePlansField from "@/components/PricePlansField";
const EditCourses = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: courseRes, loading: loadingOne, error: errorOne } =
    useGet(`/api/admin/courses/${id}`);

  const { data: teachersRes, loading: loadingTeachers, error: errorTeachers } =
    useGet("/api/admin/teacher");

  const { data: categoriesRes, loading: loadingCats, error } =
    useGet("/api/admin/teacher/selectionCategories");

  const { putData, loading: saving } = usePut();

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
      },

      {
        name: "teacherIds",
        label: "Teacher",
        type: "multipleSelect",
        options: teacherOptions,
      },


      
      { name: "isHaveSemester", label: "Semester", type: "switch" },
      {
        name: "pricePlans",
        label: "Price Plans",
        type: "custom",
        fullWidth: true,
        render: ({ value, onChange }) => (
          <PricePlansField value={value || []} onChange={onChange} />
        ),
      },

      { name: "image", label: "Image", type: "file" },
    ],
    [teacherOptions, categoryOptions]
  );

  const fileToBase64 = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const onSave = async (formData) => {
    let imageBase64 = formData.image;

    if (formData.image instanceof File) {
      imageBase64 = await fileToBase64(formData.image);
    }
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
      name: formData.name,
      categoryId: formData.categoryId,
      teacherIds: formData.teacherIds,
      preRequisition: formData.preRequisition || "",
      whatYouGain: formData.whatYouGain || "",
      duration: formData.duration,
      image: imageBase64,
      description: formData.description || "",
      isHaveSemester: formData.isHaveSemester,

      pricePlans: formData.pricePlans.map((p) => ({
        label: p.label,
        days: Number(p.days),
        priceEgp: Number(p.priceEgp),
        priceUsd: Number(p.priceUsd),
        hasDiscount: p.hasDiscount,
        ...(p.hasDiscount && {
          discountEgp: Number(p.discountEgp),
          discountUsd: Number(p.discountUsd),
        }),
      })),
    };

    await putData(
      payload,
      `/api/admin/courses/${id}`,
      "Course updated successfully"
    );

    navigate(-1);
  };

  if (loadingOne || loadingTeachers || loadingCats) return <Loader />;
  if (errorOne || errorTeachers || error) return <Errorpage />;

  const course = courseRes?.data;

  return (
    <AddPage
      title="Edit Course"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{
        name: course?.name || "",
        description: course?.description || "",
        categoryId: course?.categoryId || "",
        teacherIds: course?.teachers?.map((t) => t.teacherId) || [],
          image: course?.image || "",
        isHaveSemester: course?.isHaveSemester || false,

        // ✅ أهم جزء (mapping)
        pricePlans:
          course?.prices?.map((p) => ({
            label: p.durationLabel,
            days: p.durationDays,
            priceEgp: p.priceEgp,
            priceUsd: p.priceUsd,
            hasDiscount: p.hasDiscount,
            discountEgp: p.discountEgp,
            discountUsd: p.discountUsd,
          })) || [],
      }}
    />
  );
};

export default EditCourses;