// -----------------------------------------------------------------------------
// Classroom Validation
//
// The rules a classroom's name and description must meet, checked on the
// trimmed text (spaces at either end don't count):
//   - the name can't be empty and stays under 80 characters
//   - the description needs at least 10 characters, so learners have some
//     context, and stays under 240 so it fits on the classroom card
//
// Each check returns the problem as a message the teacher can read, or null
// when the text is fine. Pure functions: no React, no Supabase, so the create
// form, the edit dialog and teacherClassroomService share them.
// -----------------------------------------------------------------------------

export const MAX_CLASSROOM_NAME_LENGTH = 80;
export const MIN_CLASSROOM_DESCRIPTION_LENGTH = 10;
export const MAX_CLASSROOM_DESCRIPTION_LENGTH = 240;

export function classroomNameError(name: string): string | null {
  const text = name.trim();

  if (text === "") {
    return "Enter a classroom name.";
  }

  if (text.length > MAX_CLASSROOM_NAME_LENGTH) {
    return `Keep the classroom name under ${MAX_CLASSROOM_NAME_LENGTH} characters.`;
  }

  return null;
}

export function classroomDescriptionError(description: string): string | null {
  const text = description.trim();

  if (text === "") {
    return "Add a short classroom description.";
  }

  if (text.length < MIN_CLASSROOM_DESCRIPTION_LENGTH) {
    return `Use at least ${MIN_CLASSROOM_DESCRIPTION_LENGTH} characters so learners have enough context.`;
  }

  if (text.length > MAX_CLASSROOM_DESCRIPTION_LENGTH) {
    return `Keep the description under ${MAX_CLASSROOM_DESCRIPTION_LENGTH} characters.`;
  }

  return null;
}

// The first problem with either field, name first.
export function classroomDetailsError(name: string, description: string): string | null {
  return classroomNameError(name) ?? classroomDescriptionError(description);
}
