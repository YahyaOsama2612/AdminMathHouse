import React, { useState, useEffect } from "react";
import ReusableTableSearch from "@/components/ReusableTableSearch";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { Clock, CheckCircle, XCircle, FileText, Tag } from "lucide-react";

const PaymentContent = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [modal, setModal] = useState({
    isOpen: false,
    requestId: null,
    actionType: "",
  });

  const { postData, loading: actionLoading } = usePost();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 1500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const queryParams = new URLSearchParams({
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  }).toString();

  const {
    data,
    loading: getLoading,
    error,
    refetch,
  } = useGet(`/api/admin/payment/content-buy-requests?${queryParams}`);

  const responseData = data?.data?.data || {
    pending: [],
    accepted: [],
    rejected: [],
  };

  const paginationData = data?.data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const currentTabTableData = responseData[activeTab] || [];

  const handleOpenModal = (id, actionType) => {
    setModal({
      isOpen: true,
      requestId: id,
      actionType,
    });
  };

  const handleConfirmAction = async () => {
    try {
      // Endpoint to respond to the content purchase request
      const url = `/api/admin/payment/content-buy-requests/${modal.requestId}/reply`;

      // Request body format: { "action": "approve" } or { "action": "reject" }
      const body = {
        action: modal.actionType,
      };

      const successMsg =
        modal.actionType === "approve"
          ? "Content request approved successfully ✅"
          : "Content request rejected successfully ❌";

      await postData(body, url, successMsg);

      setModal({ isOpen: false, requestId: null, actionType: "" });

      refetch();
    } catch (error) {
      console.error("Action failed:", error);
    }
  };

  const columns = [
    {
      header: "Student",
      key: "student",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {row.student?.firstname} {row.student?.lastname}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.student?.nickname}
          </span>
        </div>
      ),
    },

    {
      header: "Email",
      key: "email",
      render: (_, row) => row.student?.email || "—",
    },

    {
      header: "Phone",
      key: "phone",
      render: (_, row) => row.student?.phone || "—",
    },

    {
      header: "Purpose / Source",
      key: "purpose",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-semibold flex items-center gap-1 capitalize">
            <Tag size={14} />
            {row.purpose || "—"}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            Source: {row.source || "—"}
          </span>
        </div>
      ),
    },

    {
      header: "Amount",
      key: "amount",
      render: (val) => (
        <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
          {val} EGP
        </span>
      ),
    },

    {
      header: "Date",
      key: "createdAt",
      render: (val) =>
        new Date(val).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },

    {
      header: "Receipt",
      key: "receiptImg",
      render: (val) =>
        val ? (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-one hover:text-one/80 transition-colors text-xs font-semibold bg-one/10 px-2 py-1 rounded w-max"
          >
            <FileText size={14} />
            View
          </a>
        ) : (
          <span className="text-muted-foreground text-xs italic">
            No Receipt
          </span>
        ),
    },
  ];

  if (getLoading && !currentTabTableData.length) return <Loader />;
  if (error) return <Errorpage />;

  const tabs = [
    {
      id: "pending",
      label: "Pending",
      icon: <Clock size={16} />,
      color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    },
    {
      id: "accepted",
      label: "Accepted",
      icon: <CheckCircle size={16} />,
      color: "text-green-600 bg-green-50 border-green-200",
    },
    {
      id: "rejected",
      label: "Rejected",
      icon: <XCircle size={16} />,
      color: "text-red-600 bg-red-50 border-red-200",
    },
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-wrap gap-3 px-4 pt-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = responseData[tab.id]?.length || 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm transition-all duration-200 ${
                isActive
                  ? `${tab.color} shadow-sm ring-1 ring-current`
                  : "bg-card text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              {tab.icon}
              <span className="capitalize">{tab.label}</span>

              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                  isActive ? "bg-white/50" : "bg-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <ReusableTableSearch
        title={`${
          activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
        } Content Requests`}
        columns={columns}
        data={currentTabTableData}
        loading={getLoading}
        extraActions={(row) =>
          activeTab === "pending" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal(row.id, "approve")}
                className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded hover:bg-green-600 transition"
              >
                Accept
              </button>

              <button
                onClick={() => handleOpenModal(row.id, "reject")}
                className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded hover:bg-red-600 transition"
              >
                Reject
              </button>
            </div>
          )
        }
        currentPage={page}
        totalPages={paginationData.totalPages}
        totalResults={paginationData.total}
        rowsPerPage={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        searchTerm={searchTerm}
        onSearchChange={(val) => setSearchTerm(val)}
      />

      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="p-6">
              <h3
                className={`text-xl font-bold mb-2 ${
                  modal.actionType === "approve"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {modal.actionType === "approve"
                  ? "Approve Request"
                  : "Reject Request"}
              </h3>

              <p className="text-muted-foreground text-sm mb-4">
                {modal.actionType === "approve"
                  ? "Are you sure you want to approve this content purchase?"
                  : "Are you sure you want to reject this request?"}
              </p>
            </div>

            <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button
                onClick={() =>
                  setModal({ isOpen: false, requestId: null, actionType: "" })
                }
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg font-semibold text-muted-foreground hover:bg-muted text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg font-bold text-white text-sm ${
                  modal.actionType === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentContent;
