import { useNavigate } from "react-router-dom";
import { API_URL } from "@/api/api";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import toast from "react-hot-toast";
import axios from "axios";
import { Clock, Plus, RefreshCw, RotateCcw } from "lucide-react";
import { getToken } from "../../../../utils/auth";
import { Card, PageHead, SkelRows } from "@/components/admin/kit";

/* Settings → Currencies (MathPortal currencies tab): base currency + last update strip with
   "Refresh Rates", live rate cards, then the currencies table (make base, edit, delete). */
const Currency = () => {
  const navigate = useNavigate();
  const { data, loading, refetch, error } = useGet("/api/admin/currency");
  const {
    data: liveRates,
    loading: liveLoading,
    refetch: refetchLiveRates,
  } = useGet("/api/admin/currency/rates/live");
  const { deleteData } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [makingBase, setMakingBase] = useState(null);

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
      throw e;
    }
  };

  const makeBase = async (row) => {
    setMakingBase(row.id);
    try {
      await axios.put(
        `${API_URL}/api/admin/currency/base/${row.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      toast.success(`${row.code || row.name} is now the base currency`);
      refetch();
      refetchLiveRates();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setMakingBase(null);
    }
  };

  const columns = [
    { header: "Name", key: "name", render: (v) => <span className="font-semibold text-gray-800">{v}</span> },
    { header: "Symbol", key: "symbol", render: (v) => <span className="font-bold text-one">{v}</span> },
    { header: "Code", key: "code", render: (v) => <span className="text-gray-700">{v}</span> },
    { header: "Exchange Rate", key: "exchangeRate", render: (v) => <span className="text-gray-700 tabular-nums">{v}</span> },
    {
      header: "Base",
      key: "isBase",
      render: (value, row) =>
        value ? (
          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full text-white bg-green-600">Yes</span>
        ) : (
          <button
            onClick={() => makeBase(row)}
            disabled={makingBase === row.id}
            className="text-[11px] font-extrabold px-2.5 py-1 rounded-md text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
          >
            {makingBase === row.id ? "Saving…" : "Make Base"}
          </button>
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

  const live = liveRates?.data?.data;
  const baseRow = tableData.find((c) => c.isBase);
  const lastUpdated = live?.lastUpdated ? new Date(live.lastUpdated) : null;

  return (
    <div>
      <PageHead title="Currencies" sub="Currencies students can pay in, the base currency and today’s exchange rates.">
        <button onClick={() => navigate("/admin/settings/currency/add")} className="a-btn primary">
          <Plus className="w-4 h-4" /> Add Currency
        </button>
      </PageHead>

      {/* Base currency + last update */}
      {liveLoading && !live ? (
        <div className="skel h-[76px] mb-4"></div>
      ) : live ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-red-50 text-one flex items-center justify-center font-extrabold">
              {baseRow?.symbol || "$"}
            </span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Base currency</p>
              <p className="font-extrabold text-gray-800">{live.base}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:mx-auto">
            <span className="w-10 h-10 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center"><Clock size={18} /></span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last updated</p>
              <p className="text-sm font-bold text-gray-800">
                {lastUpdated && !Number.isNaN(lastUpdated.getTime()) ? lastUpdated.toLocaleString("en-US") : "—"}
              </p>
            </div>
          </div>
          <button onClick={refetchLiveRates} disabled={liveLoading} className="a-btn primary w-full sm:w-auto">
            <RefreshCw size={15} className={liveLoading ? "animate-spin" : ""} /> Refresh Rates
          </button>
        </div>
      ) : null}

      {/* Live rate cards */}
      {liveLoading && !live ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skel h-[104px]"></div>)}
        </div>
      ) : live?.rates?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
          {live.rates.map((rate) => (
            <div key={rate.code} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-[11px] text-gray-400">Code</p>
              <p className="font-extrabold text-gray-800">{rate.code}</p>
              <p className="text-[11px] text-gray-400 mt-2">Rate</p>
              <p className="font-bold text-one tabular-nums">{Number(rate.rate).toFixed(4)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {error && !data ? (
        <Card>
          <p className="font-bold text-gray-800">Currencies could not be loaded</p>
          <p className="text-sm text-gray-500 mb-3">{String(error)}</p>
          <button onClick={refetch} className="a-btn"><RotateCcw size={15} /> Try again</button>
        </Card>
      ) : loading && !data ? (
        <SkelRows n={4} />
      ) : (
        <ReusableTable
          columns={columns}
          data={tableData}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Currency"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Currency;
