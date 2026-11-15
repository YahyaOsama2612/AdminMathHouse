import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import { FormSkeleton, LoadError } from "@/pages/Admin/Settings/settingsKit";
import PromoCodeForm from "./PromoCodeForm";

const EditPromoCodes = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: promoRes, loading: loadingPromo, error: promoError, refetch } = useGet(`/api/admin/promoCodes/${id}`);
  const { data: packagesRes, loading: loadingPackages, error: packagesError, refetch: refetchPackages } = useGet("/api/admin/package/selection");
  const { data: currenciesRes, loading: loadingCurrencies, error: currenciesError, refetch: refetchCurrencies } = useGet("/api/admin/promoCodes/currency");

  const { putData } = usePut(`/api/admin/promoCodes/${id}`);

  const packageOptions = useMemo(
    () => packagesRes?.data?.map((p) => ({ value: p.value, label: p.label })) || [],
    [packagesRes],
  );

  const currencyOptions = useMemo(
    () => currenciesRes?.data?.data?.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })) || [],
    [currenciesRes],
  );

  // Rich lesson objects (with nested chapter/course/category/subCategory) used
  // to pre-populate the hierarchical selector's rows when editing.
  const initialLessons = useMemo(() => promoRes?.data?.data?.lessons || [], [promoRes]);

  const initialData = useMemo(
    () => ({
      promoName: promoRes?.data?.data?.promoName || "",
      code: promoRes?.data?.data?.code || "",
      discountAmount: promoRes?.data?.data?.discountAmount || "",
      numberOfUsages: promoRes?.data?.data?.numberOfUsagesAllowed || "",
      type: promoRes?.data?.data?.type || "generic",
      studentIds: promoRes?.data?.data?.allowedStudents?.map((s) => s.id) || [],
      packageIds: promoRes?.data?.data?.packages?.map((p) => p.id) || [],
      currencyIds: promoRes?.data?.data?.currencies?.map((c) => c.id) || [],
      lessonSelector: {
        lessonIds: (promoRes?.data?.data?.lessons || []).map((l) => l.id),
        chapterIds: (promoRes?.data?.data?.chapters || []).map((c) => c.id),
        courseIds: (promoRes?.data?.data?.courses || []).map((c) => c.id),
      },
      startDate: promoRes?.data?.data?.startDate?.split("T")[0] || "",
      endDate: promoRes?.data?.data?.endDate?.split("T")[0] || "",
    }),
    [promoRes],
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

    await putData(payload, `/api/admin/promoCodes/${id}`, "Promo code updated successfully");
    navigate("/admin/marketing/promocodes");
  };

  const waiting = (!promoRes && !promoError) || (!packagesRes && !packagesError) || (!currenciesRes && !currenciesError);
  if (loadingPromo || loadingPackages || loadingCurrencies || waiting) return <FormSkeleton />;
  if (promoError || packagesError || currenciesError)
    return (
      <LoadError
        text="Could not load this promo code."
        onRetry={() => {
          refetch();
          refetchPackages();
          refetchCurrencies();
        }}
      />
    );

  return (
    <PromoCodeForm
      key={id}
      initial={initialData}
      packageOptions={packageOptions}
      currencyOptions={currencyOptions}
      initialLessons={initialLessons}
      onSave={onSave}
    />
  );
};

export default EditPromoCodes;
