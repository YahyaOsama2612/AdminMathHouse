import { useNavigate } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

const Sessions = () => {
  const navigate = useNavigate();

  const { data, loading, refetch, error } = useGet("/api/admin/session");
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/session/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
        throw e
    }
  };

  const handleEdit = (row) => {
    navigate(`/admin/live/sessions/edit/${row.id}`);
  };

  const columns = [
    { header: "Name", key: "name" },
    // { header: "Category", key: "categoryName",filterable: true, filterType: 'select' },
    // { header: "Course", key: "courseName",filterable: true, filterType: 'select' },
    // { header: "Lesson", key: "lessonName" ,filterable: true, filterType: 'select'},
    { header: "Type", key: "type" ,filterable: true, filterType: 'select'},
    { header: "Group", key: "groupName" ,filterable: true, filterType: 'select'},
    { header: "Teacher", key: "teacherName" ,filterable: true, filterType: 'select'},
    { header: "Date", key: "sessionDate" ,filterable: true, filterType: 'select'  },
    { header: "From", key: "timeFrom" },
    { header: "To", key: "timeTo" },
  ];

 const tableData = useMemo(() => {
  return (
    data?.data?.sessions?.map((s) => ({
      id: s.id,
      name: s.name,
      // الحقول دي مش موجودة في الـ JSON الحالي، لو ضفتها في الـ API هتظهر تلقائياً
      categoryName: s.categoryName || "-", 
      courseName: s.courseName || "-",
      lessonName: s.lessonName || "-",
      
      type: s.type,
      
      // ✅ التعديل هنا: الوصول للاسم من جوه الـ groups object
      groupName: s.groups?.name || "-", 
      
      // ✅ التعديل هنا: الوصول للاسم من جوه الـ teacher object
      teacherName: s.teacher?.name || "-", 
      
      sessionDate: s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : "-",
      timeFrom: s.timeFrom,
      timeTo: s.timeTo,
      raw: s,
    })) || []
  );
}, [data]);

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTable
        title="Sessions"
        titleAdd="Session"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onAddClick={() => navigate("/admin/live/sessions/add")}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDeleteModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Session"
        description={`Are you sure you want to delete "${selectedRow?.name}"?`}
      />
    </div>
  );
};

export default Sessions;