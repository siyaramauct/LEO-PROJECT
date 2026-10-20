// -----------------------------------------------------------------------------
// Lesson Summary
//
// The result screen after a quiz: percentage, correct and incorrect counts,
// and a question-by-question review showing the right answer for any the
// student got wrong.
//
// The quiz page passes the full results through sessionStorage ("quiz-result").
// If the page is opened without them (for example after a refresh in a new
// tab), it falls back to the student's latest scored attempt, which only has
// the score, so the answer review is empty.
//
// Route: /summary || Access: students
// -----------------------------------------------------------------------------

import { Check, ClipboardCheck, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import { getLatestQuizResult, type QuizResult } from "../services/studentLessonService";
import { projectImageUrl } from "../utils/images";

export default function LessonSummary() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [result, setResult] = useState<QuizResult | null>(() => {
    const savedResult = sessionStorage.getItem("quiz-result");
    return savedResult ? JSON.parse(savedResult) : null;
  });
  const [isLoading, setIsLoading] = useState(!result && Boolean(session?.user));

  // Fallback: no saved result, so show the latest scored attempt instead.
  useEffect(() => {
    if (result || !session?.user) return;

    const loadLatestAttempt = async () => {
      try {
        setResult(await getLatestQuizResult(session.user.id));
      } catch (loadError) {
        console.error("Failed to load latest quiz result:", loadError);
      } finally {
        setIsLoading(false);
      }
    };

    void loadLatestAttempt();
  }, [result, session?.user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <StudentBottomNav />
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 pb-20 lg:ml-56 lg:pb-0">
          <p className="text-sm text-slate-500">Loading quiz summary...</p>
        </main>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <StudentBottomNav />
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 pb-20 lg:ml-56 lg:pb-0">
          <section className="w-full max-w-md rounded-xl border border-slate-100 bg-white p-6 text-center">
            <ClipboardCheck size={25} className="mx-auto text-slate-300" />
            <h1 className="mt-4 text-xl font-bold">No quiz result found</h1>
            <p className="mt-2 text-sm text-slate-500">
              Complete a lesson quiz to see your result here.
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
  }

  // -- Result screen --

  const percentage = result.totalQuestions
    ? Math.round((result.score / result.totalQuestions) * 100)
    : 0;
  const message =
    percentage >= 80
      ? "You have a strong understanding of this lesson."
      : percentage >= 50
        ? "Review the answers below, then keep practising."
        : "Review the flashcards and try the lesson again when you are ready.";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-medium text-violet-700">Lesson complete</p>
            <h1 className="mt-1 text-xl font-bold">Quiz result</h1>
          </div>
        </header>
        <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
          <section className="rounded-xl border border-slate-100 bg-white p-5 text-center sm:p-6">
            <img src={projectImageUrl("winning.png")} alt="Trophy" className="mx-auto h-20 w-20" />
            <h2 className="mt-3 text-2xl font-bold">{percentage}%</h2>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
            <div className="mx-auto mt-5 h-2 max-w-md overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-700"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </section>
          <section className="mt-4 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-2xl font-bold">{result.score}</p>
              <p className="mt-1 text-xs text-slate-500">Score out of {result.totalQuestions}</p>
            </article>
            <article className="rounded-xl border border-slate-100 bg-white p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Check size={16} />
              </span>
              <p className="mt-3 text-2xl font-bold">{result.correct}</p>
              <p className="mt-1 text-xs text-slate-500">Correct answers</p>
            </article>
            <article className="rounded-xl border border-slate-100 bg-white p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <X size={16} />
              </span>
              <p className="mt-3 text-2xl font-bold">{result.incorrect}</p>
              <p className="mt-1 text-xs text-slate-500">Answers to review</p>
            </article>
          </section>
          <section className="mt-5 rounded-xl border border-slate-100 bg-white p-5">
            <h2 className="text-base font-bold">Answer review</h2>
            <p className="mt-1 text-sm text-slate-500">
              See how each response compared with the correct answer.
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {result.results.map((item, index) => (
                <article key={item.questionId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.isCorrect ? "bg-violet-700 text-white" : "bg-slate-200 text-slate-600"}`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-sm font-semibold leading-5">{item.question}</h3>
                        <span className="text-xs font-semibold text-slate-500">
                          {item.isCorrect ? "Correct" : "Review"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        <span className="font-semibold">Your answer:</span> {item.studentAnswer}
                      </p>
                      {!item.isCorrect && (
                        <p className="mt-1 text-sm text-violet-700">
                          <span className="font-semibold">Correct answer:</span>{" "}
                          {item.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("quiz-result");
                navigate("/student/classrooms");
              }}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Back to classrooms
            </button>
            <button
              type="button"
              onClick={() => navigate("/student/classrooms")}
              className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
            >
              <RotateCcw size={17} /> Choose another lesson
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
