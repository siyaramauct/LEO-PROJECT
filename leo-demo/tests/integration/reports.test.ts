// -----------------------------------------------------------------------------
// Report Tests
//
// The progress reports from src/services/reportService.ts, run as the signed-in
// teacher or student so RLS decides what each one can see:
//   getClassReports         the teacher's whole-class report
//   getLearningReport       a student's own report
//   getRosterStats          the figures on the classroom's Students tab
//   getTeacherLessonReport  one lesson's report
//
// Every test reads the same class, built once with known scores, times and
// study days, so each figure below can be worked out by hand:
//
//                 Meetings (quiz /3)        Emails (quiz /3)   Small Talk     Study days
//   Ann Smith     1/3 in 30 min, then 3/3   2/3 in 20 min      not done       today, -1, -2
//                 in 10 min (a retake)
//   Ben Jones     1/3 in 5 min              not done           not done       none
//   Cara Mokoena  not done                  not done           not done       3 days ago
//
// Small Talk is flashcards only. A fourth lesson is scheduled for next week, so
// every report must leave it out.
// -----------------------------------------------------------------------------

import { beforeAll, describe, expect, test } from "vitest";
import {
  getClassReports,
  getLearningReport,
  getRosterStats,
  getTeacherLessonReport,
  type ClassReport,
} from "../../src/services/reportService";
import {
  dateKeyDaysAgo,
  seedAttempt,
  seedClassroom,
  seedEnrolment,
  seedFlashcards,
  seedLesson,
  seedQuiz,
  seedStudyDays,
  seedUser,
  signInAs,
  type TestUser,
} from "./helpers";

// -- The class ------------------------------------------------------------------------

let teacher: TestUser;
let otherTeacher: TestUser;
let ann: TestUser;
let ben: TestUser;
let cara: TestUser;
let classroomId: string;
let meetings: string; // Lesson ids.
let emails: string;
let smallTalk: string;
let scheduled: string;

beforeAll(async () => {
  // 1. The people.
  teacher = await seedUser("teacher");
  otherTeacher = await seedUser("teacher");
  ann = await seedUser("student", { metadata: { name: "Ann", surname: "Smith" } });
  ben = await seedUser("student", { metadata: { name: "Ben", surname: "Jones" } });
  cara = await seedUser("student", { metadata: { name: "Cara", surname: "Mokoena" } });

  // 2. The classroom and its students.
  classroomId = await seedClassroom(teacher, "Business English");

  for (const student of [ann, ben, cara]) {
    await seedEnrolment(student, classroomId);
  }

  // 3. The lessons, released 3, 2 and 1 days ago. Two have a three-question quiz.
  meetings = await seedLesson(classroomId, { title: "Meetings", releasedDaysAgo: 3 });
  emails = await seedLesson(classroomId, { title: "Emails", releasedDaysAgo: 2 });
  smallTalk = await seedLesson(classroomId, { title: "Small Talk", releasedDaysAgo: 1 });
  scheduled = await seedLesson(classroomId, { title: "Next Week", scheduled: true });

  for (const lessonId of [meetings, emails, smallTalk]) {
    await seedFlashcards(lessonId);
  }

  await seedQuiz(meetings);
  await seedQuiz(emails);
  await seedQuiz(scheduled);

  // 4. The attempts, oldest first. All within the last hour, so this week.
  await seedAttempt(ann, meetings, { score: 1, minutes: 30, endedMinutesAgo: 4 });
  await seedAttempt(ann, meetings, { score: 3, minutes: 10, endedMinutesAgo: 3 });
  await seedAttempt(ann, emails, { score: 2, minutes: 20, endedMinutesAgo: 2 });
  await seedAttempt(ben, meetings, { score: 1, minutes: 5, endedMinutesAgo: 1 });

  // 5. The study days.
  await seedStudyDays(ann, [0, 1, 2]);
  await seedStudyDays(cara, [3]);
});

// -- Class report (teacher) -----------------------------------------------------------

