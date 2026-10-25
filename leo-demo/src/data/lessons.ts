// -----------------------------------------------------------------------------
// Lessons
//
// Reads lessons (the lessons table). Students only ever get released lessons:
// these functions filter by release date, and row-level security also hides
// unreleased lessons and lessons from classrooms the student has not joined.
//
// Every function throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError } from "./errors";

export type Lesson = {
  lesson_id: string;
  classroom_id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null; // Storage path in the images bucket.
  created_at: string | null;
  release_date: string;
};

const LESSON_COLUMNS =
  "lesson_id, classroom_id, title, description, lesson_image_path, created_at, release_date";

type ReleasedLessonsOptions = {
  // title: A to Z. newest: most recently released first. created: newest first by creation.
  order?: "title" | "newest" | "created";
  limit?: number;
};

const ORDER_COLUMNS = {
  title: { column: "title", ascending: true },
  newest: { column: "release_date", ascending: false },
  created: { column: "created_at", ascending: false },
} as const;

// Released lessons in the given classrooms.
export async function getReleasedLessons(
  classroomIds: string[],
  { order, limit }: ReleasedLessonsOptions = {},
): Promise<Lesson[]> {
  if (classroomIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("lessons")
    .select(LESSON_COLUMNS)
    .in("classroom_id", classroomIds)
    .lte("release_date", new Date().toISOString());

  if (order) {
    const { column, ascending } = ORDER_COLUMNS[order];
    query = query.order(column, { ascending });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new DataError("Your lessons could not be loaded right now.", error);
  }

  return data as Lesson[];
}

// Every released lesson the user may see, A to Z. Row-level security decides
// which classrooms that covers.
export async function getVisibleReleasedLessons(): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_COLUMNS)
    .lte("release_date", new Date().toISOString())
    .order("title", { ascending: true });

  if (error) {
    throw new DataError("Could not load lessons. Please try again.", error);
  }

  return data as Lesson[];
}

export type LessonWithClassroom = {
  title: string;
  classroom: { classroom_id: string; teacher_id: string; classroom_name: string } | null;
};

// A lesson's title with its classroom and teacher, for messages to the teacher.
export async function getLessonWithClassroom(
  lessonId: string,
): Promise<LessonWithClassroom | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("title, classrooms(classroom_id, teacher_id, classroom_name)")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    throw new DataError("The lesson could not be found.", error);
  }

  if (!data) {
    return null;
  }

  // Supabase returns the classroom as an object or a one-item array,
  // depending on how it reads the relationship.
  const classroom = Array.isArray(data.classrooms) ? data.classrooms[0] : data.classrooms;

  return {
    title: data.title,
    classroom: (classroom ?? null) as LessonWithClassroom["classroom"],
  };
}

export type LessonListing = {
  lesson_id: string;
  title: string;
  lesson_image_path: string | null;
  release_date: string;
};

// Every lesson in a classroom, scheduled ones included. For the teacher.
export async function getClassroomLessons(classroomId: string): Promise<LessonListing[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("lesson_id, title, lesson_image_path, release_date")
    .eq("classroom_id", classroomId);

  if (error) {
    throw new DataError("The lessons could not be loaded right now.", error);
  }

  return data as LessonListing[];
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from("lessons").delete().eq("lesson_id", lessonId);

  if (error) {
    throw new DataError(`Could not delete lesson: ${error.message}`, error);
  }
}

// How many lessons a classroom has, scheduled ones included.
export async function countClassroomLessons(classroomId: string): Promise<number> {
  const { count, error } = await supabase
    .from("lessons")
    .select("lesson_id", { count: "exact", head: true })
    .eq("classroom_id", classroomId);

  if (error) {
    throw new DataError("The lesson limit could not be checked. Please try again.", error);
  }

  return count ?? 0;
}

type NewLesson = {
  classroomId: string;
  title: string;
  description: string;
  coverImagePath: string;
  releaseDateIso: string | null; // Null releases it now (the column's default).
};

// Returns the new lesson's id.
export async function insertLesson({
  classroomId,
  title,
  description,
  coverImagePath,
  releaseDateIso,
}: NewLesson): Promise<string> {
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      classroom_id: classroomId,
      title,
      description,
      lesson_image_path: coverImagePath,
      ...(releaseDateIso ? { release_date: releaseDateIso } : {}),
    })
    .select("lesson_id")
    .single();

  if (error) {
    throw new DataError(error.message || "The lesson could not be created.", error);
  }

  return data.lesson_id as string;
}

type LessonChanges = {
  title: string;
  description: string;
  releaseDateIso: string;
};

export async function updateLesson(lessonId: string, changes: LessonChanges): Promise<void> {
  const { error } = await supabase
    .from("lessons")
    .update({
      title: changes.title,
      description: changes.description,
      release_date: changes.releaseDateIso,
    })
    .eq("lesson_id", lessonId);

  if (error) {
    throw new DataError("The lesson could not be updated. Please try again.", error);
  }
}

export type TeacherLesson = {
  lesson_id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null;
  release_date: string; // When students can open it (ISO timestamp); never empty.
};

// One lesson, checked to belong to the classroom. Null if it does not.
export async function getTeacherLesson(
  lessonId: string,
  classroomId: string,
): Promise<TeacherLesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("lesson_id, title, description, lesson_image_path, release_date")
    .eq("lesson_id", lessonId)
    .eq("classroom_id", classroomId)
    .maybeSingle();

  if (error) {
    throw new DataError("This lesson could not be found.", error);
  }

  return data as TeacherLesson | null;
}

// When a lesson opens to students (ISO timestamp). Null if the lesson can't be
// seen, e.g. it doesn't exist or belongs to another teacher's classroom.
export async function getLessonReleaseDate(lessonId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("release_date")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    throw new DataError("This lesson could not be found.", error);
  }

  return (data?.release_date as string | undefined) ?? null;
}

// The newest lessons across these classrooms, by creation date.
export async function getRecentLessons(classroomIds: string[], limit: number): Promise<Lesson[]> {
  if (classroomIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_COLUMNS)
    .in("classroom_id", classroomIds)
    // nullsFirst: false keeps undated lessons from jumping to the top.
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new DataError("Your recent lessons could not be loaded right now.", error);
  }

  return data as Lesson[];
}

export type ScheduledLessonRow = {
  lesson_id: string;
  classroom_id: string;
  classroom_name: string;
  title: string;
  description: string | null;
  release_date: string;
};

// The teacher's lessons that are not released yet, soonest first.
export async function getScheduledLessons(teacherId: string): Promise<ScheduledLessonRow[]> {
  // The !inner join keeps only lessons in this teacher's classrooms.
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "lesson_id, classroom_id, title, description, release_date, classrooms!inner(classroom_name, teacher_id)",
    )
    .eq("classrooms.teacher_id", teacherId)
    .gt("release_date", new Date().toISOString())
    .order("release_date", { ascending: true });

  if (error) {
    throw new DataError("Scheduled lessons could not be loaded right now.", error);
  }

  return data.map(({ classrooms, ...lesson }) => {
    // Supabase returns the classroom as an object or a one-item array.
    const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms;

    return { ...lesson, classroom_name: classroom?.classroom_name ?? "Unknown classroom" };
  }) as ScheduledLessonRow[];
}
