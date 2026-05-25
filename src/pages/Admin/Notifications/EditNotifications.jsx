import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditNotifications = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // 🔹 جلب بيانات الإشعار الواحد
  const {
    data: notificationRes,
    loading: loadingOne,
    error: errorOne,
  } = useGet(`/api/admin/notification/${id}`);

  // 🔹 جلب خيارات المستلمين
  const {
    data: optionsData,
    loading: loadingOptions,
    error: errorOptions,
  } = useGet("/api/admin/notification/select-options");

  const { putData, loading: saving } = usePut(`/api/admin/notification/${id}`);

  const parentsOptions = optionsData?.data?.parents || [];
  const studentsOptions = optionsData?.data?.students || [];
  const teachersOptions = optionsData?.data?.teachers || [];

  const fields = useMemo(
    () => [
      {
        name: "notification",
        label: "Notification Text",
        type: "text",
        required: true,
        fullWidth: true,
      section: "General Information",
      },
    
      {
        name: "materialLink",
        label: "Material Link",
        type: "text",
        fullWidth: true,
      section: "General Information",
      },
      {
        name: "dateTime",
        label: "Date & Time",
        type: "datetime",
        required: true,
      section: "General Information",
      },

      // 👇 multipleSelect للمستلمين
      {
        name: "parentIds",
        label: "Parents",
        type: "multipleSelect",
        options: parentsOptions,
      section: "General Information",
      },
      {
        name: "studentIds",
        label: "Students",
        type: "multipleSelect",
        options: studentsOptions,
      section: "General Information",
      },
      {
        name: "teacherIds",
        label: "Teachers",
        type: "multipleSelect",
        options: teachersOptions,
      section: "General Information",
      },  {
        name: "sendToAll",
        label: "Send To All Users",
        type: "switch",
      section: "General Information",
      },
    ],
    [parentsOptions, studentsOptions, teachersOptions]
  );

  const onSave = async (formData) => {
    if (!formData.notification?.trim()) {
      toast.error("Notification text is required");
      return;
    }

    if (!formData.dateTime) {
      toast.error("Please select date & time");
      return;
    }

    if (!formData.sendToAll) {
      const hasAnyRecipient =
        formData.parentIds.length ||
        formData.studentIds.length ||
        formData.teacherIds.length;

      if (!hasAnyRecipient) {
        toast.error("Select at least one recipient or enable Send To All");
        return;
      }
    }

    const payload = {
      materialLink: formData.materialLink || null,
      dateTime: formData.dateTime,
      notification: formData.notification,
      sendToAll: formData.sendToAll,
      parentIds: formData.sendToAll ? [] : formData.parentIds,
      studentIds: formData.sendToAll ? [] : formData.studentIds,
      teacherIds: formData.sendToAll ? [] : formData.teacherIds,
    };

    await putData(payload, `/api/admin/notification/${id}`, "Notification updated successfully");
    navigate("/admin/notifications");
  };

  if (loadingOne || loadingOptions || saving) return <Loader />;
  if (errorOne || errorOptions) return <Errorpage />;

  const notification = notificationRes?.data;

  return (
    <AddPage
      title="Edit Notification"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/notifications")}
      initialData={{
        notification: notification?.notification || "",
        sendToAll: notification?.sendToAll ?? false,
        materialLink: notification?.materialLink || "",
      
        dateTime: notification?.dateTime
          ? new Date(notification.dateTime).toISOString().slice(0, 19)
          : "",
        parentIds: notification?.parents?.map((p) => p.value) || [],
        studentIds: notification?.students?.map((s) => s.value) || [],
        teacherIds: notification?.teachers?.map((t) => t.value) || [],
      }}
    />
  );
};

export default EditNotifications;