describe("Class report", () => {
  let report: ClassReport;

  beforeAll(async () => {
    await signInAs(teacher);
    [report] = await getClassReports(teacher.id, classroomId);
  });

  test("Test A - The report lists the released lessons in release order, leaving out scheduled ones", () => {
    expect(report.name).toBe("Business English");
    expect(report.lessons.map((lesson) => lesson.title)).toEqual([
      "Meetings",
      "Emails",
      "Small Talk",
    ]);
  });

  test("Test B - A lesson's figures use each student's best score, first tries and time taken", () => {
    const lesson = report.lessons.find((row) => row.lessonId === meetings);

    expect(lesson).toMatchObject({
      hasQuiz: true,
      completedCount: 2, // Ann and Ben.
      averagePercent: 67, // Best scores 100% and 33%.
      firstAttemptAverage: 33, // Both first tries were 1/3.
      bands: { mastered: 1, developing: 0, support: 1, notAttempted: 1 },
      retakes: 1, // Ann's second attempt.
      medianMinutes: 10, // Middle of 5, 10 and 30 minutes.
    });
  });

  test("Test C - Lessons nobody has finished, and flashcards-only lessons, are reported too", () => {
    const emailsReport = report.lessons.find((row) => row.lessonId === emails);
    const smallTalkReport = report.lessons.find((row) => row.lessonId === smallTalk);

    expect(emailsReport).toMatchObject({
      completedCount: 1,
      averagePercent: 67,
      bands: { mastered: 0, developing: 1, support: 0, notAttempted: 2 },
      retakes: 0,
      medianMinutes: 20,
    });
    expect(smallTalkReport).toMatchObject({
      hasQuiz: false,
      completedCount: 0,
      averagePercent: null,
      medianMinutes: null,
    });
  });

  test("Test D - A student's figures: name, lessons done, best-score average and activity", () => {
    const annReport = report.students.find((student) => student.id === ann.id);

    expect(annReport).toMatchObject({
      name: "Ann Smith",
      initials: "AS",
      completedCount: 2,
      averagePercent: 84, // Best scores 100% and 67%.
      lastActiveKey: dateKeyDaysAgo(0),
      daysSinceActive: 0,
      activeDaysLast7: 3,
      flags: [],
    });
    expect(annReport?.results.get(meetings)).toEqual({
      attempts: 2,
      firstPercent: 33,
      bestPercent: 100, // The retake raised it; a retake never lowers it.
    });
  });

  test("Test E - Students who need help are flagged", () => {
    const benReport = report.students.find((student) => student.id === ben.id);
    const caraReport = report.students.find((student) => student.id === cara.id);

    // Ben: 33% average, no study days, 1 of 3 lessons done.
    expect(benReport?.flags).toEqual(["low-scores", "inactive", "behind"]);

    // Cara: studied 3 days ago (not inactive yet), but no lessons done.
    expect(caraReport?.daysSinceActive).toBe(3);
    expect(caraReport?.flags).toEqual(["behind"]);
  });

  test("Test F - The class totals add up", () => {
    expect(report).toMatchObject({
      averagePercent: 67, // Best scores 100%, 67% and 33%.
      completionRate: 33, // 3 of 9 possible completions.
      masteryRate: 33, // 1 of 3 best scores at 80% or more.
      activeThisWeek: 2, // Ann and Cara.
      needsAttention: 2, // Ben and Cara.
    });
    expect(report.activeStudentsByDay.get(dateKeyDaysAgo(0))).toBe(1);
    expect(report.activeStudentsByDay.get(dateKeyDaysAgo(3))).toBe(1);
  });

  test("Test G - Another teacher gets no report for this classroom", async () => {
    await signInAs(otherTeacher);

    expect(await getClassReports(teacher.id, classroomId)).toEqual([]);
  });

  test("Test H - A student can't see classmates' results through the class report", async () => {
    await signInAs(ben);

    const [studentView] = await getClassReports(teacher.id, classroomId);

    // RLS hides the other enrolments and attempts, so only Ben appears.
    expect(studentView.students.map((student) => student.id)).toEqual([ben.id]);
  });
});

// -- Learning report (student) --------------------------------------------------------

