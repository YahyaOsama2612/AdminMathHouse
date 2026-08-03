import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import SearchStudents from "@/components/SearchStudents";
import HierarchicalLessonSelector from "@/components/HierarchicalLessonSelector";

const TYPE_OPTIONS = [
  { value: "generic", label: "Generic" },
  { value: "restricted", label: "Restricted" },
];

const AddPromoCode = () => {
  const navigate = useNavigate();

  const { postData, loading: saving } = usePost("/api/admin/promoCodes");

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
    [packageOptions, currencyOptions],
  );

  /* ================= Initial Data ================= */
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

    await postData(
      payload,
      "/api/admin/promoCodes",
      "Promo code added successfully",
    );
    navigate("/admin/marketing/promocodes");
  };

  if (loadingPackages || loadingCurrencies) return <Loader />;
  if (packagesError || currenciesError) return <Errorpage />;

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
