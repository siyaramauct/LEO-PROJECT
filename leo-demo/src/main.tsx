import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import  { createBrowserRouter, RouterProvider } from "react-router-dom"
import Lessons from "./Pages/Lessons.tsx"
import FlashActivity from "./Pages/FlashActivity.tsx"
import QuickQuiz from "./Pages/QuickQuiz.tsx"
import LessonSummary from "./Pages/LessonSummary.tsx" 
import StudentDashboard from "./Pages/StudentDashboard.tsx"
import StudentFlashcards from "./Pages/StudentFlashcards.tsx"
import TeacherDashboard from "./Pages/TeacherDashboard.tsx"
import TeacherClassroom from "./Pages/TeacherClassroom.tsx"
import ClassroomDetail from "./Pages/ClassroomDetail.tsx"
import CreateClassroom from "./Pages/CreateClassroom.tsx"
import CreateLesson from "./Pages/CreateLesson.tsx"
import LearningHub from "./Pages/LearningHub.tsx"
import ClassProgress from "./Pages/ClassProgress.tsx"

const router = createBrowserRouter([
  {
    path: "/", element: <StudentDashboard />,
  },
  {
    path: "/lessons", element: <Lessons />,
  },
  {
    path: "/student/flashcards", element: <StudentFlashcards />,
  },
  {
    path: "/teacher-dashboard", element: <TeacherDashboard />,
  },
  {
    path: "/TeacherClassroom", element: <TeacherClassroom />,
  },
  {
    path: "/teacher-classroom/:classroomId", element: <ClassroomDetail />,
  },
  {
    path: "/create-classroom", element: <CreateClassroom />,
  },
  {
    path: "/create-lesson", element: <CreateLesson />,
  },
  {
    path: "/learning-hub", element: <LearningHub />,
  },
  {
    path: "/class-progress", element: <ClassProgress />,
  },
  {
    path: "/lesson/:lessonId", element: <FlashActivity />
  },
  {
    path: "/quiz",
    element: <QuickQuiz />,
  },
  {
    path: "/summary",
    element: <LessonSummary />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
