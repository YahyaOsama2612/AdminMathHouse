import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import usePost from "@/hooks/usePost";
import PopupForm from "./PopupForm";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const AddPopup = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/popup");

  const onSave = async (formData) => {
    if (formData.startDate > formData.endDate) {
      toast.error("Start date must be before end date");
      return;
    }
    let imageBase64 = null;
    if (formData.image instanceof File) {
      imageBase64 = await fileToBase64(formData.image);
    }

    const payload = {
      name: formData.name,
      image: imageBase64,
      destination: formData.destination,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isActive: !!formData.isActive,
    };

    await postData(payload, "/api/admin/popup", "Popup added successfully");
    navigate("/admin/marketing/popup");
  };

  return (
    <PopupForm
      isNew
      imageRequired
      initial={{ name: "", image: "", destination: "", startDate: "", endDate: "", isActive: true }}
      onSave={onSave}
    />
  );
};

export default AddPopup;
