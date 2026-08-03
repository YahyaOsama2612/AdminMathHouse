import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "@/components/HierarchicalLessonSelector";

const TYPE_OPTIONS = [
  { value: "generic", label: "Generic" },
  { value: "restricted", label: "Restricted" },
];

const EditPromoCodes = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: promoRes,
    loading: loadingPromo,
    error: promoError,
  } = useGet(`/api/admin/promoCodes/${id}`);

  const {
    data: packagesRes,
    loading: loadingPackages,
    error: packagesError,
  } = useGet("/api/admin/package/selection");

  const {
    data: currenciesRes,
    loading: loadingCurrencies,
    error: currenciesError,
  } = useGet("/api/admin/promoCodes/currency");

  const { putData, loading: saving } = usePut(`/api/admin/promoCodes/${id}`);

  /* ================= Options ================= */
  const packageOptions = useMemo(
    () =>
      packagesRes?.data?.map((p) => ({
        value: p.value,
        label: p.label,
      })) || [],
    [packagesRes],
  );

  const currencyOptions = useMemo(
    () =>
      currenciesRes?.data?.data?.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.code})`,
      })) || [],
    [currenciesRes],
  );

  // Rich lesson objects (with nested chapter/course/category/subCategory) used
  // to pre-populate the hierarchical selector's rows when editing.
  const initialLessons = useMemo(
    () => promoRes?.data?.data?.lessons || [],
    [promoRes],
  );

  /* ================= Fields ================= */
  const fields = useMemo(
    () => [
      {
        name: "promoName",
        label: "Promo Name",
        type: "text",
        required: true,
        section: "General Information",
      },
      {
        name: "code",
        label: "Promo Code",
        type: "text",
        required: true,
        helperText: "Must be unique",
        section: "General Information",
      },
      {
        name: "discountAmount",
        label: "Discount (%)",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "numberOfUsages",
        label: "Number Of Usages",
        type: "number",
        required: true,
        section: "General Information",
      },
      {
        name: "startDate",
        label: "Start Date",
        type: "datemin",
        required: true,
        section: "General Information",
      },
      {
        name: "endDate",
        label: "End Date",
        type: "datemin",
        required: true,
        section: "General Information",
      },
      {
        name: "type",
        label: "Promo Type",
        type: "select",
        options: TYPE_OPTIONS,
        required: true,
        section: "General Information",
      },

      /* ============= Eligible Students ============= */
      {
        name: "studentIds",
        label: "Eligible Students",
        type: "custom",
        required: true,
        requiredMessage: "Please select at least one student",
        fullWidth: true,
        section: "Eligible Students",
        hidden: (formData) => formData.type !== "restricted",
        render: ({ value, onChange, error }) => (
          <SearchStudents
            value={value || []}
            onChange={onChange}
            error={error}
          />
        ),
      },

      /* ============= Applicable Scope ============= */
      {
        name: "packageIds",
        label: "Packages",
        type: "multipleSelect",
        options: packageOptions,
        section: "Applicable Scope",
      },
      {
        name: "currencyIds",
        label: "Currencies",
        type: "multipleSelect",
        options: currencyOptions,
        section: "Applicable Scope",
      },
      {
        name: "lessonSelector",
        label: "Chapters & Lessons",
        type: "custom",
        fullWidth: true,
        section: "Applicable Scope",
        render: ({ value, onChange }) => (
          <HierarchicalLessonSelector
            value={value?.lessonIds}
            initialLessons={initialLessons}
            onChange={(lessonIds, rowDetails) =>
              onChange({
                lessonIds,
                chapterIds: Array.from(
                  new Set(
                    (rowDetails || []).flatMap((r) => r.chapterIds || []),
                  ),
                ),
                // Course scope is no longer chosen via a separate dropdown —
                // it's derived from whatever courses the selected
                // chapters/lessons belong to. Each row exposes a single
                // courseId (not an array), so collect one per row.
                courseIds: Array.from(
                  new Set(
                    (rowDetails || []).map((r) => r.courseId).filter(Boolean),
                  ),
                ),
              })
            }
          />
        ),
      },
    ],
    [packageOptions, currencyOptions, initialLessons],
  );

  /* ================= Initial Data ================= */
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

    if (
      formData.type === "restricted" &&
      (!formData.studentIds || formData.studentIds.length === 0)
    ) {
      toast.error(
        "Please select at least one student for a restricted promo code",
      );
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

    await putData(
      payload,
      `/api/admin/promoCodes/${id}`,
      "Promo code updated successfully",
    );
    navigate("/admin/marketing/promocodes");
  };

  if (loadingPromo || loadingPackages || loadingCurrencies || saving)
    return <Loader />;
  if (promoError || packagesError || currenciesError) return <Errorpage />;

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
