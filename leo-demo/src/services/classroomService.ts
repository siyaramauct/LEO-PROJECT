// -----------------------------------------------------------------------------
// Classroom Service
//
// What a student does with classrooms, step by step: list the ones they have
// joined, join one with a code, and leave one. Pages call these instead of
// querying Supabase, so each workflow is written once (see src/data for the
// queries underneath).
//
// Functions throw a DataError whose message can be shown to the student.
// -----------------------------------------------------------------------------

import { getClassroomTeacherId, getClassroomsByIds } from "../data/classrooms";
import type { ClassroomSummary } from "../data/classrooms";
import {
  getEnrolledClassroomIds,
  joinClassroomWithCode,
  removeEnrolment,
} from "../data/enrolments";
import { notifyUser } from "../data/notifications";

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
