// -----------------------------------------------------------------------------
// Report Service
//
// Builds the progress reports:
//   getClassReports    the teacher's view of a classroom (ClassroomReport page):
//                      per student and per lesson, completion, first and best
//                      quiz scores, retakes, time spent, recent activity, and
//                      flags for students who may need help
//   getLearningReport  the student's own view (StudentLearningReport page):
//                      each classroom's lessons with best scores, the study
//                      calendar and the streak
//
// Everything is loaded in a fixed number of queries, whatever the class size,
// and combined in memory. Scores are each student's best attempt, so a retake
// never lowers them. The rules live in src/domain.
//
// Functions throw a DataError when a required query fails.
// -----------------------------------------------------------------------------

import { getStudyDays } from "../data/activity";
import { getClassAttempts, getCompletedAttempts, type ClassAttempt } from "../data/attempts";
import {
  getClassroomsByIds,
  getTeacherClassrooms,
  type ClassroomSummary,
} from "../data/classrooms";
import {
  getClassroomEnrolments,
  getClassroomRoster,
  getEnrolledClassroomIds,
} from "../data/enrolments";
import { DataError } from "../data/errors";
import { getFlashcards, type LessonFlashcard } from "../data/flashcards";
import {
  getReleasedLessons,
  getTeacherLesson,
  type Lesson,
  type TeacherLesson,
} from "../data/lessons";
import { getLessonDocuments } from "../data/materials";
import { getStudentProfiles, type StudentProfile } from "../data/profiles";
import { getStudentProgress, type StudentProgress } from "../data/progress";
import { getQuiz, getQuizCeilings, type Quiz } from "../data/quizzes";
import {
  MASTERY_PERCENT,
  scoreBand,
  studentFlags,
  type ScoreBand,
  type StudentFlag,
} from "../domain/progress";
import { scorePercent } from "../domain/scoring";
import { average, bestOf, median, scoredOnly } from "../domain/statistics";
import { buildActivityWeeks, daysBetween } from "../utils/activityCalendar";
import { bucketImageUrlOrBroken } from "../utils/images";
import { toDateKey } from "../utils/releaseDate";
import { signLessonDocuments, type LessonDocument } from "./lessonCreationService";

// =============================================================================
// Teacher: class reports
// =============================================================================

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
  daysSinceActive: number | null; // Null when there is no activity in the 12-week window.
  activeDays: number; // Days studied in the 12-week window.
  activeDaysLast7: number;
  results: Map<string, StudentLessonResult>; // Completed lessons only, keyed by lesson id.
  flags: StudentFlag[];
};

