import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";

const AddCurrency = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/currency");

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Currency Name",
        type: "text",
        required: true,
        placeholder: "e.g. US Dollar",
        section: "General Information",
      },
      {
        name: "symbol",
        label: "Symbol",
        type: "text",
        required: true,
        placeholder: "e.g. $",
        section: "General Information",
      },
      {
        name: "code",
        label: "Code",
        type: "text",
        required: true,
        placeholder: "e.g. USD",
        section: "General Information",
      },
      {
        name: "exchangeRate",
        label: "Exchange Rate (optional)",
        type: "numberdecimal",
        placeholder: "e.g. 1.0000",
        section: "General Information",
        min: 0,
        helperText: "Rate relative to base (default 1.000000)",
      },
      {
        name: "isBase",
        label: "Is Base Currency? (optional)",
        type: "switch",
        section: "General Information",
      },
    ],
    []
  );

  const initialFormValues = useMemo(
    () => ({
      name: "",
      symbol: "",
      code: "",
      exchangeRate: "",
      isBase: false,
    }),
    []
  );

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      symbol: formData.symbol,
      code: formData.code?.toUpperCase(),
      exchangeRate: Number(formData.exchangeRate),
      isBase: Boolean(formData.isBase),
    };

    await postData(payload, "/api/admin/currency", "Currency added successfully");
    navigate("/admin/settings/currency");
  };

  return (
    <AddPage
      title="Add Currency"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/currency")}
       
      initialData={initialFormValues}
    />
  );
};

export default AddCurrency;