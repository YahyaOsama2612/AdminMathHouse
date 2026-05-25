import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const EditCurrency = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: currencyRes, loading: loadingCurrency, error } = useGet(
    `/api/admin/currency/${id}`
  );
  const { putData, loading: saving } = usePut(`/api/admin/currency/${id}`);

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

  const onSave = async (formData) => {
    const payload = {
      name: formData.name,
      symbol: formData.symbol,
      code: formData.code?.toUpperCase(),
      exchangeRate: Number(formData.exchangeRate),
      isBase: Boolean(formData.isBase),
    };

    await putData(payload, `/api/admin/currency/${id}`, "Currency updated successfully");
    navigate("/admin/settings/currency");
  };

  if (loadingCurrency) return <Loader />;
  if (error) return <Errorpage />;

  const currency = currencyRes?.data?.data;

  

  return (
    <AddPage
      title="Edit Currency"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate("/admin/settings/currency")}
       
      initialData={({
      name: currency?.name || "",
      symbol: currency?.symbol || "",
      code: currency?.code || "",
      exchangeRate: currency?.exchangeRate || "",
      isBase: currency?.isBase || false,
    })}
    />
  );
};

export default EditCurrency;