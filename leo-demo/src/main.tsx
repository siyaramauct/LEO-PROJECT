import { StrictMode } from 'react'
import type { ReactNode } from "react"
import { createRoot } from 'react-dom/client'
import './index.css'
import  { createBrowserRouter, RouterProvider } from "react-router-dom"
import ProtectedRoute from "./Components/ProtectedRoute.tsx"
import Lessons from "./Pages/Lessons.tsx"
import FlashActivity from "./Pages/FlashActivity.tsx"
import QuickQuiz from "./Pages/QuickQuiz.tsx"
import LessonSummary from "./Pages/LessonSummary.tsx" 
import Login from "./Pages/Login.tsx"
import RoleSelection from "./Pages/RoleSelection.tsx"
import SignUp from "./Pages/Signup.tsx"
import StudentClassrooms from "./Pages/StudentClassrooms.tsx"
import StudentDashboard from "./Pages/StudentDashboard.tsx"
import StudentFlashcards from "./Pages/StudentFlashcards.tsx"
import TeacherDashboard from "./Pages/TeacherDashboard.tsx"
import TeacherClassroom from "./Pages/TeacherClassroom.tsx"
import ClassroomDetail from "./Pages/ClassroomDetail.tsx"
import CreateClassroom from "./Pages/CreateClassroom.tsx"
import CreateLesson from "./Pages/CreateLesson.tsx"
import LearningHub from "./Pages/LearningHub.tsx"
import ClassProgress from "./Pages/ClassProgress.tsx"
import { AuthContextProvider } from "./context/AuthContext.tsx"

const protect = (element: ReactNode) => <ProtectedRoute>{element}</ProtectedRoute>

const router = createBrowserRouter([
  {
    path: "/", element: protect(<StudentDashboard />),
  },
  {
    path: "/lessons", element: protect(<Lessons />),
  },
  {
    path: "/student/flashcards", element: protect(<StudentFlashcards />),
  },
  {
    path: "/student/classrooms", element: protect(<StudentClassrooms />),
  },
  {
    path: "/teacher-dashboard", element: protect(<TeacherDashboard />),
  },
  {
    path: "/TeacherClassroom", element: protect(<TeacherClassroom />),
  },
  {
    path: "/teacher-classroom/:classroomId", element: protect(<ClassroomDetail />),
  },
  {
    path: "/create-classroom", element: protect(<CreateClassroom />),
  },
  {
    path: "/create-lesson", element: protect(<CreateLesson />),
  },
  {
    path: "/learning-hub", element: protect(<LearningHub />),
  },
  {
    path: "/class-progress", element: protect(<ClassProgress />),
  },
  {
    path: "/lesson/:lessonId", element: protect(<FlashActivity />)
  },
  {
    path: "/quiz",
    element: protect(<QuickQuiz />),
  },
  {
    path: "/summary",
    element: protect(<LessonSummary />),
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
  {
    path: "/select-role",
    element: <RoleSelection />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  </StrictMode>,
)
