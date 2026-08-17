import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import  { createBrowserRouter, RouterProvider } from "react-router-dom"
import Lessons from "./Pages/Lessons.tsx"
import FlashActivity from "./Pages/FlashActivity.tsx"
import StudentDashboard from "./Pages/StudentDashboard.tsx"
import StudentFlashcards from "./Pages/StudentFlashcards.tsx"

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
    path: "/lesson/:lessonId", element: <FlashActivity />
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
