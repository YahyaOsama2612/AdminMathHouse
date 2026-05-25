import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditPaymentMethod = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // جلب بيانات payment method الواحدة
  const { data: paymentRes, loading: loadingOne, error: errorOne } = useGet(`/api/admin/paymentMethod/${id}`);

  // جلب العملات للاختيار
  const { data: currencyData, loading: loadingCurrency, error: errorCurrency } = useGet("/api/admin/paymentMethod/selectionCurrency");

  const { putData, loading: saving } = usePut(`/api/admin/paymentMethod/${id}`);

  // إعداد خيارات العملات للـ multi-select
  const currenciesOptions = useMemo(() => {
    return currencyData?.data?.data?.map(c => ({
      value: c.id,
      label: `${c.name} (${c.symbol})`
    })) || [];
  }, [currencyData]);

  const fields = useMemo(() => [
    {
      name: "name",
      label: "Payment Method Name",
      type: "text",
      required: true,
      placeholder: "Enter payment method name",
      section: "General Information",
    },
    {
      name: "description",
      label: "Description",
      type: "text",
      required: true,
      placeholder: "Enter description",
      section: "General Information",
    },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Automatic", value: "Automatic" },
        { label: "Manual", value: "Manual" }
      ],
      section: "General Information",
    },
    {
      name: "isActive",
      label: "Active",
      type: "switch",
      section: "General Information",
    },
    {
      name: "currencies",
      label: "Currencies",
      type: "multipleSelect",
      options: currenciesOptions,
      required: true,
        section: "General Information",
    },
    {
      name: "logo",
      label: "Logo",
      type: "file",
      fullWidth: true,
      section: "Media",
    },
  ], [currenciesOptions]);

  // تحويل File إلى Base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSave = async (formData) => {
    let logoBase64 = null;
    if (formData.logo instanceof File) {
      logoBase64 = await fileToBase64(formData.logo);
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      isActive: formData.isActive,
      currencies: formData.currencies, // array of currency IDs
    };

    if (logoBase64) {
      payload.logo = logoBase64;
    }

    await putData(payload, `/api/admin/paymentMethod/${id}`, "Payment Method updated successfully");
    navigate("/admin/payment/payment-method");
  };

  if (loadingOne || loadingCurrency || saving) return <Loader />;
  if (errorOne || errorCurrency) return <Errorpage />;

  const paymentMethod = paymentRes?.data?.data; // حسب الـ response API

  return (
    <AddPage
      title="Edit Payment Method"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/payment/payment-method")}
      initialData={{
        name: paymentMethod?.name || "",
        description: paymentMethod?.description || "",
        type: paymentMethod?.type || "",
        isActive: paymentMethod?.isActive ?? true,
        logo: paymentMethod?.logo || null,
        currencies: paymentMethod?.currencies?.map(c => c.id) || [],
      }}
    />
  );
};

export default EditPaymentMethod;