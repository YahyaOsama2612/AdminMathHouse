import { useNavigate } from "react-router-dom";
import React, { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import { Card, PageHead, Pill, SkelRows, Stat } from "@/components/admin/kit";

/* Payments → Payment methods (MathPortal "Payout methods" card): logo, name, description,
   type, currencies, active switch, edit / delete. */
const PaymentMethod = ({ headless = false }) => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/paymentMethod");
  const { deleteData } = useDelete();
  const { putData, loading: putLoading } = usePut();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/paymentMethod/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleToggleStatus = async (row) => {
    try {
      await putData(
        { isActive: !row.isActive },
        `/api/admin/paymentMethod/${row.id}`,
        "Status updated successfully"
      );
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/payment/payment-method/edit/${row.id}`);
  };

  const columns = [
    {
      header: "Logo",
      key: "logo",
      render: (value, row) =>
        value ? (
          <img src={value} alt={row.name} className="w-12 h-12 object-contain rounded-xl border border-gray-100 bg-white p-1" />
        ) : (
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-gray-500 font-extrabold text-sm">
            {String(row.name || "?").slice(0, 2).toUpperCase()}
          </span>
        ),
    },
    { header: "Name", key: "name", render: (v) => <span className="font-bold text-gray-800">{v}</span> },
    { header: "Description", key: "description", render: (v) => <span className="text-gray-600 break-words">{v || "—"}</span> },
    {
      header: "Type",
      key: "type",
      filterable: true,
      filterType: "select",
      render: (v) => <Pill tone={v === "Automatic" ? "blue" : "gray"}>{v || "—"}</Pill>,
    },
    {
      header: "Currencies",
      key: "currencies",
      render: (v) =>
        v ? (
          <div className="flex flex-wrap gap-1">
            {String(v).split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
              <span key={c} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{c}</span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((method) => ({
        id: method.id,
        name: method.name,
        description: method.description,
        type: method.type,
        currencies: (method.currencies || []).map((c) => c.code).join(", "),
        isActive: method.isActive,
        createdAt: method.createdAt,
        logo: method.logo,
        raw: method,
      })) || []
    );
  }, [data]);

  const addButton = (
    <button onClick={() => navigate("/admin/payment/payment-method/add")} className="a-btn primary">
      <Plus className="w-4 h-4" /> Add Payment Method
    </button>
  );

  return (
    <div className={headless ? "bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4" : ""}>
      {headless ? (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 text-[15px]">Payment methods</h3>
            <p className="text-xs text-gray-400">Channels students can pay through — logo, description, type and currencies. Switch a method off to hide it from students.</p>
          </div>
          <div className="ml-auto">{addButton}</div>
        </div>
      ) : (
        <PageHead title="Payment Methods" sub="Channels students can pay through — logo, description, type and currencies. Switch a method off to hide it from students.">
          {addButton}
        </PageHead>
      )}

      {error && !data ? (
        <Card>
          <p className="font-bold text-gray-800">Payment methods could not be loaded</p>
          <p className="text-sm text-gray-500 mb-3">{String(error)}</p>
          <button onClick={refetch} className="a-btn"><RotateCcw size={15} /> Try again</button>
        </Card>
      ) : loading && !data ? (
        <SkelRows n={5} />
      ) : (
        <>
          {!headless && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Stat label="Methods" value={tableData.length} />
            <Stat label="Active" value={tableData.filter((m) => m.isActive).length} color="#15803d" />
            <Stat label="Automatic" value={tableData.filter((m) => m.type === "Automatic").length} />
            <Stat label="Manual" value={tableData.filter((m) => m.type === "Manual").length} />
          </div>}

          <div className={putLoading ? "opacity-70 pointer-events-none transition-opacity" : "transition-opacity"}>
            <ReusableTable
              columns={columns}
              data={tableData}
              onEdit={handleEdit}
              onDelete={handleDelete}
              extraActions={(row) => (
                <button
                  onClick={() => handleToggleStatus(row)}
                  className={`a-switch ${row.isActive ? "on" : ""}`}
                  title={row.isActive ? "Active — click to switch off" : "Off — click to activate"}
                  aria-label="Toggle status"
                >
                  <span></span>
                </button>
              )}
            />
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Payment Method"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default PaymentMethod;
