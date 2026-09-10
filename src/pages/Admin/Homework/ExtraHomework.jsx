import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { FileText, ExternalLink } from "lucide-react";

const ExtraHomework = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet(
    "/api/admin/extra-homework?page=1&limit=10",
  );
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/extra-homework/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/extra-homework/edit/${row.id}`);
  };

  // ✅ الـ columns محدثة مع الـ keys الصحيحة
  const columns = [
    {
      header: "Title",
      key: "title",
      width: "200px",
    },
    {
      header: "Description",
      key: "description",
      width: "250px",
      render: (value) => <span className="line-clamp-2">{value || "-"}</span>,
    },
    {
      header: "Target Type",
      key: "targetType",
      width: "120px",
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-bold ${
            value === "Individual"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      header: "Group / Target",
      key: "targetName",
      width: "180px",
      render: (value) => value || "-",
    },
    {
      header: "Due Date",
      key: "dueDate",
      width: "140px",
      render: (value) =>
        value ? new Date(value).toLocaleDateString("ar-EG") : "-",
    },
    {
      header: "Assigned",
      key: "assignedCount",
      width: "100px",
      render: (value) => (
        <span className="font-bold text-slate-700">{value}</span>
      ),
    },
    {
      header: "Submitted",
      key: "submittedCount",
      width: "120px",
      render: (value) => (
        <span className="text-emerald-600 font-bold">{value}</span>
      ),
    },
    {
      header: "Pending",
      key: "pendingCount",
      width: "120px",
      render: (value) => (
        <span className="text-orange-600 font-bold">{value}</span>
      ),
    },
    {
      header: "Graded",
      key: "gradedCount",
      width: "100px",
      render: (value) => (
        <span className="text-blue-600 font-bold">{value}</span>
      ),
    },
    {
      header: "Submission Rate",
      key: "submissionRate",
      width: "140px",
      render: (value) => {
        const percentage = Math.round(value * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600">
              {percentage}%
            </span>
          </div>
        );
      },
    },
    {
      header: "PDF",
      key: "pdfUrl",
      width: "80px",
      render: (value) =>
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            title="Download PDF"
          >
            <FileText size={16} />
          </a>
        ) : (
          "-"
        ),
    },
    {
      header: "Link",
      key: "link",
      width: "80px",
      render: (value) =>
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            title="External Link"
          >
            <ExternalLink size={16} />
          </a>
        ) : (
          "-"
        ),
    },
    {
      header: "Created",
      key: "createdAt",
      width: "140px",
      render: (value) =>
        value ? new Date(value).toLocaleDateString("ar-EG") : "-",
    },
  ];

  // ✅ معالجة صيغ الـ API المختلفة مع ربط الـ keys الصحيح
  const tableData = useMemo(() => {
    try {
      // تحديد أين البيانات بالفعل
      let homeworkList = [];

      if (!data) {
        homeworkList = [];
      } else if (Array.isArray(data)) {
        // إذا كانت الاستجابة مصفوفة مباشرة
        homeworkList = data;
      } else if (
        data.data?.data?.homework &&
        Array.isArray(data.data.data.homework)
      ) {
        // ✅ إذا كانت الاستجابة { data: { data: { homework: [...] } } }
        homeworkList = data.data.data.homework;
      } else if (data.data?.homework && Array.isArray(data.data.homework)) {
        // ✅ إذا كانت الاستجابة { data: { homework: [...] } }
        homeworkList = data.data.homework;
      } else if (data.data && Array.isArray(data.data)) {
        // إذا كانت الاستجابة { data: [...] }
        homeworkList = data.data;
      } else if (data.homework && Array.isArray(data.homework)) {
        // إذا كانت الاستجابة { homework: [...] }
        homeworkList = data.homework;
      } else if (data.homeworks && Array.isArray(data.homeworks)) {
        // إذا كانت الاستجابة { homeworks: [...] }
        homeworkList = data.homeworks;
      } else if (data.result && Array.isArray(data.result)) {
        // إذا كانت الاستجابة { result: [...] }
        homeworkList = data.result;
      } else {
        // محاولة استخراج المصفوفة من أي كائن
        const values = Object.values(data);
        if (values.length > 0 && Array.isArray(values[0])) {
          homeworkList = values[0];
        } else {
          homeworkList = [];
        }
      }

      // ✅ تحويل البيانات إلى صيغة الجدول مع ربط الـ keys الصحيح
      return (
        homeworkList.map((homework) => ({
          id: homework.id,
          title: homework.title || "N/A",
          description: homework.description || "N/A",
          // ✅ ربط نوع الـ Target بشكل صحيح
          targetType:
            homework.targetType === "individual" ? "Individual" : "Group",
          // ✅ استخراج اسم الـ Group أو Individual
          targetName:
            homework.targetType === "group"
              ? homework.groupName || "N/A"
              : "Individual Students",
          // ✅ البيانات من الـ stats object
          assignedCount: homework.stats?.totalAssigned || 0,
          submittedCount: homework.stats?.submittedCount || 0,
          pendingCount: homework.stats?.pendingCount || 0,
          gradedCount: homework.stats?.gradedCount || 0,
          submissionRate: homework.stats?.submissionRate || 0,
          // ✅ روابط الملفات
          pdfUrl: homework.pdfUrl,
          link: homework.link,
          // ✅ التواريخ
          dueDate: homework.dueDate,
          createdAt: homework.createdAt,
          raw: homework,
        })) || []
      );
    } catch (err) {
      console.error("❌ خطأ في معالجة البيانات:", err);
      return [];
    }
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Extra Homework"
        titleAdd="Homework"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/extra-homework/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Homework"
        description={`Are you sure you want to delete "${selectedRow?.title}"?`}
      />
    </div>
  );
};

export default ExtraHomework;
