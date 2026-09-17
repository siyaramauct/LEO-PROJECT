import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Home,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { supabase } from "../supabase-client";
import { useAuth } from "../../context/AuthContext";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";
import StatCard from "../Components/StatCard";

type Lesson = {
  lesson_id: string;
  title: string;
};

type Student = {
  id: string;
  name: string | null;
  surname: string | null;
};

type Mcq = {
  lesson_id: string;
  score_ceiling: number | null;
};

type Attempt = {
  student_id: string;
  lesson_id: string;
  score: number | null;
  completed_at: string | null;
};

type LessonProgress = {
  lessonId: string;
  title: string;
  completed: boolean;
  score: number | null;
};

type StudentProgress = {
  id: string;
  name: string;
  initials: string;
  progress: number;
  averageScore: number | null;
  lessons: LessonProgress[];
};

export default function ClassroomReport() {
  const { classroomId } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [classroomName, setClassroomName] =
    useState("Class Report");

  const [students, setStudents] =
    useState<StudentProgress[]>([]);

  const [completedStudentCount, setCompletedStudentCount] =
    useState(0);

  const [averageScore, setAverageScore] =
    useState<number | null>(null);

  const [quizCount, setQuizCount] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReport() {
      if (!session?.user?.id || !classroomId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      // =========================
      // 1. Get classroom
      // =========================
      const { data: classroom, error: classroomError } =
        await supabase
          .from("classrooms")
          .select("classroom_id, classroom_name")
          .eq("classroom_id", classroomId)
          .eq("teacher_id", session.user.id)
          .single();

      if (classroomError || !classroom) {
        console.error(classroomError);
        setError("Unable to load this classroom.");
        setIsLoading(false);
        return;
      }

      setClassroomName(classroom.classroom_name);

      // =========================
      // 2. Get classroom lessons
      // =========================
      const { data: lessons, error: lessonsError } =
        await supabase
          .from("lessons")
          .select("lesson_id, title")
          .eq("classroom_id", classroomId)
          .order("title");

      if (lessonsError) {
        console.error(lessonsError);
        setError("Unable to load classroom lessons.");
        setIsLoading(false);
        return;
      }

      const classroomLessons: Lesson[] = lessons ?? [];
      const lessonIds = classroomLessons.map(
        (lesson) => lesson.lesson_id
      );

      setLessonCount(classroomLessons.length);

      // =========================
      // 3. Get classroom students
      // =========================
      const { data: enrolments, error: enrolmentError } =
        await supabase
          .from("classroom_students")
          .select("student_id")
          .eq("classroom_id", classroomId);

      if (enrolmentError) {
        console.error(enrolmentError);
        setError("Unable to load classroom students.");
        setIsLoading(false);
        return;
      }

      const studentIds = (enrolments ?? []).map(
        (enrolment) => enrolment.student_id
      );

      // No students
      if (studentIds.length === 0) {
        setStudents([]);
        setCompletedStudentCount(0);
        setAverageScore(null);
        setQuizCount(0);
        setIsLoading(false);
        return;
      }

      // =========================
      // 4. Get student profiles
      // =========================
      const { data: profiles, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, name, surname")
          .in("id", studentIds);

      if (profileError) {
        console.error(profileError);
        setError("Unable to load student information.");
        setIsLoading(false);
        return;
      }

      const studentProfiles: Student[] = profiles ?? [];

      let mcqs: Mcq[] = [];
      let attempts: Attempt[] = [];

      // =========================
      // 5. Get quizzes and attempts
      // =========================
      if (lessonIds.length > 0) {
        const { data: mcqData, error: mcqError } =
          await supabase
            .from("mcqs")
            .select("lesson_id, score_ceiling")
            .in("lesson_id", lessonIds);

        if (mcqError) {
          console.error(mcqError);
          setError("Unable to load quiz information.");
          setIsLoading(false);
          return;
        }

        mcqs = mcqData ?? [];

        const { data: attemptData, error: attemptError } =
          await supabase
            .from("lesson_attempts")
            .select(
              "student_id, lesson_id, score, completed_at"
            )
            .in("student_id", studentIds)
            .in("lesson_id", lessonIds)
            .not("completed_at", "is", null);

        if (attemptError) {
          console.error(attemptError);
          setError("Unable to load student progress.");
          setIsLoading(false);
          return;
        }

        attempts = attemptData ?? [];
      }

      // =========================
      // 6. Store score ceilings
      // =========================
      const scoreCeilings = new Map<string, number>();

      mcqs.forEach((mcq) => {
        if (mcq.score_ceiling !== null) {
          scoreCeilings.set(
            mcq.lesson_id,
            Number(mcq.score_ceiling)
          );
        }
      });

      // =========================
      // 7. Use latest attempt
      // =========================
      const latestAttempts = new Map<string, Attempt>();

      attempts.forEach((attempt) => {
        const key = `${attempt.student_id}-${attempt.lesson_id}`;

        const existing = latestAttempts.get(key);

        if (
          !existing ||
          new Date(
            attempt.completed_at ?? 0
          ).getTime() >
            new Date(
              existing.completed_at ?? 0
            ).getTime()
        ) {
          latestAttempts.set(key, attempt);
        }
      });

      // =========================
      // 8. Build student progress
      // =========================
      const progressData: StudentProgress[] =
        studentProfiles.map((student) => {
          const fullName =
            `${student.name ?? ""} ${
              student.surname ?? ""
            }`.trim() || "Student";

          const initials =
            `${student.name?.[0] ?? ""}${
              student.surname?.[0] ?? ""
            }`.toUpperCase() || "S";

          const lessonProgress: LessonProgress[] =
            classroomLessons.map((lesson) => {
              const key = `${student.id}-${lesson.lesson_id}`;

              const attempt = latestAttempts.get(key);

              const ceiling =
                scoreCeilings.get(lesson.lesson_id);

              let percentageScore: number | null = null;

              if (
                attempt &&
                attempt.score !== null &&
                ceiling !== undefined &&
                ceiling > 0
              ) {
                percentageScore = Math.round(
                  (Number(attempt.score) / ceiling) *
                    100
                );
              }

              return {
                lessonId: lesson.lesson_id,
                title: lesson.title,
                completed: !!attempt,
                score: percentageScore,
              };
            });

          const completedLessons =
            lessonProgress.filter(
              (lesson) => lesson.completed
            ).length;

          const progress =
            classroomLessons.length > 0
              ? Math.round(
                  (completedLessons /
                    classroomLessons.length) *
                    100
                )
              : 0;

          const scores = lessonProgress
            .map((lesson) => lesson.score)
            .filter(
              (score): score is number =>
                score !== null
            );

          const studentAverage =
            scores.length > 0
              ? Math.round(
                  scores.reduce(
                    (total, score) =>
                      total + score,
                    0
                  ) / scores.length
                )
              : null;

          return {
            id: student.id,
            name: fullName,
            initials,
            progress,
            averageScore: studentAverage,
            lessons: lessonProgress,
          };
        });

      setStudents(progressData);

      // =========================
      // 9. Overall class progress
      // =========================
      setCompletedStudentCount(
        progressData.filter(
          (student) =>
            classroomLessons.length > 0 &&
            student.progress === 100
        ).length
      );

      // =========================
      // 10. Average class score
      // =========================
      const allScores = progressData.flatMap(
        (student) =>
          student.lessons
            .map((lesson) => lesson.score)
            .filter(
              (score): score is number =>
                score !== null
            )
      );

      setAverageScore(
        allScores.length > 0
          ? Math.round(
              allScores.reduce(
                (total, score) =>
                  total + score,
                0
              ) / allScores.length
            )
          : null
      );

      // =========================
      // 11. Completed lessons
      // =========================
      setQuizCount(
        progressData.reduce(
          (total, student) =>
            total +
            student.lessons.filter(
              (lesson) => lesson.completed
            ).length,
          0
        )
      );

      setIsLoading(false);
    }

    void loadReport();
  }, [session, classroomId]);

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {/* =========================
          MOBILE VERSION
      ========================== */}
      <div className="min-h-dvh bg-slate-50 pb-16 lg:hidden">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate("/class-progress")
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-700">
                Teacher Portal
              </p>

              <h1 className="mt-1 truncate text-xl font-bold">
                {classroomName}
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Class report
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl p-4 sm:p-6">
          {isLoading ? (
            <div className="rounded-xl border border-slate-100 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">
                Loading report...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <StatCard
                  icon={<CheckCircle2 />}
                  label="Class Progress"
                  value={`${completedStudentCount} / ${students.length}`}
                />

                <StatCard
                  icon={<BarChart3 />}
                  label="Average Score"
                  value={
                    averageScore !== null
                      ? `${averageScore}%`
                      : "—"
                  }
                  progress={averageScore ?? 0}
                />

                <StatCard
                  icon={<ClipboardCheck />}
                  label="Completed Lessons"
                  value={String(quizCount)}
                />
              </section>

              <section className="mt-4 rounded-xl border border-slate-100 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="font-bold">
                    Students
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {students.length} students ·{" "}
                    {lessonCount} lessons
                  </p>
                </div>

                {students.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      No students enrolled
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Students will appear here once
                      they join this classroom.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <article
                        key={student.id}
                        className="p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                            {student.initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {student.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {
                                student.lessons.filter(
                                  (lesson) =>
                                    lesson.completed
                                ).length
                              }{" "}
                              /{" "}
                              {student.lessons.length}{" "}
                              completed
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">
                              Average
                            </p>

                            <p className="text-sm font-bold">
                              {student.averageScore !==
                              null
                                ? `${student.averageScore}%`
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Progress</span>

                            <span className="font-semibold text-slate-700">
                              {student.progress}%
                            </span>
                          </div>

                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-violet-700"
                              style={{
                                width: `${student.progress}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                          {student.lessons.length ===
                          0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400">
                              No lessons have been
                              added to this classroom.
                            </div>
                          ) : (
                            student.lessons.map(
                              (lesson) => (
                                <div
                                  key={
                                    lesson.lessonId
                                  }
                                  className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 last:border-b-0"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-slate-700">
                                      {lesson.title}
                                    </p>

                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      {lesson.completed
                                        ? "Completed"
                                        : "Not started"}
                                    </p>
                                  </div>

                                  <span
                                    className={`ml-3 shrink-0 text-xs font-bold ${
                                      lesson.score !==
                                      null
                                        ? "text-violet-700"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {lesson.score !==
                                    null
                                      ? `${lesson.score}%`
                                      : "—"}
                                  </span>
                                </div>
                              )
                            )
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>

        {/* Mobile Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem
            icon={<Home size={19} />}
            label="Home"
            to="/teacher-dashboard"
          />

          <NavItem
            icon={<Users size={19} />}
            label="Classes"
            to="/TeacherClassroom"
          />

          <NavItem
            icon={<Sparkles size={19} />}
            label="Explore"
            to="/learning-hub"
          />

          <NavItem
            icon={<BarChart3 size={19} />}
            label="Reports"
            to="/class-progress"
            active
          />

          <NavItem
            icon={<Settings size={19} />}
            label="Profile"
            to="/teacher-profile"
          />
        </nav>
      </div>

      {/* =========================
          DESKTOP VERSION
      ========================== */}
      <div className="hidden min-h-dvh lg:flex">
        {/* Sidebar */}
        <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2">
            <h1 className="text-2xl font-bold tracking-tight">
              LEO
            </h1>

            <p className="text-xs text-violet-200">
              Teacher Portal
            </p>
          </div>

          <nav className="space-y-2">
            <SidebarItem
              icon={<Home size={18} />}
              label="Dashboard"
              to="/teacher-dashboard"
            />

            <SidebarItem
              icon={<Users size={18} />}
              label="Classes"
              to="/TeacherClassroom"
            />

            <SidebarItem
              icon={<Sparkles size={18} />}
              label="Explore"
              to="/learning-hub"
            />

            <SidebarItem
              icon={<BarChart3 size={18} />}
              label="Reports"
              to="/class-progress"
              active
            />
          </nav>

          <div className="mt-auto space-y-2">
            <SidebarItem
              icon={<Settings size={18} />}
              label="Settings"
              to="/teacher-profile"
            />
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-700">
                Teacher Portal
              </p>

              <h1 className="mt-1 text-xl font-bold">
                {classroomName}
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Class report
              </p>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
            {isLoading ? (
              <div className="rounded-xl border border-slate-100 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">
                  Loading report...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-100 bg-white p-10 text-center">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/class-progress")
                  }
                  className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-violet-700"
                >
                  <ArrowLeft size={16} />
                  Classrooms
                </button>

                {/* Stats */}
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard
                    icon={<CheckCircle2 />}
                    label="Class Progress"
                    value={`${completedStudentCount} / ${students.length}`}
                  />

                  <StatCard
                    icon={<BarChart3 />}
                    label="Average Score"
                    value={
                      averageScore !== null
                        ? `${averageScore}%`
                        : "—"
                    }
                    progress={averageScore ?? 0}
                  />

                  <StatCard
                    icon={<ClipboardCheck />}
                    label="Completed Lessons"
                    value={String(quizCount)}
                  />
                </section>

                {/* Students */}
                <section className="mt-4 rounded-xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                    <h2 className="font-bold">
                      Students
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {students.length} students ·{" "}
                      {lessonCount} lessons
                    </p>
                  </div>

                  {students.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        No students enrolled
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Students will appear here once
                        they join this classroom.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {students.map((student) => (
                        <article
                          key={student.id}
                          className="p-4 sm:p-5"
                        >
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                            {/* Student */}
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                                {student.initials}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {student.name}
                                </p>

                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {
                                    student.lessons.filter(
                                      (lesson) =>
                                        lesson.completed
                                    ).length
                                  }{" "}
                                  /{" "}
                                  {
                                    student.lessons.length
                                  }{" "}
                                  completed
                                </p>
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="w-full xl:w-48">
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>Progress</span>

                                <span className="font-semibold text-slate-700">
                                  {student.progress}%
                                </span>
                              </div>

                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-violet-700"
                                  style={{
                                    width: `${student.progress}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Average */}
                            <div className="xl:w-20 xl:text-right">
                              <p className="text-[10px] text-slate-400">
                                Average
                              </p>

                              <p className="text-sm font-bold text-slate-800">
                                {student.averageScore !==
                                null
                                  ? `${student.averageScore}%`
                                  : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Lesson scores */}
                          <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
                            {student.lessons.length ===
                            0 ? (
                              <div className="px-3 py-3 text-xs text-slate-400">
                                No lessons have been
                                added to this classroom.
                              </div>
                            ) : (
                              student.lessons.map(
                                (lesson) => (
                                  <div
                                    key={
                                      lesson.lessonId
                                    }
                                    className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 last:border-b-0"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-slate-700">
                                        {lesson.title}
                                      </p>

                                      <p className="mt-0.5 text-[10px] text-slate-400">
                                        {lesson.completed
                                          ? "Completed"
                                          : "Not started"}
                                      </p>
                                    </div>

                                    <span
                                      className={`ml-4 shrink-0 text-xs font-bold ${
                                        lesson.score !==
                                        null
                                          ? "text-violet-700"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {lesson.score !==
                                      null
                                        ? `${lesson.score}%`
                                        : "—"}
                                    </span>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
