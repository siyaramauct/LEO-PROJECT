import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Components/Navbar";

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
  progress: number;
  averageScore: number | null;
  lessons: LessonProgress[];
};

export default function ClassProgress() {
  const { session } = useAuth();

  const [classroomName, setClassroomName] = useState("Class Progress");
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [classProgress, setClassProgress] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user) return;

    const loadProgress = async () => {
      setIsLoading(true);
      setError("");

      // 1. Find the teacher's classroom
      const { data: classroom, error: classroomError } = await supabase
        .from("classrooms")
        .select("classroom_id, classroom_name")
        .eq("teacher_id", session.user.id)
        .order("classroom_name")
        .limit(1)
        .maybeSingle();

      if (classroomError) {
        setError(classroomError.message);
        setIsLoading(false);
        return;
      }

      if (!classroom) {
        setError("No classroom found.");
        setIsLoading(false);
        return;
      }

      setClassroomName(classroom.classroom_name);

      // 2. Get classroom lessons and students
      const [{ data: lessons, error: lessonsError }, { data: enrolments, error: enrolmentError }] =
        await Promise.all([
          supabase
            .from("lessons")
            .select("lesson_id, title")
            .eq("classroom_id", classroom.classroom_id),

          supabase
            .from("classroom_students")
            .select("student_id")
            .eq("classroom_id", classroom.classroom_id),
        ]);

      if (lessonsError || enrolmentError) {
        setError(
          lessonsError?.message ??
            enrolmentError?.message ??
            "Could not load classroom data."
        );
        setIsLoading(false);
        return;
      }

      const classroomLessons = (lessons ?? []) as Lesson[];

      const studentIds = (enrolments ?? []).map(
        (enrolment) => enrolment.student_id
      );



      if (!studentIds.length || !classroomLessons.length) {
        setStudents([]);
        setClassProgress(0);
        setAverageScore(null);
        setQuizCount(0);
        setIsLoading(false);
        return;
      }

      const lessonIds = classroomLessons.map((lesson) => lesson.lesson_id);

      // 3. Get students, quizzes and completed attempts
      const [
        { data: profiles, error: profilesError },
        { data: mcqs, error: mcqError },
        { data: attempts, error: attemptsError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, surname")
          .in("id", studentIds),

        supabase
          .from("mcqs")
          .select("lesson_id, score_ceiling")
          .in("lesson_id", lessonIds),

        supabase
          .from("lesson_attempts")
          .select("student_id, lesson_id, score, completed_at")
          .in("student_id", studentIds)
          .in("lesson_id", lessonIds)
          .not("completed_at", "is", null),
      ]);

      if (profilesError || mcqError || attemptsError) {
        setError(
          profilesError?.message ??
            mcqError?.message ??
            attemptsError?.message ??
            "Could not load progress data."
        );
        setIsLoading(false);
        return;
      }

      const studentProfiles = (profiles ?? []) as Student[];
      const quizData = (mcqs ?? []) as Mcq[];
      const completedAttempts = (attempts ?? []) as Attempt[];

      // 4. Store each lesson's maximum possible score
      const scoreCeilings: Record<string, number> = {};

      for (const quiz of quizData) {
        if (quiz.score_ceiling !== null) {
          scoreCeilings[quiz.lesson_id] = quiz.score_ceiling;
        }
      }

      // 5. If a student has multiple attempts, use their latest attempt
      const latestAttempts: Record<string, Attempt> = {};

      for (const attempt of completedAttempts) {
        const key = `${attempt.student_id}-${attempt.lesson_id}`;

        const existing = latestAttempts[key];

        if (
          !existing ||
          (attempt.completed_at ?? "") > (existing.completed_at ?? "")
        ) {
          latestAttempts[key] = attempt;
        }
      }

      // 6. Build progression for every student and every lesson
      const progressData: StudentProgress[] = studentProfiles.map((student) => {
        const studentLessons: LessonProgress[] = classroomLessons.map(
          (lesson) => {
            const key = `${student.id}-${lesson.lesson_id}`;
            const attempt = latestAttempts[key];

            if (!attempt) {
              return {
                lessonId: lesson.lesson_id,
                title: lesson.title,
                completed: false,
                score: null,
              };
            }

            const ceiling = scoreCeilings[lesson.lesson_id];

            const score =
              ceiling && ceiling > 0 && attempt.score !== null
                ? Math.round((Number(attempt.score) / ceiling) * 100)
                : null;

            return {
              lessonId: lesson.lesson_id,
              title: lesson.title,
              completed: true,
              score,
            };
          }
        );

        const completedCount = studentLessons.filter(
          (lesson) => lesson.completed
        ).length;

        const progress = classroomLessons.length
          ? Math.round((completedCount / classroomLessons.length) * 100)
          : 0;

        const studentScores = studentLessons
          .map((lesson) => lesson.score)
          .filter((score): score is number => score !== null);

        const studentAverage = studentScores.length
          ? Math.round(
              studentScores.reduce((total, score) => total + score, 0) /
                studentScores.length
            )
          : null;

        return {
          id: student.id,
          name:
            `${student.name ?? ""} ${student.surname ?? ""}`.trim() ||
            "Student",
          progress,
          averageScore: studentAverage,
          lessons: studentLessons,
        };
      });

      setStudents(progressData);

      // 7. Overall classroom progress
      const totalPossible =
        studentProfiles.length * classroomLessons.length;

      const totalCompleted = progressData.reduce(
        (total, student) =>
          total +
          student.lessons.filter((lesson) => lesson.completed).length,
        0
      );

      setClassProgress(
        totalPossible
          ? Math.round((totalCompleted / totalPossible) * 100)
          : 0
      );

      // 8. Overall quiz statistics
      const scores = progressData.flatMap((student) =>
        student.lessons
          .map((lesson) => lesson.score)
          .filter((score): score is number => score !== null)
      );

      setQuizCount(scores.length);

      setAverageScore(
        scores.length
          ? Math.round(
              scores.reduce((total, score) => total + score, 0) /
                scores.length
            )
          : null
      );

      setIsLoading(false);
    };

    void loadProgress();
  }, [session?.user]);

  const sortedStudents = [...students].sort(
    (a, b) => b.progress - a.progress
  );

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gray-50">
      <Navbar />

      <main className="w-full max-w-5xl mx-auto px-4 py-6 md:px-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-violet-700">Reports</p>

          <h1 className="mt-1 text-2xl font-bold text-gray-800">
            Class Progress
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track lesson completion and quiz performance.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Loading class progress...
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Classroom */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-medium text-gray-500">
                Classroom
              </p>

              <h2 className="mt-1 text-lg font-bold text-gray-800">
                {classroomName}
              </h2>
            </section>

            {/* Overall statistics */}
            <section className="mt-4 grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-gray-200 bg-white p-5 text-center">
                <p className="text-xs text-gray-500">
                  Overall Class Progress
                </p>

                <p className="mt-2 text-3xl font-bold text-violet-700">
                  {classProgress}%
                </p>
              </article>

              <article className="rounded-xl border border-gray-200 bg-white p-5 text-center">
                <p className="text-xs text-gray-500">
                  Average Class Score
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-800">
                  {averageScore === null ? "—" : `${averageScore}%`}
                </p>
              </article>

              <article className="rounded-xl border border-gray-200 bg-white p-5 text-center">
                <p className="text-xs text-gray-500">
                  Quizzes Taken
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-800">
                  {quizCount}
                </p>
              </article>
            </section>

            {/* Lessons */}
            <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold text-gray-800">
                Lessons
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Progress for each lesson in the classroom.
              </p>

              <div className="mt-4 space-y-3">
                {sortedStudents.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No students found.
                  </p>
                ) : (
                  sortedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      {/* Student header */}
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {student.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Overall progress: {student.progress}%
                            {" · "}
                            Average score:{" "}
                            {student.averageScore === null
                              ? "—"
                              : `${student.averageScore}%`}
                          </p>
                        </div>

                        <span className="text-sm font-bold text-violet-700">
                          {student.progress}%
                        </span>
                      </div>

                      {/* Overall progress bar */}
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{
                            width: `${student.progress}%`,
                          }}
                        />
                      </div>

                      {/* Individual lessons */}
                      <div className="mt-4 space-y-2">
                        {student.lessons.map((lesson) => (
                          <div
                            key={lesson.lessonId}
                            className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {lesson.title}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {lesson.completed
                                  ? "Completed"
                                  : "Not completed"}
                              </p>
                            </div>

                            <div className="text-right">
                              {lesson.completed ? (
                                <span className="text-sm font-bold text-green-600">
                                  {lesson.score === null
                                    ? "Completed"
                                    : `${lesson.score}%`}
                                </span>
                              ) : (
                                <span className="text-sm font-semibold text-gray-400">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}