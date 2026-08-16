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