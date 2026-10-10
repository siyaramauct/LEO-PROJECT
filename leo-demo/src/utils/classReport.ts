import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../supabase-client";
import { buildActivityWeeks, daysBetween } from "./activityCalendar";
import { bucketImageUrlOrBroken } from "./images";
import { toDateKey } from "./releaseDate";

// Mastery-learning practice (Bloom; Guskey) treats roughly 80% on a formative check as mastery.
export const MASTERY_PERCENT = 80;
// Below this a lesson's content most likely needs reteaching rather than extra practice.
export const SUPPORT_PERCENT = 50;
// LMS activity is an early-warning signal (Macfadyen & Dawson, 2010); a week without study is worth a check-in.
export const INACTIVE_DAYS = 7;
// "Behind" once a student has finished less than this share of the lessons released so far.
const BEHIND_SHARE = 0.5;

export type ScoreBand = "mastered" | "developing" | "support";
export type StudentFlag = "low-scores" | "inactive" | "behind";

export const scoreBand = (percent: number): ScoreBand =>
  percent >= MASTERY_PERCENT ? "mastered" : percent >= SUPPORT_PERCENT ? "developing" : "support";

export type StudentLessonResult = {
  attempts: number;
  firstPercent: number | null;
  bestPercent: number | null;
};

export type StudentReport = {
  id: string;
  name: string;
  initials: string;
  completedCount: number;
  averagePercent: number | null;
  lastActiveKey: string | null;
  // Null when the student has no activity in the calendar window at all.
  daysSinceActive: number | null;
  activeDaysLast7: number;
  // Completed lessons only, keyed by lesson id.
  results: Map<string, StudentLessonResult>;
  flags: StudentFlag[];
};

export type LessonReport = {
  lessonId: string;
  title: string;
  imageUrl: string;
  releaseDate: string;
  hasQuiz: boolean;
  completedCount: number;
  // Class average of each student's best attempt.
  averagePercent: number | null;
  firstAttemptAverage: number | null;
  bands: Record<ScoreBand | "notAttempted", number>;
  medianMinutes: number | null;
  retakes: number;
};

export type ClassReport = {
  classroomId: string;
  name: string;
  coverUrl: string;
  students: StudentReport[];
  lessons: LessonReport[];
  activeStudentsByDay: Map<string, number>;
  averagePercent: number | null;
  completionRate: number | null;
  masteryRate: number | null;
  activeThisWeek: number;
  needsAttention: number;
};

type ClassroomRow = {
  classroom_id: string;
  classroom_name: string;
  cover_image_path: string | null;
};
type LessonRow = {
  lesson_id: string;
  classroom_id: string;
  title: string;
  lesson_image_path: string | null;
  release_date: string;
};
type EnrolmentRow = { classroom_id: string; student_id: string };
type ProfileRow = {
  id: string;
  name: string | null;
  surname: string | null;
  username: string | null;
};
type McqRow = { lesson_id: string; score_ceiling: number | null };
type AttemptRow = {
  student_id: string;
  lesson_id: string;
  score: number | null;
  started_at: string | null;
  completed_at: string;
};
type ActivityRow = { student_id: string; activity_date: string };

const PAGE_SIZE = 1000;

// Supabase caps a response at 1000 rows, so page through anything that can grow with class size.
async function fetchAllRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export const average = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
    : null;

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const percentOf = (score: number | null, ceiling: number | null) =>
  score !== null && ceiling ? Math.round((score / ceiling) * 100) : null;