describe("Learning report", () => {
  test("Test A - A student sees each lesson's best score and their classroom average", async () => {
    await signInAs(ann);

    const report = await getLearningReport(ann.id, dateKeyDaysAgo(84));
    const [classroom] = report.classrooms;

    expect(classroom).toMatchObject({
      name: "Business English",
      completedCount: 2,
      averagePercent: 84,
    });
    expect(classroom.lessons.map((lesson) => lesson.title)).toEqual(
      expect.arrayContaining(["Meetings", "Emails", "Small Talk"]),
    );
    expect(classroom.lessons.map((lesson) => lesson.lessonId)).not.toContain(scheduled);
    expect(classroom.lessons.find((lesson) => lesson.lessonId === meetings)).toMatchObject({
      completed: true,
      attempts: 2,
      bestScore: 3,
      scoreCeiling: 3,
      bestPercent: 100,
    });
    expect(classroom.lessons.find((lesson) => lesson.lessonId === smallTalk)).toMatchObject({
      hasQuiz: false,
      completed: false,
      bestPercent: null,
    });
  });

  test("Test B - The study calendar and streak come from the student's study days", async () => {
    await signInAs(ann);

    const report = await getLearningReport(ann.id, dateKeyDaysAgo(84));

    expect([...report.activeDays].sort()).toEqual([
      dateKeyDaysAgo(2),
      dateKeyDaysAgo(1),
      dateKeyDaysAgo(0),
    ]);
    expect(report.progress).toMatchObject({
      current_streak: 3, // Today, yesterday and the day before.
      weekly_lessons_completed: 2, // Meetings and Emails.
      weekly_goal: 7,
    });
  });

  test("Test C - A student in no classroom gets an empty report", async () => {
    const loner = await seedUser("student");

    await signInAs(loner);
    const report = await getLearningReport(loner.id, dateKeyDaysAgo(84));

    expect(report.classrooms).toEqual([]);
    expect(report.activeDays.size).toBe(0);
    expect(report.progress?.current_streak).toBe(0);
  });
});

// -- Roster statistics ----------------------------------------------------------------

describe("Roster statistics", () => {
  test("Test A - Each student's quiz lessons done, best-score average and last active day", async () => {
    await signInAs(teacher);

    const result = await getRosterStats(
      [ann.id, ben.id, cara.id],
      [meetings, emails, smallTalk],
      dateKeyDaysAgo(84),
    );

    expect(result.errorMessage).toBeNull();
    expect(result.quizLessonCount).toBe(2); // Small Talk has no quiz.
    expect(result.stats[ann.id]).toEqual({
      completedLessons: 2,
      averagePercent: 84,
      lastActive: dateKeyDaysAgo(0),
    });
    expect(result.stats[ben.id]).toEqual({
      completedLessons: 1,
      averagePercent: 33,
      lastActive: null,
    });
    expect(result.stats[cara.id]).toEqual({
      completedLessons: 0,
      averagePercent: null,
      lastActive: dateKeyDaysAgo(3),
    });
  });
});

// -- Lesson report (teacher) ----------------------------------------------------------

describe("Lesson report", () => {
  test("Test A - A quiz lesson lists every student, attempted first and highest score first", async () => {
    await signInAs(teacher);

    const report = await getTeacherLessonReport(teacher.id, classroomId, meetings);

    expect(report.classroomName).toBe("Business English");
    expect(report.lesson.title).toBe("Meetings");
    expect(report.flashcards).toHaveLength(3);
    expect(report.quiz?.score_ceiling).toBe(3);
    expect(report.isFlashcardsOnly).toBe(false);
    expect(
      report.results.map(({ name, attempted, score, scorePercent }) => ({
        name,
        attempted,
        score,
        scorePercent,
      })),
    ).toEqual([
      { name: "Ann Smith", attempted: true, score: 3, scorePercent: 100 }, // Latest try.
      { name: "Ben Jones", attempted: true, score: 1, scorePercent: 33 },
      { name: "Cara Mokoena", attempted: false, score: null, scorePercent: null },
    ]);
  });

  test("Test B - A flashcards-only lesson is reported as having no quiz", async () => {
    await signInAs(teacher);

    const report = await getTeacherLessonReport(teacher.id, classroomId, smallTalk);

    expect(report.quiz).toBeNull();
    expect(report.isFlashcardsOnly).toBe(true);
  });

  test("Test C - Another teacher can't open this lesson's report", async () => {
    await signInAs(otherTeacher);

    await expect(getTeacherLessonReport(teacher.id, classroomId, meetings)).rejects.toThrow(
      "This classroom could not be found.",
    );
  });

  test("Test D - A lesson from another classroom isn't shown under this one", async () => {
    const otherClassroom = await seedClassroom(teacher, "Marketing");
    const otherLesson = await seedLesson(otherClassroom, { title: "Branding" });

    await signInAs(teacher);
    await expect(getTeacherLessonReport(teacher.id, classroomId, otherLesson)).rejects.toThrow(
      "This lesson could not be found.",
    );
  });
});
