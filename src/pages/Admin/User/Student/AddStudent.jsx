import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import useLazyGet from "@/hooks/useLazyGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const AddStudent = () => {
  const navigate = useNavigate();

  // 🔹 جلب دالة الإرسال وحالة التحميل الخاصة بها
  const { postData, loading: saving, error: postError } = usePost("/api/admin/student");

  // 🔹 جلب البيانات الأولية (categories فقط — بدون categoryId)
  const { data: selectData, loading: loadingSelects, error: selectError } = useGet("/api/admin/student/select");

  // 🔹 جلب grades عند اختيار category
  const { data: gradesData, loading: loadingGrades, fetchData: fetchGrades } = useLazyGet();

  // 🔹 قائمة grades المفلترة (null = استخدم الافتراضية)
  const [filteredGrades, setFilteredGrades] = useState(null);

  // 🔹 مزامنة filteredGrades مع آخر رد من fetchGrades
  React.useEffect(() => {
    if (gradesData?.data?.data?.grades !== undefined) {
      setFilteredGrades(gradesData.data.data.grades);
    }
  }, [gradesData]);

  // 🔹 تجهيز خيارات categories
  const categoriesOptions = useMemo(() => {
    return (
      selectData?.data?.data?.categories?.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })) || []
    );
  }, [selectData]);

  // 🔹 تجهيز خيارات grades (مفلترة أو افتراضية)
  const gradesOptions = useMemo(() => {
    const grades = filteredGrades ?? selectData?.data?.data?.grades;
    return (
      grades?.map((g) => ({
        value: g.id,
        label: g.name,
      })) || []
    );
  }, [filteredGrades, selectData]);

  // 🔹 handler لتغيير category → جلب grades الخاصة بها
  const handleCategoryChange = useCallback(
    async (selectedValue, setFormData) => {
      // إعادة تعيين grade
      setFormData((prev) => ({ ...prev, grade: "" }));

      if (selectedValue) {
        setFilteredGrades(null);
        await fetchGrades(`/api/admin/student/select?categoryId=${selectedValue}`);
      } else {
        setFilteredGrades(null);
      }
    },
    [fetchGrades]
  );

  const fields = useMemo(
    () => [
      {
        name: "firstname",
        label: "First Name",
        type: "text",
        required: true,
        placeholder: "Enter first name",
        section: "Account Information",
      },
      {
        name: "lastname",
        label: "Last Name",
        type: "text",
        required: true,
        placeholder: "Enter last name",
        section: "Account Information",
      },
      {
        name: "nickname",
        label: "Nickname",
        type: "text",
        required: true,
        placeholder: "Optional nickname",
        section: "Account Information",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "Enter email",
        section: "Account Information",
      },
      {
        name: "password",
        label: "Password",
        type: "password",
        required: true,
        placeholder: "Enter password",
        section: "Account Information",
      },
      {
        name: "phone",
        label: "Phone",
        type: "text",
        pattern: /^[0-9]{10,15}$/,
        required: true,
        placeholder: "Student phone",
        section: "Account Information",
      },
      {
        name: "parentphone",
        label: "Parent Phone",
        type: "text",
        pattern: /^[0-9]{10,15}$/,
        placeholder: "Parent phone",
        section: "Account Information",
        helperText: "Optional",
      },
      {
        name: "category",
        label: "Category",
        required: true,
        type: "select",
        options: categoriesOptions,
        section: "Account Information",
        helperText: "Choose the student's category",
        onChange: handleCategoryChange,
      },
      {
        name: "grade",
        label: "Grade",
        required: true,
        type: "select",
        options: gradesOptions,
        isLoading: loadingGrades,
        isDisabled: loadingGrades,
        section: "Account Information",
        helperText: loadingGrades ? "Loading grades..." : "Choose the student's grade",
      },
    ],
    [categoriesOptions, gradesOptions, loadingGrades, handleCategoryChange]
  );

  const initialFormValues = useMemo(
    () => ({
      firstname: "",
      lastname: "",
      nickname: "",
      email: "",
      password: "",
      phone: "",
      parentphone: "",
      category: "",
      grade: "",
    }),
    []
  );

  const onSave = async (formData) => {
    const payload = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      nickname: formData.nickname || "",
      email: formData.email,
      password: formData.password,
      phone: formData.phone || "",
      category: formData.category || null,
      grade: formData.grade || null,
    };
    if (formData.parentphone) payload.parentphone = formData.parentphone;

    try {
      await postData(payload, "/api/admin/student", "Student added successfully");
      navigate("/admin/users/students");
    } catch (error) {
      throw error;
    }
  };

  if (loadingSelects) return <Loader />;
  if (selectError) return <Errorpage />;

  return (
    <AddPage
      title="Add Student"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/users/students")}
      initialData={initialFormValues}
    />
  );
};

export default AddStudent;