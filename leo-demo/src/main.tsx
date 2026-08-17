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
import TeacherProfile from './Pages/TeacherProfile.tsx'
import { AuthContextProvider } from '../context/AuthContext.tsx'

import { GuardRoute } from "./Components/GuardRoute";

const router = createBrowserRouter([

  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/select-role",
    element: <RoleSelection />, // handles its own session check , not  in GuardRoute
  },

  // Student Routes Only
  {
    element: <GuardRoute allowedRoles={["student"]} />,
    children: [
      { path: "/lessons", element: <Lessons /> },
      { path: "/lesson/:lessonId", element: <FlashActivity /> },
    ],
  },

  // Teacher Routes Only 
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

  //  either role 
  {
    element: <GuardRoute allowedRoles={["student", "teacher"]} />,
    children: [
      { path: "/learning-hub", element: <LearningHub /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  </StrictMode>,
)