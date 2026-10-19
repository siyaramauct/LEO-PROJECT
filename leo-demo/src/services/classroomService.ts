// -----------------------------------------------------------------------------
// Classroom Service
//
// What a student does with classrooms, step by step: list the ones they have
// joined, open one, join one with a code, and leave one. Pages call these instead of
// querying Supabase, so each workflow is written once (see src/data for the
// queries underneath).
//
// Functions throw a DataError whose message can be shown to the student.
// -----------------------------------------------------------------------------

import { getClassroom, getClassroomTeacherId, getClassroomsByIds } from "../data/classrooms";
import type { ClassroomSummary } from "../data/classrooms";
import {
  getEnrolledClassroomIds,
  isEnrolled,
  joinClassroomWithCode,
  removeEnrolment,
} from "../data/enrolments";
import { DataError } from "../data/errors";
import { getReleasedLessons, type Lesson } from "../data/lessons";
import { getClassroomMaterials, type Material } from "../data/materials";
import { notifyUser } from "../data/notifications";
import { getLessonProgress } from "./lessonService";

type EnrolledClassroomsOptions = {
  order?: "name" | "newest"; // Alphabetical, or most recently joined first.
  limit?: number; // Only with "newest": the most recent few.
};

// The student's classrooms, in the requested order.
export async function getEnrolledClassrooms(
  studentId: string,
  { order = "name", limit }: EnrolledClassroomsOptions = {},
): Promise<ClassroomSummary[]> {
  const newestFirst = order === "newest";

  const classroomIds = await getEnrolledClassroomIds(studentId, { newestFirst, limit });
  const classrooms = await getClassroomsByIds(classroomIds);

  if (newestFirst) {
    // The enrolments are already newest first, so follow their order.
    return classroomIds
      .map((id) => classrooms.find((classroom) => classroom.classroom_id === id))
      .filter((classroom) => classroom !== undefined);
  }

  return classrooms.sort((a, b) => a.classroom_name.localeCompare(b.classroom_name));
}

export type StudentClassroomLesson = Lesson & {
  hasQuiz: boolean; // False for flashcards-only lessons, which have no score.
  completed: boolean;
  score: number | null; // From the most recent attempt.
  totalQuestions: number | null; // The quiz's score ceiling.
  percentage: number | null;
};

type StudentClassroom = {
  classroom: ClassroomSummary;
  lessons: StudentClassroomLesson[]; // Released lessons, oldest first.
  materials: Material[];
};

// One classroom from the student's side. Checks the student is enrolled first,
// so a shared or guessed link to someone else's classroom shows nothing.
export async function getStudentClassroom(
  studentId: string,
  classroomId: string,
): Promise<StudentClassroom> {
  // 1. Confirm the student is enrolled. A failed check counts as not enrolled.
  const enrolled = await isEnrolled(studentId, classroomId).catch((enrolmentError) => {
    console.error("Failed to check classroom enrolment:", enrolmentError);
    return false;
  });

  if (!enrolled) {
    throw new DataError("This classroom is unavailable.");
  }

  // 2. Together: the classroom, its released lessons and its shared materials.
  const [classroom, lessons, materials] = await Promise.all([
    getClassroom(classroomId),
    getReleasedLessons([classroomId], { order: "created" }),
    // Materials are secondary: a failure leaves the list empty.
    getClassroomMaterials(classroomId).catch((materialsError) => {
      console.error("Failed to load classroom materials:", materialsError);
      return [];
    }),
  ]);

  if (!classroom) {
    throw new DataError("Classroom information could not be loaded right now.");
  }

  // 3. The student's progress in each lesson: done or not, and the latest score.
  const progress = await getLessonProgress(
    studentId,
    lessons.map((lesson) => lesson.lesson_id),
  );

  return {
    classroom,
    materials,
    lessons: lessons.map((lesson) => {
      const lessonProgress = progress.get(lesson.lesson_id);

      return {
        ...lesson,
        hasQuiz: lessonProgress?.hasQuiz ?? true,
        completed: lessonProgress?.completed ?? false,
        score: lessonProgress?.latestScore ?? null,
        totalQuestions: lessonProgress?.scoreCeiling ?? null,
        percentage: lessonProgress?.latestPercent ?? null,
      };
    }),
  };
}

// Returns the id of the classroom joined, ready to open it.
export function joinClassroom(code: string): Promise<string> {
  return joinClassroomWithCode(code.trim());
}

type NamedProfile = { name?: string | null; surname?: string | null } | null | undefined;

// How a student is named in messages to their teacher.
export function studentDisplayName(profile: NamedProfile, email: string | null | undefined) {
  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(" ");
  return fullName || email || "A student";
}

type LeaveClassroomInput = {
  studentId: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
};

export async function leaveClassroom({
  studentId,
  studentName,
  classroomId,
  classroomName,
}: LeaveClassroomInput): Promise<void> {
  // 1. Find the teacher first: once the student has left, they can no longer
  //    read the classroom.
  const teacherId = await getClassroomTeacherId(classroomId);

  // 2. Remove the enrolment.
  await removeEnrolment(studentId, classroomId);

  // 3. Tell the teacher (best effort; a failure never undoes leaving).
  await notifyUser({
    recipient_id: teacherId,
    type: "student_left_classroom",
    title: "Student left classroom",
    body: `${studentName} left "${classroomName}".`,
    link_url: `/teacher-classroom/${classroomId}`,
  });
}
