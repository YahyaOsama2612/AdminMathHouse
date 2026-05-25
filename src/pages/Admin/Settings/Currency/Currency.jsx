import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import toast from "react-hot-toast";
import usePut from "@/hooks/usePut";
import axios from "axios";
import { getToken } from "../../../../utils/auth";

const Currency = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/currency");
  const {
  data: liveRates,
  loading: liveLoading,
  error: liveError,
  refetch: refetchLiveRates,
} = useGet("/api/admin/currency/rates/live");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/currency/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "Symbol", key: "symbol" },
    { header: "Code", key: "code" },
    { header: "Exchange Rate", key: "exchangeRate" },
    {
      header: "Base",
      key: "isBase",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span
            className={` rounded-full text-white font-semibold text-sm ${
              value
                ? "bg-green-500 px-2 py-1"
                : "hidden bg-gray-300 text-gray-800"
            }`}
          >
            {value && "Yes"}
          </span>
          {!value && (
     <button
  onClick={async () => {
    try {
      await axios.put(
        `https://bcknd.mathshouse.net/api/admin/currency/base/${row.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      
      refetch();
      refetchLiveRates();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  }}
  className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-600/80 transition"
>
  Make Base
</button>
          )}
        </div>
      ),
    },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        code: c.code,
        exchangeRate: c.exchangeRate,
        isBase: c.isBase,
        createdAt: c.createdAt,
        raw: c,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/settings/currency/edit/${row.id}`);
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;




  return (
    <div>
       {!liveLoading && liveRates?.data?.data && (
    <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 mb-6 shadow-sm">
  {/* decorative glow */}
  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-200/30 rounded-full blur-2xl" />

  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    {/* Base Currency */}
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-one flex items-center justify-center font-bold">
        $
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Base Currency
        </p>
        <p className="text-xl font-extrabold text-gray-900">
          {liveRates.data.data.base}
        </p>
      </div>
    </div>

    {/* Last Updated */}
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-one flex items-center justify-center">
        ⏱️
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Last Updated
        </p>
        <p className="text-sm font-semibold text-gray-800">
          {new Date(liveRates.data.data.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2">
      <button
        onClick={refetchLiveRates}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-one text-white text-sm font-medium shadow hover:bg-one/90 active:scale-[0.98] transition"
      >
        🔄 Refresh Rates
      </button>
    </div>
  </div>
</div>
    )}

    {/* Boxes */}
    {liveLoading ? (
      <Loader />
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {liveRates?.data?.data?.rates?.map((rate) => (
          <div
            key={rate.code}
            className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center border"
          >
            <span className="text-sm text-gray-500">Code</span>
            <span className="font-bold text-lg">{rate.code}</span>

            <span className="text-sm text-gray-500 mt-2">Rate</span>
            <span className="font-semibold text-one/80">
              {rate.rate.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    )}
      <ReusableTable
        title="Currencies"
        titleAdd="Currency"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/settings/currency/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Currency"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default Currency;
