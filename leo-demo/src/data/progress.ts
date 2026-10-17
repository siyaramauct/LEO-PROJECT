// -----------------------------------------------------------------------------
// Student Progress
//
// The signed-in student's streak and weekly goal, worked out in the database
// by the get_student_progress function.
//
// Throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError } from "./errors";

export type StudentProgress = {
  current_streak: number;
  longest_streak: number;
  weekly_lessons_completed: number;
  weekly_goal: number;
};

// Null when the function returns no row.
export async function getStudentProgress(): Promise<StudentProgress | null> {
  const { data, error } = await supabase.rpc("get_student_progress");

  if (error) {
    throw new DataError("Your learning progress could not be loaded right now.", error);
  }

  return (data?.[0] as StudentProgress | undefined) ?? null;
}
