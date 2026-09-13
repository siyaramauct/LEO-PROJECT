import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { AuthContextProvider } from "../context/AuthContext.tsx";
import { GuardRoute } from "./Components/GuardRoute";
import ClassroomDetail from "./Pages/ClassroomDetail.tsx";
import ClassProgress from "./Pages/ClassProgress";
import CreateClassroom from "./Pages/CreateClassroom.tsx";
import CreateLesson from "./Pages/CreateLesson";
import FlashActivity from "./Pages/FlashActivity.tsx";
import Home from "./Pages/Home.tsx";
import LearningHub from "./Pages/LearningHub.tsx";
import Lessons from "./Pages/Lessons.tsx";
import LessonSummary from "./Pages/LessonSummary.tsx";
import Login from "./Pages/Login.tsx";
import QuickQuiz from "./Pages/QuickQuiz.tsx";
import RoleSelection from "./Pages/RoleSelection.tsx";
import SignUp from "./Pages/Signup.tsx";
import StudentClassrooms from "./Pages/StudentClassrooms.tsx";
import StudentDashboard from "./Pages/StudentDashboard.tsx";
import StudentFlashcards from "./Pages/StudentFlashcards.tsx";
import StudentLearningHub from "./Pages/StudentLearningHub.tsx";
import StudentProfile from "./Pages/StudentProfile.tsx";
import TeacherClassroom from "./Pages/TeacherClassroom.tsx";
import TeacherDashboard from "./Pages/TeacherDashboard.tsx";
import TeacherProfile from "./Pages/TeacherProfile.tsx";
import LoadingScreen from "./Components/LoadingScreen.tsx";
import NotFound from "./Pages/NotFound.tsx";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/login", element: <Login /> },
  { path: "/loading", element: <LoadingScreen /> },
  { path: "/select-role", element: <RoleSelection /> },
  {
    element: <GuardRoute allowedRoles={["student"]} />,
    children: [
      { path: "/lessons", element: <Lessons /> },
      { path: "/lesson/:lessonId", element: <FlashActivity /> },
      { path: "/quiz", element: <QuickQuiz /> },
      { path: "/quiz/:lessonId", element: <QuickQuiz /> },
      { path: "/summary", element: <LessonSummary /> },
      { path: "/student/dashboard", element: <StudentDashboard /> },
      { path: "/student/classrooms", element: <StudentClassrooms /> },
      { path: "/student/flashcards", element: <StudentFlashcards /> },
      { path: "/student/hub", element: <StudentLearningHub /> },
      { path: "/student/profile", element: <StudentProfile /> },
    ],
  },
  {
    element: <GuardRoute allowedRoles={["teacher"]} />,
    children: [
      { path: "/teacher-dashboard", element: <TeacherDashboard /> },
      { path: "/TeacherClassroom", element: <TeacherClassroom /> },
      { path: "/teacher-classroom/:classroomId", element: <ClassroomDetail /> },
      { path: "/create-classroom", element: <CreateClassroom /> },
      { path: "/create-lesson", element: <CreateLesson /> },
      { path: "/class-progress", element: <ClassProgress /> },
      { path: "/teacher-profile", element: <TeacherProfile /> },
    ],
  },
  {
    element: <GuardRoute allowedRoles={["student", "teacher"]} />,
    children: [{ path: "/learning-hub", element: <LearningHub /> }],
  },
  { path: "*", element: <NotFound /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  </StrictMode>,
);
