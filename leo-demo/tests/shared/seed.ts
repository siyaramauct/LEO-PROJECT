// -----------------------------------------------------------------------------
// Test Data Seeding
//
// Shared by the integration tests (Vitest) and the end-to-end tests
// (Playwright). Creates the users and rows a test needs with an admin client
// that uses the secret key and bypasses RLS: it SETS UP data, and the tests then
// check what real users can do with it. Helpers start with "seed" so they're
// never confused with the app's own services.
//
// Reads its settings from process.env, which both runners fill from .env.test:
// Vitest through loadEnv (vitest.integration.config.ts), Playwright through
// process.loadEnvFile (playwright.config.ts). It imports only types from src/,
// never the app's Supabase client, because that client reads Vite's
// import.meta.env, which doesn't exist when Playwright runs.
//
// Each test creates its own users and rows with unique emails and codes, so
// tests never collide. For a clean database: npx supabase db reset, then
// npx supabase seed buckets --local.
// -----------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import type { Material } from "../../src/data/materials";
import type { Quiz } from "../../src/data/quizzes";
import type { QuizQuestion } from "../../src/domain/scoring";

// -- Safety check and admin client --------------------------------------------------

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";

// Tests create users and rows, so they must never reach the hosted project.
// Stop straight away unless .env.test points at this machine.
const isLocal =
  supabaseUrl.startsWith("http://127.0.0.1") || supabaseUrl.startsWith("http://localhost");

if (!isLocal) {
  throw new Error(`Tests must use local Supabase, not "${supabaseUrl}". Check .env.test.`);
}

// Never signs in as anyone, so it keeps no session and refreshes no token.
export const admin = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY as string, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -- Users ---------------------------------------------------------------------------

// Every seeded user has this password, so tests can sign in as any of them.
export const TEST_PASSWORD = "integration-test-password";

export type TestUser = { id: string; email: string };

type SeedUserOptions = {
  // Replaces the default sign-up details, e.g. other names, or the full_name /
  // given_name / family_name that Google sends.
  metadata?: Record<string, string>;
};

// Creates a confirmed user. The on_auth_user_created trigger copies the name,
// surname and role into their profile, as happens after a real signup. A null
// role is a new user who hasn't picked one yet on /select-role.
export async function seedUser(
  role: "teacher" | "student" | null,
  { metadata }: SeedUserOptions = {},
): Promise<TestUser> {
  // 1. A unique email, so repeated runs never clash.
  const email = `${role ?? "new"}-${crypto.randomUUID()}@test.local`;

  // 2. The sign-up details: the role (if any) plus names.
  const userMetadata = metadata ?? {
    name: "Test",
    surname: role === "teacher" ? "Teacher" : "Student",
  };

  // 3. Create the user, already confirmed, with those details.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: role ? { ...userMetadata, user_role: role } : userMetadata,
  });

  if (error) {
    throw error;
  }

  return { id: data.user.id, email };
}

// -- Classroom data -------------------------------------------------------------------

// A classroom owned by the teacher. A trigger also creates its invite code.
export async function seedClassroom(teacher: TestUser, name = "Business English"): Promise<string> {
  const { data, error } = await admin
    .from("classrooms")
    .insert({
      teacher_id: teacher.id,
      classroom_name: name,
      join_code: crypto.randomUUID().slice(0, 12), // Must be unique.
    })
    .select("classroom_id")
    .single();

  if (error) {
    throw error;
  }

  return data.classroom_id as string;
}

// Adds the student to the classroom. Real students join through the
// join_classroom_with_code RPC; classroom_students has no insert policy.
export async function seedEnrolment(student: TestUser, classroomId: string): Promise<void> {
  const { error } = await admin
    .from("classroom_students")
    .insert({ student_id: student.id, classroom_id: classroomId });

  if (error) {
    throw error;
  }
}

type SeedLessonOptions = {
  title?: string;
  scheduled?: boolean; // Released a week from now instead of today.
  releasedDaysAgo?: number; // Released this many days ago, for a clear release order.
};

// A lesson in the classroom, released now unless it is scheduled.
export async function seedLesson(
  classroomId: string,
  { title = "Meetings", scheduled = false, releasedDaysAgo }: SeedLessonOptions = {},
): Promise<string> {
  // 1. Now, a week ahead for a scheduled lesson, or some days back. Lessons
  //    seeded "now" one after another can share a timestamp, so tests that
  //    depend on release order should use releasedDaysAgo.
  const releaseDate = new Date();

  if (scheduled) {
    releaseDate.setDate(releaseDate.getDate() + 7);
  } else if (releasedDaysAgo !== undefined) {
    releaseDate.setDate(releaseDate.getDate() - releasedDaysAgo);
  }

  // 2. Insert the lesson.
  const { data, error } = await admin
    .from("lessons")
    .insert({
      classroom_id: classroomId,
      title,
      description: "Vocabulary for business meetings",
      release_date: releaseDate.toISOString(),
    })
    .select("lesson_id")
    .single();

  if (error) {
    throw error;
  }

  return data.lesson_id as string;
}

type SeedMaterialOptions = {
  type?: "document" | "link";
  lessonId?: string; // Attach it to a lesson instead of the whole classroom.
  fileName?: string; // For documents.
  url?: string; // For links.
};

