import React, { useMemo, useState } from "react";
import { Download, BookOpen, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { exportCommonLessonsReport } from "@/utils/Reportexport";

const CommonLessonsReportView = ({
  commonLessonsData,
  attendanceStudents = [],
  sessionName = "",
  userIds = [],
  attendanceNameMap = new Map(),
}) => {
  const [downloading, setDownloading] = useState(false);

  const flattenedLessons = useMemo(() => {
    if (!commonLessonsData || !Array.isArray(commonLessonsData)) return [];
    const list = [];
    commonLessonsData.forEach((item) => {
      if (Array.isArray(item.lessons)) {
        const chapterName = item.name || item.chapterName || "General";
        item.lessons.forEach((lesson) => {
          list.push({
            id: lesson.id,
            lessonName: lesson.name,
            chapterId: item.id,
            chapterName: chapterName,
          });
        });
      } else {
        list.push({
          id: item.id,
          lessonName: item.name || item.lessonName,
          chapterId: item.chapterId || item.chapter?.id,
          chapterName: item.chapterName || item.chapter?.name || "General",
        });
      }
    });
    return list;
  }, [commonLessonsData]);

  const studentNamesList = useMemo(() => {
    if (attendanceStudents && attendanceStudents.length > 0) {
      return attendanceStudents.map(
        (s) =>
          s.studentName ||
          s.name ||
          attendanceNameMap.get(s.studentId || s.id) ||
          "Student",
      );
    }
    return userIds.map((id) => attendanceNameMap.get(id) || id);
  }, [attendanceStudents, attendanceNameMap, userIds]);

  const handleDownload = async () => {
    if (!commonLessonsData || flattenedLessons.length === 0) {
      toast.error("No common lessons to export");
      return;
    }

    try {
      setDownloading(true);
      await exportCommonLessonsReport({
        sessionName: sessionName || "Session",
        studentNames: studentNamesList,
        commonLessons: commonLessonsData,
      });
      toast.success("Report downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  if (!commonLessonsData) return null;

  const totalLessons = flattenedLessons.length;
  const totalChapters = Array.isArray(commonLessonsData)
    ? commonLessonsData.length
    : 0;
  const studentsCount = studentNamesList.length;

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-white overflow-hidden text-left">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-red-50 text-one flex items-center justify-center shrink-0">
            <BookOpen size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-gray-800">Common lessons</h4>
              <span className="a-pill bg-red-50 text-one">{totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}</span>
              <span className="a-pill bg-gray-100 text-gray-600">{totalChapters} {totalChapters === 1 ? "chapter" : "chapters"}</span>
            </div>
            <p className="text-xs text-gray-400">
              Across {studentsCount} selected student{studentsCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <button type="button" onClick={handleDownload} disabled={downloading || totalLessons === 0} className="a-btn !py-2 !px-3 !text-xs">
          <Download size={14} />
          {downloading ? "Downloading…" : "Download report"}
        </button>
      </div>

      {studentNamesList.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50/60 border-b border-gray-100 flex items-start sm:items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 shrink-0">
            <Users size={13} /> Students · {studentNamesList.length}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
            {studentNamesList.map((name, i) => (
              <span key={i} className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {totalLessons === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No common lessons found for the selected students in this course.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="a-th w-12">#</th>
                  <th className="a-th">Chapter</th>
                  <th className="a-th">Common lesson</th>
                </tr>
              </thead>
              <tbody>
                {flattenedLessons.map((item, idx) => (
                  <tr key={item.id || idx} className="a-tr">
                    <td className="a-td text-xs font-semibold text-gray-400">{idx + 1}</td>
                    <td className="a-td">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold">{item.chapterName}</span>
                    </td>
                    <td className="a-td font-semibold text-gray-800">{item.lessonName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommonLessonsReportView;

