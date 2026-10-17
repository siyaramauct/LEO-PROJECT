// -----------------------------------------------------------------------------
// Student Learning Report
//
// The student's own progress across every classroom:
//   Overview    lessons completed, average score, quizzes done, streak and
//               this week's goal
//   Activity    a 12-week calendar with each studied day filled in
//   Classrooms  a sortable list; picking one shows its lessons with best
//               scores, sortable by course order or score
//
// Scores are each lesson's best attempt, so a retake never lowers them.
//
// It opens from the Reports picker (StudentReportPicker) with the chosen
// classroom already selected; picking another classroom here updates the URL.
//
// On phones, the chosen classroom's details sit below the list rather than
// beside it, so they are scrolled into view on arrival and on each pick.
//
// Route: /student/report/:classroomId || Access: students
// -----------------------------------------------------------------------------

import { ArrowLeft, CheckCircle2, ChevronRight, Layers } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ActivityCalendar from "../Components/ActivityCalendar";
import LoadingScreen from "../Components/LoadingScreen";
import ProgressBar from "../Components/ProgressBar";
import SegmentedControl from "../Components/SegmentedControl";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import type { StudentProgress } from "../data/progress";
import { average, scoredOnly } from "../domain/statistics";
import usePreloadImages from "../hooks/usePreloadImages";
import {
  getLearningReport,
  type StudentClassroomReport,
  type StudentLessonReport,
} from "../services/reportService";
import { projectImageUrl } from "../utils/images";
import { ACTIVITY_WEEKS, buildActivityWeeks } from "../utils/activityCalendar";

// -- Types --------------------------------------------------------------------

type ClassroomSort = "highest" | "lowest";
type LessonSort = "order" | "highest" | "lowest";

// -- Helpers ------------------------------------------------------------------

// Sorts a classroom's lessons. Course order is by release date. Score sorts
// split the list: unscored lessons (flashcards only, or not attempted) are
// returned separately and shown after the scored ones.
function sortLessons(lessons: StudentLessonReport[], sort: LessonSort) {
  const byOrder = [...lessons].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  if (sort === "order") {
    return { scored: byOrder, unscored: [] as StudentLessonReport[] };
  }

  const direction = sort === "highest" ? -1 : 1;

  return {
    scored: byOrder
      .filter((lesson) => lesson.bestPercent !== null)
      .sort((a, b) => direction * ((a.bestPercent ?? 0) - (b.bestPercent ?? 0))),
    unscored: byOrder.filter((lesson) => lesson.bestPercent === null),
  };
}

// One lesson row: cover, title, status and the best score with a bar.
function LessonRowItem({ lesson }: { lesson: StudentLessonReport }) {
  const status = lesson.hasQuiz
    ? lesson.completed
      ? `Quiz · ${lesson.attempts} attempt${lesson.attempts === 1 ? "" : "s"}`
      : "Quiz not attempted"
    : lesson.completed
      ? "Flashcards completed"
      : "Flashcards not started";

  return (
    <Link
      to={`/lesson/${lesson.lessonId}`}
      className="flex items-center gap-3 py-3 transition hover:bg-slate-50 sm:px-2"
    >
      <img src={lesson.imageUrl} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{lesson.title}</span>
        <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
          {!lesson.hasQuiz && <Layers size={11} className="shrink-0" />}
          {status}
        </span>
      </span>
      {lesson.bestPercent !== null ? (
        <span className="w-20 shrink-0 text-right sm:w-28">
          <span className="block text-sm font-bold text-slate-900">
            {lesson.bestPercent}%
            <span className="ml-1.5 hidden text-xs font-medium text-slate-400 sm:inline">
              {lesson.bestScore}/{lesson.scoreCeiling}
            </span>
          </span>
          <ProgressBar value={lesson.bestPercent} className="ml-auto mt-1.5 w-full" />
        </span>
      ) : lesson.completed ? (
        <CheckCircle2 size={18} className="shrink-0 text-violet-700" aria-label="Completed" />
      ) : (
        <ChevronRight size={18} className="shrink-0 text-slate-300" />
      )}
    </Link>
  );
}

// -- Page ---------------------------------------------------------------------

