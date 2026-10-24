// -----------------------------------------------------------------------------
// Quick Quiz
//
// The lesson's multiple-choice quiz, one question at a time. Students can move
// back and forth and change answers until they press "Complete attempt".
//
// On completion, lessonService marks and saves the attempt, notifies the
// teacher and logs today for the streak. The page then stores the detailed
// result in sessionStorage and opens the summary page.
//
// Route: /quiz/:lessonId || Access: students
// -----------------------------------------------------------------------------

import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StudentBottomNav from "../Components/StudentBottomNav";
import { errorMessage } from "../data/errors";
import { getQuiz, getQuizQuestions, type Quiz } from "../data/quizzes";
import type { AnswerOption, QuizAnswers, QuizQuestion } from "../domain/scoring";
import { studentDisplayName } from "../services/classroomService";
import { submitQuiz } from "../services/studentLessonService";

// -- Page ---------------------------------------------------------------------

export default function QuickQuiz() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [mcq, setMcq] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<QuizAnswers>({}); // By question id.
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [isLoading, setIsLoading] = useState(() => Boolean(lessonId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load the lesson's quiz, then its questions.
  useEffect(() => {
    if (!lessonId) return;

    const loadQuiz = async () => {
      try {
        const quiz = await getQuiz(lessonId);

        if (!quiz) {
          setError("This lesson does not have a quiz yet.");
          return;
        }

        setQuestions(await getQuizQuestions(quiz.mcq_id));
        setMcq(quiz);
      } catch (loadError) {
        console.error("Failed to load quiz:", loadError);
        setError(errorMessage(loadError, "The quiz could not be loaded right now."));
      } finally {
        setIsLoading(false);
      }
    };
    void loadQuiz();
  }, [lessonId]);

  const question = questions[index];
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  // -- Submit the attempt --

  async function completeAttempt() {
    if (!session?.user || !lessonId || !mcq) return;
    setIsSubmitting(true);

    try {
      const result = await submitQuiz({
        studentId: session.user.id,
        studentName: studentDisplayName(profile, session.user.email),
        lessonId,
        quiz: mcq,
        questions,
        answers,
        startedAt,
      });

      // Hand the detailed result to the summary page.
      sessionStorage.setItem("quiz-result", JSON.stringify(result));
      navigate("/summary");
    } catch (submitError) {
      console.error("Failed to submit quiz:", submitError);
      setError(errorMessage(submitError, "Your attempt could not be saved."));
    } finally {
      setIsSubmitting(false);
    }
  }

  // -- Loading and error screens --

  if (isLoading)
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentBottomNav />
        <main className="flex min-h-dvh items-center justify-center pb-nav-20 lg:ml-56 lg:pb-0">
          <p className="text-sm text-slate-500">Loading quiz...</p>
        </main>
      </div>
    );
  if (error || !question || !mcq)
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentBottomNav />
        <main className="flex min-h-dvh items-center justify-center p-4 pb-nav-20 lg:ml-56 lg:pb-0">
          <section className="w-full max-w-md rounded-xl border border-slate-100 bg-white p-6 text-center">
            <h1 className="text-lg font-bold">Quiz unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">
              {error || "No questions are available for this lesson."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/student/classrooms")}
              className="mt-5 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Back to classrooms
            </button>
          </section>
        </main>
      </div>
    );

  // -- Question screen --

  const options: Array<[AnswerOption, string]> = [
    ["A", question.option_a],
    ["B", question.option_b],
    ["C", question.option_c],
    ["D", question.option_d],
  ];
  const isLastQuestion = index === questions.length - 1;
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-nav-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/student/classrooms")}
              aria-label="Back to classrooms"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>
            <div>
              <p className="text-xs font-medium text-violet-700">Lesson quiz</p>
              <h1 className="mt-1 text-base font-bold">{mcq.title ?? "Multiple choice quiz"}</h1>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">
                Question {index + 1} of {questions.length}
              </span>
              <span className="text-slate-500">{Object.keys(answers).length} answered</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
          <section className="mt-5 rounded-xl border border-slate-100 bg-white p-5 sm:p-6">
            <p className="text-xs font-medium text-violet-700">Question {index + 1}</p>
            <h2 className="mt-3 text-xl font-bold leading-8 sm:text-2xl">
              {question.question_text}
            </h2>
            <div className="mt-6 space-y-2">
              {options.map(([key, option]) => {
                const selected = answers[question.question_id] === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [question.question_id]: key }))
                    }
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${selected ? "border-violet-700 inset-ring inset-ring-violet-700" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {key}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => setIndex((current) => current - 1)}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft size={17} /> Previous
              </button>
              {isLastQuestion ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={completeAttempt}
                  className="flex items-center gap-1 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  <Check size={17} /> {isSubmitting ? "Submitting..." : "Complete attempt"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIndex((current) => current + 1)}
                  className="flex items-center gap-1 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Next <ChevronRight size={17} />
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
