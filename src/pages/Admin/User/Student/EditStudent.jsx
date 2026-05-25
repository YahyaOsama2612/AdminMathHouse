import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import useLazyGet from "@/hooks/useLazyGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // 🔹 جلب بيانات الطالب الحالي
  const { data: studentRes, loading: loadingStudent, error: selectError } = useGet(`/api/admin/student/${id}`);

  // 🔹 جلب البيانات الأولية (categories + grades الافتراضية)
  const { data: selectData, loading: loadingSelect, error: selectError2 } = useGet("/api/admin/student/select");

  // 🔹 جلب grades عند تغيير category
  const { data: gradesData, loading: loadingGrades, fetchData: fetchGrades } = useLazyGet();

  const { putData, loading: saving } = usePut(`/api/admin/student/${id}`);

  // 🔹 قائمة grades المفلترة (null = استخدم الافتراضية)
  const [filteredGrades, setFilteredGrades] = useState(null);

  // 🔹 مزامنة filteredGrades عند وصول رد من fetchGrades
  useEffect(() => {
    if (gradesData?.data?.data?.grades !== undefined) {
      setFilteredGrades(gradesData.data.data.grades);
    }
  }, [gradesData]);

  const student = studentRes?.data?.data;

  // 🔹 عند تحميل بيانات الطالب → جلب grades الخاصة بـ category الطالب
  useEffect(() => {
    if (student?.category && selectData) {
      fetchGrades(`/api/admin/student/select?categoryId=${student.category}`);
    }
  }, [student?.category, selectData, fetchGrades]);

  const categoriesOptions = useMemo(() => {
    return (
      selectData?.data?.data?.categories?.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })) || []
    );
  }, [selectData]);

  const gradesOptions = useMemo(() => {
    const grades = filteredGrades ?? selectData?.data?.data?.grades;
    return (
      grades?.map((g) => ({
        value: g,
        label: `Grade ${g}`,
      })) || []
    );
  }, [filteredGrades, selectData]);

  // 🔹 handler لتغيير category → إعادة تعيين grade وجلب grades الجديدة
  const handleCategoryChange = useCallback(
    async (selectedValue, setFormData) => {
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
        placeholder: "Leave blank to keep current password",
        section: "Account Information",
      },
      {
        name: "phone",
        label: "Phone",
        type: "text",
        placeholder: "Student phone",
        section: "Account Information",
      },
      {
        name: "parentphone",
        label: "Parent Phone",
        type: "text",
        placeholder: "Parent phone",
        section: "Account Information",
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: categoriesOptions,
        section: "Account Information",
        helperText: "Choose the student's category",
        onChange: handleCategoryChange,
      },
      {
        name: "grade",
        label: "Grade",
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

  const onSave = async (formData) => {
    const payload = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      nickname: formData.nickname || "",
      email: formData.email,
      password: formData.password || undefined,
      phone: formData.phone || "",
      parentphone: formData.parentphone || "",
      category: formData.category || null,
      grade: formData.grade || null,
    };

    await putData(payload, `/api/admin/student/${id}`, "Student updated successfully");
    navigate("/admin/users/students");
  };

  if (loadingStudent || loadingSelect) return <Loader />;
  if (selectError || selectError2) return <Errorpage />;

  return (
    <AddPage
      title="Edit Student"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/users/students")}
      initialData={{
        firstname: student?.firstname || "",
        lastname: student?.lastname || "",
        nickname: student?.nickname || "",
        email: student?.email || "",
        password: "",
        phone: student?.phone || "",
        parentphone: student?.parentphone || "",
        category: student?.category || "",
        grade: student?.grade || "",
      }}
    />
  );
};

export default EditStudent;
