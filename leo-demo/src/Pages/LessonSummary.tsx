// -----------------------------------------------------------------------------
// Lesson Summary
//
// The result screen after a quiz:
//   a violet score banner, like the dashboard banners, with the percentage,
//   the score band (the same bands as the reports) and a progress bar
//   a question-by-question review, green for correct and red to review, with
//   the right answer shown for any the student got wrong
//   buttons back to their classrooms or on to more practice
//
// The quiz page passes the full results through sessionStorage ("quiz-result").
// If the page is opened without them (for example after a refresh in a new
// tab), it falls back to the student's latest scored attempt, which only has
// the score, so the answer review is empty.
//
// Route: /summary || Access: students
// -----------------------------------------------------------------------------

import { ArrowLeft, ClipboardCheck, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import { scoreBand, type ScoreBand } from "../domain/progress";
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
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 pb-nav-20 lg:ml-56 lg:pb-0">
          <p className="text-sm text-slate-500">Loading quiz summary...</p>
        </main>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <StudentBottomNav />
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 pb-nav-20 lg:ml-56 lg:pb-0">
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
    ? Math.min(100, Math.round((result.score / result.totalQuestions) * 100))
    : 0;
  const band = BANDS[scoreBand(percentage)];

  // Leaving the page drops the stored result, so the next quiz starts clean.
  function leaveTo(path: string) {
    sessionStorage.removeItem("quiz-result");
    navigate(path);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-nav-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-medium text-violet-700">Lesson complete</p>
            <h1 className="mt-1 text-xl font-bold">Quiz result</h1>
            <p className="mt-1 text-xs text-slate-500">
              See how you did and what to practise next.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8">
          {
            // Score banner, in the same violet as the dashboard banners
          }
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-5 text-white shadow-lg shadow-violet-200 sm:p-6">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 right-24 h-24 w-24 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between gap-5">
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wide">
                  {band.label}
                </span>
                <div className="mt-4 flex items-baseline gap-3">
                  <h2 className="text-5xl font-black leading-none">{percentage}%</h2>
                  <p className="text-sm font-semibold text-violet-100">
                    Score {result.score} out of {result.totalQuestions}
                  </p>
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-violet-100">{band.message}</p>
                <div
                  className="mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-label="Quiz score"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-sm sm:flex">
                <img
                  src={projectImageUrl("winning.png")}
                  alt="Trophy"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </section>

          {
            // Answer review
          }
          <section className="rounded-xl border border-slate-100 bg-white p-5">
            <h2 className="text-base font-bold">Answer review</h2>
            <p className="mt-1 text-sm text-slate-500">
              See how each response compared with the correct answer.
            </p>

            {result.results.length === 0 ? (
              <p className="mt-4 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                The answer review is only available straight after a quiz.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {result.results.map((item, index) => (
                  <li
                    key={item.questionId}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${item.isCorrect ? "bg-green-700" : "bg-red-700"}`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <h3 className="text-sm font-semibold leading-5">{item.question}</h3>
                        <span
                          className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${item.isCorrect ? "bg-green-700" : "bg-red-700"}`}
                        >
                          {item.isCorrect ? "Correct" : "Review"}
                        </span>
                      </div>

                      <dl className="mt-3 flex flex-wrap gap-2 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                          <dt className="inline font-semibold text-slate-500">Your answer: </dt>
                          <dd className="inline font-semibold text-slate-800">
                            {item.studentAnswer}
                          </dd>
                        </div>
                        {!item.isCorrect && (
                          <div className="rounded-lg border border-green-200 bg-white px-3 py-1.5">
                            <dt className="inline font-semibold text-slate-500">
                              Correct answer:{" "}
                            </dt>
                            <dd className="inline font-semibold text-green-700">
                              {item.correctAnswer}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {
            // Next steps
          }
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => leaveTo("/student/classrooms")}
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={17} /> Back to classrooms
            </button>
            <button
              type="button"
              onClick={() => leaveTo("/student/practice")}
              className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
            >
              <RotateCcw size={17} /> Practise another lesson
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// -- Score bands ----------------------------------------------------------------

// The same bands as the reports (domain/progress), worded for the student.
const BANDS: Record<ScoreBand, { label: string; message: string }> = {
  mastered: {
    label: "Mastered",
    message: "You have a strong understanding of this lesson. Great work!",
  },
  developing: {
    label: "Developing",
    message: "Good progress. Review the answers below, then keep practising.",
  },
  support: {
    label: "Keep practising",
    message: "Review the flashcards and try the lesson again when you are ready.",
  },
};
