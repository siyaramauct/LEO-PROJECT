import { Award, BarChart3, BookOpen, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import StudentBottomNav from "../Components/StudentBottomNav";
import StatCard from "../Components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";

type CompletedLesson = {
  lesson_id: string;
  lessonTitle: string;
  classroomName: string;
  quizTitle: string | null;
  score: number | null;
  scorePercent: number | null;
  completedAt: string | null;
};

type AttemptRow = { lesson_id: string; score: number | null; completed_at: string | null };
type LessonRow = { lesson_id: string; title: string; classroom_id: string };
type ClassroomRow = { classroom_id: string; classroom_name: string };
type McqRow = { lesson_id: string; title: string | null; score_ceiling: number | null };

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : null;

export default function StudentLearningReport() {
  const { session } = useAuth();
  const studentId = session?.user.id;

  const [lessons, setLessons] = useState<CompletedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return;

    let isCurrent = true;

    const load = async () => {
      setIsLoading(true);
      setError("");

      const { data: attemptData, error: attemptError } = await supabase
        .from("lesson_attempts")
        .select("lesson_id, score, completed_at")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      if (!isCurrent) return;

      if (attemptError) {
        setError("Your learning report could not be loaded right now.");
        setIsLoading(false);
        return;
      }

      // A lesson may have been attempted more than once — keep only the most recent attempt.
      const latestByLesson = new Map<string, AttemptRow>();
      for (const attempt of (attemptData ?? []) as AttemptRow[]) {
        if (!latestByLesson.has(attempt.lesson_id)) latestByLesson.set(attempt.lesson_id, attempt);
      }

      const lessonIds = [...latestByLesson.keys()];
      if (!lessonIds.length) {
        setLessons([]);
        setIsLoading(false);
        return;
      }

      const [lessonsResult, mcqsResult] = await Promise.all([
        supabase.from("lessons").select("lesson_id, title, classroom_id").in("lesson_id", lessonIds),
        supabase.from("mcqs").select("lesson_id, title, score_ceiling").in("lesson_id", lessonIds),
      ]);

      if (!isCurrent) return;

      if (lessonsResult.error) {
        setError("Your learning report could not be loaded right now.");
        setIsLoading(false);
        return;
      }

      const lessonRows = (lessonsResult.data ?? []) as LessonRow[];
      const mcqsByLesson = new Map(((mcqsResult.data ?? []) as McqRow[]).map((mcq) => [mcq.lesson_id, mcq]));
      const classroomIds = [...new Set(lessonRows.map((lesson) => lesson.classroom_id))];

      const { data: classroomData } = classroomIds.length
        ? await supabase.from("classrooms").select("classroom_id, classroom_name").in("classroom_id", classroomIds)
        : { data: [] as ClassroomRow[] };

      if (!isCurrent) return;

      const classroomsById = new Map(((classroomData ?? []) as ClassroomRow[]).map((classroom) => [classroom.classroom_id, classroom]));

      const completedLessons: CompletedLesson[] = lessonRows.map((lesson) => {
        const attempt = latestByLesson.get(lesson.lesson_id);
        const mcq = mcqsByLesson.get(lesson.lesson_id);
        const ceiling = mcq?.score_ceiling ?? null;
        const scorePercent = ceiling && ceiling > 0 && attempt?.score != null ? Math.round((Number(attempt.score) / ceiling) * 100) : null;
        return {
          lesson_id: lesson.lesson_id,
          lessonTitle: lesson.title,
          classroomName: classroomsById.get(lesson.classroom_id)?.classroom_name ?? "Classroom",
          quizTitle: mcq?.title ?? null,
          score: attempt?.score ?? null,
          scorePercent,
          completedAt: attempt?.completed_at ?? null,
        };
      });

      completedLessons.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
      setLessons(completedLessons);
      setIsLoading(false);
    };

    void load();
    return () => { isCurrent = false; };
  }, [studentId]);

  const lessonsCompleted = lessons.length;
  const quizzesCompleted = lessons.filter((lesson) => lesson.quizTitle !== null).length;
  const scoredLessons = lessons.filter((lesson) => lesson.scorePercent !== null);
  const averageScore = scoredLessons.length
    ? Math.round(scoredLessons.reduce((total, lesson) => total + (lesson.scorePercent ?? 0), 0) / scoredLessons.length)
    : null;
  const highestScore = scoredLessons.length ? Math.max(...scoredLessons.map((lesson) => lesson.scorePercent ?? 0)) : null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-medium text-violet-700">Student portal</p>
            <h1 className="mt-1 text-xl font-bold">Learning report</h1>
            <p className="mt-1 text-xs text-slate-500">All the lessons you've covered, the quizzes you've completed, and the marks you obtained.</p>
          </div>
        </header>

        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-4">
                <StatCard icon={<BookOpen />} label="Lessons covered" value={isLoading ? "—" : String(lessonsCompleted)} />
                <StatCard icon={<CheckCircle2 />} label="Quizzes completed" value={isLoading ? "—" : String(quizzesCompleted)} />
                <StatCard icon={<BarChart3 />} label="Average mark" value={isLoading || averageScore === null ? "—" : `${averageScore}%`} />
                <StatCard icon={<Award />} label="Highest mark" value={isLoading || highestScore === null ? "—" : `${highestScore}%`} />
              </section>

              <section className="mt-4 rounded-xl border border-slate-100 bg-white p-5">
                <h2 className="text-base font-bold">Lessons covered</h2>
                <p className="mt-1 text-sm text-slate-500">Every lesson quiz you've completed, most recent first.</p>

                {isLoading ? (
                  <p className="mt-4 text-sm text-slate-400">Loading your learning report...</p>
                ) : lessons.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">You have not completed any lessons yet.</p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {lessons.map((lesson) => (
                      <div key={lesson.lesson_id} className="flex items-center gap-3 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                          <BookOpen size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{lesson.lessonTitle}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {lesson.classroomName} · {lesson.quizTitle ? `${lesson.quizTitle} quiz` : "No quiz"}
                            {lesson.completedAt ? ` · Completed ${formatDate(lesson.completedAt)}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {lesson.score !== null ? (
                            <span className="text-sm font-bold text-violet-700">
                              {lesson.scorePercent !== null ? `${lesson.scorePercent}%` : lesson.score}
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
