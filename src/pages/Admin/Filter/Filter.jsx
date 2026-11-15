import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHead, Tabs } from "@/components/admin/kit";
import AllSemesters from "../Course/Semester/AllSemesters";
import AllCourses from "../Course/Courses/AllCourses";
import AllChapters from "../Course/Chapters/AllChapters";
import AllLessons from "../Course/Lessons/AllLessons";
import AllQuestions from "../Course/Questions/AllQuestions";
import AllDiagnosticExam from "../Course/Diagnosticexam/AllDiagnosticExam";
import AllQuiz from "../Course/Quiz/AllQuiz";
import AllExams from "../Course/Exam/AllExams";

/* Segmented tab bar (MathPortal design) over the course lists; the open tab is remembered per session. */
const Filter = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("activeTab") || "semesters";
  });

  useEffect(() => {
    sessionStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const tabs = [
    { key: "courses", label: "Courses", component: <AllCourses /> },
    { key: "semesters", label: "Semesters", component: <AllSemesters /> },
    { key: "chapters", label: "Chapters", component: <AllChapters /> },
    { key: "lessons", label: "Lessons", component: <AllLessons /> },
    { key: "questions", label: "Questions", component: <AllQuestions /> },
    { key: "diagnostic", label: "Diagnostic Exams", component: <AllDiagnosticExam /> },
    { key: "quiz", label: "Quiz", component: <AllQuiz /> },
    { key: "exams", label: "Exams", component: <AllExams /> },
  ];

  return (
    <div>
      <Link to="/admin/Filter" className="text-xs font-bold text-gray-500 hover:text-one">← Filter</Link>
      <PageHead title="All content tables" sub="Every course, semester, chapter, lesson, question, quiz and exam in one place." />
      <Tabs tabs={tabs.map(({ key, label }) => ({ key, label }))} value={activeTab} onChange={setActiveTab} />
      <div key={activeTab}>{tabs.find((tab) => tab.key === activeTab)?.component}</div>
    </div>
  );
};

export default Filter;
