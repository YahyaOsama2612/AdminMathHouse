import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";

const AddNotifications = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/notification");

  // جلب خيارات المستلمين
  const { data: optionsData, loading: optionsLoading } = useGet(
    "/api/admin/notification/select-options"
  );

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
      section: "General Information",
      },
      
      {
        name: "materialLink",
        label: "Material Link",
        type: "text",
      section: "General Information",
      },
      {
        name: "dateTime",
        label: "Date & Time",
        type: "datetime",
        required: true,
      section: "General Information",
      },

      // 👇 multipleSelect بدل Custom
      {
        name: "parentIds",
        label: "Parents",
        type: "multipleSelect",
        options: parentsOptions,
      section: "General Information",
        disabled: false,
      },
      {
        name: "studentIds",
        label: "Students",
        type: "multipleSelect",
        options: studentsOptions,
      section: "General Information",
        disabled: false,
      },
      {
        name: "teacherIds",
        label: "Teachers",
        type: "multipleSelect",
        options: teachersOptions,
      section: "General Information",
        disabled: false,
      },{
        name: "sendToAll",
        label: "Send To All Users",
        type: "switch",
      section: "General Information",
      }
    ],
    [parentsOptions, studentsOptions, teachersOptions]
  );

  const initialFormValues = useMemo(
    () => ({
      notification: "",
      sendToAll: false,
      materialLink: "",
      dateTime: "",
      parentIds: [],
      studentIds: [],
      teacherIds: [],
    }),
    []
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

    await postData(payload, "/api/admin/notification", "Notification sent successfully");
    navigate("/admin/notifications");
  };

  return (
    <AddPage
      title="Add Notification"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/notifications")}
      initialData={initialFormValues}
      loading={saving || optionsLoading}
    />
  );
};

export default AddNotifications;