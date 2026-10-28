// -----------------------------------------------------------------------------
// Lesson Authoring Service
//
// What a teacher does to build lessons, step by step: check the classroom's
// lesson limit, create a lesson with its documents, flashcards and quiz, edit
// or delete a flashcard (scheduled lessons only), and add or remove a lesson
// PDF. Pages call these instead of querying Supabase (see src/data).
//
// Functions throw a DataError whose message can be shown to the teacher.
// -----------------------------------------------------------------------------

import {
  flashcardError,
  flashcardsError,
  lessonDetailsError,
  quizError,
} from "../domain/lessonValidation";
import { MAX_LESSONS_PER_CLASSROOM } from "../domain/limits";
import { DataError, friendlyMessage } from "../data/errors";
import {
  deleteFlashcard,
  insertFlashcards,
  updateFlashcard,
  type LessonFlashcard,
} from "../data/flashcards";
import { removeImageFiles, uploadImage } from "../data/imageFiles";
import { countClassroomLessons, getLessonReleaseDate, insertLesson } from "../data/lessons";
import {
  addLessonDocuments,
  addMaterial,
  deleteMaterial,
  removeDocumentFiles,
  signDocumentUrl,
  uploadDocument,
} from "../data/materials";
import { notifyClassroomStudents } from "../data/notifications";
import { insertQuestions, insertQuiz, type NewQuestion } from "../data/quizzes";
import { isScheduledRelease, releaseDateToIso } from "../utils/releaseDate";

// Lesson document links work for an hour.
const SIGNED_LINK_SECONDS = 60 * 60;

// -- Creating a lesson ------------------------------------------------------------------

export async function checkLessonLimit(classroomId: string): Promise<void> {
  const lessonCount = await countClassroomLessons(classroomId);

  if (lessonCount >= MAX_LESSONS_PER_CLASSROOM) {
    throw new DataError(
      `This classroom has reached its ${MAX_LESSONS_PER_CLASSROOM}-lesson limit.`,
    );
  }
}

type DraftFlashcard = {
  term: string;
  definition: string;
  imageFile: File | null;
};

type CreateLessonInput = {
  classroomId: string;
  title: string;
  description: string;
  coverImagePath: string;
  releaseDateKey: string; // "YYYY-MM-DD", or "" to release now.
  documents: File[]; // PDFs.
  flashcards: DraftFlashcard[];
  quiz: { title: string; questions: NewQuestion[] } | null; // Null for flashcards only.
};

// Saves everything in order, stopping at the first failure. Returns the new
// lesson's id.
export async function createLesson({
  classroomId,
  title,
  description,
  coverImagePath,
  releaseDateKey,
  documents,
  flashcards,
  quiz,
}: CreateLessonInput): Promise<string> {
  // 0. The same text rules the form applies, in case a caller skipped them.
  const problem =
    lessonDetailsError(title, description) ??
    flashcardsError(flashcards) ??
    (quiz ? quizError(quiz.title, quiz.questions) : null);

  if (problem) {
    throw new DataError(problem);
  }

  // 1. The lesson row, with a release date if it is scheduled.
  const lessonId = await insertLesson({
    classroomId,
    title: title.trim(),
    description: description.trim(),
    coverImagePath,
    releaseDateIso: releaseDateKey ? releaseDateToIso(releaseDateKey) : null,
  });

  // 2. Any PDFs: uploaded, then recorded. Uploads are removed if recording fails.
  if (documents.length > 0) {
    await attachLessonDocuments(classroomId, lessonId, documents);
  }

  // 3. Flashcard images, then the flashcard rows.
  const flashcardRows = await Promise.all(
    flashcards.map(async (flashcard, index) => ({
      lesson_id: lessonId,
      word: flashcard.term.trim(),
      definition: flashcard.definition.trim(),
      image_path: flashcard.imageFile
        ? await uploadFlashcardImage(lessonId, `${index + 1}`, flashcard)
        : null,
    })),
  );

  await insertFlashcards(flashcardRows);

  // 4. The quiz and its questions, unless this is a flashcards-only lesson.
  if (quiz) {
    const mcqId = await insertQuiz({
      lessonId,
      title: quiz.title.trim(),
      scoreCeiling: quiz.questions.length,
    });

    await insertQuestions(
      mcqId,
      quiz.questions.map((question) => ({
        question_text: question.question_text.trim(),
        option_a: question.option_a.trim(),
        option_b: question.option_b.trim(),
        option_c: question.option_c.trim(),
        option_d: question.option_d.trim(),
        correct_option: question.correct_option,
      })),
    );
  }

  // 5. Tell the students (best effort). Scheduled lessons aren't open yet, so
  //    students aren't told about them now.
  if (!releaseDateKey) {
    await notifyClassroomStudents(classroomId, {
      type: "new_lesson",
      title: "New lesson available",
      body: `Your teacher added "${title.trim()}".`,
      link_url: `/lesson/${lessonId}`,
    });
  }

  return lessonId;
}

