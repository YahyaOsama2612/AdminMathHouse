import { createBrowserRouter } from "react-router-dom";
import Login from "../Auth/Login";
import LoginDrive from "../Auth/LoginDrive";
import SaveRoute from "../Auth/SaveRoute";
import AdminLayout from "../Layout/AdminLayout";
import Home from "../pages/Home/Home";
import Filter from '../pages/Admin/Filter/Filter'

import Admin from "../pages/Admin/Admins/Admin/Admin";
import AddAdmin from "../pages/Admin/Admins/Admin/AddAdmin";
import EditAdmin from "../pages/Admin/Admins/Admin/EditAdmin";

import Student from "../pages/Admin/User/Student/Student";
import AddStudent from "../pages/Admin/User/Student/AddStudent";
import EditStudent from "../pages/Admin/User/Student/EditStudent";
import Attend from "../pages/Admin/User/Student/Attend";
import UserPackage from "../pages/Admin/User/Package/userpackage";

import Category from '../pages/Admin/Course/Category/Category'
import AddCategory from '../pages/Admin/Course/Category/AddCategory'
import EditCategory from '../pages/Admin/Course/Category/EditCategory'

import Semester from '../pages/Admin/Course/Semester/Semester'
import AddSemester from '../pages/Admin/Course/Semester/AddSemester'
import EditSemester from '../pages/Admin/Course/Semester/EditSemester'

import Teacher from '../pages/Admin/User/Teacher/Teachers'
import AddTeacher from '../pages/Admin/User/Teacher/AddTeachers'
import EditTeacher from '../pages/Admin/User/Teacher/EditTeachers'

import Parent from '../pages/Admin/User/Parent/Parent'
import AddParent from '../pages/Admin/User/Parent/AddParent'
import EditParent from '../pages/Admin/User/Parent/EditParent'


import ExamCode from '../pages/Admin/Settings/ExamCode/ExamCode'
import Addexamcode from '../pages/Admin/Settings/ExamCode/AddExamCode'
import Editexamcode from '../pages/Admin/Settings/ExamCode/EditExamCode'

import Courses from '../pages/Admin/Course/Courses/Courses'
import AllCourses from '../pages/Admin/Course/Courses/AllCourses'
import AddCourse from '../pages/Admin/Course/Courses/AddCourses'
import EditCourse from '../pages/Admin/Course/Courses/EditCourses'

import Chapters from '../pages/Admin/Course/Chapters/Chapters'
import AddChapter from '../pages/Admin/Course/Chapters/AddChapters'
import EditChapter from '../pages/Admin/Course/Chapters/EditChapters'

import Lessons from '../pages/Admin/Course/Lessons/Lessons'
import AddLesson from '../pages/Admin/Course/Lessons/AddLessons'
import EditLesson from '../pages/Admin/Course/Lessons/EditLessons'

import Section from '../pages/Admin/Settings/Section/Section'
import AddSection from '../pages/Admin/Settings/Section/AddSection'
import EditSection from '../pages/Admin/Settings/Section/EditSection'

import RawScore from '../pages/Admin/Settings/RawScore/RawScore'
import AddRawScore from '../pages/Admin/Settings/RawScore/AddRawScore'
import EditRawScore from '../pages/Admin/Settings/RawScore/EditRawScore'  

import Currency from '../pages/Admin/Settings/Currency/Currency'
import AddCurrency from '../pages/Admin/Settings/Currency/AddCurrency'
import EditCurrency from '../pages/Admin/Settings/Currency/EditCurrency'

import Questions from '../pages/Admin/Course/Questions/Questions'
import AllQuestions from '../pages/Admin/Course/Questions/AllQuestions'
import AddQuestions from '../pages/Admin/Course/Questions/AddQuestions'
import EditQuestions from '../pages/Admin/Course/Questions/EditQuestions'
import SameQuestions from '../pages/Admin/Course/Questions/SameQuestions'

import Packages from '../pages/Admin/Package/Packages/Packages'
import AddPackages from '../pages/Admin/Package/Packages/AddPackages'
import EditPackages from '../pages/Admin/Package/Packages/EditPackages'

import Grouos from '../pages/Admin/Live/Groups/Groups'
import AddGroups from '../pages/Admin/Live/Groups/AddGroups'
import EditGroups from '../pages/Admin/Live/Groups/EditGroups'

import Sessions from '../pages/Admin/Live/Sessions/Sessions'
import AddSessions from '../pages/Admin/Live/Sessions/AddSessions'
import EditSessions from '../pages/Admin/Live/Sessions/EditSessions'

