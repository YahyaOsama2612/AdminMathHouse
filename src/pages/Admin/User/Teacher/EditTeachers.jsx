import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import api from "@/api/api";

const EditTeachers = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCours, setLoadingCours] = useState(false);

  // جلب المدرس
  const {
    data: teacherRes,
    loading: loadingOne,
    error,
  } = useGet(`/api/admin/teacher/${id}`);

  // جلب الكاتيجوريز
  const {
    data: categoriesRes,
    loading: loadingCats,
    error: errorC,
  } = useGet("/api/admin/teacher/selectionCategories");

  const { putData } = usePut(`/api/admin/teacher/${id}`);

  const teacher = teacherRes?.data?.teacher;

  // تحميل الكورسات حسب الكاتيجوري
  useEffect(() => {
    if (!selectedCategory) {
      setCourses([]);
      return;
    }

    const fetchCourses = async () => {
      try {
        setLoadingCours(true);

        const res = await api.get(
          `/api/admin/courses/category/${selectedCategory}`
        );

        setCourses(res.data?.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCours(false);
      }
    };

    fetchCourses();
  }, [selectedCategory]);

  // عند تحميل المدرس نحدد الكاتيجوري الخاصة به
  useEffect(() => {
    if (teacher?.categoryId) {
      setSelectedCategory(teacher.categoryId);
    }
  }, [teacher]);

  const categoryOptions = useMemo(() => {
    return (
      categoriesRes?.data?.data?.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })) || []
    );
  }, [categoriesRes]);

  const couersOptions = useMemo(() => {
    return (
      courses?.map((course) => ({
        value: course.id,
        label: course.name,
      })) || []
    );
  }, [courses]);

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Teacher Name",
        type: "text",
        required: true,
        placeholder: "Enter teacher name",
        section: "General Information",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "Enter email",
        section: "General Information",
      },
      {
        name: "phoneNumber",
        label: "Phone Number",
        type: "text",
        pattern: /^[0-9]{10,15}$/,
        required: true,
        placeholder: "Enter phone number",
        section: "General Information",
      },
      {
        name: "password",
        label: "Password (Optional)",
        type: "password",
        placeholder: "Leave empty to keep current password",
        section: "General Information",
      },
      {
        name: "avatar",
        label: "Avatar (Optional)",
        type: "file",
        section: "General Information",
      },
      {
    name: "categoryId",
    label: "Category",
    type: "select",
    options: categoryOptions,
    section: "Assignment",
    onChange: (value, setForm) => {
      setSelectedCategory(value);
      // ✅ فوراً نمسح الكورسات المختارة لأنها تنتمي لكاتيجوري قديم
      if (setForm) {
        setForm(prev => ({ ...prev, courseIds: [] }));
      }
    },
  },
      {
        name: "courseIds",
        label: "Course (Optional)",
        type: "multipleSelect",
        options: couersOptions,
        section: "Assignment",
        helperText: "Optional: Assign teacher to a course",
      },
    ],
    [categoryOptions, couersOptions]
  );

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSave = async (formData) => {
    let avatarBase64 = null;

    if (formData.avatar instanceof File) {
      avatarBase64 = await fileToBase64(formData.avatar);
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      categoryId: formData.categoryId || null,
      courseIds: formData.courseIds || null,
    };

    if (formData.password?.trim()) {
      payload.password = formData.password;
    }

    if (avatarBase64) {
      payload.avatar = avatarBase64;
    }

    await putData(
      payload,
      `/api/admin/teacher/${id}`,
      "Teacher updated successfully"
    );

    navigate("/admin/users/teachers");
  };
const memoizedInitialData = useMemo(() => {
  if (!teacher) return null;
  return {
    name: teacher.name || "",
    email: teacher.email || "",
    phoneNumber: teacher.phoneNumber || "",
    password: "",
    avatar: teacher.avatar || "",
    categoryId: teacher.categoryId || "",
    courseIds: teacher.courses?.map((course) => course.id) || [],
  };
}, [teacher]);
  if (loadingOne || loadingCats ) {
    return <Loader />;
  }

  if (error || errorC) {
    return <Errorpage />;
  }

  return (
    <AddPage
      title="Edit Teacher"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/users/teachers")}
     initialData={memoizedInitialData}
    />
  );
};

export default EditTeachers;