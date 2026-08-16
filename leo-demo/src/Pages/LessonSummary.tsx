import { useNavigate } from "react-router-dom"
import Navbar from "../Components/Navbar"

interface QuizResult {
  score: number
  totalQuestions: number
  correct: number
  incorrect: number
  results: {
    questionId: number
    question: string
    studentAnswer: string
    correctAnswer: string
    isCorrect: boolean
  }[]
}

export default function LessonSummary() {
  const navigate = useNavigate()

  const savedResult = sessionStorage.getItem("quiz-result")

  const result: QuizResult | null = savedResult
    ? JSON.parse(savedResult)
    : null

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 text-center">

          <h1 className="text-2xl font-bold text-gray-900">
            No quiz results found
          </h1>

          <p className="mt-3 text-gray-600">
            Complete a quiz first to see your lesson summary.
          </p>

          <button
            onClick={() => navigate("/quiz")}
            className="mt-6 rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800"
          >
            Start Quiz
          </button>

        </main>
      </div>
    )
  }

  const percentage = Math.round(
    (result.score / result.totalQuestions) * 100,
  )

  const getMessage = () => {
    if (percentage >= 80) {
      return "Excellent work! You have a strong understanding of this lesson."
    }

    if (percentage >= 50) {
      return "Good effort! Review the questions you missed and try again."
    }

    return "Keep practising! Review the lesson material and try the quiz again."
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-5 py-8">

        {/* Completion header */}

        <div className="text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl">
            🎉
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-violet-700">
            Lesson Complete
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Great job!
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            {getMessage()}
          </p>

        </div>

        {/* Score card */}

        <div className="mt-8 rounded-3xl bg-white p-7 text-center shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Your Score
          </p>

          <div className="mt-3 flex items-baseline justify-center gap-2">

            <span className="text-5xl font-bold text-gray-900">
              {result.score}
            </span>

            <span className="text-2xl text-gray-400">
              / {result.totalQuestions}
            </span>

          </div>

          <p className="mt-2 text-lg font-semibold text-violet-700">
            {percentage}%
          </p>

          <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-violet-700 transition-all duration-700"
              style={{ width: `${percentage}%` }}
            />
          </div>

        </div>

        {/* Correct / Incorrect */}

        <div className="mt-5 grid grid-cols-2 gap-4">

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">

            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
              ✓
            </div>

            <p className="mt-3 text-2xl font-bold text-green-700">
              {result.correct}
            </p>

            <p className="text-sm font-medium text-green-800">
              Correct
            </p>

          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
              ✕
            </div>

            <p className="mt-3 text-2xl font-bold text-red-700">
              {result.incorrect}
            </p>

            <p className="text-sm font-medium text-red-800">
              Incorrect
            </p>

          </div>

        </div>

        {/* Answer review */}

        <div className="mt-8">

          <h2 className="text-xl font-bold text-gray-900">
            Answer Review
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Review your answers and see what you can improve.
          </p>

          <div className="mt-5 space-y-4">

            {result.results.map((item, index) => (

              <div
                key={item.questionId}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >

                <div className="flex items-start gap-4">

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                      item.isCorrect
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1">

                    <div className="flex items-start justify-between gap-3">

                      <h3 className="font-semibold text-gray-900">
                        {item.question}
                      </h3>

                      <span
                        className={`shrink-0 text-sm font-bold ${
                          item.isCorrect
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {item.isCorrect
                          ? "Correct"
                          : "Incorrect"}
                      </span>

                    </div>

                    <div className="mt-4 space-y-2 text-sm">

                      <p className="text-gray-600">
                        <span className="font-semibold">
                          Your answer:
                        </span>{" "}
                        {item.studentAnswer || "Not answered"}
                      </p>

                      {!item.isCorrect && (
                        <p className="text-green-700">
                          <span className="font-semibold">
                            Correct answer:
                          </span>{" "}
                          {item.correctAnswer}
                        </p>
                      )}

                    </div>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* Actions */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">

          <button
            onClick={() => {
              sessionStorage.removeItem("quiz-result")
              navigate("/quiz")
            }}
            className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-white"
          >
            Try Quiz Again
          </button>

          <button
            onClick={() => navigate("/")}
            className="rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white transition hover:bg-violet-800 sm:flex-1"
          >
            Back to Lessons
          </button>

        </div>

      </main>
    </div>
  )
}