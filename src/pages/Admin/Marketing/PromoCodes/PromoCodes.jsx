import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import ReusableTable from "@/components/ReusableTable";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import PromoCodeDetailsModal from "@/components/PromoCodeDetailsModal";
import useGet from "@/hooks/useGet";
import useDelete from "@/hooks/useDelete";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const PromoCodes = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/promoCodes");
  const { deleteData, loading: deleteLoading } = useDelete();
  const { putData, loading: putLoading } = usePut();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);

  const {
    data: detailRes,
    loading: loadingDetail,
    error: detailError,
  } = useGet(viewModalOpen && viewingId ? `/api/admin/promoCodes/${viewingId}` : null);

  const handleView = (row) => {
    setViewingId(row.id);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingId(null);
  };

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/promoCodes/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/marketing/promocodes/edit/${row.id}`);
  };

  const handleAdd = () => {
    navigate("/admin/marketing/promocodes/add");
  };

  const columns = [
    { header: "Promo Name", key: "promoName" },
    { header: "Code", key: "code" },
    { header: "Type", key: "type", filterable: true, filterType: "select" },
    {
      header: "Discount (%)",
      key: "discountAmount",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Start Date",
      key: "startDate",
      filterable: true,
      filterType: "select",
    },
    {
      header: "End Date",
      key: "endDate",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Usages Allowed",
      key: "numberOfUsagesAllowed",
      filterable: true,
      filterType: "select",
    },
    {
      header: "Users Used",
      key: "numberOfUsers",
      filterable: true,
      filterType: "select",
    },
   
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((promo) => ({
        id: promo.id,
        promoName: promo.promoName,
        code: promo.code,
        discountAmount: promo.discountAmount,
        startDate: new Date(promo.startDate).toLocaleDateString(),
        endDate: new Date(promo.endDate).toLocaleDateString(),
        numberOfUsagesAllowed: promo.numberOfUsagesAllowed,
        numberOfUsers: promo.numberOfUsers,
        courses: (promo.courses || []).map((c) => c.courseName).join(", "),
        packages: (promo.packages || []).map((p) => p.packageName).join(", "),
        type: promo.type,
        isActive: promo.isActive ?? true,
        raw: promo,
      })) || []
    );
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Promo Codes"
        titleAdd="Promo Code"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading || putLoading}
        onAddClick={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        extraActions={(row) => (
          <button
            onClick={() => handleView(row)}
            className="group p-2 rounded-lg transition-all duration-200 hover:bg-one hover:scale-105"
            title="View"
          >
            <Eye className="w-4 h-4 text-one transition-colors duration-200 group-hover:text-white" />
          </button>
        )}
      />

      <PromoCodeDetailsModal
        open={viewModalOpen}
        onClose={closeViewModal}
        promo={detailRes?.data?.data}
        loading={loadingDetail}
        error={detailError}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Promo Code"
        description={`Are you sure you want to delete "${selectedRow?.promoName}"?`}
      />
    </div>
  );
};

export default PromoCodes;