export type LessonReport = {
  lessonId: string;
  title: string;
  imageUrl: string;
  releaseDate: string;
  hasQuiz: boolean;
  completedCount: number;
  averagePercent: number | null; // Class average of each student's best attempt.
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

// Reports for all of the teacher's classrooms, or just one when classroomId is given.
export async function getClassReports(
  teacherId: string,
  classroomId?: string,
): Promise<ClassReport[]> {
  // 1. The teacher's classrooms.
  const classrooms = await getTeacherClassrooms(teacherId, { classroomId });

  if (classrooms.length === 0) {
    return [];
  }

  const classroomIds = classrooms.map((classroom) => classroom.classroom_id);
  const today = new Date();
  const todayKey = toDateKey(today);
  const windowStartKey = buildActivityWeeks(today)[0][0].key;

  // 2. Released lessons and enrolments. Scheduled lessons aren't open to
  //    students yet, so they don't count against completion.
  const [lessons, enrolments] = await Promise.all([
    getReleasedLessons(classroomIds),
    getClassroomEnrolments(classroomIds),
  ]);

  const lessonIds = lessons.map((lesson) => lesson.lesson_id);
  const studentIds = [...new Set(enrolments.map((enrolment) => enrolment.student_id))];

  // 3. Everything about those students and lessons, in parallel.
  const [profiles, ceilings, attempts, studyDays] = await Promise.all([
    getStudentProfiles(studentIds),
    getQuizCeilings(lessonIds),
    getClassAttempts(lessonIds, studentIds),
    getStudyDays(studentIds, windowStartKey),
  ]);

  // 4. Index the rows for quick lookup.
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const attemptsByLesson = groupBy(attempts, (attempt) => attempt.lesson_id);

  const daysByStudent = new Map<string, string[]>();
  for (const [studentId, days] of groupBy(studyDays, (day) => day.student_id)) {
    daysByStudent.set(
      studentId,
      days.map((day) => day.activity_date),
    );
  }

  // 5. One report per classroom.
  return classrooms.map((classroom) => {
    const classLessons = lessons
      .filter((lesson) => lesson.classroom_id === classroom.classroom_id)
      .sort((a, b) => a.release_date.localeCompare(b.release_date));

    const classStudentIds = enrolments
      .filter((enrolment) => enrolment.classroom_id === classroom.classroom_id)
      .map((enrolment) => enrolment.student_id);

    return buildClassReport({
      classroom,
      lessons: classLessons,
      studentIds: classStudentIds,
      ceilings,
      attemptsByLesson,
      profilesById,
      daysByStudent,
      todayKey,
    });
  });
}

type ClassReportInput = {
  classroom: ClassroomSummary;
  lessons: Lesson[]; // This classroom's released lessons, in release order.
  studentIds: string[];
  ceilings: Map<string, number | null>;
  attemptsByLesson: Map<string, ClassAttempt[]>;
  profilesById: Map<string, StudentProfile>;
  daysByStudent: Map<string, string[]>;
  todayKey: string;
};

function buildClassReport({
  classroom,
  lessons,
  studentIds,
  ceilings,
  attemptsByLesson,
  profilesById,
  daysByStudent,
  todayKey,
}: ClassReportInput): ClassReport {
  // Only attempts by this class's students count.
  const classStudents = new Set(studentIds);
  const attemptsFor = (lessonId: string) =>
    (attemptsByLesson.get(lessonId) ?? []).filter((attempt) =>
      classStudents.has(attempt.student_id),
    );

  // 1. Each student's first and best result on each lesson they completed.
  const resultsByStudent = foldAttempts(
    studentIds,
    lessons.flatMap((lesson) => attemptsFor(lesson.lesson_id)),
    ceilings,
  );

  // 2. One report per lesson.
  const lessonReports = lessons.map((lesson) =>
    buildLessonReport({
      lesson,
      studentIds,
      resultsByStudent,
      attempts: attemptsFor(lesson.lesson_id),
      hasQuiz: ceilings.has(lesson.lesson_id),
    }),
  );

  // 3. One report per student.
  const studentReports = studentIds.map((id) =>
    buildStudentReport({
      id,
      profile: profilesById.get(id),
      results: resultsByStudent.get(id) ?? new Map(),
      days: daysByStudent.get(id) ?? [],
      releasedLessons: lessons.length,
      todayKey,
    }),
  );

  // 4. Class totals.
  const allBest = studentReports.flatMap((student) =>
    scoredOnly([...student.results.values()].map((result) => result.bestPercent)),
  );
  const possibleCompletions = studentReports.length * lessonReports.length;
  const totalCompletions = studentReports.reduce(
    (total, student) => total + student.completedCount,
    0,
  );
  const masteredCount = allBest.filter((percent) => percent >= MASTERY_PERCENT).length;

  return {
    classroomId: classroom.classroom_id,
    name: classroom.classroom_name,
    coverUrl: bucketImageUrlOrBroken(classroom.cover_image_path),
    students: studentReports,
    lessons: lessonReports,
    activeStudentsByDay: countActiveStudentsByDay(studentIds, daysByStudent),
    averagePercent: average(allBest),
    completionRate: possibleCompletions
      ? Math.round((totalCompletions / possibleCompletions) * 100)
      : null,
    masteryRate: allBest.length ? Math.round((masteredCount / allBest.length) * 100) : null,
    activeThisWeek: studentReports.filter((student) => student.activeDaysLast7 > 0).length,
    needsAttention: studentReports.filter((student) => student.flags.length > 0).length,
  };
}

// Folds attempts (oldest first) into each student's result per lesson. The
// first attempt seen is the student's first try, which never changes.
function foldAttempts(
  studentIds: string[],
  attempts: ClassAttempt[],
  ceilings: Map<string, number | null>,
) {
  const resultsByStudent = new Map<string, Map<string, StudentLessonResult>>(
    studentIds.map((id) => [id, new Map()]),
  );

  for (const attempt of attempts) {
    const results = resultsByStudent.get(attempt.student_id);

    if (!results) {
      continue;
    }

    const score = attempt.score === null ? null : Number(attempt.score);
    const percent = scorePercent(score, ceilings.get(attempt.lesson_id) ?? null);
    const previous = results.get(attempt.lesson_id);

    if (previous) {
      results.set(attempt.lesson_id, {
        attempts: previous.attempts + 1,
        firstPercent: previous.firstPercent,
        bestPercent: bestOf(previous.bestPercent, percent),
      });
    } else {
      results.set(attempt.lesson_id, { attempts: 1, firstPercent: percent, bestPercent: percent });
    }
  }

  return resultsByStudent;
}

type LessonReportInput = {
  lesson: Lesson;
  studentIds: string[];
  resultsByStudent: Map<string, Map<string, StudentLessonResult>>;
  attempts: ClassAttempt[]; // This lesson's attempts by this class's students.
  hasQuiz: boolean;
};

function buildLessonReport({
  lesson,
  studentIds,
  resultsByStudent,
  attempts,
  hasQuiz,
}: LessonReportInput): LessonReport {
  // One result per student who completed the lesson.
  const studentResults = studentIds.flatMap((id) => {
    const result = resultsByStudent.get(id)?.get(lesson.lesson_id);
    return result ? [result] : [];
  });

  const bestPercents = scoredOnly(studentResults.map((result) => result.bestPercent));

  // How many students fall in each score band.
  const bands = {
    mastered: 0,
    developing: 0,
    support: 0,
    notAttempted: studentIds.length - studentResults.length,
  };

  for (const percent of bestPercents) {
    bands[scoreBand(percent)] += 1;
  }

  const medianMinutes = median(minutesOnTask(attempts));

  return {
    lessonId: lesson.lesson_id,
    title: lesson.title,
    imageUrl: bucketImageUrlOrBroken(lesson.lesson_image_path),
    releaseDate: lesson.release_date,
    hasQuiz,
    completedCount: studentResults.length,
    averagePercent: average(bestPercents),
    firstAttemptAverage: average(scoredOnly(studentResults.map((result) => result.firstPercent))),
    bands,
    medianMinutes: medianMinutes === null ? null : Math.max(1, Math.round(medianMinutes)),
    retakes: studentResults.reduce((total, result) => total + result.attempts - 1, 0),
  };
}

// Time on task, in minutes, for attempts whose start time was recorded.
function minutesOnTask(attempts: ClassAttempt[]) {
  const minutes: number[] = [];

  for (const attempt of attempts) {
    if (!attempt.started_at) {
      continue;
    }

    const elapsed =
      (new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) / 60_000;

    if (elapsed > 0) {
      minutes.push(elapsed);
    }
  }

  return minutes;
}

type StudentReportInput = {
  id: string;
  profile: StudentProfile | undefined;
  results: Map<string, StudentLessonResult>;
  days: string[]; // "YYYY-MM-DD" keys the student studied.
  releasedLessons: number;
  todayKey: string;
};

function buildStudentReport({
  id,
  profile,
  results,
  days,
  releasedLessons,
  todayKey,
}: StudentReportInput): StudentReport {
  const name =
    `${profile?.name ?? ""} ${profile?.surname ?? ""}`.trim() || profile?.username || "Student";

  const initials =
    `${profile?.name?.[0] ?? ""}${profile?.surname?.[0] ?? ""}`.toUpperCase() ||
    name[0].toUpperCase();

  const lastActiveKey = days.length
    ? days.reduce((latest, day) => (day > latest ? day : latest))
    : null;
  const daysSinceActive = lastActiveKey ? daysBetween(lastActiveKey, todayKey) : null;

  const averagePercent = average(
    scoredOnly([...results.values()].map((result) => result.bestPercent)),
  );

  return {
    id,
    name,
    initials,
    completedCount: results.size,
    averagePercent,
    lastActiveKey,
    daysSinceActive,
    activeDays: days.length, // One row per student per day, so this counts distinct days.
    activeDaysLast7: days.filter((day) => daysBetween(day, todayKey) < 7).length,
    results,
    flags: studentFlags({
      averagePercent,
      daysSinceActive,
      completedLessons: results.size,
      releasedLessons,
    }),
  };
}

// How many of the class's students studied on each day.
function countActiveStudentsByDay(studentIds: string[], daysByStudent: Map<string, string[]>) {
  const activeStudentsByDay = new Map<string, number>();

  for (const id of studentIds) {
    for (const day of daysByStudent.get(id) ?? []) {
      activeStudentsByDay.set(day, (activeStudentsByDay.get(day) ?? 0) + 1);
    }
  }

  return activeStudentsByDay;
}

// =============================================================================
// Student: learning report
// =============================================================================

export type StudentLessonReport = {
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

export type StudentClassroomReport = {
  classroomId: string;
  name: string;
  coverUrl: string;
  lessons: StudentLessonReport[];
  completedCount: number;
  averagePercent: number | null;
};

export type LearningReport = {
  classrooms: StudentClassroomReport[];
  activeDays: Set<string>; // "YYYY-MM-DD" keys the student studied.
  progress: StudentProgress | null; // Streak and weekly goal.
};

// The student's own report. fromDateKey is the first day of the activity calendar.
export async function getLearningReport(
  studentId: string,
  fromDateKey: string,
): Promise<LearningReport> {
  // 1. Enrolments, the calendar days and the streak. The calendar and streak
  //    are secondary: a failure leaves them empty instead of hiding the report.
  const [classroomIds, studyDays, progress] = await Promise.all([
    getEnrolledClassroomIds(studentId),
    getStudyDays([studentId], fromDateKey).catch((activityError) => {
      console.error("Could not load learning activity:", activityError);
      return [];
    }),
    getStudentProgress().catch((progressError) => {
      console.error("Could not load learning progress:", progressError);
      return null;
    }),
  ]);

  const activeDays = new Set(studyDays.map((day) => day.activity_date));

  if (classroomIds.length === 0) {
    return { classrooms: [], activeDays, progress };
  }

  // 2. The classrooms and their released lessons.
  const [classrooms, lessons] = await Promise.all([
    getClassroomsByIds(classroomIds),
    getReleasedLessons(classroomIds),
  ]);

  // 3. The student's attempts and each lesson's quiz size.
  const lessonIds = lessons.map((lesson) => lesson.lesson_id);

  const [attempts, ceilings] = await Promise.all([
    getCompletedAttempts(studentId, lessonIds),
    getQuizCeilings(lessonIds),
  ]);

  const attemptsByLesson = groupBy(attempts, (attempt) => attempt.lesson_id);

  // 4. Each lesson gets its best score, and each classroom its average.
  const lessonReports = lessons.map((lesson) => {
    const lessonAttempts = attemptsByLesson.get(lesson.lesson_id) ?? [];
    const scores = scoredOnly(
      lessonAttempts.map((attempt) => (attempt.score === null ? null : Number(attempt.score))),
    );
    const bestScore = scores.length ? Math.max(...scores) : null;
    const scoreCeiling = ceilings.get(lesson.lesson_id) ?? null;

    return {
      classroomId: lesson.classroom_id,
      report: {
        lessonId: lesson.lesson_id,
        title: lesson.title,
        imageUrl: bucketImageUrlOrBroken(lesson.lesson_image_path),
        releaseDate: lesson.release_date,
        hasQuiz: ceilings.has(lesson.lesson_id),
        completed: lessonAttempts.length > 0,
        attempts: lessonAttempts.length,
        bestScore,
        scoreCeiling,
        bestPercent: scorePercent(bestScore, scoreCeiling),
      },
    };
  });

  const classroomReports = classrooms.map((classroom) => {
    const classroomLessons = lessonReports
      .filter((lesson) => lesson.classroomId === classroom.classroom_id)
      .map((lesson) => lesson.report);

    return {
      classroomId: classroom.classroom_id,
      name: classroom.classroom_name,
      coverUrl: bucketImageUrlOrBroken(classroom.cover_image_path),
      lessons: classroomLessons,
      completedCount: classroomLessons.filter((lesson) => lesson.completed).length,
      averagePercent: average(scoredOnly(classroomLessons.map((lesson) => lesson.bestPercent))),
    };
  });

  return { classrooms: classroomReports, activeDays, progress };
}

// =============================================================================
// Teacher: roster statistics (the classroom's Students tab)
// =============================================================================

export type RosterStats = {
  completedLessons: number; // Quiz lessons only, once the quiz lookup succeeds.
  averagePercent: number | null; // Average of each lesson's best score.
  lastActive: string | null; // "YYYY-MM-DD", within the activity window.
};

export type RosterStatsResult = {
  stats: Record<string, RosterStats>; // Keyed by student id.
  quizLessonCount: number | null; // Null when the quiz lookup failed.
  errorMessage: string | null; // Set when some figures could not be loaded.
};

// Lessons completed, average best score and last active day for each student.
// Each part is loaded separately, so one failure leaves the others in place.
export async function getRosterStats(
  studentIds: string[],
  lessonIds: string[],
  activeSinceKey: string,
): Promise<RosterStatsResult> {
  // The details of each failure go to the console; the teacher gets one plain
  // warning that some figures are missing.
  let failureCount = 0;
  const failed = (failure: unknown) => {
    console.error("A roster statistic could not be loaded:", failure);
    failureCount += 1;
    return null;
  };

  // 1. Quiz sizes, completed attempts and recent study days, together.
  const [ceilings, attempts, studyDays] = await Promise.all([
    getQuizCeilings(lessonIds).catch(failed),
    getClassAttempts(lessonIds, studentIds).catch(failed),
    getStudyDays(studentIds, activeSinceKey).catch(failed),
  ]);

  // 2. Each student's best percentage per lesson, so retakes never lower it.
  const bestByStudent = new Map<string, Map<string, number | null>>();

  for (const attempt of attempts ?? []) {
    // Flashcards-only lessons have no score; skip them once quizzes are known.
    if (ceilings && !ceilings.has(attempt.lesson_id)) {
      continue;
    }

    const score = attempt.score === null ? null : Number(attempt.score);
    const percent = scorePercent(score, ceilings?.get(attempt.lesson_id) ?? null);
    const lessons = bestByStudent.get(attempt.student_id) ?? new Map<string, number | null>();

    lessons.set(attempt.lesson_id, bestOf(lessons.get(attempt.lesson_id) ?? null, percent));
    bestByStudent.set(attempt.student_id, lessons);
  }

  // 3. Each student's most recent study day.
  const lastActive = new Map<string, string>();

  for (const day of studyDays ?? []) {
    const current = lastActive.get(day.student_id);

    if (!current || day.activity_date > current) {
      lastActive.set(day.student_id, day.activity_date);
    }
  }

  // 4. One set of figures per student.
  const stats = Object.fromEntries(
    studentIds.map((id) => {
      const lessons = bestByStudent.get(id) ?? new Map<string, number | null>();

      return [
        id,
        {
          completedLessons: lessons.size,
          averagePercent: average(scoredOnly([...lessons.values()])),
          lastActive: lastActive.get(id) ?? null,
        },
      ];
    }),
  );

  return {
    stats,
    quizLessonCount: ceilings ? ceilings.size : null,
    errorMessage: failureCount
      ? "Some statistics couldn't be loaded, so a few figures may be missing. Refresh the page to try again."
      : null,
  };
}

// =============================================================================
// Teacher: one lesson's report (TeacherLessonReport page)
// =============================================================================

export type LessonStudentResult = {
  id: string;
  name: string;
  attempted: boolean;
  score: number | null; // From the student's latest attempt.
  scorePercent: number | null;
  completedAt: string | null;
};

export type TeacherLessonReport = {
  classroomName: string;
  lesson: TeacherLesson;
  flashcards: LessonFlashcard[];
  documents: LessonDocument[];
  documentsError: string | null; // Set when the documents could not be loaded.
  quiz: Quiz | null;
  isFlashcardsOnly: boolean; // Only true when the quiz lookup found no quiz.
  results: LessonStudentResult[]; // Attempted first, highest score first.
};

export async function getTeacherLessonReport(
  teacherId: string,
  classroomId: string,
  lessonId: string,
): Promise<TeacherLessonReport> {
  // 1. Together: the classroom (only found if it is this teacher's), the
  //    lesson, the roster, the flashcards and the documents.
  const [classrooms, lesson, roster, flashcards, documents] = await Promise.all([
    getTeacherClassrooms(teacherId, { classroomId }),
    getTeacherLesson(lessonId, classroomId),
    getClassroomRoster(classroomId),
    getFlashcards(lessonId),
    // A failed lookup comes back as null; the page reports it next to the list.
    getLessonDocuments(lessonId).catch(() => null),
  ]);

  const classroom = classrooms[0];

  if (!classroom) {
    throw new DataError("This classroom could not be found.");
  }

  if (!lesson) {
    throw new DataError("This lesson could not be found.");
  }

  // 2. The students' names and the lesson's quiz. A failed quiz lookup comes
  //    back as undefined, which is not the same as "no quiz" (null).
  const studentIds = roster.map((entry) => entry.student_id);

  const [profiles, quiz] = await Promise.all([
    getStudentProfiles(studentIds),
    getQuiz(lessonId).catch(() => undefined),
  ]);

  // 3. Completed attempts, reduced to each student's latest one.
  const attempts = await getClassAttempts([lessonId], studentIds);
  const latestByStudent = new Map<string, ClassAttempt>();

  for (const attempt of attempts) {
    const existing = latestByStudent.get(attempt.student_id);

    if (!existing || attempt.completed_at > existing.completed_at) {
      latestByStudent.set(attempt.student_id, attempt);
    }
  }

  const ceiling = quiz?.score_ceiling ?? null;

  const results = profiles.map((profile) => {
    const attempt = latestByStudent.get(profile.id);
    const name =
      `${profile.name ?? ""} ${profile.surname ?? ""}`.trim() || profile.username || "Student";

    if (!attempt) {
      return {
        id: profile.id,
        name,
        attempted: false,
        score: null,
        scorePercent: null,
        completedAt: null,
      };
    }

    const score = attempt.score === null ? null : Number(attempt.score);

    return {
      id: profile.id,
      name,
      attempted: true,
      score: attempt.score,
      scorePercent: scorePercent(score, ceiling),
      completedAt: attempt.completed_at,
    };
  });

  // Students who attempted come first, highest score first.
  results.sort((a, b) => {
    if (a.attempted !== b.attempted) {
      return a.attempted ? -1 : 1;
    }

    return (b.scorePercent ?? b.score ?? 0) - (a.scorePercent ?? a.score ?? 0);
  });

  return {
    classroomName: classroom.classroom_name,
    lesson,
    flashcards,
    documents: documents ? await signLessonDocuments(documents) : [],
    documentsError: documents ? null : "Lesson documents could not be loaded right now.",
    quiz: quiz ?? null,
    isFlashcardsOnly: quiz === null,
    results,
  };
}

// =============================================================================
// Helpers
// =============================================================================

// Groups items into lists by key, keeping their order.
function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}
