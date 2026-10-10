// -----------------------------------------------------------------------------
// Classroom Students Tab
//
// The Students tab of a classroom: four summary tiles (enrolled, active this
// week, average score, completion) and a searchable, sortable roster table with
// each student's progress and a remove button.
//
// The statistics are loaded here, when the tab is opened, so the classroom page
// itself stays quick to load.
//
// Used by: ClassroomDetail
// -----------------------------------------------------------------------------

import { Activity, BarChart3, CheckCircle2, UserMinus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ClassroomMetric from "./ClassroomMetric";
import SearchSortBar from "./SearchSortBar";
import type { StudentProfile } from "./ClassroomInvitePanel";
import { supabase } from "../supabase-client";
import { daysBetween } from "../utils/activityCalendar";
import { toDateKey } from "../utils/releaseDate";
import {
  compareNullableNumbers,
  compareText,
  matchesSearch,
  toTime,
  type SortOption,
} from "../utils/listControls";

type ClassroomStudentsTabProps = {
  classroomId: string;
  students: StudentProfile[];
  enrolledAt: Record<string, string>;
  lessonIds: string[];
  rosterError: string | null;
  onRemove: (student: StudentProfile) => void;
};

type StudentStats = {
  completedLessons: number;
  averagePercent: number | null;
  lastActive: string | null;
};

// How far back "last active" looks.
const ACTIVITY_WINDOW_DAYS = 30;

type StudentSort =
  | "name-asc"
  | "name-desc"
  | "recently-joined"
  | "highest-score"
  | "most-quizzes"
  | "recently-active";

const studentSortOptions: SortOption<StudentSort>[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "recently-joined", label: "Recently joined" },
  { value: "highest-score", label: "Highest avg score" },
  { value: "most-quizzes", label: "Most quizzes done" },
  { value: "recently-active", label: "Recently active" },
];

// -- Helpers ------------------------------------------------------------------

// student_activity.activity_date is a plain date, so dates are compared as
// local "YYYY-MM-DD" keys.
const localDate = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return toDateKey(date);
};

const lastActiveLabel = (activityDate: string | null) => {
  if (!activityDate) return `Not active in ${ACTIVITY_WINDOW_DAYS} days`;
  const days = daysBetween(activityDate, localDate());
  if (days <= 0) return "Active today";
  if (days === 1) return "Active yesterday";
  return `Active ${days} days ago`;
};

const fullName = (student: StudentProfile) =>
  [student.name, student.surname].filter(Boolean).join(" ") || "Unnamed student";
const initials = (student: StudentProfile) =>
  `${student.name?.[0] ?? ""}${student.surname?.[0] ?? ""}` || "S";

// -- Component ----------------------------------------------------------------

