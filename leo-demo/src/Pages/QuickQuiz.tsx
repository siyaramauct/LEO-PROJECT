import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../Components/Navbar"

interface Question {
  id: number
  question: string
  options?: string[]
  correctAnswer: string
  type: "multiple-choice" | "text"
}

interface QuizAnswer {
  questionId: number
  answer: string
}

const questions: Question[] = [
  {
    id: 1,
    question: "Which part of the cell contains the genetic material?",
    options: [
      "Ribosome",
      "Nucleus",
      "Cell Membrane",
      "Cytoplasm",
    ],
    correctAnswer: "Nucleus",
    type: "multiple-choice",
  },
  {
    id: 2,
    question: "Which organelle is known as the powerhouse of the cell?",
    options: [
      "Nucleus",
      "Ribosome",
      "Mitochondria",
      "Cell Wall",
    ],
    correctAnswer: "Mitochondria",
    type: "multiple-choice",
  },
  {
    id: 3,
    question: "What controls what enters and leaves the cell?",
    options: [
      "Nucleus",
      "Cell Membrane",
      "Ribosome",
      "Cytoplasm",
    ],
    correctAnswer: "Cell Membrane",
    type: "multiple-choice",
  },
  {
    id: 4,
    question: "What is the jelly-like substance inside a cell called?",
    options: [
      "Cytoplasm",
      "Nucleus",
      "Cell Wall",
      "Mitochondria",
    ],
    correctAnswer: "Cytoplasm",
    type: "multiple-choice",
  },
  {
    id: 5,
    question: "Name the organelle responsible for making proteins.",
    correctAnswer: "Ribosome",
    type: "text",
  },
]

function getSavedQuizProgress() {
  const savedProgress = sessionStorage.getItem("quiz-progress")

  if (!savedProgress) {
    return {
      currentQuestion: 0,
      answers: [] as QuizAnswer[],
    }
  }

  try {
    const saved = JSON.parse(savedProgress)

    return {
      currentQuestion: saved.currentQuestion ?? 0,
      answers: saved.answers ?? [],
    }
  } catch {
    return {
      currentQuestion: 0,
      answers: [] as QuizAnswer[],
    }
  }
}

