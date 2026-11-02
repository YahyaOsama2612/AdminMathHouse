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
    <div className="mt-4 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden text-left">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-800">Common Lessons</h4>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-50 text-indigo-600">
                {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-200 text-slate-700">
                {totalChapters} {totalChapters === 1 ? "Chapter" : "Chapters"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identified across {studentsCount} selected student
              {studentsCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || totalLessons === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Download size={14} />
          {downloading ? "Downloading..." : "Download Report"}
        </button>
      </div>

      {/* Selected Students Strip */}
      {studentNamesList.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-start sm:items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 shrink-0">
            <Users size={14} className="text-indigo-600" />
            <span>Students ({studentNamesList.length}):</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
            {studentNamesList.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {totalLessons === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400 italic">
          No common lessons found for the selected students in this course.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-80">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/70 sticky top-0 z-10 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Chapter</th>
                <th className="p-3">Common Lesson Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {flattenedLessons.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="p-3 text-center font-medium text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="p-3 font-semibold text-slate-700">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
                      {item.chapterName}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-800">
                    {item.lessonName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CommonLessonsReportView;

