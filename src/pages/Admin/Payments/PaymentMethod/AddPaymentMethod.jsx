import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const AddPaymentMethod = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/paymentMethod");
  const { data: currencyData, loading: currencyLoading, error: currencyError } = useGet("/api/admin/paymentMethod/selectionCurrency");

 const currenciesOptionsMemo = useMemo(() => {
  return (
    currencyData?.data?.data?.map(c => ({
      label: `${c.name} (${c.symbol})`,
      value: c.id
    })) || []
  );
}, [currencyData]);

  const fields = useMemo(
    () => [
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
        options: currenciesOptionsMemo,
        required: true,
        section: "General Information",
      },
      {
        name: "logo",
        label: "Logo",
        type: "file",
        fullWidth: true,
        required: true,
        section: "Media",
      },
    ],
    [currenciesOptionsMemo]
  );
 const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  const initialFormValues = useMemo(() => ({
    name: "",
    description: "",
    type: "",
    isActive: true,
    logo: null,
    currencies: [],
  }), []);

  const onSave = async (formData) => {
     let imageBase64 = null;
    if (formData.logo instanceof File) {
      imageBase64 = await fileToBase64(formData.logo);
    }
    const payload = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      isActive: formData.isActive,
      logo: imageBase64,
      currencies: formData.currencies, // array of currency IDs
    };

    try {
      await postData(payload, "/api/admin/paymentMethod", "Payment Method added successfully");
      navigate("/admin/payment/payment-method");
    } catch (error) {
      throw error;
    }
  };

  if (saving || currencyLoading) return <Loader />;
  if (currencyError) return <Errorpage />;

  return (
    <AddPage
      title="Add Payment Method"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/payment/payment-method")}
      initialData={initialFormValues}
    />
  );
};

export default AddPaymentMethod;