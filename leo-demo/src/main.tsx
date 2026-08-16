import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import  { createBrowserRouter, RouterProvider } from "react-router-dom"
import Lessons from "./Pages/Lessons.tsx"
import FlashActivity from "./Pages/FlashActivity.tsx"
import QuickQuiz from "./Pages/QuickQuiz.tsx"
import LessonSummary from "./Pages/LessonSummary.tsx" 

const router = createBrowserRouter([
  {
    path: "/", element: <Lessons />,
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
