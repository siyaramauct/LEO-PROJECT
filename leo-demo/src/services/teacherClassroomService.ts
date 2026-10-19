// -----------------------------------------------------------------------------
// Teacher Classroom Service
//
// What a teacher does to run a classroom, step by step: create it, load its
// lessons and students, share files and links with the class, remove a
// material, and remove a student. Pages call these instead of querying
// Supabase (see src/data).
//
// Functions throw a DataError whose message can be shown to the teacher.
// -----------------------------------------------------------------------------

import { insertClassroom } from "../data/classrooms";
import { getClassroomRoster, removeEnrolment, type RosterEntry } from "../data/enrolments";
import { DataError } from "../data/errors";
import { getFlashcardCounts } from "../data/flashcards";
import { getClassroomLessons, type LessonListing } from "../data/lessons";
import {
  addMaterial,
  deleteMaterial,
  removeDocumentFiles,
  uploadDocument,
  type Material,
} from "../data/materials";
import { notifyClassroomStudents, notifyUser } from "../data/notifications";
import { getStudentProfiles, type StudentProfile } from "../data/profiles";
import { getQuizCeilings } from "../data/quizzes";

// -- Classrooms ---------------------------------------------------------------------

type NewClassroomInput = {
  teacherId: string;
  name: string;
  description: string;
  proficiencyLevel: string;
  coverImagePath: string;
};

export function createClassroom({
  teacherId,
  name,
  description,
  proficiencyLevel,
  coverImagePath,
}: NewClassroomInput): Promise<void> {
  return insertClassroom({
    teacherId,
    name: name.trim(),
    description: description.trim(),
    proficiencyLevel,
    coverImagePath,
    joinCode: generateJoinCode(name),
  });
}

// Fills the legacy classrooms.join_code column, which must still be unique, as
// four letters from the name and four random characters, e.g. "BUSI-7K2Q".
// Students join with the private invite code instead (see ClassroomInvitePanel).
function generateJoinCode(classroomName: string) {
  const namePrefix = classroomName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "CLASS");

  const randomSuffix = crypto
    .getRandomValues(new Uint32Array(1))[0]
    .toString(36)
    .toUpperCase()
    .slice(-4)
    .padStart(4, "0");

  return `${namePrefix}-${randomSuffix}`;
}

// -- Reading a classroom ------------------------------------------------------------

export type ClassroomLessonSummary = LessonListing & {
  hasQuiz: boolean; // False for flashcards-only lessons.
  wordCount: number; // One flashcard is one word.
  isScheduled: boolean; // Released on a later day.
};

// Every lesson in the classroom, scheduled ones included, with whether it has
// a quiz and how many words it teaches.
export async function getClassroomLessonSummaries(
  classroomId: string,
): Promise<ClassroomLessonSummary[]> {
  // 1. The lessons.
  const lessons = await getClassroomLessons(classroomId);
  const lessonIds = lessons.map((lesson) => lesson.lesson_id);

  // 2. Together: which have a quiz, and how many flashcards each has. Both are
  //    secondary: a failure is logged and the lessons still load.
  const [ceilings, wordCounts] = await Promise.all([
    getQuizCeilings(lessonIds).catch((quizError) => {
      console.error("Failed to load lesson quizzes:", quizError);
      return null;
    }),
    getFlashcardCounts(lessonIds).catch((countError) => {
      console.error("Failed to load lesson word counts:", countError);
      return new Map<string, number>();
    }),
  ]);

  // 3. Lessons without a quiz are flashcards-only. If that lookup failed,
  //    assume a quiz rather than mislabel them.
  const now = new Date();

  return lessons.map((lesson) => ({
    ...lesson,
    hasQuiz: ceilings === null || ceilings.has(lesson.lesson_id),
    wordCount: wordCounts.get(lesson.lesson_id) ?? 0,
    isScheduled: new Date(lesson.release_date) > now,
  }));
}

type ClassroomStudents = {
  roster: RosterEntry[]; // Who is enrolled, and when they joined.
  profiles: StudentProfile[];
};

