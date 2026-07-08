import ExcelJS from "exceljs";
import api from "@/api/api";

/* ---------------------------------------------------------------------- */
/* Shared: trigger a browser download for a built workbook                 */
/* ---------------------------------------------------------------------- */
const downloadWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const safeFileName = (name) => (name || "student").replace(/\s+/g, "_");

/* ---------------------------------------------------------------------- */
/* 1. Curriculum tree fetch (chapters + lessons for a course, in order)     */
/*    Reuses the same endpoints as LessonSelectionRow.jsx                  */
/* ---------------------------------------------------------------------- */
export const fetchCourseCurriculum = async (courseId) => {
  const chaptersRes = await api.get(
    `/api/admin/session/select/chapter/${courseId}`,
  );
  const chapters = chaptersRes.data?.data?.chapters || [];

  return Promise.all(
    chapters.map(async (chapter) => {
      const lessonsRes = await api.get(
        `/api/admin/session/select/lesson/${chapter.id}`,
      );
      const lessons = lessonsRes.data?.data?.lessons || [];
      return { id: chapter.id, name: chapter.name, lessons };
    }),
  );
};

/* ---------------------------------------------------------------------- */
/* 2. Group quiz attempts by lesson into Q1/Q2/Q3 percentages              */
/*    Relies on quizName containing "Quiz 1" / "Quiz 2" / "Quiz 3"         */
/* ---------------------------------------------------------------------- */
const QUIZ_NUMBER_REGEX = /quiz\s*(\d+)/i;

export const buildLessonScoresMap = (quizzes = []) => {
  const map = {}; // lessonId -> { 1: pct, 2: pct, 3: pct }

  quizzes.forEach((quiz) => {
    const lessonId = quiz.lesson?.id;
    if (!lessonId) return;

    const match = quiz.quizName?.match(QUIZ_NUMBER_REGEX);
    const quizNumber = match ? Number(match[1]) : null;
    if (!quizNumber || quizNumber < 1 || quizNumber > 3) return;

    // Not attempted (status "absent", score null) -> leave blank
    if (quiz.score === null || quiz.score === undefined || !quiz.totalScore) {
      return;
    }

    const percentage = Math.round((quiz.score / quiz.totalScore) * 100);
    if (!map[lessonId]) map[lessonId] = {};
    map[lessonId][quizNumber] = percentage;
  });

  return map;
};

/* ---------------------------------------------------------------------- */
/* 3. Export: Lesson Progress report (Image 1 style)                       */
/* ---------------------------------------------------------------------- */
export const exportLessonProgressReport = async ({
  studentName,
  grade,
  courseId,
  quizzes,
}) => {
  if (!courseId) {
    throw new Error(
      "A course must be selected to export the lesson progress report.",
    );
  }

  const [chapters, lessonScores] = await Promise.all([
    fetchCourseCurriculum(courseId),
    Promise.resolve(buildLessonScoresMap(quizzes)),
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lesson Progress");

  sheet.columns = [
    { width: 5 },
    { width: 55 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
  ];

  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = `NAME : ${studentName}`;
  sheet.getCell("A1").font = { bold: true, size: 13 };

  sheet.mergeCells("A2:B2");
  sheet.getCell("A2").value = `GRADE : ${grade || ""}`;
  sheet.getCell("A2").font = { bold: true, size: 13 };

  let rowIndex = 4;
  let lessonCounter = 1;

  chapters.forEach((chapter) => {
    const headerRow = sheet.getRow(rowIndex);
    sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
    headerRow.getCell(1).value = chapter.name;
    headerRow.getCell(3).value = "Q1";
    headerRow.getCell(4).value = "Q2";
    headerRow.getCell(5).value = "Q3";

    for (let col = 1; col <= 5; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF6A821" }, // orange, matches template
      };
    }
    rowIndex += 1;

    chapter.lessons.forEach((lesson) => {
      const row = sheet.getRow(rowIndex);
      row.getCell(1).value = lessonCounter;
      row.getCell(2).value = lesson.name;

      const scores = lessonScores[lesson.id] || {};
      row.getCell(3).value = scores[1] ?? "";
      row.getCell(4).value = scores[2] ?? "";
      row.getCell(5).value = scores[3] ?? "";

      rowIndex += 1;
      lessonCounter += 1;
    });
  });

  await downloadWorkbook(
    workbook,
    `${safeFileName(studentName)}_Lesson_Progress.xlsx`,
  );
};

/* ---------------------------------------------------------------------- */
/* 4. Export: Exam report (Image 2 style, adapted to real fields —          */
/*    no Module 1/Module 2 exist in the API, so Score/Total/Mistakes/     */
/*    Status are used instead)                                             */
/* ---------------------------------------------------------------------- */
export const exportExamReport = async ({ studentName, grade, exams = [] }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Exam Report");

  sheet.columns = [
    { width: 5 },
    { width: 45 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
  ];

  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = "NAME";
  sheet.getCell("B1").value = studentName;
  sheet.getCell("A1").font = { bold: true };

  sheet.mergeCells("A2:B2");
  sheet.getCell("A2").value = "GRADE";
  sheet.getCell("B2").value = grade || "";
  sheet.getCell("A2").font = { bold: true };

  const headerRowIndex = 4;
  const headerRow = sheet.getRow(headerRowIndex);
  ["#", "Exam Name", "Score", "Total", "Mistakes", "Status"].forEach(
    (label, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6E0B4" }, // light green, matches template
      };
    },
  );

  exams.forEach((exam, idx) => {
    const row = sheet.getRow(headerRowIndex + 1 + idx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = exam.examName;
    row.getCell(3).value = exam.score ?? "";
    row.getCell(4).value = exam.totalScore ?? "";
    row.getCell(5).value = exam.mistakesCount ?? "";
    row.getCell(6).value = exam.status || "";
  });

  await downloadWorkbook(
    workbook,
    `${safeFileName(studentName)}_Exam_Report.xlsx`,
  );
};
