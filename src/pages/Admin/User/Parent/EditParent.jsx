import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import StudentPicker from "@/pages/Admin/Live/Groups/parts/StudentPicker";

const EditParent = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: parentRes, loading, error } = useGet(`/api/admin/parent/${id}`);
  const { putData, loading: saving } = usePut(`/api/admin/parent/${id}`);
  const parent = parentRes?.data?.data;
  // Students already linked to this parent (GET /api/admin/parent/:id → students [{ id, name, nickname, email }])
  const linked = useMemo(() => parent?.students || [], [parent]);

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Parent Name",
        type: "text",
        required: true,
        placeholder: "Enter parent name",
        section: "Contact Information",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "example@email.com",
        section: "Contact Information",
      },
      {
        name: "phoneNumber",
        label: "Phone Number",
        type: "number",
        required: true,
        placeholder: "010xxxxxxxx",
        section: "Contact Information",
      },
      {
        name: "password",
        label: "Password",
        type: "text",
        placeholder: "Leave empty to keep current password",
        section: "Contact Information",
      },
      {
        // Already-linked students start ticked and show by name; saving keeps exactly the ticked ones.
        name: "studentIds",
        label: "Students",
        fullWidth: true,
        type: "custom",
        render: ({ value, onChange, error }) => (
          <StudentPicker value={value || []} onChange={(ids) => onChange(ids)} known={linked} error={error} />
        ),
      },
    ],
    [linked],
  );

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      // 3. إضافة الـ studentIds المحددة إلى الـ payload المرسل للسيرفر
      studentIds: formData.studentIds || [],
    };

    if (formData.password?.trim()) {
      payload.password = formData.password;
    }

    try {
      await putData(
        payload,
        `/api/admin/parent/${id}`,
        "Parent updated successfully",
      );
      navigate("/admin/users/parents");
    } catch (e) {
      throw e;
    }
  };

  if (loading || saving) {
    // عرض الـ Loader أيضاً أثناء الحفظ إذا أردت
    return <Loader />;
  }
  if (error) {
    return <Errorpage />;
  }

  const currentStudents =
    parent?.students?.map((student) => student._id || student.id) ||
    parent?.studentIds ||
    [];

  return (
    <AddPage
      title="Edit Parent"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/users/parents")}
      initialData={{
        name: parent?.name || "",
        email: parent?.email || "",
        phoneNumber: parent?.phoneNumber || "",
        password: "",
        // 4. تمرير الطلاب الحاليين القادمين من الـ API ليعرضهم الجدول تلقائياً عند فتح الصفحة
        studentIds: currentStudents,
      }}
    />
  );
};

export default EditParent;
