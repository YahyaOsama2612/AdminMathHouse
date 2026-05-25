import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import api from "@/api/api";

const AddTeachers = () => {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCours, setLoadingCours] = useState(false);

  const { postData } = usePost("/api/admin/teacher");

  const {
    data: categoriesRes,
    loading: loadingCats,
    error,
  } = useGet("/api/admin/teacher/selectionCategories");

  // fetch courses when category changes
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

        setCourses(res.data?.data?.data  || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCours(false);
      }
    };

    fetchCourses();
  }, [selectedCategory]);

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
        label: "Password",
        type: "password",
        required: true,
        placeholder: "Enter password",
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
        label: "Category (Optional)",
        type: "select",
        options: categoryOptions,
        section: "Assignment",
        helperText: "Optional: Assign teacher to a category",
        onChange: (value) => {
          setSelectedCategory(value);
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

  const initialFormValues = useMemo(
    () => ({
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      avatar: "",
      categoryId: "",
      courseIds: [],
    }),
    []
  );

  const onSave = async (formData) => {
    let avatarBase64 = null;

    if (formData.avatar instanceof File) {
      avatarBase64 = await fileToBase64(formData.avatar);
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      password: formData.password,
      avatar: avatarBase64,
      categoryId: formData.categoryId || null,
      courseIds: formData.courseIds || null,
    };

    try {
      await postData(
        payload,
        "/api/admin/teacher",
        "Teacher added successfully"
      );

      navigate("/admin/users/teachers");
    } catch (error) {
      throw error;
    }
  };

  if (loadingCats) {
    return <Loader />;
  }

  if (error) {
    return <Errorpage />;
  }

  return (
    <AddPage
      title="Add Teacher"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/users/teachers")}
      initialData={initialFormValues}
    />
  );
};

export default AddTeachers;