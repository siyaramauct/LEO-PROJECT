
import { useEffect } from "react"
import { useState } from "react"
import LessonCard from "../Components/LessonCard"
import Navbar from "../Components/Navbar"
import { supabase } from "../supabase-client"

interface Lesson {
  id: number
  title: string
  description: string
  image_url: string | null
  image_alt: string | null
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true)
      setErrorMessage("")
      const { data, error } = await supabase.from("Lesson").select("*").order("id", { ascending: true })

      if (error) {
        console.error("Error fetching lessons:", error)
        setErrorMessage("Could not load lessons. Please try again.")
        setIsLoading(false)
        return
      }

      setLessons(data ?? [])
      setIsLoading(false)
    }

    fetchLessons()
  }, [])

  return (
    <div className="w-full h-screen flex flex-col items-center ">
      <Navbar />
      <h2 className="text-lg text-center font-bold mt-5">Lessons</h2>
      {isLoading && <p className="mt-5 text-sm text-gray-500">Loading lessons...</p>}
      {errorMessage && <p className="mt-5 text-sm font-semibold text-red-600">{errorMessage}</p>}
      <div className="w-full flex flex-row flex-wrap gap-5 justify-center mt-5">
        {!isLoading && !errorMessage && lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            title={lesson.title}
            description={lesson.description}
            imageSrc={lesson.image_url ?? "/business-illustration.avif"}
            imageAlt={lesson.image_alt ?? lesson.title}
            number={lesson.id}
          />
        ))}
      </div>
    </div>
  )
}