export default function ClassroomStudentsTab({
  classroomId,
  students,
  enrolledAt,
  lessonIds,
  rosterError,
  onRemove,
}: ClassroomStudentsTabProps) {
  const [stats, setStats] = useState<Record<string, StudentStats>>({});
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  // Lessons that have a quiz. Flashcards-only lessons have no score, so they
  // are left out of the completion figures.
  const [quizLessonCount, setQuizLessonCount] = useState<number | null>(null);
  // The effect below depends on these strings rather than the arrays, so it
  // only re-runs when the actual ids change.
  const studentKey = students.map((student) => student.id).join(",");
  const lessonKey = lessonIds.join(",");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentSort, setStudentSort] = useState<StudentSort>("name-asc");

  // -- Load statistics --
  //
  // One round of three queries for the whole roster: quiz ceilings per lesson,
  // completed attempts, and recent activity days. Results are combined per
  // student into lessons completed, average best score and last active day.
  useEffect(() => {
    let cancelled = false; // Ignore a slow response after the roster changed.
    const studentIds = studentKey ? studentKey.split(",") : [];
    const classLessonIds = lessonKey ? lessonKey.split(",") : [];

    const load = async () => {
      setIsLoadingStats(true);
      setStatsError(null);
      if (!studentIds.length) {
        setStats({});
        setIsLoadingStats(false);
        return;
      }

      const [mcqResult, attemptResult, activityResult] = await Promise.all([
        classLessonIds.length
          ? supabase.from("mcqs").select("lesson_id, score_ceiling").in("lesson_id", classLessonIds)
          : Promise.resolve({ data: [], error: null }),
        classLessonIds.length
          ? supabase
              .from("lesson_attempts")
              .select("student_id, lesson_id, score")
              .in("lesson_id", classLessonIds)
              .in("student_id", studentIds)
              .not("completed_at", "is", null)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("student_activity")
          .select("student_id, activity_date")
          .in("student_id", studentIds)
          .gte("activity_date", localDate(ACTIVITY_WINDOW_DAYS)),
      ]);
      if (cancelled) return;

      const error = mcqResult.error ?? attemptResult.error ?? activityResult.error;
      if (error) setStatsError(`Some statistics could not be loaded: ${error.message}`);

      const ceilings = new Map(
        (mcqResult.data ?? []).map((mcq) => [
          mcq.lesson_id as string,
          mcq.score_ceiling as number | null,
        ]),
      );
      setQuizLessonCount(mcqResult.error ? null : ceilings.size);
      // Best percentage per student per lesson, so retakes never lower the average.
      const bestPercent = new Map<string, Map<string, number | null>>();
      for (const attempt of attemptResult.data ?? []) {
        // Skip unscored attempts from flashcards-only lessons.
        if (!mcqResult.error && !ceilings.has(attempt.lesson_id)) continue;
        const ceiling = ceilings.get(attempt.lesson_id);
        const percent =
          ceiling && attempt.score !== null
            ? Math.round((Number(attempt.score) / ceiling) * 100)
            : null;
        const lessons = bestPercent.get(attempt.student_id) ?? new Map<string, number | null>();
        const previous = lessons.get(attempt.lesson_id);
        lessons.set(
          attempt.lesson_id,
          previous == null ? percent : percent == null ? previous : Math.max(previous, percent),
        );
        bestPercent.set(attempt.student_id, lessons);
      }

      // Most recent activity day per student.
      const lastActive = new Map<string, string>();
      for (const row of activityResult.data ?? []) {
        const current = lastActive.get(row.student_id);
        if (!current || row.activity_date > current) {
          lastActive.set(row.student_id, row.activity_date);
        }
      }

      setStats(
        Object.fromEntries(
          studentIds.map((id) => {
            const lessons = bestPercent.get(id) ?? new Map<string, number | null>();
            const percents = [...lessons.values()].filter(
              (value): value is number => value !== null,
            );
            return [
              id,
              {
                completedLessons: lessons.size,
                averagePercent: percents.length
                  ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length)
                  : null,
                lastActive: lastActive.get(id) ?? null,
              },
            ];
          }),
        ),
      );
      setIsLoadingStats(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [studentKey, lessonKey]);

  // -- Class summary figures --

  const lessonCount = quizLessonCount ?? lessonIds.length;
  const flashcardOnlyCount = lessonIds.length - lessonCount;
  const studentStats = students.map((student) => stats[student.id]).filter(Boolean);
  const weekStart = localDate(6);
  const activeThisWeek = studentStats.filter(
    (stat) => stat.lastActive && stat.lastActive >= weekStart,
  ).length;
  const averages = studentStats
    .map((stat) => stat.averagePercent)
    .filter((value): value is number => value !== null);
  const classAverage = averages.length
    ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length)
    : null;
  const possibleCompletions = students.length * lessonCount;
  const completionRate = possibleCompletions
    ? Math.round(
        (studentStats.reduce((sum, stat) => sum + stat.completedLessons, 0) / possibleCompletions) *
          100,
      )
    : null;
  const pending = isLoadingStats ? "…" : null;

  // -- Search and sort --
  // Stat-based sorts put students without a value (or still loading) last,
  // then fall back to name order.
  const compareStudents = (a: StudentProfile, b: StudentProfile) => {
    const byName = compareText(fullName(a), fullName(b));
    const statA = stats[a.id];
    const statB = stats[b.id];
    switch (studentSort) {
      case "name-desc":
        return -byName;
      case "recently-joined":
        return (
          compareNullableNumbers(toTime(enrolledAt[a.id]), toTime(enrolledAt[b.id]), "desc") ||
          byName
        );
      case "highest-score":
        return (
          compareNullableNumbers(statA?.averagePercent, statB?.averagePercent, "desc") || byName
        );
      case "most-quizzes":
        return (
          compareNullableNumbers(statA?.completedLessons, statB?.completedLessons, "desc") || byName
        );
      case "recently-active":
        return (
          compareNullableNumbers(toTime(statA?.lastActive), toTime(statB?.lastActive), "desc") ||
          byName
        );
      default:
        return byName;
    }
  };
  const visibleStudents = students
    .filter((student) =>
      matchesSearch(studentQuery, student.name, student.surname, student.username),
    )
    .sort(compareStudents);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ClassroomMetric
          icon={<Users size={16} />}
          label="Students enrolled"
          value={String(students.length)}
          detail="Total"
        />
        <ClassroomMetric
          icon={<Activity size={16} />}
          label="Active this week"
          value={pending ?? `${activeThisWeek}/${students.length}`}
          detail="Last 7 days"
        />
        <ClassroomMetric
          icon={<BarChart3 size={16} />}
          label="Average quiz score"
          value={pending ?? (classAverage === null ? "—" : `${classAverage}%`)}
          detail="Best attempt"
        />
        <ClassroomMetric
          icon={<CheckCircle2 size={16} />}
          label="Lesson completion"
          value={pending ?? (completionRate === null ? "—" : `${completionRate}%`)}
          detail={`${lessonCount} quiz lesson${lessonCount !== 1 ? "s" : ""}${flashcardOnlyCount > 0 ? ` · ${flashcardOnlyCount} flashcards only` : ""}`}
        />
      </div>

      <section className="rounded-xl border border-slate-100 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-base font-bold">Roster</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {students.length} student{students.length !== 1 ? "s" : ""} in this classroom
            </p>
          </div>
          <Link
            to={`/class-progress/${classroomId}`}
            className="text-xs font-semibold text-violet-700 hover:underline"
          >
            Full progress report
          </Link>
        </div>

        {students.length > 0 && (
          <SearchSortBar
            size="sm"
            className="mx-4 mt-3"
            query={studentQuery}
            onQueryChange={setStudentQuery}
            searchPlaceholder="Search by name or username..."
            sort={studentSort}
            onSortChange={setStudentSort}
            sortOptions={studentSortOptions}
          />
        )}

        {rosterError && (
          <p role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {rosterError}
          </p>
        )}
        {statsError && (
          <p
            role="alert"
            className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            {statsError}
          </p>
        )}

        {students.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <Users size={24} className="text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">No students have joined yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Use “Invite students” in the banner to share the classroom code.
            </p>
          </div>
        ) : visibleStudents.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No students match "{studentQuery.trim()}".
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Quizzes done
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Avg score
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Last active
                  </th>
                  <th scope="col" className="px-4 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStudents.map((student) => {
                  const stat = stats[student.id];
                  const joined = enrolledAt[student.id];
                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold text-violet-700">
                            {initials(student)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800">
                              {fullName(student)}
                            </span>
                            {student.username && (
                              <span className="text-xs text-slate-500">@{student.username}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {joined
                          ? new Date(joined).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {stat ? `${stat.completedLessons}/${lessonCount}` : (pending ?? "—")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {stat
                          ? stat.averagePercent === null
                            ? "—"
                            : `${stat.averagePercent}%`
                          : (pending ?? "—")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {stat ? lastActiveLabel(stat.lastActive) : (pending ?? "—")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onRemove(student)}
                          aria-label={`Remove ${fullName(student)} from this classroom`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors duration-1000 ease-out hover:bg-violet-700 hover:text-white"
                        >
                          <UserMinus size={15} /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