async function attachLessonDocuments(classroomId: string, lessonId: string, documents: File[]) {
  const storagePaths = await Promise.all(
    documents.map(async (file) => {
      const storagePath = lessonDocumentPath(classroomId, lessonId, file);

      await uploadDocument(storagePath, file, "application/pdf").catch((uploadError) => {
        // e.g. Could not upload "notes.pdf". That file is too large to upload.
        const reason = friendlyMessage(uploadError, "Please try again.");
        throw new DataError(`Could not upload "${file.name}". ${reason}`, uploadError);
      });

      return storagePath;
    }),
  );

  try {
    await addLessonDocuments(classroomId, lessonId, storagePaths);
  } catch (recordError) {
    await removeDocumentFiles(storagePaths);
    throw recordError;
  }
}

// Storage "folders" are just path prefixes; the random id stops a second upload
// with the same name overwriting a file in use.
function lessonDocumentPath(classroomId: string, lessonId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");

  return `lesson_documents/${classroomId}/${lessonId}/${crypto.randomUUID()}-${safeName}`;
}

async function uploadFlashcardImage(lessonId: string, prefix: string, flashcard: DraftFlashcard) {
  const file = flashcard.imageFile as File;
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const imagePath = `flashcards/${lessonId}/${prefix}-${crypto.randomUUID()}-${safeName}`;

  await uploadImage(imagePath, file).catch((uploadError) => {
    const reason = friendlyMessage(uploadError, "Please try again.");
    throw new DataError(
      `Could not upload the image for "${flashcard.term}". ${reason}`,
      uploadError,
    );
  });

  return imagePath;
}

// -- Editing flashcards -------------------------------------------------------------------

// Flashcards can only change while their lesson is scheduled. Once it's
// released, students may already have studied the cards or taken the quiz made
// from them, so they stay as released. The lesson itself can still be deleted.
async function requireScheduledLesson(lessonId: string) {
  const releaseDate = await getLessonReleaseDate(lessonId);

  if (!isScheduledRelease(releaseDate)) {
    throw new DataError(
      "This lesson has been released, so its flashcards can no longer be edited or deleted.",
    );
  }
}

type FlashcardEdit = {
  lessonId: string;
  card: LessonFlashcard;
  word: string;
  definition: string;
  newImage: File | null; // A replacement picture, if one was chosen.
  removeImage: boolean; // Drop the current picture without replacing it.
};

// Returns the card's new image path.
export async function saveFlashcardEdit({
  lessonId,
  card,
  word,
  definition,
  newImage,
  removeImage,
}: FlashcardEdit): Promise<string | null> {
  // 1. The edit must meet the same text rules as a new flashcard.
  const problem = flashcardError({ term: word, definition });

  if (problem) {
    throw new DataError(problem);
  }

  // 2. Only a scheduled lesson's flashcards can change. The card's own lesson
  //    is checked, so a mismatched lessonId can't get round it.
  await requireScheduledLesson(card.lesson_id);

  // 3. Upload the new picture, if one was chosen.
  let imagePath = removeImage ? null : card.image_path;

  if (newImage) {
    imagePath = await uploadFlashcardImage(lessonId, card.flashcard_id, {
      term: word,
      definition,
      imageFile: newImage,
    });
  }

  // 4. Update the flashcard row.
  await updateFlashcard(card.flashcard_id, { word, definition, image_path: imagePath });

  // 5. Remove the old picture once nothing points to it (best effort).
  if (card.image_path && card.image_path !== imagePath) {
    await removeImageFiles([card.image_path]);
  }

  return imagePath;
}

// Deletes the card, then its picture. Only while its lesson is scheduled.
export async function removeFlashcard(card: LessonFlashcard): Promise<void> {
  await requireScheduledLesson(card.lesson_id);

  await deleteFlashcard(card.flashcard_id);

  if (card.image_path) {
    await removeImageFiles([card.image_path]);
  }
}

// -- Lesson documents -------------------------------------------------------------------

export type LessonDocument = {
  resource_id: string;
  resource_url: string; // Storage path.
  uploaded_date: string;
  signedUrl: string; // Works for an hour; "" if signing failed.
};

type AddDocumentInput = {
  classroomId: string;
  lessonId: string;
  file: File; // A PDF.
};

// Uploads a PDF and records it. If recording fails, the file is removed again.
export async function addLessonDocument({
  classroomId,
  lessonId,
  file,
}: AddDocumentInput): Promise<LessonDocument> {
  const storagePath = lessonDocumentPath(classroomId, lessonId, file);

  await uploadDocument(storagePath, file, "application/pdf");

  try {
    const material = await addMaterial({
      classroomId,
      lessonId,
      type: "document",
      url: storagePath,
    });

    return {
      resource_id: material.resource_id,
      resource_url: material.resource_url,
      uploaded_date: material.uploaded_date,
      signedUrl: await signDocumentUrl(storagePath, SIGNED_LINK_SECONDS),
    };
  } catch (recordError) {
    await removeDocumentFiles([storagePath]);
    throw new DataError("The lesson document could not be saved. Please try again.", recordError);
  }
}

// Deletes the record, then the stored file.
export async function removeLessonDocument(document: LessonDocument): Promise<void> {
  await deleteMaterial(document.resource_id);
  await removeDocumentFiles([document.resource_url]);
}

// Signs each stored document so it can be opened for the next hour.
export async function signLessonDocuments(
  documents: { resource_id: string; resource_url: string; uploaded_date: string }[],
): Promise<LessonDocument[]> {
  return Promise.all(
    documents.map(async (document) => ({
      ...document,
      signedUrl: await signDocumentUrl(document.resource_url, SIGNED_LINK_SECONDS),
    })),
  );
}
