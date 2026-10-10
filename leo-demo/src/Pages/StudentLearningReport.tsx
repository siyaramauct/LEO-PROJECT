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
// On phones, choosing a classroom scrolls its details into view, because they
// sit below the list rather than beside it.
//
// Route: /student/report || Access: students
// -----------------------------------------------------------------------------

import { CheckCircle2, ChevronRight, Layers } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ActivityCalendar from "../Components/ActivityCalendar";
import LoadingScreen from "../Components/LoadingScreen";
import ProgressBar from "../Components/ProgressBar";
import SegmentedControl from "../Components/SegmentedControl";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import usePreloadImages from "../hooks/usePreloadImages";
import { supabase } from "../supabase-client";
import { bucketImageUrlOrBroken, projectImageUrl } from "../utils/images";
import { ACTIVITY_WEEKS, buildActivityWeeks } from "../utils/activityCalendar";

// -- Types --------------------------------------------------------------------

// Returned by the get_student_progress database function.
type StudentProgress = {
  current_streak: number;
  longest_streak: number;
  weekly_lessons_completed: number;
  weekly_goal: number;
};

type LessonReport = {
  lessonId: string;
  title: string;
  imageUrl: string;
  releaseDate: string;
  hasQuiz: boolean;
  completed: boolean;
  attempts: number;
  bestScore: number | null; // Best attempt.
  scoreCeiling: number | null;
  bestPercent: number | null;
};

type ClassroomReport = {
  classroomId: string;
  name: string;
  coverUrl: string;
  lessons: LessonReport[];
  completedCount: number;
  averagePercent: number | null;
};

type ClassroomSort = "highest" | "lowest";
type LessonSort = "order" | "highest" | "lowest";

type AttemptRow = { lesson_id: string; score: number | null };
type LessonRow = {
  lesson_id: string;
  classroom_id: string;
  title: string;
  lesson_image_path: string | null;
  release_date: string;
};
type ClassroomRow = {
  classroom_id: string;
  classroom_name: string;
  cover_image_path: string | null;
};
type McqRow = { lesson_id: string; score_ceiling: number | null };

// -- Helpers ------------------------------------------------------------------

const average = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
    : null;

// Sorts a classroom's lessons. Course order is by release date. Score sorts
// split the list: unscored lessons (flashcards only, or not attempted) are
// returned separately and shown after the scored ones.
function sortLessons(lessons: LessonReport[], sort: LessonSort) {
  const byOrder = [...lessons].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  if (sort === "order") return { scored: byOrder, unscored: [] as LessonReport[] };
  const direction = sort === "highest" ? -1 : 1;
  return {
    scored: byOrder
      .filter((lesson) => lesson.bestPercent !== null)
      .sort((a, b) => direction * ((a.bestPercent ?? 0) - (b.bestPercent ?? 0))),
    unscored: byOrder.filter((lesson) => lesson.bestPercent === null),
  };
}

