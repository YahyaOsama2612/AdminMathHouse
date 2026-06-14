import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReusableTable from "@/components/ReusableTable";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import axios from "@/api/api";

const Attend = () => {
  const navigate = useNavigate();
  const { id: studentId } = useParams();
  const [actionLoading, setActionLoading] = useState(false);

  // 🔹 جلب الداتا من الـ API
  const { data, loading, error, refetch } = useGet(
    `/api/admin/student/${studentId}/content`,
  );

  // 🔹 دالة التعامل مع الـ Checkbox الذكية بالهيكل الصحيح للـ API
  const handleEnrollmentChange = async (row, isChecked) => {
    if (!row.id) return;
    setActionLoading(true);

    try {
      // تجهيز العناصر بناءً على الهيكل المتوقع: [{ id: "...", priceId: null }]
      const targetObject = { id: row.id, priceId: null };

      const payload = {
        courses: row.type === "course" ? [targetObject] : [],
        chapters: row.type === "chapter" ? [targetObject] : [],
        lessons: row.type === "lesson" ? [targetObject] : [],
        action: isChecked ? "enroll" : "unenroll",
      };

      const response = await axios.post(
        `/api/admin/student/${studentId}/enroll`,
        payload,
      );

      // 💡 فحص رسالة الـ Backend في حالة الـ Inherit (المحتوى متاح مسبقاً)
    /*   const backendMessage =
        response?.data?.data?.message || response?.data?.message;
      if (
        backendMessage &&
        backendMessage.includes("already inherited or enrolled")
      ) {
        alert(
          "هذا المحتوى متاح للطالب بالفعل (مورث من كورس أو شابتر مشترك فيه) ولا يمكن تعديله بشكل منفرد.",
        );
      } */

      await refetch();
    } catch (err) {
      console.error("Failed to update enrollment:", err);
      const apiError =
        err.response?.data?.error?.message || "حدث خطأ أثناء تحديث حالة الحضور";
      alert(apiError);
    } finally {
      setActionLoading(false);
    }
  };

  // 🔹 تعريف أعمدة الجدول
  const columns = [
    {
      header: "Status",
      key: "isEnrolled",
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
    {
      header: "Type",
      key: "type",
      render: (value) => {
        const badges = {
          course: "bg-purple-100 text-purple-800 border border-purple-200",
          chapter: "bg-green-100 text-green-800 border border-green-200",
          lesson: "bg-blue-100 text-blue-800 border border-blue-200",
        };
        return (
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badges[value]}`}
          >
            {value.toUpperCase()}
          </span>
        );
      },
    },
    { header: "Name", key: "name" },
    { header: "Belongs To", key: "parentName" },
  ];

  // 🔹 تحويل الداتا المركبة (Flattening) لتشمل كل المستويات بشكل نقي ومستقل
  const tableData = useMemo(() => {
    const contentArray = data?.data?.data?.content;
    if (!Array.isArray(contentArray)) return [];

    const flattenedContent = [];

    contentArray.forEach((course) => {
      // 1. إضافة الكورس نفسه كسطر مستقل
      flattenedContent.push({
        id: course.id,
        name: course.name,
        type: "course",
        isEnrolled: course.isEnrolled,
        parentName: course.categoryName || "Main Category",
      });

      if (Array.isArray(course.chapters)) {
        course.chapters.forEach((chapter) => {
          // 2. إضافة الشابتر نفسه كسطر مستقل
          flattenedContent.push({
            id: chapter.id,
            name: chapter.name,
            type: "chapter",
            isEnrolled: chapter.isEnrolled,
            parentName: `Course: ${course.name}`,
          });

          if (Array.isArray(chapter.lessons)) {
            chapter.lessons.forEach((lesson) => {
              // 3. إضافة الدرس كسطر مستقل
              flattenedContent.push({
                id: lesson.id,
                name: lesson.name,
                type: "lesson",
                isEnrolled: lesson.isEnrolled,
                parentName: `Chapter: ${chapter.name}`,
              });
            });
          }
        });
      }
    });

    return flattenedContent;
  }, [data]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div>
        <Errorpage />
      </div>
    );
  }

  const studentName = data?.data?.data?.student?.name || "Student";

  return (
    <div className="p-6">
      {actionLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader />
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {studentName}'s Content & Attendance
        </h1>
        <p className="text-sm text-gray-500">
          Manage enrollment and attendance for courses, chapters, and lessons.
        </p>
      </div>

      <ReusableTable
        title="Student Content Management List"
        columns={columns}
        data={tableData}
        loading={loading}
      />
    </div>
  );
};

export default Attend;