// Loads every report for the teacher's classrooms (or just one) in a fixed number of queries.
export async function loadClassReports(
  teacherId: string,
  classroomId?: string,
): Promise<ClassReport[]> {
  let classroomQuery = supabase
    .from("classrooms")
    .select("classroom_id, classroom_name, cover_image_path")
    .eq("teacher_id", teacherId)
    .order("classroom_name");
  if (classroomId) classroomQuery = classroomQuery.eq("classroom_id", classroomId);
  const { data: classroomData, error: classroomError } = await classroomQuery;
  if (classroomError) throw classroomError;
  const classrooms = (classroomData ?? []) as ClassroomRow[];
  if (!classrooms.length) return [];
  const classroomIds = classrooms.map((classroom) => classroom.classroom_id);

  const today = new Date();
  const todayKey = toDateKey(today);
  const windowStartKey = buildActivityWeeks(today)[0][0].key;

  const [lessonResult, enrolmentResult] = await Promise.all([
    // Scheduled lessons aren't available to students yet, so they don't count against completion.
    supabase
      .from("lessons")
      .select("lesson_id, classroom_id, title, lesson_image_path, release_date")
      .in("classroom_id", classroomIds)
      .lte("release_date", today.toISOString()),
    supabase
      .from("classroom_students")
      .select("classroom_id, student_id")
      .in("classroom_id", classroomIds),
  ]);
  if (lessonResult.error) throw lessonResult.error;
  if (enrolmentResult.error) throw enrolmentResult.error;
  const lessons = (lessonResult.data ?? []) as LessonRow[];
  const enrolments = (enrolmentResult.data ?? []) as EnrolmentRow[];
  const lessonIds = lessons.map((lesson) => lesson.lesson_id);
  const studentIds = [...new Set(enrolments.map((enrolment) => enrolment.student_id))];

  const [profiles, mcqs, attempts, activity] = await Promise.all([
    studentIds.length
      ? supabase
          .from("profiles")
          .select("id, name, surname, username")
          .in("id", studentIds)
          .then(({ data, error }) => {
            if (error) throw error;
            return (data ?? []) as ProfileRow[];
          })
      : [],
    lessonIds.length
      ? supabase
          .from("mcqs")
          .select("lesson_id, score_ceiling")
          .in("lesson_id", lessonIds)
          .then(({ data, error }) => {
            if (error) throw error;
            return (data ?? []) as McqRow[];
          })
      : [],
    lessonIds.length && studentIds.length
      ? fetchAllRows<AttemptRow>((from, to) =>
          supabase
            .from("lesson_attempts")
            .select("student_id, lesson_id, score, started_at, completed_at")
            .in("lesson_id", lessonIds)
            .in("student_id", studentIds)
            .not("completed_at", "is", null)
            .order("completed_at")
            .order("attempt_id")
            .range(from, to),
        )
      : [],
    studentIds.length
      ? fetchAllRows<ActivityRow>((from, to) =>
          supabase
            .from("student_activity")
            .select("student_id, activity_date")
            .in("student_id", studentIds)
            .gte("activity_date", windowStartKey)
            .order("student_id")
            .order("activity_date")
            .range(from, to),
        )
      : [],
  ]);

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const ceilings = new Map(mcqs.map((mcq) => [mcq.lesson_id, mcq.score_ceiling]));
  const activityByStudent = new Map<string, string[]>();
  for (const row of activity)
    activityByStudent.set(row.student_id, [
      ...(activityByStudent.get(row.student_id) ?? []),
      row.activity_date,
    ]);

  // Attempts arrive oldest first, so the first one seen per student and lesson is their first try.
  const attemptsByLesson = new Map<string, AttemptRow[]>();
  for (const attempt of attempts)
    attemptsByLesson.set(attempt.lesson_id, [
      ...(attemptsByLesson.get(attempt.lesson_id) ?? []),
      attempt,
    ]);

  return classrooms.map((classroom) => {
    const classLessons = lessons
      .filter((lesson) => lesson.classroom_id === classroom.classroom_id)
      .sort((a, b) => a.release_date.localeCompare(b.release_date));
    const classStudentIds = enrolments
      .filter((enrolment) => enrolment.classroom_id === classroom.classroom_id)
      .map((enrolment) => enrolment.student_id);
    const classStudentSet = new Set(classStudentIds);

    const resultsByStudent = new Map<string, Map<string, StudentLessonResult>>(
      classStudentIds.map((id) => [id, new Map()]),
    );
    const lessonReports: LessonReport[] = classLessons.map((lesson) => {
      const ceiling = ceilings.get(lesson.lesson_id) ?? null;
      const lessonAttempts = (attemptsByLesson.get(lesson.lesson_id) ?? []).filter((attempt) =>
        classStudentSet.has(attempt.student_id),
      );
      const minutes: number[] = [];
      for (const attempt of lessonAttempts) {
        const results = resultsByStudent.get(attempt.student_id)!;
        const percent = percentOf(attempt.score === null ? null : Number(attempt.score), ceiling);
        const previous = results.get(lesson.lesson_id);
        results.set(
          lesson.lesson_id,
          previous
            ? {
                attempts: previous.attempts + 1,
                firstPercent: previous.firstPercent,
                bestPercent:
                  previous.bestPercent === null
                    ? percent
                    : percent === null
                      ? previous.bestPercent
                      : Math.max(previous.bestPercent, percent),
              }
            : { attempts: 1, firstPercent: percent, bestPercent: percent },
        );
        if (attempt.started_at) {
          const elapsed =
            (new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) /
            60_000;
          if (elapsed > 0) minutes.push(elapsed);
        }
      }

      const studentResults = classStudentIds.flatMap((id) => {
        const result = resultsByStudent.get(id)!.get(lesson.lesson_id);
        return result ? [result] : [];
      });
      const bestPercents = studentResults.flatMap((result) =>
        result.bestPercent === null ? [] : [result.bestPercent],
      );
      const bands = {
        mastered: 0,
        developing: 0,
        support: 0,
        notAttempted: classStudentIds.length - studentResults.length,
      };
      for (const percent of bestPercents) bands[scoreBand(percent)] += 1;
      const medianMinutes = median(minutes);

      return {
        lessonId: lesson.lesson_id,
        title: lesson.title,
        imageUrl: bucketImageUrlOrBroken(lesson.lesson_image_path),
        releaseDate: lesson.release_date,
        hasQuiz: ceilings.has(lesson.lesson_id),
        completedCount: studentResults.length,
        averagePercent: average(bestPercents),
        firstAttemptAverage: average(
          studentResults.flatMap((result) =>
            result.firstPercent === null ? [] : [result.firstPercent],
          ),
        ),
        bands,
        medianMinutes: medianMinutes === null ? null : Math.max(1, Math.round(medianMinutes)),
        retakes: studentResults.reduce((total, result) => total + result.attempts - 1, 0),
      };
    });

    const activeStudentsByDay = new Map<string, number>();
    const studentReports: StudentReport[] = classStudentIds.map((id) => {
      const profile = profilesById.get(id);
      const name =
        `${profile?.name ?? ""} ${profile?.surname ?? ""}`.trim() || profile?.username || "Student";
      const initials =
        `${profile?.name?.[0] ?? ""}${profile?.surname?.[0] ?? ""}`.toUpperCase() ||
        name[0].toUpperCase();
      const results = resultsByStudent.get(id)!;
      const days = activityByStudent.get(id) ?? [];
      for (const day of days) activeStudentsByDay.set(day, (activeStudentsByDay.get(day) ?? 0) + 1);
      const lastActiveKey = days.length
        ? days.reduce((latest, day) => (day > latest ? day : latest))
        : null;
      const daysSinceActive = lastActiveKey ? daysBetween(lastActiveKey, todayKey) : null;
      const averagePercent = average(
        [...results.values()].flatMap((result) =>
          result.bestPercent === null ? [] : [result.bestPercent],
        ),
      );

      const flags: StudentFlag[] = [];
      if (averagePercent !== null && averagePercent < SUPPORT_PERCENT) flags.push("low-scores");
      if (daysSinceActive === null || daysSinceActive >= INACTIVE_DAYS) flags.push("inactive");
      if (classLessons.length >= 2 && results.size / classLessons.length < BEHIND_SHARE)
        flags.push("behind");

      return {
        id,
        name,
        initials,
        completedCount: results.size,
        averagePercent,
        lastActiveKey,
        daysSinceActive,
        activeDaysLast7: days.filter((day) => daysBetween(day, todayKey) < 7).length,
        results,
        flags,
      };
    });

    const allBest = studentReports.flatMap((student) =>
      [...student.results.values()].flatMap((result) =>
        result.bestPercent === null ? [] : [result.bestPercent],
      ),
    );
    const possibleCompletions = studentReports.length * lessonReports.length;

    return {
      classroomId: classroom.classroom_id,
      name: classroom.classroom_name,
      coverUrl: bucketImageUrlOrBroken(classroom.cover_image_path),
      students: studentReports,
      lessons: lessonReports,
      activeStudentsByDay,
      averagePercent: average(allBest),
      completionRate: possibleCompletions
        ? Math.round(
            (studentReports.reduce((total, student) => total + student.completedCount, 0) /
              possibleCompletions) *
              100,
          )
        : null,
      masteryRate: allBest.length
        ? Math.round(
            (allBest.filter((percent) => percent >= MASTERY_PERCENT).length / allBest.length) * 100,
          )
        : null,
      activeThisWeek: studentReports.filter((student) => student.activeDaysLast7 > 0).length,
      needsAttention: studentReports.filter((student) => student.flags.length > 0).length,
    };
  });
}

export const FLAG_LABELS: Record<StudentFlag, string> = {
  "low-scores": `Average below ${SUPPORT_PERCENT}%`,
  inactive: "Inactive",
  behind: "Behind on lessons",
};

export function inactiveLabel(daysSinceActive: number | null) {
  return daysSinceActive === null ? "No activity in 12 weeks" : `Inactive ${daysSinceActive} days`;
}