// A material shared in the classroom, as the app stores it. A document gets a
// real file in the documents bucket too, so tests can check it's deleted later.
export async function seedMaterial(
  classroomId: string,
  {
    type = "document",
    lessonId,
    fileName = "notes.pdf",
    url = "https://example.com/business-vocabulary",
  }: SeedMaterialOptions = {},
): Promise<Material> {
  let resourceUrl = url;

  // 1. Documents: store the file where the app would put it.
  if (type === "document") {
    const folder = lessonId
      ? `lesson_documents/${classroomId}/${lessonId}`
      : `classroom_documents/${classroomId}`;

    resourceUrl = `${folder}/${crypto.randomUUID()}-${fileName}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(resourceUrl, testFile(fileName, "application/pdf"));

    if (uploadError) {
      throw uploadError;
    }
  }

  // 2. The material row the app lists.
  const { data, error } = await admin
    .from("learning_resources")
    .insert({
      classroom_id: classroomId,
      lesson_id: lessonId ?? null,
      resource_type: type,
      resource_url: resourceUrl,
    })
    .select("resource_id, resource_type, resource_url, uploaded_date")
    .single();

  if (error) {
    throw error;
  }

  return data as Material;
}

// -- Lesson content -------------------------------------------------------------------

type SeededFlashcard = { flashcard_id: string; word: string; definition: string };

// Flashcards in a lesson, one per word, with simple definitions. Returns them
// in the order the words were given.
export async function seedFlashcards(
  lessonId: string,
  words = ["invoice", "deadline", "profit"],
): Promise<SeededFlashcard[]> {
  const { data, error } = await admin
    .from("flashcards")
    .insert(
      words.map((word) => ({
        lesson_id: lessonId,
        word,
        definition: `The meaning of ${word}`,
      })),
    )
    .select("flashcard_id, word, definition");

  if (error) {
    throw error;
  }

  const cards = data as SeededFlashcard[];

  return words.map((word) => cards.find((card) => card.word === word) as SeededFlashcard);
}

// A three-question business English quiz in the lesson, out of 3 marks. The
// correct answers are A, B and C, in that order.
export async function seedQuiz(
  lessonId: string,
): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> {
  // 1. The quiz.
  const { data: quiz, error: quizError } = await admin
    .from("mcqs")
    .insert({ lesson_id: lessonId, title: "Business Vocabulary Check", score_ceiling: 3 })
    .select("mcq_id, title, score_ceiling")
    .single();

  if (quizError) {
    throw quizError;
  }

  // 2. Its questions.
  const { data: questions, error: questionsError } = await admin
    .from("questions")
    .insert([
      {
        mcq_id: quiz.mcq_id,
        question_text: "Please find the _ for last month's order attached.",
        option_a: "invoice",
        option_b: "agenda",
        option_c: "résumé",
        option_d: "headline",
        correct_option: "A",
      },
      {
        mcq_id: quiz.mcq_id,
        question_text: "We need to extend the _ because the supplier is late.",
        option_a: "salary",
        option_b: "deadline",
        option_c: "budget",
        option_d: "invoice",
        correct_option: "B",
      },
      {
        mcq_id: quiz.mcq_id,
        question_text: "The company made a _ of R2 million after paying all its costs.",
        option_a: "loss",
        option_b: "debt",
        option_c: "profit",
        option_d: "salary",
        correct_option: "C",
      },
    ])
    .select("question_id, question_text, option_a, option_b, option_c, option_d, correct_option");

  if (questionsError) {
    throw questionsError;
  }

  // Sorted by answer letter, so tests can rely on the order A, B, C.
  const sorted = (questions as QuizQuestion[]).sort((a, b) =>
    a.correct_option.localeCompare(b.correct_option),
  );

  return { quiz: quiz as Quiz, questions: sorted };
}

// -- Student history ------------------------------------------------------------------

type SeedAttemptOptions = {
  score: number | null; // Null for a flashcards-only completion.
  minutes: number; // How long the attempt took.
  endedMinutesAgo: number; // When it was completed, counted back from now.
};

// A completed attempt with an exact score and duration, as if the student had
// taken the lesson earlier. Recent by default, so it falls in the current week.
export async function seedAttempt(
  student: TestUser,
  lessonId: string,
  { score, minutes, endedMinutesAgo }: SeedAttemptOptions,
): Promise<void> {
  const completedAt = new Date(Date.now() - endedMinutesAgo * 60_000);
  const startedAt = new Date(completedAt.getTime() - minutes * 60_000);

  const { error } = await admin.from("lesson_attempts").insert({
    student_id: student.id,
    lesson_id: lessonId,
    score,
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
  });

  if (error) {
    throw error;
  }
}

// A "YYYY-MM-DD" key for a day counted back from today, in local time like the
// reports use.
export function dateKeyDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

// Days the student studied, counted back from today (0 = today).
export async function seedStudyDays(student: TestUser, daysAgo: number[]): Promise<void> {
  const { error } = await admin.from("student_activity").insert(
    daysAgo.map((days) => ({
      student_id: student.id,
      activity_date: dateKeyDaysAgo(days),
      source: "flashcard_practice",
    })),
  );

  if (error) {
    throw error;
  }
}

// -- Files ----------------------------------------------------------------------------

// A tiny file to upload. Storage only looks at its name, size and type.
export function testFile(name: string, type: string): File {
  return new File(["integration test"], name, { type });
}
