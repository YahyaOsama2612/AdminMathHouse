import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import PricePlansField from "@/components/PricePlansField";

const EditLessons = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // جلب بيانات الدرس
  const {
    data: lessonRes,
    loading: loadingLesson,
    error,
  } = useGet(`/api/admin/lessons/${id}`);
  const {
    data: teachersRes,
    loading: loadingTeachers,
    error: errorTeachers,
  } = useGet("/api/admin/teacher");
  const { putData, loading: saving } = usePut(`/api/admin/lessons/${id}`);

  const teacherOptions = useMemo(
    () =>
      teachersRes?.data?.teacher?.map((t) => ({
        value: t.id,
        label: t.name,
      })) || [],
    [teachersRes],
  );

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Lesson Name",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "teacherId",
        label: "Teacher",
        type: "select",
        required: true,
        options: teacherOptions,
        section: "General Information",
      },
     
        
      {
        name: "description",
        label: "Description",
        type: "text",
        section: "General Information",
      },
      {
        name: "preRequisition",
        label: "Pre-requisition",
        type: "text",
        section: "General Information",
        helperText: "leave empty for no pre-requisition",
      },
      {
        name: "whatYouGain",
        label: "What You Will Gain",
        type: "text",
        section: "General Information",
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
      
      {
        name: "image",
        label: "Lesson Image",
        type: "file",
        section: "General Information",
        helperText: "leave empty for no image",
      },
    ],
    [teacherOptions],
  );

  const initialData = useMemo(
    () => ({
      name: lessonRes?.data?.lesson?.name || "",
      teacherId: lessonRes?.data?.teacher?.id || "",
      chapterId: lessonRes?.data?.chapter?.id || "",
      price: lessonRes?.data?.lesson?.price || "",
      discount: lessonRes?.data?.lesson?.discount || "",
      description: lessonRes?.data?.lesson?.description || "",
      preRequisition: lessonRes?.data?.lesson?.preRequisition || "",
      whatYouGain: lessonRes?.data?.lesson?.whatYouGain || "",
      image: lessonRes?.data?.lesson?.image || "",
       pricePlans:
          lessonRes?.data?.prices?.map((p) => ({
            label: p.durationLabel,
            days: p.durationDays,
            priceEgp: p.priceEgp,
            priceUsd: p.priceUsd,
            hasDiscount: p.hasDiscount,
            discountEgp: p.discountEgp,
            discountUsd: p.discountUsd,
          })) || [],
    }),
    [lessonRes],
  );

 const onSave = async (formData) => {
  let imageBase64 = formData.image;

  if (formData.image instanceof File) {
    imageBase64 = await fileToBase64(formData.image);
  }

  if (!formData.pricePlans || formData.pricePlans.length === 0) {
    toast.error("You must add at least one price plan");
    return;
  }

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

  await putData(
    payload,
    `/api/admin/lessons/${id}`,
    "Lesson updated successfully"
  );

  navigate(-1);
};

  if (loadingLesson || loadingTeachers) {
    return <Loader />;
  }

  if (error || errorTeachers) {
    return <Errorpage />;
  }

  return (
    <AddPage
      title="Edit Lesson"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialData}
    />
  );
};

export default EditLessons;
