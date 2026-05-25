import React, { useState, useEffect } from "react";
import AllSemesters from "../Course/Semester/AllSemesters";
import AllCourses from "../Course/Courses/AllCourses";
import AllChapters from "../Course/Chapters/AllChapters";
import AllLessons from "../Course/Lessons/AllLessons";
import AllQuestions from "../Course/Questions/AllQuestions";
import AllDiagnosticExam from "../Course/Diagnosticexam/AllDiagnosticExam";
import AllQuiz from "../Course/Quiz/AllQuiz";
import AllExams from "../Course/Exam/AllExams";

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
      {/* Tabs */}
      <div className="flex gap-2 w-full justify-around flex-wrap mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg border ${
              activeTab === tab.key
                ? "bg-one text-white"
                : "bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white p-4 rounded-xl shadow">
        {tabs.find((tab) => tab.key === activeTab)?.component}
      </div>
    </div>
  );
};

export default Filter;