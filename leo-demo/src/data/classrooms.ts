// -----------------------------------------------------------------------------
// Classrooms
//
// Reads classroom details (the classrooms table). Row-level security limits
// results to classrooms the signed-in user may see.
//
// Every function throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError } from "./errors";

// The details pages show for a classroom in lists and banners.
export type ClassroomSummary = {
  classroom_id: string;
  classroom_name: string;
  description: string | null;
  cover_image_path: string | null; // Storage path in the images bucket.
  created_date: string | null;
};

const SUMMARY_COLUMNS = "classroom_id, classroom_name, description, cover_image_path, created_date";

// In no particular order; the caller sorts.
export async function getClassroomsByIds(classroomIds: string[]): Promise<ClassroomSummary[]> {
  if (classroomIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("classrooms")
    .select(SUMMARY_COLUMNS)
    .in("classroom_id", classroomIds);

  if (error) {
    throw new DataError("Your classroom details could not be loaded right now.", error);
  }

  return data as ClassroomSummary[];
}

// Null when the classroom does not exist or is not visible to this user.
export async function getClassroom(classroomId: string): Promise<ClassroomSummary | null> {
  const { data, error } = await supabase
    .from("classrooms")
    .select(SUMMARY_COLUMNS)
    .eq("classroom_id", classroomId)
    .maybeSingle();

  if (error) {
    throw new DataError("Classroom information could not be loaded right now.", error);
  }

  return data as ClassroomSummary | null;
}

export async function getClassroomTeacherId(classroomId: string): Promise<string> {
  const { data, error } = await supabase
    .from("classrooms")
    .select("teacher_id")
    .eq("classroom_id", classroomId)
    .single();

  if (error) {
    throw new DataError("Could not verify classroom teacher. Please try again.", error);
  }

  return data.teacher_id as string;
}

type TeacherClassroomsOptions = {
  classroomId?: string; // Just this one classroom, if the teacher owns it.
};

// The teacher's own classrooms, A to Z.
export async function getTeacherClassrooms(
  teacherId: string,
  { classroomId }: TeacherClassroomsOptions = {},
): Promise<ClassroomSummary[]> {
  let query = supabase
    .from("classrooms")
    .select(SUMMARY_COLUMNS)
    .eq("teacher_id", teacherId)
    .order("classroom_name");

  if (classroomId) {
    query = query.eq("classroom_id", classroomId);
  }

  const { data, error } = await query;

  if (error) {
    throw new DataError("Your classrooms could not be loaded right now.", error);
  }

  return data as ClassroomSummary[];
}

export type ClassroomWithCounts = ClassroomSummary & {
  lessonCount: number; // Every lesson, scheduled ones included.
  studentCount: number;
};

type CountedClassroomRow = ClassroomSummary & {
  // Counts embedded by the query, returned as [{ count: 3 }].
  lessons: { count: number }[] | null;
  classroom_students: { count: number }[] | null;
};

// The teacher's classrooms with their lesson and student counts, in one query.
export async function getTeacherClassroomsWithCounts(
  teacherId: string,
  { order = "name" }: { order?: "name" | "newest" } = {},
): Promise<ClassroomWithCounts[]> {
  const { data, error } = await supabase
    .from("classrooms")
    .select(`${SUMMARY_COLUMNS}, lessons(count), classroom_students(count)`)
    .eq("teacher_id", teacherId)
    .order(order === "name" ? "classroom_name" : "created_date", { ascending: order === "name" });

  if (error) {
    throw new DataError("We could not load your classrooms. Please try again.", error);
  }

  return (data as CountedClassroomRow[]).map(({ lessons, classroom_students, ...classroom }) => ({
    ...classroom,
    lessonCount: lessons?.[0]?.count ?? 0,
    studentCount: classroom_students?.[0]?.count ?? 0,
  }));
}

type NewClassroom = {
  teacherId: string;
  name: string;
  description: string;
  proficiencyLevel: string;
  coverImagePath: string;
  joinCode: string; // The legacy unique code; students join with the invite code.
};

// Created without reading the row back: the classroom only becomes readable
// once it exists, so asking for it in the same request is refused.
export async function insertClassroom({
  teacherId,
  name,
  description,
  proficiencyLevel,
  coverImagePath,
  joinCode,
}: NewClassroom): Promise<void> {
  const { error } = await supabase.from("classrooms").insert({
    teacher_id: teacherId,
    classroom_name: name,
    description,
    proficiency_level: proficiencyLevel,
    language: "English", // Every classroom is English; the column is kept for the schema.
    cover_image_path: coverImagePath,
    invite_only: true,
    join_code: joinCode,
  });

  if (error) {
    throw new DataError(error.message || "The classroom could not be created.", error);
  }
}

export async function deleteClassroom(teacherId: string, classroomId: string): Promise<void> {
  const { error } = await supabase
    .from("classrooms")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("teacher_id", teacherId);

  if (error) {
    throw new DataError("The classroom could not be deleted. Please try again.", error);
  }
}

// The private code students join with. Only the classroom's teacher can read it.
export async function getInviteCode(classroomId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_classroom_invite_code", {
    p_classroom_id: classroomId,
  });

  if (error) {
    throw new DataError(`Could not load invitation code: ${error.message}`, error);
  }

  return (data as string | null) ?? null;
}

// Replaces the invite code; the old one stops working straight away.
export async function rotateInviteCode(classroomId: string): Promise<string> {
  const { data, error } = await supabase.rpc("rotate_classroom_invite_code", {
    p_classroom_id: classroomId,
  });

  if (error) {
    throw new DataError(error.message || "Could not create a new code.", error);
  }

  if (!data) {
    throw new DataError("Could not create a new code.");
  }

  return data as string;
}