import Popup from '../pages/Admin/Marketing/Popup/Popup'
import AddPopup from '../pages/Admin/Marketing/Popup/AddPopup'
import EditPopup from '../pages/Admin/Marketing/Popup/EditPopup'

import PaymentMethod from '../pages/Admin/Payments/PaymentMethod/PaymentMethod'
import AddPaymentMethod from '../pages/Admin/Payments/PaymentMethod/AddPaymentMethod'
import EditPaymentMethod from '../pages/Admin/Payments/PaymentMethod/EditPaymentMethod'


import Diagnosticexam from '../pages/Admin/Course/Diagnosticexam/Diagnosticexam'
import AddDiagnosticexam from "../pages/Admin/Course/Diagnosticexam/AddDiagnosticexam";
import EditDiagnosticexam from "../pages/Admin/Course/Diagnosticexam/EditDiagnosticexam";

import Exam from '../pages/Admin/Course/Exam/Exam'
import AddExam from '../pages/Admin/Course/Exam/AddExam'
import EditExam from '../pages/Admin/Course/Exam/EditExam'

import Quiz from '../pages/Admin/Course/Quiz/Quiz'
import AddQuiz from '../pages/Admin/Course/Quiz/AddQuiz'
import EditQuiz from '../pages/Admin/Course/Quiz/EditQuiz'

import Promocodes from '../pages/Admin/Marketing/PromoCodes/PromoCodes'
import Addpromocodes from '../pages/Admin/Marketing/PromoCodes/AddPromoCodes'
import Editpromocodes from '../pages/Admin/Marketing/PromoCodes/EditPromoCodes'

import Notifications from '../pages/Admin/Notifications/Notifications'
import AddNotifications from '../pages/Admin/Notifications/AddNotifications'
import EditNotifications from '../pages/Admin/Notifications/EditNotifications'

import Parallel from '../pages/Admin/Course/Parallel/Parallel'
import AddParallel from '../pages/Admin/Course/Parallel/AddParallel'
import EditParallel from '../pages/Admin/Course/Parallel/EditParallel'

import Grade from '../pages/Admin/Course/Grade/Grade'
import AddGrade from '../pages/Admin/Course/Grade/AddGrade'
import EditGrade from '../pages/Admin/Course/Grade/EditGrade'


