import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import { FormSkeleton, LoadError } from "@/pages/Admin/Settings/settingsKit";
import PromoCodeForm from "./PromoCodeForm";

const AddPromoCode = () => {
  const navigate = useNavigate();

  const { postData } = usePost("/api/admin/promoCodes");

  const {
    data: packagesRes,
    loading: loadingPackages,
    error: packagesError,
    refetch: refetchPackages,
  } = useGet("/api/admin/package/selection");

  const {
    data: currenciesRes,
    loading: loadingCurrencies,
    error: currenciesError,
    refetch: refetchCurrencies,
  } = useGet("/api/admin/promoCodes/currency");

  const packageOptions = useMemo(
    () => packagesRes?.data?.map((p) => ({ value: p.value, label: p.label })) || [],
    [packagesRes],
  );

  const currencyOptions = useMemo(
    () => currenciesRes?.data?.data?.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })) || [],
    [currenciesRes],
  );

  const initialData = useMemo(
    () => ({
      promoName: "",
      code: "",
      discountAmount: "",
      numberOfUsages: "",
      type: "generic",
      studentIds: [],
      packageIds: [],
      currencyIds: [],
      lessonSelector: { lessonIds: [], chapterIds: [], courseIds: [] },
      startDate: "",
      endDate: "",
    }),
    [],
  );

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

    if (formData.type === "restricted" && (!formData.studentIds || formData.studentIds.length === 0)) {
      toast.error("Please select at least one student for a restricted promo code");
      return;
    }

    const payload = {
      promoName: formData.promoName,
      code: formData.code,
      discountAmount: Number(formData.discountAmount),
      numberOfUsages: Number(formData.numberOfUsages),
      courseIds: formData.lessonSelector?.courseIds || [],
      packageIds: formData.packageIds || [],
      chapterIds: formData.lessonSelector?.chapterIds || [],
      lessonIds: formData.lessonSelector?.lessonIds || [],
      currencyIds: formData.currencyIds || [],
      startDate: formData.startDate,
      endDate: formData.endDate,
      type: formData.type,
    };

    // studentIds is only relevant (and only sent) when the promo is restricted
    if (formData.type === "restricted") {
      payload.studentIds = formData.studentIds || [];
    }

    await postData(payload, "/api/admin/promoCodes", "Promo code added successfully");
    navigate("/admin/marketing/promocodes");
  };

  if (loadingPackages || loadingCurrencies || ((!packagesRes || !currenciesRes) && !packagesError && !currenciesError))
    return <FormSkeleton />;
  if (packagesError || currenciesError)
    return (
      <LoadError
        text="Could not load packages or currencies."
        onRetry={() => {
          refetchPackages();
          refetchCurrencies();
        }}
      />
    );

  return (
    <PromoCodeForm
      isNew
      initial={initialData}
      packageOptions={packageOptions}
      currencyOptions={currencyOptions}
      onSave={onSave}
    />
  );
};

export default AddPromoCode;
