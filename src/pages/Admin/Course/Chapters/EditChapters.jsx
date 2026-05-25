  import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import PricePlansField from "@/components/PricePlansField";

const EditChapters = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: chapterRes,
    loading: loadingChapter,
    error,
  } = useGet(`/api/admin/chapters/${id}`);

  const {
    data: teachersRes,
    loading: loadingTeachers,
    error: errorTeachers,
  } = useGet("/api/admin/teacher/selectionTeachers");

  const {
    data: coursesRes,
    loading: loadingCourses,
    error: errorCourses,
  } = useGet("/api/admin/teacher/selectionCourses");

  const { putData, loading: saving } = usePut(
    `/api/admin/chapters/${id}`
  );

  const teacherOptions = useMemo(
    () =>
      teachersRes?.data?.teacher?.map((t) => ({
        value: t.id,
        label: t.name,
      })) || [],
    [teachersRes]
  );

  const courseOptions = useMemo(
    () =>
      coursesRes?.data?.courses?.map((c) => ({
        value: c.id,
        label: c.name,
      })) || [],
    [coursesRes]
  );

  // ---------------- FIELDS ----------------
  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Chapter Name",
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
        name: "courseId",
        label: "Course",
        type: "select",
        required: true,
        options: courseOptions,
        section: "General Information",
      },
    

      // 🔥 PRICE PLANS SYSTEM (NEW)
      {
        name: "pricePlans",
        label: "Price Plans",
        type: "custom",
        fullWidth: true,
        section: "Pricing",
        render: ({ value, onChange }) => (
          <PricePlansField
            value={value || []}
            onChange={onChange}
          />
        ),
      },

      {
        name: "description",
        label: "Description",
        type: "text",
        section: "General Information",
                helperText : "leave empty for no description",

      },
      {
        name: "preRequisition",
        label: "Pre-requisition",
        type: "text",
        section: "General Information",
        helperText: "leave empty for no pre-requisition"

      },
      {
        name: "whatYouGain",
        label: "What You Will Gain",
        type: "text",
        section: "General Information",
                helperText: "leave empty for no what you will gain",

      },
      {
        name: "image",
        label: "Chapter Image",
        type: "file",
        section: "Media",
      },
    ],
    [teacherOptions, courseOptions]
  );

  // ---------------- INITIAL DATA ----------------
const initialData = useMemo(() => {
  const data = chapterRes?.data;

  return {
    name: data?.chapter?.name || "",
    teacherId: data?.teacher?.id || "",
    courseId: data?.course?.id || "",
    duration: data?.chapter?.duration || "",

    description: data?.chapter?.description || "",
    preRequisition: data?.chapter?.preRequisition || "",
    whatYouGain: data?.chapter?.whatYouGain || "",
    image: data?.chapter?.image || "",

    // 🔥 المهم هنا
    pricePlans:
      data?.prices?.map((p) => ({
        label: p.durationLabel,
        days: p.durationDays,
        priceEgp: p.priceEgp,
        priceUsd: p.priceUsd,
        hasDiscount: p.hasDiscount,
        discountEgp: p.discountEgp,
        discountUsd: p.discountUsd,
      })) || [],
  };
}, [chapterRes]);
  // ---------------- SAVE ----------------
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSave = async (formData) => {
    
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
    let imageBase64 = null;

    if (formData.image instanceof File) {
      imageBase64 = await fileToBase64(formData.image);
    } else if (typeof formData.image === "string") {
      imageBase64 = formData.image;
    }

    const payload = {
      name: formData.name,
      teacherId: formData.teacherId,
      courseId: formData.courseId,
      description: formData.description || "",
      preRequisition: formData.preRequisition || "",
      whatYouGain: formData.whatYouGain || "",
      image: imageBase64,
    };

    // 🔥 convert pricePlans → backend format
    payload.pricePlans = formData.pricePlans.map((p) => ({
      label: p.label,
      days: Number(p.days),
      priceEgp: Number(p.priceEgp),
      priceUsd: Number(p.priceUsd),
      hasDiscount: p.hasDiscount,
      discountEgp: p.hasDiscount ? Number(p.discountEgp) : 0,
      discountUsd: p.hasDiscount ? Number(p.discountUsd) : 0,
    }));

    await putData(
      payload,
      `/api/admin/chapters/${id}`,
      "Chapter updated successfully"
    );

    navigate(-1);
  };

  // ---------------- LOADING ----------------
  if (loadingChapter || loadingTeachers || loadingCourses)
    return <Loader />;

  if (error || errorTeachers || errorCourses)
    return <Errorpage />;

  // ---------------- UI ----------------
  return (
    <AddPage
      title="Edit Chapter"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialData}
    />
  );
};

export default EditChapters;