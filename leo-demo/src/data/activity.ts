// -----------------------------------------------------------------------------
// Study Activity
//
// Records the days a student studied (student_activity), which drive their
// streak and the activity calendar. One row per student per day: repeat
// visits on the same day are ignored.
//
// Logging is best effort: a failure is written to the console but never stops
// the lesson or quiz that triggered it. Reading throws a DataError.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError } from "./errors";
import { fetchAllRows } from "./paging";

// What the student was doing when the day was logged.
export type StudySource = "flashcard_practice" | "lesson_quiz" | "lesson_completed";

export async function logStudyDay(studentId: string, source: StudySource): Promise<void> {
  const { error } = await supabase
    .from("student_activity")
    .upsert(
      { student_id: studentId, source },
      { onConflict: "student_id,activity_date", ignoreDuplicates: true },
    );

  if (error) {
    console.error("Could not record learning activity:", error);
  }
}

export type StudyDay = {
  student_id: string;
  activity_date: string; // "YYYY-MM-DD"
};

// The days these students studied, from fromDateKey ("YYYY-MM-DD") onwards.
// Read page by page because it grows with class size.
export async function getStudyDays(studentIds: string[], fromDateKey: string): Promise<StudyDay[]> {
  if (studentIds.length === 0) {
    return [];
  }

  try {
    return await fetchAllRows<StudyDay>((from, to) =>
      supabase
        .from("student_activity")
        .select("student_id, activity_date")
        .in("student_id", studentIds)
        .gte("activity_date", fromDateKey)
        .order("student_id")
        .order("activity_date")
        .range(from, to),
    );
  } catch (error) {
    throw new DataError("Study activity could not be loaded right now.", error);
  }
}
