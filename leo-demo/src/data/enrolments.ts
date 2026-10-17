// -----------------------------------------------------------------------------
// Enrolments
//
// Reads and changes which classrooms a student belongs to (classroom_students).
// Joining goes through the join_classroom_with_code database function, which
// checks the code and the class size; students cannot insert enrolments directly.
//
// Every function throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError } from "./errors";

type EnrolledIdsOptions = {
  newestFirst?: boolean; // Most recently joined first; otherwise no set order.
  limit?: number;
};

export async function getEnrolledClassroomIds(
  studentId: string,
  { newestFirst = false, limit }: EnrolledIdsOptions = {},
): Promise<string[]> {
  let query = supabase
    .from("classroom_students")
    .select("classroom_id")
    .eq("student_id", studentId);

  if (newestFirst) {
    query = query.order("enrolled_at", { ascending: false, nullsFirst: false });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new DataError("Your classrooms could not be loaded right now.", error);
  }

  return data.map((row) => row.classroom_id as string);
}

export async function isEnrolled(studentId: string, classroomId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("classroom_students")
    .select("classroom_id")
    .eq("student_id", studentId)
    .eq("classroom_id", classroomId)
    .maybeSingle();

  if (error) {
    throw new DataError("Your classroom membership could not be checked.", error);
  }

  return data !== null;
}

export async function removeEnrolment(studentId: string, classroomId: string): Promise<void> {
  const { error } = await supabase
    .from("classroom_students")
    .delete()
    .eq("student_id", studentId)
    .eq("classroom_id", classroomId);

  if (error) {
    throw new DataError("You could not be removed from this classroom. Please try again.", error);
  }
}

// Returns the id of the classroom joined.
export async function joinClassroomWithCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_classroom_with_code", {
    p_code: code,
  });

  // The function's own messages (wrong code, class full) are written for students.
  if (error) {
    throw new DataError(error.message, error);
  }

  if (!data) {
    throw new DataError("Could not join this classroom.");
  }

  return data as string;
}

export type Enrolment = {
  classroom_id: string;
  student_id: string;
};

// Who is enrolled in these classrooms. Only the classrooms' teacher can read
// other students' enrolments.
export async function getClassroomEnrolments(classroomIds: string[]): Promise<Enrolment[]> {
  if (classroomIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("classroom_students")
    .select("classroom_id, student_id")
    .in("classroom_id", classroomIds);

  if (error) {
    throw new DataError("Class enrolments could not be loaded right now.", error);
  }

  return data as Enrolment[];
}

export type RosterEntry = {
  student_id: string;
  enrolled_at: string;
};

// Who is enrolled in one classroom, and when they joined. Teachers only.
export async function getClassroomRoster(classroomId: string): Promise<RosterEntry[]> {
  const { data, error } = await supabase
    .from("classroom_students")
    .select("student_id, enrolled_at")
    .eq("classroom_id", classroomId);

  if (error) {
    throw new DataError(`Could not load enrolled students: ${error.message}`, error);
  }

  return data as RosterEntry[];
}
