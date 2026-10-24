// -----------------------------------------------------------------------------
// Lesson Drafts
//
// Keeps a teacher's unfinished Create Lesson form in the browser's
// localStorage, so leaving the tab or app doesn't lose it. Phones often unload
// a page left in the background, and it reloads from scratch on return; the
// form then restores the draft.
//
// One draft per teacher on this device, cleared once the lesson is saved.
// Pictures and PDFs are files, which localStorage can't hold, so they aren't
// kept. Drafts older than a week are dropped.
//
// Storage can be unavailable (private browsing, full, or blocked), so every
// read and write is wrapped: without it, the form simply works as before.
// -----------------------------------------------------------------------------

import { QUIZ_FORMATS, type DraftQuestion, type QuizFormat } from "../domain/quizDraft";

export type LessonDraftStep = "details" | "flashcards" | "activity" | "review";

export type LessonDraft = {
  step: LessonDraftStep;
  title: string;
  description: string;
  classroomId: string;
  coverId: string;
  releaseDate: string; // "YYYY-MM-DD", or "" to release now.
  flashcards: { id: number; term: string; definition: string }[];
  includeMcq: boolean;
  mcqFormat: QuizFormat | null;
  quizTitle: string;
  questions: (DraftQuestion & { id: number })[];
};

type StoredDraft = { savedAt: number; draft: LessonDraft };

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // A week.

function storageKey(userId: string) {
  return `leo:lesson-draft:${userId}`;
}

// The teacher's saved draft, or null if there is none to restore. A draft for
// a different classroom than the one the page was opened for is left alone.
export function loadLessonDraft(userId: string, requestedClassroomId: string): LessonDraft | null {
  if (!userId) {
    return null;
  }

  try {
    // 1. Read it.
    const stored = localStorage.getItem(storageKey(userId));
    if (!stored) {
      return null;
    }

    const { savedAt, draft } = JSON.parse(stored) as StoredDraft;

    // 2. Drop it if it's too old to be wanted.
    if (Date.now() - savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey(userId));
      return null;
    }

    // 3. Opened for another classroom: start a fresh lesson instead.
    if (requestedClassroomId && draft.classroomId && draft.classroomId !== requestedClassroomId) {
      return null;
    }

    // 4. A quiz format the app no longer offers is cleared, so it's picked again.
    const mcqFormat =
      draft.mcqFormat && QUIZ_FORMATS.includes(draft.mcqFormat) ? draft.mcqFormat : null;

    // 5. The review step needs its questions; without them, go back a step.
    if (draft.step === "review" && draft.questions.length === 0) {
      return { ...draft, mcqFormat, step: "activity" };
    }

    return { ...draft, mcqFormat };
  } catch {
    // Unreadable or blocked storage: no draft.
    return null;
  }
}

export function saveLessonDraft(userId: string, draft: LessonDraft) {
  try {
    const stored: StoredDraft = { savedAt: Date.now(), draft };
    localStorage.setItem(storageKey(userId), JSON.stringify(stored));
  } catch {
    // Full or blocked storage: the form still works, it just isn't kept.
  }
}

export function clearLessonDraft(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Blocked storage: there was nothing saved to clear.
  }
}