export async function getClassroomStudents(classroomId: string): Promise<ClassroomStudents> {
  // 1. Who is enrolled.
  const roster = await getClassroomRoster(classroomId);

  // 2. Their profiles, for names and usernames.
  try {
    const profiles = await getStudentProfiles(roster.map((entry) => entry.student_id));

    return { roster, profiles };
  } catch (profilesError) {
    throw new DataError(
      "Students are enrolled, but their profiles could not be loaded. Please try again.",
      profilesError,
    );
  }
}

// -- Materials ---------------------------------------------------------------------

type ShareDocumentInput = {
  classroomId: string;
  classroomName: string;
  file: File;
  contentType: string; // From validateMaterialFile.
};

export async function shareDocument({
  classroomId,
  classroomName,
  file,
  contentType,
}: ShareDocumentInput): Promise<Material> {
  // 1. Store the file. Storage "folders" are just path prefixes; the random id
  //    stops a second upload with the same name overwriting a file in use.
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `classroom_documents/${classroomId}/${crypto.randomUUID()}-${safeFileName}`;

  await uploadDocument(storagePath, file, contentType);

  // 2. Record it as a classroom material.
  const material = await addMaterial({ classroomId, type: "document", url: storagePath }).catch(
    (insertError) => {
      throw new DataError(
        "The document was uploaded but could not be shared. Please try again.",
        insertError,
      );
    },
  );

  // 3. Tell the students (best effort).
  await notifyClassroomStudents(classroomId, {
    type: "new_material",
    title: "New classroom material",
    body: `Your teacher shared "${file.name}" in "${classroomName}".`,
    link_url: `/student/classrooms/${classroomId}`,
  });

  return material;
}

// Only http and https addresses are accepted; "example.com" is treated as
// "https://example.com".
export function normaliseLink(url: string) {
  const externalUrl = url.includes("://") ? url : `https://${url}`;

  try {
    const { protocol } = new URL(externalUrl);

    if (protocol === "http:" || protocol === "https:") {
      return externalUrl;
    }
  } catch {
    // Not a valid address; reported below.
  }

  throw new DataError("Enter a web address that starts with http:// or https://.");
}

type ShareLinkInput = {
  classroomId: string;
  classroomName: string;
  url: string;
};

export async function shareLink({
  classroomId,
  classroomName,
  url,
}: ShareLinkInput): Promise<Material> {
  // 1. Check the address and record it.
  const material = await addMaterial({ classroomId, type: "link", url: normaliseLink(url) });

  // 2. Tell the students (best effort).
  await notifyClassroomStudents(classroomId, {
    type: "new_material",
    title: "New classroom material",
    body: `Your teacher shared a link in "${classroomName}".`,
    link_url: `/student/classrooms/${classroomId}`,
  });

  return material;
}

type MaterialToRemove = {
  id: string;
  resourceType: "document" | "link";
  resourcePath: string;
};

// Removes the stored file first (if any), then the material row.
export async function removeMaterial({
  id,
  resourceType,
  resourcePath,
}: MaterialToRemove): Promise<void> {
  if (resourceType === "document") {
    await removeDocumentFiles([resourcePath]);
  }

  await deleteMaterial(id);
}

// -- Students ---------------------------------------------------------------------

type RemoveStudentInput = {
  classroomId: string;
  classroomName: string;
  studentId: string;
};

export async function removeStudent({
  classroomId,
  classroomName,
  studentId,
}: RemoveStudentInput): Promise<void> {
  // 1. End the enrolment.
  await removeEnrolment(studentId, classroomId).catch((removeError) => {
    throw new DataError("This student could not be removed. Please try again.", removeError);
  });

  // 2. Tell the student (best effort).
  await notifyUser({
    recipient_id: studentId,
    type: "removed_from_classroom",
    title: "You were removed from a classroom",
    body: `You were removed from "${classroomName}".`,
    link_url: "/student/classrooms",
  });
}