export default function StudentLearningReport() {
  const navigate = useNavigate();
  const { classroomId } = useParams();
  const { session } = useAuth();
  const studentId = session?.user.id;

  // The 12-week grid is built once, when the page opens.
  const [activityWeeks] = useState(() => buildActivityWeeks(new Date()));
  const [classrooms, setClassrooms] = useState<StudentClassroomReport[] | null>(null);
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [error, setError] = useState("");
  const [classroomSort, setClassroomSort] = useState<ClassroomSort>("highest");
  const [lessonSort, setLessonSort] = useState<LessonSort>("order");
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(
    classroomId ?? null,
  );
  const classroomDetailRef = useRef<HTMLElement>(null);
  const hasScrolledOnArrival = useRef(false);

  // Below 768px the details sit under the list, so bring them into view.
  const scrollToDetailsOnPhones = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      classroomDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const selectClassroom = (id: string) => {
    setSelectedClassroomId(id);
    navigate(`/student/report/${id}`, { replace: true });
    scrollToDetailsOnPhones();
  };

  // -- Load the report --
  // reportService loads the classrooms, lessons and best scores, the calendar
  // days and the streak.

  useEffect(() => {
    if (!studentId) return;

    let isCurrent = true;

    const load = async () => {
      try {
        const report = await getLearningReport(studentId, activityWeeks[0][0].key);

        if (!isCurrent) return;

        setActiveDays(report.activeDays);
        setProgress(report.progress);
        setClassrooms(report.classrooms);
      } catch (loadError) {
        console.error("Could not load the learning report:", loadError);

        if (!isCurrent) return;

        setError("Your learning report could not be loaded right now.");
        setClassrooms([]);
      }
    };

    void load();
    return () => {
      isCurrent = false;
    };
  }, [studentId, activityWeeks]);

  // -- Wait for cover images --

  const coverUrls = useMemo(
    () => (classrooms ? classrooms.map((classroom) => classroom.coverUrl) : null),
    [classrooms],
  );
  const imagesReady = usePreloadImages(coverUrls);

  // -- On arrival --
  // Once the report is drawn: a classroom the student is not in sends them back
  // to the picker; otherwise phones scroll straight to the chosen classroom.
  useEffect(() => {
    if (!classrooms || !imagesReady || hasScrolledOnArrival.current) return;
    hasScrolledOnArrival.current = true;
    if (classroomId && !classrooms.some((classroom) => classroom.classroomId === classroomId)) {
      navigate("/student/report", { replace: true });
      return;
    }
    scrollToDetailsOnPhones();
  }, [classrooms, imagesReady, classroomId, navigate]);

  // -- Sorting --
  // Classrooms without scores sit at the end whichever way the list is sorted.
  const sortedClassrooms = useMemo(() => {
    const direction = classroomSort === "highest" ? -1 : 1;
    return [...(classrooms ?? [])].sort((a, b) => {
      if (a.averagePercent === null || b.averagePercent === null) {
        return a.averagePercent === b.averagePercent
          ? a.name.localeCompare(b.name)
          : a.averagePercent === null
            ? 1
            : -1;
      }
      return direction * (a.averagePercent - b.averagePercent) || a.name.localeCompare(b.name);
    });
  }, [classrooms, classroomSort]);

  if (classrooms === null || !imagesReady)
    return <LoadingScreen label="Loading your learning report" />;

  // -- Derived values --

  // Defaults to the first classroom in the list until one is picked.
  const selectedClassroom =
    sortedClassrooms.find((classroom) => classroom.classroomId === selectedClassroomId) ??
    sortedClassrooms[0] ??
    null;
  const allLessons = classrooms.flatMap((classroom) => classroom.lessons);
  const completedLessons = allLessons.filter((lesson) => lesson.completed).length;
  const completionPercent = allLessons.length
    ? Math.round((completedLessons / allLessons.length) * 100)
    : 0;
  const quizzesCompleted = allLessons.filter((lesson) => lesson.hasQuiz && lesson.completed).length;
  const overallAverage = average(scoredOnly(allLessons.map((lesson) => lesson.bestPercent)));
  const activeDayCount = activityWeeks.flat().filter((day) => activeDays.has(day.key)).length;
  const weeklyPercent = progress
    ? Math.round((progress.weekly_lessons_completed / Math.max(progress.weekly_goal, 1)) * 100)
    : 0;

  const selectedHasScores = Boolean(
    selectedClassroom?.lessons.some((lesson) => lesson.bestPercent !== null),
  );
  // Score sorts mean nothing without scores, so fall back to course order.
  const effectiveLessonSort = selectedHasScores ? lessonSort : "order";
  const { scored, unscored } = sortLessons(selectedClassroom?.lessons ?? [], effectiveLessonSort);

  const overviewStats = [
    {
      label: "Average score",
      value: overallAverage === null ? "—" : `${overallAverage}%`,
      detail: "Best attempt per quiz",
    },
    {
      label: "Quizzes completed",
      value: String(quizzesCompleted),
      detail: `of ${allLessons.filter((lesson) => lesson.hasQuiz).length} quiz lessons`,
    },
    {
      label: "Current streak",
      value: progress
        ? `${progress.current_streak} day${progress.current_streak === 1 ? "" : "s"}`
        : "—",
      detail: progress
        ? `Longest ${progress.longest_streak} day${progress.longest_streak === 1 ? "" : "s"}`
        : "Streak unavailable",
    },
    {
      label: "This week",
      value: progress ? `${progress.weekly_lessons_completed} / ${progress.weekly_goal}` : "—",
      detail: progress ? `${Math.min(100, weeklyPercent)}% of weekly goal` : "Goal unavailable",
    },
  ];

  // -- Layout --

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <Link
              to="/student/report"
              aria-label="Back to class reports"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-700">Student portal</p>
              <h1 className="mt-1 text-xl font-bold">Learning report</h1>
              <p className="mt-1 text-xs text-slate-500">
                Your activity, progress and scores across every classroom you belong to.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <article className="rounded-xl border border-slate-100 bg-white p-5">
              <h2 className="text-sm font-bold">Overview</h2>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-3xl font-bold leading-none">
                  {completedLessons}
                  <span className="text-base font-semibold text-slate-400">
                    {" "}
                    / {allLessons.length}
                  </span>
                </p>
                <p className="text-sm font-semibold text-slate-600">{completionPercent}%</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Lessons completed across {classrooms.length} classroom
                {classrooms.length === 1 ? "" : "s"}
              </p>
              <ProgressBar value={completionPercent} className="mt-3 h-2" />

              <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-100 bg-slate-100">
                {overviewStats.map((stat) => (
                  <div key={stat.label} className="bg-white p-3">
                    <dt className="text-xs text-slate-500">{stat.label}</dt>
                    <dd className="mt-1 text-lg font-bold">{stat.value}</dd>
                    <dd className="mt-0.5 truncate text-[11px] text-slate-400">{stat.detail}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="rounded-xl border border-slate-100 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold">Activity</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Days you studied in the last {ACTIVITY_WEEKS} weeks
                  </p>
                </div>
                <p className="text-right">
                  <span className="block text-lg font-bold leading-none">{activeDayCount}</span>
                  <span className="text-[11px] text-slate-400">
                    active day{activeDayCount === 1 ? "" : "s"}
                  </span>
                </p>
              </div>

              <div className="mt-5">
                <ActivityCalendar
                  weeks={activityWeeks}
                  // A day is either studied (darkest) or not.
                  getLevel={(dayKey) => (activeDays.has(dayKey) ? 3 : 0)}
                  getTitle={(day) =>
                    `${day.date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}${activeDays.has(day.key) ? " · studied" : ""}`
                  }
                  label={`${activeDayCount} active days in the last ${ACTIVITY_WEEKS} weeks`}
                  legend={[
                    { level: 3, label: "Studied" },
                    { level: 0, label: "No activity" },
                  ]}
                />
              </div>
            </article>
          </section>

          {classrooms.length === 0 ? (
            <section className="flex flex-col items-center rounded-xl border border-slate-100 bg-white p-8 text-center">
              <img
                src={projectImageUrl("girlMagnifyingGlass.png")}
                alt=""
                className="h-32 w-auto object-contain"
              />
              <h2 className="mt-4 text-base font-bold">No classrooms yet</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Join a classroom to start lessons. Your scores and progress will show up here.
              </p>
              <button
                type="button"
                onClick={() => navigate("/student/classrooms")}
                className="mt-5 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
              >
                Go to classrooms
              </button>
            </section>
          ) : (
            <section className="grid items-start gap-4 sm:gap-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
              <article className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold">Classrooms</h2>
                  <SegmentedControl
                    label="Sort classrooms by average score"
                    value={classroomSort}
                    onChange={setClassroomSort}
                    options={[
                      { value: "highest", label: "Highest avg" },
                      { value: "lowest", label: "Lowest avg" },
                    ]}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {sortedClassrooms.map((classroom) => {
                    const isSelected = classroom.classroomId === selectedClassroom?.classroomId;
                    const classroomCompletion = classroom.lessons.length
                      ? Math.round((classroom.completedCount / classroom.lessons.length) * 100)
                      : 0;
                    return (
                      <button
                        key={classroom.classroomId}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => selectClassroom(classroom.classroomId)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${isSelected ? "border-violet-700 bg-violet-50/60" : "border-slate-100 hover:bg-slate-50"}`}
                      >
                        <img
                          src={classroom.coverUrl}
                          alt=""
                          className="h-12 w-14 shrink-0 rounded-md object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {classroom.name}
                          </span>
                          <span className="mt-1 block text-[11px] text-slate-500">
                            {classroom.completedCount} of {classroom.lessons.length} lessons
                          </span>
                          <ProgressBar value={classroomCompletion} className="mt-1.5" />
                        </span>
                        <span className="w-12 shrink-0 text-right">
                          <span className="block text-sm font-bold">
                            {classroom.averagePercent === null
                              ? "—"
                              : `${classroom.averagePercent}%`}
                          </span>
                          <span className="text-[10px] text-slate-400">avg</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>

              {selectedClassroom && (
                <article
                  ref={classroomDetailRef}
                  className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-100 bg-white"
                >
                  <div className="relative h-28 sm:h-32">
                    <img
                      src={selectedClassroom.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/45" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-5">
                      <h2 className="min-w-0 truncate text-lg font-bold">
                        {selectedClassroom.name}
                      </h2>
                      <Link
                        to={`/student/classrooms/${selectedClassroom.classroomId}`}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
                      >
                        Open <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="p-3 sm:p-4">
                      <dt className="text-[11px] text-slate-500">Average</dt>
                      <dd className="mt-1 text-base font-bold">
                        {selectedClassroom.averagePercent === null
                          ? "—"
                          : `${selectedClassroom.averagePercent}%`}
                      </dd>
                    </div>
                    <div className="p-3 sm:p-4">
                      <dt className="text-[11px] text-slate-500">Completed</dt>
                      <dd className="mt-1 text-base font-bold">
                        {selectedClassroom.completedCount} / {selectedClassroom.lessons.length}
                      </dd>
                    </div>
                    <div className="p-3 sm:p-4">
                      <dt className="text-[11px] text-slate-500">Quizzes</dt>
                      <dd className="mt-1 text-base font-bold">
                        {
                          selectedClassroom.lessons.filter(
                            (lesson) => lesson.hasQuiz && lesson.completed,
                          ).length
                        }{" "}
                        / {selectedClassroom.lessons.filter((lesson) => lesson.hasQuiz).length}
                      </dd>
                    </div>
                  </dl>

                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-bold">Lessons</h3>
                      <SegmentedControl
                        label="Sort lessons"
                        value={effectiveLessonSort}
                        onChange={setLessonSort}
                        options={[
                          { value: "order", label: "Course order" },
                          { value: "highest", label: "Best scores", disabled: !selectedHasScores },
                          { value: "lowest", label: "Lowest scores", disabled: !selectedHasScores },
                        ]}
                      />
                    </div>

                    {selectedClassroom.lessons.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">
                        Your teacher has not released any lessons in this classroom yet.
                      </p>
                    ) : (
                      <>
                        <div className="mt-2 divide-y divide-slate-100">
                          {scored.map((lesson) => (
                            <LessonRowItem key={lesson.lessonId} lesson={lesson} />
                          ))}
                        </div>
                        {unscored.length > 0 && (
                          <>
                            <p className="mt-4 border-t border-slate-100 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Not scored
                            </p>
                            <div className="divide-y divide-slate-100">
                              {unscored.map((lesson) => (
                                <LessonRowItem key={lesson.lessonId} lesson={lesson} />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </article>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
