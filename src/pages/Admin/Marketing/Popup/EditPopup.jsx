import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditPopup = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: popupRes, loading: loadingPopup, error } = useGet(`/api/admin/popup/${id}`);
  const { putData, loading: saving } = usePut(`/api/admin/popup/${id}`);

  const [currentImage, setCurrentImage] = useState("");

  useEffect(() => {
    if (popupRes?.data?.popup?.image) {
      setCurrentImage(popupRes.data.popup.image);
    }
  }, [popupRes]);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Popup Name",
        type: "text",
        required: true,
        section:"General Information"
      },
   
      {
        name: "destination",
        label: "Destination",
        type: "select",
        options: [
          { value: "student", label: "Student" },
          { value: "parent", label: "Parent" },
          { value: "teacher", label: "Teacher" },
        ],
        required: true,
        section:"General Information"
      },
      {
        name: "isActive",
        label: "Active",
        type: "switch",
        section:"General Information"
      },
       {
        name: "startDate",
        label: "Start Date",
        type: "datemin",
        required: true,
        section:"General Information"
      },
      {
        name: "endDate",
        label: "End Date",
        type: "datemin",
        required: true,
        section:"General Information"
      },
      
         {
        name: "image",
        label: "Popup Image",
        type: "file",
        section:"General Information",
        helperText: "Upload a new image to replace the old one",
        // preview: currentImage, // 👈 عرض الصورة الحالية كـ preview
      },
     
    ],
    [currentImage]
  );

  const initialData = useMemo(
    () => ({
      name: popupRes?.data?.popup?.name || "",
      destination: popupRes?.data?.popup?.destination || "",
      image: popupRes?.data?.popup?.image || "",
      isActive: popupRes?.data?.popup?.isActive || false,
      startDate: popupRes?.data?.popup?.startDate?.split("T")[0] || "",
      endDate: popupRes?.data?.popup?.endDate?.split("T")[0] || "",
    }),
    [popupRes]
  );

  const onSave = async (formData) => {
    if (formData.startDate > formData.endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    let imageBase64 = currentImage; // القيمة الافتراضية هي الصورة القديمة
    if (formData.image instanceof File) {
      imageBase64 = await fileToBase64(formData.image);
    }

    const payload = {
      name: formData.name,
      destination: formData.destination,
      image: imageBase64,
      isActive: formData.isActive,
      startDate: formData.startDate,
      endDate: formData.endDate,
    };

    try {
      await putData(payload, `/api/admin/popup/${id}`, "Popup updated successfully");
      navigate("/admin/marketing/popup");
    } catch (error) {
      throw error;
    }
  };

  if (loadingPopup || saving) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <AddPage
      title="Edit Popup"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/marketing/popup")}
      initialData={initialData}
      loading={saving}
    />
  );
};

export default EditPopup;