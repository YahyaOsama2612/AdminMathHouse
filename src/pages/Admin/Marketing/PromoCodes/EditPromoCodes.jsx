import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditPromoCodes = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: promoRes,
    loading: loadingPromo,
    error: promoError,
  } = useGet(`/api/admin/promoCodes/${id}`);

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

  const { putData, loading: saving } = usePut(`/api/admin/promoCodes/${id}`);

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
      promoName: promoRes?.data?.data?.promoName || "",
      code: promoRes?.data?.data?.code || "",
      discountAmount: promoRes?.data?.data?.discountAmount || "",
      numberOfUsages: promoRes?.data?.data?.numberOfUsagesAllowed || "",
      courseIds: promoRes?.data?.data?.courses?.map((c) => c.id) || [],
      packageIds: promoRes?.data?.data?.packages?.map((p) => p.id) || [],
      startDate: promoRes?.data?.data?.startDate?.split("T")[0] || "",
      endDate: promoRes?.data?.data?.endDate?.split("T")[0] || "",
    }),
    [promoRes],
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

    await putData(payload, `/api/admin/promoCodes/${id}`, "Promo code updated successfully");
    navigate("/admin/marketing/promocodes");
  };

  if (loadingPromo || loadingCourses || loadingPackages || saving) return <Loader />;
  if (promoError || coursesError || packagesError) return <Errorpage />;

  return (
    <AddPage
      title="Edit Promo Code"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/marketing/promocodes")}
      initialData={initialData}
      loading={saving}
    />
  );
};

export default EditPromoCodes;