import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const AddPromoCode = () => {
  const navigate = useNavigate();

  const { postData, loading: saving } = usePost("/api/admin/promoCodes");

  const {
    data: coursesRes,
    loading: loadingCourses,
    error: coursesError,
  } = useGet("/api/admin/courses/selection");

  const {
    data: packagesRes,
    loading: loadingPackages,
    error: packagesError,
  } = useGet("/api/admin/package/selection");

  /* ================= Options ================= */
  const courseOptions = useMemo(
    () =>
      coursesRes?.data?.map((c) => ({
        value: c.value,
        label: c.label,
      })) || [],
    [coursesRes],
  );

  const packageOptions = useMemo(
    () =>
      packagesRes?.data?.map((p) => ({
        value: p.value,
        label: p.label,
      })) || [],
    [packagesRes],
  );

  /* ================= Fields ================= */
  const fields = useMemo(
    () => [
      {
        name: "promoName",
        label: "Promo Name",
        type: "text",
        required: true,
        section:"General Information"
      },
      {
        name: "code",
        label: "Promo Code",
        type: "text",
        required: true,
        section:"General Information"
      },
      {
        name: "discountAmount",
        label: "Discount (%)",
        type: "number",
        required: true,
        section:"General Information"
      },
      {
        name: "numberOfUsages",
        label: "Number Of Usages",
        type: "number",
        required: true,
        section:"General Information"
      },
      {
        name: "courseIds",
        label: "Courses",
        type: "multipleSelect",
        options: courseOptions,
        section:"General Information"
      },
      {
        name: "packageIds",
        label: "Packages",
        type: "multipleSelect",
        options: packageOptions,
        section:"General Information"
      },
      {
        name: "startDate",
        label: "Start Date",
        type: "datemin",
        required: true,
        section:"General Information"
      },
      {
        name: "endDate",
        label: "End Date",
        type: "datemin",
        required: true,
        section:"General Information"
      },
    ],
    [courseOptions, packageOptions],
  );

  /* ================= Initial Data ================= */
  const initialData = useMemo(
    () => ({
      promoName: "",
      code: "",
      discountAmount: "",
      numberOfUsages: "",
      courseIds: [],
      packageIds: [],
      startDate: "",
      endDate: "",
    }),
    [],
  );

  /* ================= Save ================= */
  const onSave = async (formData) => {
    if (formData.startDate > formData.endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    if (Number(formData.discountAmount) <= 0) {
      toast.error("Discount must be greater than 0");
      return;
    }
    if (Number(formData.discountAmount) >= 100) {
      toast.error("Discount must be less than 100");
      return;
    }

    const payload = {
      promoName: formData.promoName,
      code: formData.code,
      discountAmount: Number(formData.discountAmount),
      numberOfUsages: Number(formData.numberOfUsages),
      courseIds: formData.courseIds || [],
      packageIds: formData.packageIds || [],
      startDate: formData.startDate,
      endDate: formData.endDate,
    };

    await postData(payload, "/api/admin/promoCodes", "Promo code added successfully");
    navigate("/admin/marketing/promocodes");
  };

  if (loadingCourses || loadingPackages ) return <Loader />;
  if (coursesError || packagesError) return <Errorpage />;

  return (
    <AddPage
      title="Add Promo Code"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/marketing/promocodes")}
      initialData={initialData}
      loading={saving}
    />
  );
};

export default AddPromoCode;