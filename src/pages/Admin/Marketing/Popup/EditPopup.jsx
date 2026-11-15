import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { FormSkeleton, LoadError } from "@/pages/Admin/Settings/settingsKit";
import PopupForm from "./PopupForm";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const EditPopup = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: popupRes, loading: loadingPopup, error, refetch } = useGet(`/api/admin/popup/${id}`);
  const { putData } = usePut(`/api/admin/popup/${id}`);

  const popup = popupRes?.data?.popup;
  const currentImage = popup?.image || ""; // sent back unchanged when no new file is chosen

  const onSave = async (formData) => {
    if (formData.startDate > formData.endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    let imageBase64 = currentImage;
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

    await putData(payload, `/api/admin/popup/${id}`, "Popup updated successfully");
    navigate("/admin/marketing/popup");
  };

  if (loadingPopup || (!popupRes && !error)) return <FormSkeleton />;
  if (error) return <LoadError text="Could not load this popup." onRetry={refetch} />;

  return (
    <PopupForm
      key={popup?.id || id}
      initial={{
        name: popup?.name || "",
        destination: popup?.destination || "",
        image: popup?.image || "",
        isActive: popup?.isActive !== false, // the saved on/off switch (older popups default to on)
        startDate: popup?.startDate?.split("T")[0] || "",
        endDate: popup?.endDate?.split("T")[0] || "",
      }}
      onSave={onSave}
    />
  );
};

export default EditPopup;
