import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import axios from "axios";
import { getToken } from "../../../../utils/auth";

const EditPackages = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = getToken();
  const { putData, loading: saving } = usePut(`/api/admin/package/${id}`);

  // 🔹 Get package data
  const { data: packageRes, loading: loadingOne, error: errorOne } = 
    useGet(`/api/admin/package/${id}`);

  // 🔹 Get select options (types & categories)
  const { data: selectData, loading: loadingSelect, error: errorSelect } = 
    useGet("/api/admin/package/select");

  const [courseOptions, setCourseOptions] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // تحديث الكورسات عند تغير الكاتيجوري
  useEffect(() => {
    if (!selectedCategoryId) return;

    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await axios.get(`https://bcknd.mathshouse.net/api/admin/package/courses/${selectedCategoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const options = res.data?.data?.map(c => ({ value: c.value, label: c.label })) || [];
        setCourseOptions(options);
      } catch (err) {
        toast.error("Failed to load courses");
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [selectedCategoryId, token]);

  const typeOptions = useMemo(() => selectData?.data?.types || [], [selectData]);
  const categoryOptions = useMemo(() => selectData?.data?.categories || [], [selectData]);

  
  useEffect(() => {
    if (packageRes?.data?.categoryId) {
      setSelectedCategoryId(packageRes.data.categoryId);
    }
  }, [packageRes]);

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
    try {
      await putData(payload, `/api/admin/package/${id}`, "Package updated successfully");
      navigate(-1);
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingOne || loadingSelect || saving) return <Loader />;
  if (errorOne || errorSelect) return <Errorpage />;

  const pkg = packageRes?.data || {};

  return (
    <AddPage
      title="Edit Package"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{
        name: pkg.name || "",
        type: pkg.type || "",
        categoryId: pkg.categoryId || "",
        courseId: pkg.courseId || "",
        number: pkg.number || 0,
        price: pkg.price || 0,
        duration: pkg.duration || 0,
      }}
    />
  );
};

export default EditPackages;