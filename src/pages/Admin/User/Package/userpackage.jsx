import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import axios from "@/api/api";

const UserPackage = () => {
  const navigate = useNavigate();
  const { id: studentId } = useParams();
  const [actionLoading, setActionLoading] = useState(false);

  // تخزين طريقة الدفع المختارة من قبل المستخدم
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  // 🔹 جلب البيانات بناءً على هيكل الـ الـ API الجديد بالكامل
  const { data, loading, error, refetch } = useGet(
    `/api/admin/student/${studentId}/packages`,
  );

  // استخراج البيانات لتسهيل استخدامها في الواجهة
  const rootData = data?.data?.data;
  const student = rootData?.student;
  const paymentMethods = rootData?.manualPaymentMethods || [];

  // 🔹 دالة تفعيل أو شراء الباقة
  const handleEnrollmentChange = async (row, isChecked) => {
    if (!row.id) return;

    // إذا قام المستخدم بإلغاء التحديد (يمكنك تخصيصها حسب الرغبة)
    if (!isChecked) {
      alert("إلغاء الاشتراك يتم من خلال إدارة الفواتير والعمليات المالية.");
      return;
    }

    // التحقق من اختيار طريقة الدفع أولاً
    if (!selectedPaymentMethod) {
      alert("برجاء اختيار طريقة الدفع أولاً قبل تفعيل الباقة.");
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        packageId: row.id,
        paymentMethodId: selectedPaymentMethod,
      };

      await axios.post(`/api/admin/student/${studentId}/packages`, payload);

      alert("تم تفعيل الباقة بنجاح للمستخدم!");
      await refetch();
    } catch (err) {
      console.error("Failed to enroll package:", err);
      const apiError =
        err.response?.data?.error?.message || "حدث خطأ أثناء تفعيل الباقة";
      alert(apiError);
    } finally {
      setActionLoading(false);
    }
  };

  // 🔹 تعريف أعمدة الجدول لتناسب تفاصيل الباقة الجديدة
  const columns = [
    {
      header: "Enroll",
      key: "isPurchasedBefore",
      render: (value, row) => {
        return (
          <input
            type="checkbox"
            checked={!!value}
            disabled={actionLoading}
            onChange={(e) => handleEnrollmentChange(row, e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
          />
        );
      },
    },
    { header: "Package Name", key: "name" },
    {
      header: "Type",
      key: "type",
      render: (value) => (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
          {value?.toUpperCase()}
        </span>
      ),
    },
    { header: "Sessions/Items Count", key: "number" },
    {
      header: "Price",
      key: "price",
      render: (value) => (
        <span className="font-semibold text-green-600">{value} EGP</span>
      ),
    },
    {
      header: "Duration",
      key: "duration",
      render: (value) => <span>{value} Days</span>,
    },
    {
      header: "Purchase Count",
      key: "purchaseCount",
      render: (value) => (
        <span className="badge bg-gray-100 p-1 rounded text-gray-700 font-mono">
          {value || 0}
        </span>
      ),
    },
  ];

  // 🔹 تجهيز بيانات الجدول من الـ packages المرتجعة مباشرة
  const tableData = useMemo(() => {
    const packagesArray = rootData?.packages;
    if (!Array.isArray(packagesArray)) return [];

    return packagesArray.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      type: pkg.type,
      number: pkg.number,
      price: pkg.price,
      duration: pkg.duration,
      purchaseCount: pkg.purchaseCount,
      isPurchasedBefore: pkg.isPurchasedBefore,
    }));
  }, [rootData]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="p-6 space-y-6">
      {actionLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader />
        </div>
      )}

      {/* 🔹 كارت معلومات الطالب والرصيد الحالي */}
      {student && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{student.name}</h1>
           
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-center">
              <span className="block text-xs text-blue-600 font-semibold">
                Live Balance
              </span>
              <span className="text-lg font-bold text-blue-800">
                {student.balances?.live || 0}
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-center">
              <span className="block text-xs text-amber-600 font-semibold">
                Exam Balance
              </span>
              <span className="text-lg font-bold text-amber-800">
                {student.balances?.exam || 0}
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-center">
              <span className="block text-xs text-emerald-600 font-semibold">
                Question Balance
              </span>
              <span className="text-lg font-bold text-emerald-800">
                {student.balances?.question || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 شريط التحكم واختيار طريقة الدفع */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Enrollment Controls
          </h2>
          <p className="text-xs text-gray-500">
            Select a payment method before assigning a package.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            <option value="">-- Select Payment Method --</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🔹 جدول عرض الباقات وإدارتها */}
      <ReusableTable
        title="Student Packages Management List"
        columns={columns}
        data={tableData}
        loading={loading}
      />
    </div>
  );
};

export default UserPackage;