import PaymentRecharge from '../pages/Admin/Payments/PaymentRecharge/PaymentRecharge'
import PaymentPackage from '../pages/Admin/Payments/PaymentPackage/PaymentPackage'
import DriveLayout from "../Layout/DriveLayout";
import PaymentContent from "../pages/Admin/Payments/PaymentContent/PaymentContent";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "logindrive",
    element: <LoginDrive />,
  },
  {
path:"/drive/*",
element:(
    <SaveRoute allowedRole="drive">
    <DriveLayout />
  </SaveRoute>
),
children: [
  {
    index: true,
    element: <Home />,
  },
]

  },

  {
    path: "/admin/*",
    element: (
    <SaveRoute allowedRole="admin">
        <AdminLayout />
      </SaveRoute>
    ),
    children: [
      { index: true, element: <Home /> },

     { path: "Admin", element: <Admin /> },
      { path: "Admin/add", element: <AddAdmin /> },
      { path: "Admin/edit/:id", element: <EditAdmin /> },

      { path: "users/students", element: <Student /> },
      { path: "users/students/add", element: <AddStudent /> },
      { path: "users/students/edit/:id", element: <EditStudent /> },
      { path: "users/students/attend/:id", element: <Attend /> },
      { path: "users/packages/:id", element: <UserPackage /> },
      { path: "courses/semester/:coursesId", element: <Semester /> },
      { path: "courses/semester/add", element: <AddSemester /> },
      { path: "courses/semester/edit/:id", element: <EditSemester /> },

      { path: "users/teachers", element: <Teacher /> },
      { path: "users/teachers/add", element: <AddTeacher /> },
      { path: "users/teachers/edit/:id", element: <EditTeacher /> },
      
      { path: "users/parents", element: <Parent /> },
      { path: "users/parents/add", element: <AddParent /> },
      { path: "users/parents/edit/:id", element: <EditParent /> },
      
      {path: "settings/examcode", element: <ExamCode />},
      {path: "settings/examcode/add", element: <Addexamcode />},
      {path: "settings/examcode/edit/:id", element: <Editexamcode />},

      { path: "courses/categories", element: <Category /> },
      { path: "courses/categories/add", element: <AddCategory /> },
      { path: "courses/categories/edit/:id", element: <EditCategory /> },

      { path: "courses/courses/:categoryId", element: <Courses /> },
      { path: "courses/courses/add", element: <AddCourse /> },
      { path: "courses/courses/edit/:id", element: <EditCourse /> },

      { path: "courses/chapters/:courseId", element: <Chapters /> },
      { path: "courses/chapters/add", element: <AddChapter /> },
      { path: "courses/chapters/edit/:id", element: <EditChapter /> },


      {path:"courses/lessons/:chapterId", element: <Lessons />},
      {path:"courses/lessons/add", element: <AddLesson />},
      {path:"courses/lessons/edit/:id", element: <EditLesson />},
      
      {path:"courses/questions/:lessonId", element: <Questions />},
      {path:"courses/questions/add", element: <AddQuestions />},
      {path:"courses/questions/same/:id", element: <SameQuestions />},
      {path:"courses/questions/edit/:id", element: <EditQuestions />},

      {path:"settings/section", element: <Section />},
      {path:"settings/section/add", element: <AddSection />},
      {path:"settings/section/edit/:id", element: <EditSection />},

      {path:"settings/rawscore", element: <RawScore />},
      {path:"settings/rawscore/add", element: <AddRawScore />},
      {path:"settings/rawscore/edit/:id", element: <EditRawScore />},

      {path:"settings/currency", element: <Currency />},
      {path:"settings/currency/add", element: <AddCurrency />},
      {path:"settings/currency/edit/:id", element: <EditCurrency />},

      {path:"packages/packages", element: <Packages />},
      {path:"packages/packages/add", element: <AddPackages />},
      {path:"packages/packages/edit/:id", element: <EditPackages />},

      {path:"live/groups", element: <Grouos />},
      {path:"live/groups/add", element: <AddGroups />},
      {path:"live/groups/edit/:id", element: <EditGroups />},

      {path:"live/sessions", element: <Sessions />},
      {path:"live/sessions/add", element: <AddSessions />},
      {path:"live/sessions/edit/:id", element: <EditSessions />},

      {path:"marketing/popup", element: <Popup />},
      {path:"marketing/popup/add", element: <AddPopup />},
      {path:"marketing/popup/edit/:id", element: <EditPopup />},

      
      
      {path:"courses/diagnosticexam/:courseId", element: <Diagnosticexam />},
      {path:"courses/diagnosticexam/add", element: <AddDiagnosticexam />},
      {path:"courses/diagnosticexam/edit/:id", element: <EditDiagnosticexam />},
      
      {path:"courses/exam/:courseId", element: <Exam />},
      {path:"courses/exam/add", element: <AddExam />},
      {path:"courses/exam/edit/:id", element: <EditExam />},
      
      
      {path:"courses/quiz/:lessonId", element: <Quiz />},
      {path:"courses/quiz/add", element: <AddQuiz />},
      {path:"courses/quiz/edit/:id", element: <EditQuiz />},
      
      {path:"marketing/promocodes", element: <Promocodes />},
      {path:"marketing/promocodes/add", element: <Addpromocodes />},
      {path:"marketing/promocodes/edit/:id", element: <Editpromocodes />},
      
      {path:"notifications", element: <Notifications />},
      {path:"notifications/add", element: <AddNotifications />},
      {path:"notifications/edit/:id", element: <EditNotifications />},
      
      
      {path:"courses/questions/parallel/:id", element: <Parallel />},
      {path:"courses/questions/parallel/add", element: <AddParallel />},
      {path:"courses/questions/parallel/edit/:id", element: <EditParallel />},
      
      
      {path:"courses/grade", element: <Grade />},
      {path:"courses/grade/add", element: <AddGrade />},
      {path:"courses/grade/edit/:id", element: <EditGrade />},
      
      
      {path:"filter", element: <Filter />},





      {path:"payment/paymentrecharge", element: <PaymentRecharge />},
      {path:"payment/paymentpackage", element: <PaymentPackage />},



      {path:"payment/payment-method", element: <PaymentMethod />},
      {path:"payment/payment-method/add", element: <AddPaymentMethod />},
      {path:"payment/payment-method/edit/:id", element: <EditPaymentMethod />},

      {path:"payment/payment-content", element: <PaymentContent />},
    ],
  },
]);

export default router;
