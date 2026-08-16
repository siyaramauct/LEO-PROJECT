import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import Lessons from "./Pages/Lessons.tsx"
import CreateLesson from "./Pages/CreateLesson"
import ClassProgress from "./Pages/ClassProgress"
import FlashActivity from "./Pages/FlashActivity.tsx"
import SignUp from './Pages/Signup.tsx'
import RoleSelection from './Pages/RoleSelection.tsx'
import Login from './Pages/Login.tsx'
import Home from './Pages/Home.tsx'
import TeacherDashboard from './Pages/TeacherDashboard.tsx'
import TeacherClassroom from './Pages/TeacherClassroom.tsx'
import ClassroomDetail from './Pages/ClassroomDetail.tsx'
import CreateClassroom from './Pages/CreateClassroom.tsx'
import LearningHub from './Pages/LearningHub.tsx'
import { AuthContextProvider } from '../context/AuthContext.tsx'

const router = createBrowserRouter([
  {
    path: "/", element: <Home />,
  },
  {
    path: "/lessons", element: <Lessons />,
  },
  {
    path: "/lesson/:lessonId", element: <FlashActivity />
  },
  {
    path: "/signup", element: <SignUp />
  },
  {
    path: "/select-role", element: <RoleSelection />
  },
  {
    path: "/login", element: <Login />
  },
  {
    path: "/teacher-dashboard", element: <TeacherDashboard />
  }, 

  {
    path: "/TeacherClassroom", element: <TeacherClassroom />
  },
  {
    path: "/teacher-classroom/:classroomId", element: <ClassroomDetail />
  },
  {
    path: "/create-classroom", element: <CreateClassroom />
  },
  {
    path: "/learning-hub", element: <LearningHub />
  },
  {
    path: "/create-lesson", element: <CreateLesson />
  },
  {
    path: "/class-progress", element: <ClassProgress />
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  </StrictMode>,
)