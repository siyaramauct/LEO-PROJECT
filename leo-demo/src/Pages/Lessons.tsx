import LessonCard from "../Components/LessonCard"
import Navbar from "../Components/Navbar"


export default function Lessons() {


  const vocablessons = [
    {
      title: "Lesson 1: Basic Business English ",
      description: "Learn the most common words and phrases in the language.",
      imageSrc: "/business-illustration.avif",
      imageAlt: "Business English lesson",
      number: 1
    },
    {
      title: "Lesson 2: Business Communication",
      description: "Learn how to communicate effectively in a business setting.",
      imageSrc: "/businessEng.avif",
      imageAlt: "Business Communication lesson",
      number: 2
    }
  ]

  return (
    <div className="w-full h-screen flex flex-col items-center ">
      <Navbar />
      <h2 className="text-lg text-center font-bold mt-5">Lessons</h2>
      <div className="w-full flex flex-row flex-wrap gap-5 justify-center mt-5">
        {vocablessons.map((lesson, index) => (
          <LessonCard
            key={index}
            title={lesson.title}
            description={lesson.description}
            imageSrc={lesson.imageSrc}
            imageAlt={lesson.imageAlt}
            number={lesson.number}
          />
        ))}
      </div>
    </div>
  )
}