// One lesson row: cover, title, status and the best score with a bar.
function LessonRowItem({ lesson }: { lesson: LessonReport }) {
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
  const { session } = useAuth();
  const studentId = session?.user.id;

  // The 12-week grid is built once, when the page opens.
  const [activityWeeks] = useState(() => buildActivityWeeks(new Date()));
  const [classrooms, setClassrooms] = useState<ClassroomReport[] | null>(null);
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [error, setError] = useState("");
  const [classroomSort, setClassroomSort] = useState<ClassroomSort>("highest");
  const [lessonSort, setLessonSort] = useState<LessonSort>("order");
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const classroomDetailRef = useRef<HTMLElement>(null);

  // Below 768px the details sit under the list, so bring them into view.
  const selectClassroom = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    if (window.matchMedia("(max-width: 767px)").matches) {
      classroomDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // -- Load the report --
  //
  // 1. Enrolments, the activity calendar days and the streak, in parallel.
  // 2. The classrooms and their released lessons.
  // 3. The student's attempts and each lesson's quiz size.
  // Then each lesson gets its best score, and each classroom its average.

  useEffect(() => {
    if (!studentId) return;

    let isCurrent = true;

    const load = async () => {
      const failed = () => {
        if (!isCurrent) return;
        setError("Your learning report could not be loaded right now.");
        setClassrooms([]);
      };

      const [enrolmentResult, activityResult, progressResult] = await Promise.all([
        supabase.from("classroom_students").select("classroom_id").eq("student_id", studentId),
        supabase
          .from("student_activity")
          .select("activity_date")
          .eq("student_id", studentId)
          .gte("activity_date", activityWeeks[0][0].key),
        supabase.rpc("get_student_progress"),
      ]);
      if (!isCurrent) return;

      // Activity is secondary: a failure leaves the calendar empty instead of
      // hiding the whole report.
      if (activityResult.error) {
        console.error("Could not load learning activity:", activityResult.error);
      }
      if (progressResult.error) {
        console.error("Could not load learning progress:", progressResult.error);
      }
      setActiveDays(new Set((activityResult.data ?? []).map((row) => row.activity_date as string)));
      setProgress((progressResult.data?.[0] as StudentProgress | undefined) ?? null);

      if (enrolmentResult.error) return failed();
      const classroomIds = (enrolmentResult.data ?? []).map((row) => row.classroom_id as string);
      if (!classroomIds.length) {
        setClassrooms([]);
        return;
      }

      const [classroomResult, lessonResult] = await Promise.all([
        supabase
          .from("classrooms")
          .select("classroom_id, classroom_name, cover_image_path")
          .in("classroom_id", classroomIds),
        supabase
          .from("lessons")
          .select("lesson_id, classroom_id, title, lesson_image_path, release_date")
          .in("classroom_id", classroomIds)
          .lte("release_date", new Date().toISOString()),
      ]);
      if (!isCurrent) return;
      if (classroomResult.error || lessonResult.error) return failed();

      const lessonRows = (lessonResult.data ?? []) as LessonRow[];
      const lessonIds = lessonRows.map((lesson) => lesson.lesson_id);
      const [attemptResult, mcqResult] = lessonIds.length
        ? await Promise.all([
            supabase
              .from("lesson_attempts")
              .select("lesson_id, score")
              .eq("student_id", studentId)
              .in("lesson_id", lessonIds)
              .not("completed_at", "is", null),
            supabase.from("mcqs").select("lesson_id, score_ceiling").in("lesson_id", lessonIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
          ];
      if (!isCurrent) return;
      if (attemptResult.error || mcqResult.error) return failed();

      // Group attempts by lesson, then build each lesson's report.
      const ceilings = new Map(
        ((mcqResult.data ?? []) as McqRow[]).map((mcq) => [mcq.lesson_id, mcq.score_ceiling]),
      );
      const attemptsByLesson = new Map<string, AttemptRow[]>();
      for (const attempt of (attemptResult.data ?? []) as AttemptRow[]) {
        attemptsByLesson.set(attempt.lesson_id, [
          ...(attemptsByLesson.get(attempt.lesson_id) ?? []),
          attempt,
        ]);
      }

      const lessonsByClassroom = new Map<string, LessonReport[]>();
      for (const lesson of lessonRows) {
        const attempts = attemptsByLesson.get(lesson.lesson_id) ?? [];
        const scores = attempts.flatMap((attempt) =>
          attempt.score === null ? [] : [Number(attempt.score)],
        );
        const bestScore = scores.length ? Math.max(...scores) : null;
        const scoreCeiling = ceilings.get(lesson.lesson_id) ?? null;
        const report: LessonReport = {
          lessonId: lesson.lesson_id,
          title: lesson.title,
          imageUrl: bucketImageUrlOrBroken(lesson.lesson_image_path),
          releaseDate: lesson.release_date,
          hasQuiz: ceilings.has(lesson.lesson_id),
          completed: attempts.length > 0,
          attempts: attempts.length,
          bestScore,
          scoreCeiling,
          bestPercent:
            bestScore !== null && scoreCeiling
              ? Math.round((bestScore / scoreCeiling) * 100)
              : null,
        };
        lessonsByClassroom.set(lesson.classroom_id, [
          ...(lessonsByClassroom.get(lesson.classroom_id) ?? []),
          report,
        ]);
      }

      setClassrooms(
        ((classroomResult.data ?? []) as ClassroomRow[]).map((classroom) => {
          const lessons = lessonsByClassroom.get(classroom.classroom_id) ?? [];
          return {
            classroomId: classroom.classroom_id,
            name: classroom.classroom_name,
            coverUrl: bucketImageUrlOrBroken(classroom.cover_image_path),
            lessons,
            completedCount: lessons.filter((lesson) => lesson.completed).length,
            averagePercent: average(
              lessons.flatMap((lesson) =>
                lesson.bestPercent === null ? [] : [lesson.bestPercent],
              ),
            ),
          };
        }),
      );
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
  const overallAverage = average(
    allLessons.flatMap((lesson) => (lesson.bestPercent === null ? [] : [lesson.bestPercent])),
  );
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
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-medium text-violet-700">Student portal</p>
            <h1 className="mt-1 text-xl font-bold">Learning report</h1>
            <p className="mt-1 text-xs text-slate-500">
              Your activity, progress and scores across every classroom you belong to.
            </p>
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