export default function QuickQuiz() {
  const navigate = useNavigate()
  const savedProgress = getSavedQuizProgress()

  const [currentQuestion, setCurrentQuestion] = useState(savedProgress.currentQuestion)
  const [answers, setAnswers] = useState<QuizAnswer[]>(savedProgress.answers)
  const [showReview, setShowReview] = useState(false)

  const question = questions[currentQuestion]

  const currentAnswer =
    answers.find((answer) => answer.questionId === question.id)?.answer ?? ""

  const progress = ((currentQuestion + 1) / questions.length) * 100

  const saveProgress = (
    nextQuestion: number,
    nextAnswers: QuizAnswer[],
  ) => {
    sessionStorage.setItem(
      "quiz-progress",
      JSON.stringify({
        currentQuestion: nextQuestion,
        answers: nextAnswers,
      }),
    )
  }

  const handleAnswer = (answer: string) => {
    const existingAnswer = answers.find(
      (item) => item.questionId === question.id,
    )

    let updatedAnswers: QuizAnswer[]

    if (existingAnswer) {
      updatedAnswers = answers.map((item) =>
        item.questionId === question.id
          ? { ...item, answer }
          : item,
      )
    } else {
      updatedAnswers = [
        ...answers,
        {
          questionId: question.id,
          answer,
        },
      ]
    }

    setAnswers(updatedAnswers)

    saveProgress(currentQuestion, updatedAnswers)
  }

  const handleNext = () => {
    if (currentQuestion === questions.length - 1) {
      setShowReview(true)
      return
    }

    const nextQuestion = currentQuestion + 1

    setCurrentQuestion(nextQuestion)

    saveProgress(nextQuestion, answers)
  }

  const handlePrevious = () => {
    if (currentQuestion === 0) {
      return
    }

    const previousQuestion = currentQuestion - 1

    setCurrentQuestion(previousQuestion)

    saveProgress(previousQuestion, answers)
  }

  const handleSubmit = () => {
    const results = questions.map((item) => {
      const studentAnswer =
        answers.find(
          (answer) => answer.questionId === item.id,
        )?.answer ?? ""

      const isCorrect =
        studentAnswer.trim().toLowerCase() ===
        item.correctAnswer.trim().toLowerCase()

      return {
        questionId: item.id,
        question: item.question,
        studentAnswer,
        correctAnswer: item.correctAnswer,
        isCorrect,
      }
    })

    const score = results.filter(
      (result) => result.isCorrect,
    ).length

    const incorrect = results.filter(
      (result) => !result.isCorrect,
    ).length

    sessionStorage.setItem(
      "quiz-result",
      JSON.stringify({
        score,
        totalQuestions: questions.length,
        correct: score,
        incorrect,
        results,
      }),
    )

    sessionStorage.removeItem("quiz-progress")

    navigate("/summary")
  }

  const answeredCount = answers.filter(
    (answer) => answer.answer.trim() !== "",
  ).length

  /*
    REVIEW SCREEN
  */
  if (showReview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="mx-auto w-full max-w-3xl px-5 py-8">

          <div className="mb-8">
            <p className="text-sm font-medium text-violet-700">
              Quick Quiz
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Review your answers
            </h1>

            <p className="mt-2 text-gray-600">
              Check your answers before submitting your quiz.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">
                Questions answered
              </span>

              <span className="font-bold text-violet-700">
                {answeredCount} / {questions.length}
              </span>
            </div>

            {answeredCount < questions.length && (
              <p className="mt-3 text-sm text-amber-700">
                You have unanswered questions. Unanswered questions
                will be marked incorrect when you submit.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {questions.map((item, index) => {
              const answer =
                answers.find(
                  (entry) => entry.questionId === item.id,
                )?.answer ?? ""

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentQuestion(index)
                    setShowReview(false)
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-400 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {item.question}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        {answer
                          ? `Your answer: ${answer}`
                          : "Not answered"}
                      </p>
                    </div>

                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              onClick={() => setShowReview(false)}
              className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Back to Quiz
            </button>

            <button
              onClick={handleSubmit}
              className="rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white transition hover:bg-violet-800 sm:flex-1"
            >
              Submit Quiz
            </button>

          </div>

        </main>
      </div>
    )
  }

  /*
    QUIZ SCREEN
  */
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-5 py-8">

        {/* Header */}

        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-violet-700">
              Cell Structure
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Quick Quiz
            </h1>
          </div>

          <button
            onClick={() => {
              saveProgress(currentQuestion, answers)
              navigate("/")
            }}
            className="text-sm font-semibold text-gray-500 hover:text-violet-700"
          >
            Save & Exit
          </button>

        </div>

        {/* Progress */}

        <div className="mt-8">

          <div className="mb-2 flex justify-between text-sm">

            <span className="font-medium text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </span>

            <span className="font-semibold text-violet-700">
              {answeredCount}/{questions.length} answered
            </span>

          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-violet-700 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

        </div>

        {/* Question card */}

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">

          <p className="text-sm font-medium text-gray-500">
            Question {currentQuestion + 1}
          </p>

          <h2 className="mt-3 text-xl font-bold leading-relaxed text-gray-900 sm:text-2xl">
            {question.question}
          </h2>

          {/* Multiple choice */}

          {question.type === "multiple-choice" &&
            question.options && (
              <div className="mt-7 space-y-3">

                {question.options.map((option) => {

                  const selected = currentAnswer === option

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className={`flex w-full items-center rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-violet-700 bg-violet-50 ring-2 ring-violet-200"
                          : "border-gray-200 bg-white hover:border-violet-400 hover:bg-gray-50"
                      }`}
                    >

                      <div
                        className={`mr-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected
                            ? "border-violet-700"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && (
                          <div className="h-2.5 w-2.5 rounded-full bg-violet-700" />
                        )}
                      </div>

                      <span
                        className={`font-medium ${
                          selected
                            ? "text-violet-900"
                            : "text-gray-700"
                        }`}
                      >
                        {option}
                      </span>

                    </button>
                  )
                })}

              </div>
            )}

          {/* Typed answer */}

          {question.type === "text" && (
            <div className="mt-7">

              <label
                htmlFor="answer"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Your answer
              </label>

              <input
                id="answer"
                type="text"
                value={currentAnswer}
                onChange={(event) =>
                  handleAnswer(event.target.value)
                }
                placeholder="Type your answer..."
                className="w-full rounded-2xl border border-gray-300 px-4 py-4 outline-none transition focus:border-violet-700 focus:ring-2 focus:ring-violet-200"
              />

            </div>
          )}

        </div>

        {/* Navigation */}

        <div className="mt-6 flex items-center justify-between">

          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            className="rounded-xl bg-violet-700 px-7 py-3 font-semibold text-white transition hover:bg-violet-800"
          >
            {currentQuestion === questions.length - 1
              ? "Review Answers"
              : "Next Question"}
          </button>

        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Your progress is saved while you complete the quiz.
        </p>

      </main>
    </div>
  )
}
