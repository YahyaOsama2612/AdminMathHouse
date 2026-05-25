  import React, { useMemo } from "react";
  import { useNavigate, useLocation } from "react-router-dom";
  import { toast } from "react-hot-toast";
  import AddPage from "@/components/AddPage";
  import usePost from "@/hooks/usePost";
  import useGet from "@/hooks/useGet";
  import Loader from "@/components/Loader";
  import Errorpage from "@/components/Errorpage";
import PricePlansField from "@/components/PricePlansField";

  const AddLessons = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { chapterId } = location.state || {};

    const { postData, loading: saving } = usePost("/api/admin/lessons");
    const { data: teachersRes , loading: loadingTeachers , error: error } = useGet("/api/admin/teacher");
    // const { data: selectchaper , loading: loadingselectchaper, error: errorchaper } = useGet("/api/admin/lessons/select-chapters");

    const teacherOptions = useMemo(() => {
      return (
        teachersRes?.data?.teacher?.map((t) => ({
          value: t.id,
          label: t.name,
        })) || []
      );
    }, [teachersRes]);


    const fields = useMemo(
      () => [
        {
          name: "name",
          label: "Lesson Name",
          type: "text",
          required: true,
          placeholder: "Enter lesson name",
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
          label: "Description (Optional)",
          type: "text",
          placeholder: "Lesson description",
          section: "General Information",
          helperText: "optional",
        },
        {
          name: "preRequisition",
          label: "Pre-requisition (Optional)",
          type: "text",
          placeholder: "What students should know first",
          section: "General Information",
          helperText: "leave empty for no pre-requisition",
        },
        {
          name: "whatYouGain",
          label: "What You Will Gain (Optional)",
          type: "text",
          placeholder: "Skills you will gain",
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
       
             { name: "image", label: "Image", type: "file",
                               helperText: "leave empty for no image",
       
              },
      ],
      [teacherOptions]
    );

    // تحويل File إلى Base64
    const fileToBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const initialFormValues = useMemo(
      () => ({
        name: "",
        teacherId: "",
        pricePlans: [],
        description: "",
        preRequisition: "",
        whatYouGain: "",
        image: "",
      }),
      []
    );

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
                chapterId: chapterId,
      
          pricePlans: formData.pricePlans.map((p) => ({
            ...p,
            days: Number(p.days),
            priceEgp: Number(p.priceEgp),
            priceUsd: Number(p.priceUsd),
            discountEgp: p.hasDiscount ? Number(p.discountEgp) : undefined,
            discountUsd: p.hasDiscount ? Number(p.discountUsd) : undefined,
          })),
        };
      try {

      await postData(payload, "/api/admin/lessons", "Lesson added successfully");
      navigate(`/admin/courses/lessons/${chapterId}`);
        } catch (error) {
        throw error;
      } 
    };

    if (loadingTeachers ) return <Loader />;
    if (error  ) return <Errorpage />

    return (
      <AddPage
        title="Add Lesson"
        fields={fields}
        onSave={onSave}
        onCancel={() => navigate(-1)}
        
        initialData={initialFormValues}
      />
    );
  };

  export default AddLessons;
