import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import axios from "axios";
import { getToken } from "../../../../utils/auth";

const AddPackages = () => {
  const navigate = useNavigate();
  const token = getToken();
  const { postData } = usePost("/api/admin/package");

  // جلب البيانات الأساسية
  const { data: selectData, loading: loadingSelect, error: errorSelect } = 
    useGet("/api/admin/package/select");

  const [courseOptions, setCourseOptions] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // تحويل الداتا لشكل label و value
  const typeOptions = useMemo(() => 
    selectData?.data?.types || [], [selectData]);

  const categoryOptions = useMemo(() => 
    selectData?.data?.categories || [], [selectData]);

  // جلب الكورسات عند تغير الـ Category
  useEffect(() => {
    if (!selectedCategoryId) return;

    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await axios.get(`https://bcknd.mathshouse.net/api/admin/package/courses/${selectedCategoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const options = res.data?.data  .map(c => ({ value: c.value, label: c.label })) || [];
        
        setCourseOptions(options);
      } catch (err) {
        toast.error("Failed to load courses");
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [selectedCategoryId, token]);

  const fields = useMemo(() => [
    {
      name: "name",
      label: "Package Name",
      type: "text",
      required: true,
      section: "General Information",
    },
    {
      name: "type",
      label: "Module",
      type: "select",
      required: true,
      options: typeOptions,
      section: "General Information",
    },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      required: true,
      options: categoryOptions,
      section: "General Information",
      onChange: (val) => setSelectedCategoryId(val) 
    },
    {
      name: "courseId",
      label: "Course",
      type: "select",
      required: true,
      options: courseOptions,
      section: "General Information",
      placeholder: loadingCourses ? "Loading..." : "Select Course",
    },
   
    {
      name: "number",
      label: "Number of Items",
      type: "number",
      required: true,
      section: "General Information",
    },
    {
      name: "price",
      label: "Price",
      type: "numberdecimal",
      required: true,
      section: "General Information",
    },
    {
      name: "duration",
      label: "Duration (Days)",
      type: "number",
      required: true,
      section: "General Information",
    },
  ], [typeOptions, categoryOptions, courseOptions, loadingCourses]);

  const onSave = async (formData) => {
    const payload = {
      ...formData,
      number: formData.number ? Number(formData.number) : 0,
      price: formData.price ? Number(formData.price) : 0,
      duration: formData.duration ? Number(formData.duration) : 0,
    };
    await postData(payload, "/api/admin/package", "Package added successfully");
    navigate(-1);
  };

  if (loadingSelect) return <Loader />;
  if (errorSelect) return <Errorpage />;

  return (
    <AddPage
      title="Add Package"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{}} 
    />
  );
};

export default AddPackages;