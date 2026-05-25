import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const PaymentMethod = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/paymentMethod");
  const { deleteData, loading: deleteLoading } = useDelete();
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
        throw e
    }
  };

 const handleToggleStatus = async (row) => {
  try {
    await putData(
      { isActive: !row.isActive }, // هنا نقلب القيمة
      `/api/admin/paymentMethod/${row.id}`,
      "Status updated successfully"
    );
    refetch();
  } catch (e) {
      throw e
  }
};

  const handleEdit = (row) => {
    navigate(`/admin/payment/payment-method/edit/${row.id}`);
  };

  const columns = [
    {
      header: "logo",
      key: "logo",
      render: (value) => (
        <img
          src={value || "/placeholder.png"}
          alt="teacher"
          className="w-12 h-12 object-cover rounded-full border bg-gray-100"
        />
      ),
    },
    { header: "Name", key: "name" },
    { header: "Description", key: "description" },
    { header: "Type", key: "type" },
    { header: "Currencies", key: "currencies" }, // optional: can map names
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((method) => ({
        id: method.id,
        name: method.name,
        description: method.description,
        type: method.type,
        currencies: method.currencies.map(c => c.code).join(", "),
isActive: method.isActive,
        createdAt: method.createdAt,
        logo: method.logo,
        raw: method,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Payment Methods"
        titleAdd="Payment Method"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || putLoading}
        onAddClick={() => navigate("/admin/payment/payment-method/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
        extraActions={(row) => (
  <button
    onClick={() => handleToggleStatus(row)}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-300 ${
      row.isActive ? "bg-green-500" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
        row.isActive ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
)}

      />

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