import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const RawScore = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/rawScore");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/rawScore/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "Score", key: "score" },
    {
      header: "Gifting?",
      key: "is_giftingScore"
      ,filterable: true, filterType: 'select',
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {value ? "Yes" : "No"}
        </span>
      ),
    },
    {
      header: "Gifting Score",
      key: "giftingScore",
      filterable: true, filterType: 'select',
      render: (value) => (value ? value : "-"),
    },
    {
      header: "Course",
      key: "courseName",filterable: true, filterType: 'select'},
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.rawScores?.map((r) => ({
        id: r.id,
        name: r.name,
        score: r.score,
        is_giftingScore: r.is_giftingScore,
        giftingScore: r.giftingScore,
        courseName: r.courses?.name || "-",
        raw: r,
      })) || []
    );
  }, [data]);

  const handleEdit = (row) => {
    navigate(`/admin/settings/rawscore/edit/${row.id}`);
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Raw Scores"
        titleAdd="Raw Score"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/settings/rawscore/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Raw Score"
        description={`Are you sure you want to delete "${selectedRow?.name}" ?`}
      />
    </div>
  );
};

export default RawScore;