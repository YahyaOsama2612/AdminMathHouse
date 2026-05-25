import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import PricePlansField from "@/components/PricePlansField";

const AddChapters = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { courseId, semesterId } = location.state || {};

  const { postData, loading: saving } = usePost("/api/admin/chapters");

  const { data: teachersRes, loading: loadingTeachers, error: errorTeachers } =
    useGet("/api/admin/teacher/selectionTeachers");

  const { data: coursesRes, loading: loadingCours, error } =
    useGet("/api/admin/teacher/selectionCourses");

  const teacherOptions = useMemo(() => {
    return (
      teachersRes?.data?.teacher?.map((t) => ({
        value: t.id,
        label: t.name,
      })) || []
    );
  }, [teachersRes]);

  const courseOptions = useMemo(() => {
    return (
      coursesRes?.data?.courses?.map((c) => ({
        value: c.id,
        label: c.name,
      })) || []
    );
  }, [coursesRes]);

  // ✅ FIELDS UPDATED
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
helperText: "leave empty for no pre-requisition",      },

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
        section: "General Information",
        render: ({ value, onChange }) => (
          <PricePlansField value={value || []} onChange={onChange} />
        ),
      },
      {
        name: "image",
        label: "Chapter Image",
        type: "file",
        section: "Media",
      },
    ],
    [teacherOptions]
  );

  // default values
  const initialFormValues = useMemo(
    () => ({
      name: "",
      teacherId: "",
      pricePlans: [], // ✅ important
      description: "",
      preRequisition: "",
      whatYouGain: "",
      image: "",
    }),
    []
  );

  // file convert
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // SAVE
  const onSave = async (formData) => {
    let imageBase64 = null;

    if (formData.image instanceof File) {
      imageBase64 = await fileToBase64(formData.image);
    }

    // ❗ validation
    if (!formData.pricePlans || formData.pricePlans.length === 0) {
      toast.error("Price plans are required");
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
      name: formData.name,
      teacherId: formData.teacherId,
      courseId: courseId,
      pricePlans: formData.pricePlans.map((p) => ({
        label: p.label,
        days: Number(p.days),
        priceEgp: Number(p.priceEgp),
        priceUsd: Number(p.priceUsd),
        hasDiscount: p.hasDiscount || false,
        discountEgp: p.hasDiscount ? Number(p.discountEgp || 0) : undefined,
        discountUsd: p.hasDiscount ? Number(p.discountUsd || 0) : undefined,
      })),
    };

    if (semesterId) payload.semesterId = semesterId;
    if (formData.description) payload.description = formData.description;
    if (formData.preRequisition) payload.preRequisition = formData.preRequisition;
    if (formData.whatYouGain) payload.whatYouGain = formData.whatYouGain;
    if (imageBase64) payload.image = imageBase64;

    await postData(payload, "/api/admin/chapters", "Chapter added successfully");

    navigate(`/admin/courses/chapters/${courseId}`, {
      state: { courseId, semesterId },
    });
  };

  if (loadingTeachers || loadingCours) return <Loader />;
  if (error || errorTeachers) return <Errorpage />;

  return (
    <AddPage
      title="Add Chapter"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={initialFormValues}
    />
  );
};

export default AddChapters;