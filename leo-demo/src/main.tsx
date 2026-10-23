// -----------------------------------------------------------------------------
// App Entry Point
//
// Starts the React app and defines every route. Routes are grouped by who may
// open them: public pages, student pages, teacher pages and shared pages.
// GuardRoute wraps each protected group and sends anyone without the right
// role to the login page, the role picker or their own dashboard.
//
// The whole app sits inside AuthContextProvider, so any page can call useAuth().
// -----------------------------------------------------------------------------

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import { AuthContextProvider } from "./context/AuthContext";
import { GuardRoute } from "./Components/GuardRoute";
import LoadingScreen from "./Components/LoadingScreen";
import PwaStatus from "./Components/PwaStatus";
import { installBrokenImageFallback } from "./utils/images";

// Public pages
import ForgotPassword from "./Pages/ForgotPassword";
import Home from "./Pages/Home";
import Login from "./Pages/Login";
import NotFound from "./Pages/NotFound";
import ResetPassword from "./Pages/ResetPassword";
import RoleSelection from "./Pages/RoleSelection";
import SignUp from "./Pages/Signup";

// Student pages
import FlashActivity from "./Pages/FlashActivity";
import ImageMatchActivity from "./Pages/ImageMatchActivity";
import Lessons from "./Pages/Lessons";
import LessonSummary from "./Pages/LessonSummary";
import QuickQuiz from "./Pages/QuickQuiz";
import StudentClassroomDetail from "./Pages/StudentClassroomDetail";
import StudentClassrooms from "./Pages/StudentClassrooms";
import StudentDashboard from "./Pages/StudentDashboard";
import StudentFlashcards from "./Pages/StudentFlashcards";
import StudentLearningHub from "./Pages/StudentLearningHub";
import StudentLearningReport from "./Pages/StudentLearningReport";
import StudentPractice from "./Pages/StudentPractice";
import StudentProfile from "./Pages/StudentProfile";

// Teacher pages
import ClassProgress from "./Pages/ClassProgress";
import ClassroomDetail from "./Pages/ClassroomDetail";
import ClassroomReport from "./Pages/ClassroomReport";
import CreateClassroom from "./Pages/CreateClassroom";
import CreateLesson from "./Pages/CreateLesson";
import TeacherClassroom from "./Pages/TeacherClassroom";
import TeacherDashboard from "./Pages/TeacherDashboard";
import TeacherLessonReport from "./Pages/TeacherLessonReport";
import TeacherProfile from "./Pages/TeacherProfile";

// Shared pages
import LearningHub from "./Pages/LearningHub";

// -- Routes -------------------------------------------------------------------

const router = createBrowserRouter([
  // Anyone, signed in or not.
  { path: "/", element: <Home /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/loading", element: <LoadingScreen /> },
  { path: "/select-role", element: <RoleSelection /> },

  // Students only.
  {
    element: <GuardRoute allowedRoles={["student"]} />,
    children: [
      { path: "/lessons", element: <Lessons /> },
      { path: "/lesson/:lessonId", element: <FlashActivity /> },
      { path: "/lesson/:lessonId/match", element: <ImageMatchActivity /> },
      { path: "/quiz", element: <QuickQuiz /> },
      { path: "/quiz/:lessonId", element: <QuickQuiz /> },
      { path: "/summary", element: <LessonSummary /> },
      { path: "/student/dashboard", element: <StudentDashboard /> },
      { path: "/student/practice", element: <StudentPractice /> },
      { path: "/student/classrooms", element: <StudentClassrooms /> },
      { path: "/student/classrooms/:classroomId", element: <StudentClassroomDetail /> },
      // One route with an optional classroom: /student/report opens the report
      // on the first classroom; picking another updates the URL in place.
      { path: "/student/report/:classroomId?", element: <StudentLearningReport /> },
      { path: "/student/flashcards", element: <StudentFlashcards /> },
      { path: "/student/hub", element: <StudentLearningHub /> },
      { path: "/student/profile", element: <StudentProfile /> },
    ],
  },

  // Teachers only.
  {
    element: <GuardRoute allowedRoles={["teacher"]} />,
    children: [
      { path: "/teacher-dashboard", element: <TeacherDashboard /> },
      { path: "/TeacherClassroom", element: <TeacherClassroom /> },
      { path: "/teacher-classroom/:classroomId", element: <ClassroomDetail /> },
      {
        path: "/teacher-classroom/:classroomId/lesson/:lessonId",
        element: <TeacherLessonReport />,
      },
      { path: "/create-classroom", element: <CreateClassroom /> },
      { path: "/create-lesson", element: <CreateLesson /> },
      { path: "/class-progress", element: <ClassProgress /> },
      { path: "/class-progress/:classroomId", element: <ClassroomReport /> },
      { path: "/teacher-profile", element: <TeacherProfile /> },
    ],
  },

  // Both roles.
  {
    element: <GuardRoute allowedRoles={["student", "teacher"]} />,
    children: [{ path: "/learning-hub", element: <LearningHub /> }],
  },

  { path: "*", element: <NotFound /> },
]);

// -- Start-up -----------------------------------------------------------------

installBrokenImageFallback();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PwaStatus />
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  </StrictMode>,
);
