// -----------------------------------------------------------------------------
// Teacher Lesson Report
//
// One lesson from the teacher's side:
//   Summary     cover, title, word count and quiz name
//   Statistics  enrolled students, quiz completion, average and highest score
//               (flashcards-only lessons show a note instead, as nothing is scored)
//   Documents   PDFs attached to this lesson, with upload and delete
//   Flashcards  every card, editable in place (word, definition, image)
//   Results     each enrolled student's latest quiz score
//
// One layout for all screens: a centred column that stacks on phones.
//
// Route: /teacher-classroom/:classroomId/lesson/:lessonId || Access: teachers
// -----------------------------------------------------------------------------

import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  ImagePlus,
  Layers,
  Pencil,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ConfirmDialog from "../Components/ConfirmDialog";
import StatCard from "../Components/StatCard";
import { MAX_FLASHCARD_IMAGE_BYTES } from "../config/limits";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../data/errors";
import type { LessonFlashcard } from "../data/flashcards";
import type { TeacherLesson } from "../data/lessons";
import type { Quiz } from "../data/quizzes";
import {
  addLessonDocument,
  removeFlashcard,
  removeLessonDocument,
  saveFlashcardEdit,
  type LessonDocument,
} from "../services/lessonCreationService";
import { getTeacherLessonReport, type LessonStudentResult } from "../services/reportService";
import { bucketImageUrl, bucketImageUrlOrBroken } from "../utils/images";

// -- Types --------------------------------------------------------------------

// -- Small building blocks ----------------------------------------------------

const NoScoresNotice = () => (
  <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Layers size={17} />
    </span>
    <div>
      <p className="text-sm font-bold text-slate-800">No score statistics for this lesson</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">
        This is a flashcards-only lesson without an MCQ activity, so students aren't scored and quiz
        completion isn't tracked.
      </p>
    </div>
  </div>
);

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(value),
      )
    : null;

// Uploaded files are stored as "<uuid>-<name>"; show just the name.
function documentName(path: string) {
  const storedName = decodeURIComponent(path.split("/").pop() ?? path);
  return storedName.replace(/^[0-9a-f-]{36}-/i, "");
}

// -- Page ---------------------------------------------------------------------

export default function TeacherLessonReport() {
  const { session } = useAuth();
  const { classroomId, lessonId } = useParams<{ classroomId: string; lessonId: string }>();
  const teacherId = session?.user?.id;

  const [classroom, setClassroom] = useState<{ classroom_name: string } | null>(null);
  const [lesson, setLesson] = useState<TeacherLesson | null>(null);
  const [flashcards, setFlashcards] = useState<LessonFlashcard[]>([]);
  const [mcq, setMcq] = useState<Quiz | null>(null);
  // Only true when the quiz lookup succeeded and found no quiz.
  const [isFlashcardsOnly, setIsFlashcardsOnly] = useState(false);
  const [results, setResults] = useState<LessonStudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Flashcard editing: only one card is edited at a time.
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardToDelete, setCardToDelete] = useState<LessonFlashcard | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  // Lesson documents.
  const [documents, setDocuments] = useState<LessonDocument[]>([]);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [documentError, setDocumentError] = useState("");

  // -- Load the lesson --
  // reportService loads the classroom (checked to belong to this teacher), the
  // lesson, its flashcards and documents, its quiz, and each student's latest
  // attempt.
  useEffect(() => {
    if (!classroomId || !lessonId || !teacherId) return;

    const load = async () => {
      setIsLoading(true);
      setError("");

      try {
        const report = await getTeacherLessonReport(teacherId, classroomId, lessonId);

        setClassroom({ classroom_name: report.classroomName });
        setLesson(report.lesson);
        setFlashcards(report.flashcards);
        setDocuments(report.documents);
        setDocumentError(report.documentsError ?? "");
        setMcq(report.quiz);
        setIsFlashcardsOnly(report.isFlashcardsOnly);
        setResults(report.results);
      } catch (loadError) {
        console.error("Failed to load lesson report:", loadError);
        setError(errorMessage(loadError, "This lesson could not be loaded right now."));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [classroomId, lessonId, teacherId]);

  // -- Statistics --

  const enrolledCount = results.length;
  const attemptedResults = results.filter((student) => student.attempted);
  const attemptedCount = attemptedResults.length;
  const completionRate = enrolledCount ? Math.round((attemptedCount / enrolledCount) * 100) : 0;
  const scoredResults = attemptedResults.filter((student) => student.scorePercent !== null);
  const averageScore = scoredResults.length
    ? Math.round(
        scoredResults.reduce((total, student) => total + (student.scorePercent ?? 0), 0) /
          scoredResults.length,
      )
    : null;
  const highestScore = scoredResults.length
    ? Math.max(...scoredResults.map((student) => student.scorePercent ?? 0))
    : null;

  // -- Flashcard editing --

  // Copies the card's current values into the edit form.
  function startEditingCard(card: LessonFlashcard) {
    setCardError("");
    setEditingCardId(card.flashcard_id);
    setEditWord(card.word);
    setEditDefinition(card.definition);
    setEditImageFile(null);
    setEditImagePreview(null);
    setRemoveExistingImage(false);
  }

  // Closes the form. Preview images are temporary browser URLs and must be released.
  function cancelEditingCard() {
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditingCardId(null);
    setEditWord("");
    setEditDefinition("");
    setEditImageFile(null);
    setEditImagePreview(null);
    setRemoveExistingImage(false);
  }

  function chooseEditImage(file: File | null) {
    setCardError("");
    if (file && (!file.type.startsWith("image/") || file.size > MAX_FLASHCARD_IMAGE_BYTES)) {
      setCardError("Flashcard images must be image files smaller than 5 MB.");
      return;
    }
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(file);
    setEditImagePreview(file ? URL.createObjectURL(file) : null);
    setRemoveExistingImage(false);
  }

  // lessonService uploads a new picture if one was chosen, saves the card, then
  // removes the old picture once nothing points to it.
  async function saveEditingCard() {
    if (!editingCardId || isSavingCard || !lessonId) return;

    const word = editWord.trim();
    const definition = editDefinition.trim();
    const currentCard = flashcards.find((card) => card.flashcard_id === editingCardId);

    if (!word || !definition) {
      setCardError("A flashcard needs both a word and a definition.");
      return;
    }

    if (!currentCard) return;

    setIsSavingCard(true);
    setCardError("");

    try {
      const imagePath = await saveFlashcardEdit({
        lessonId,
        card: currentCard,
        word,
        definition,
        newImage: editImageFile,
        removeImage: removeExistingImage,
      });

      setFlashcards((cards) =>
        cards.map((card) =>
          card.flashcard_id === editingCardId
            ? { ...card, word, definition, image_path: imagePath }
            : card,
        ),
      );
      cancelEditingCard();
    } catch (saveError) {
      setCardError(errorMessage(saveError, "The flashcard could not be saved."));
    } finally {
      setIsSavingCard(false);
    }
  }

  // Runs after the teacher confirms. Deletes the card, then its picture.
  async function deleteFlashcard() {
    if (!cardToDelete || isDeletingCard) return;
    setIsDeletingCard(true);

    try {
      await removeFlashcard(cardToDelete);

      setFlashcards((cards) =>
        cards.filter((card) => card.flashcard_id !== cardToDelete.flashcard_id),
      );
    } catch (deleteError) {
      setCardError(errorMessage(deleteError, "The flashcard could not be deleted."));
    } finally {
      setCardToDelete(null);
      setIsDeletingCard(false);
    }
  }

  // -- Lesson documents --

  async function uploadLessonDocument(file: File) {
    if (!classroomId || !lessonId || isSavingDocument) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setDocumentError("Please choose a PDF document.");
      return;
    }

    setIsSavingDocument(true);
    setDocumentError("");

    try {
      const document = await addLessonDocument({ classroomId, lessonId, file });

      if (!document.signedUrl) {
        setDocumentError("The document was uploaded but its preview link could not be created.");
      }

      setDocuments((current) => [document, ...current]);
    } catch (uploadError) {
      setDocumentError(errorMessage(uploadError, "The lesson document could not be saved."));
    } finally {
      setIsSavingDocument(false);
    }
  }

  async function deleteLessonDocument(document: LessonDocument) {
    setDocumentError("");

    try {
      await removeLessonDocument(document);

      setDocuments((current) =>
        current.filter((item) => item.resource_id !== document.resource_id),
      );
    } catch (deleteError) {
      setDocumentError(errorMessage(deleteError, "The document could not be deleted."));
    }
  }

  const coverUrl = bucketImageUrlOrBroken(lesson?.lesson_image_path);

  // -- Loading and error screens --

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading lesson report...</p>
      </main>
    );
  }

  if (error || !lesson || !classroom) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-4 text-center">
        <p className="text-sm text-red-600">{error || "This lesson could not be found."}</p>
        <Link
          to={classroomId ? `/teacher-classroom/${classroomId}` : "/TeacherClassroom"}
          className="text-sm font-semibold text-violet-700"
        >
          Back to classroom
        </Link>
      </main>
    );
  }

  // -- Layout --

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to={`/teacher-classroom/${classroomId}`}
            aria-label="Back to classroom"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={19} />
          </Link>
          <div>
            <p className="text-xs font-medium text-violet-700">{classroom.classroom_name}</p>
            <h1 className="text-base font-bold sm:text-lg">Lesson report</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        {
          // Lesson summary
        }
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
          <img
            src={coverUrl}
            alt={lesson.title}
            className="h-32 w-full rounded-lg object-cover sm:h-24 sm:w-32"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{lesson.title}</h2>
            {lesson.description && (
              <p className="mt-2 text-sm leading-5 text-slate-500">{lesson.description}</p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              {flashcards.length} word{flashcards.length === 1 ? "" : "s"} ·{" "}
              {isFlashcardsOnly ? "Flashcards only, no MCQ activity" : (mcq?.title ?? "Quiz")}
            </p>
          </div>
        </section>

        {
          // Statistics. Flashcards-only lessons have no quiz, so nothing is scored.
        }
        {isFlashcardsOnly ? (
          <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
            <StatCard icon={<Users />} label="Enrolled students" value={String(enrolledCount)} />
            <NoScoresNotice />
          </section>
        ) : (
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<Users />} label="Enrolled students" value={String(enrolledCount)} />
            <StatCard
              icon={<CheckCircle2 />}
              label="Completed the quiz"
              value={`${attemptedCount}/${enrolledCount}`}
              progress={completionRate}
            />
            <StatCard
              icon={<BarChart3 />}
              label="Average score"
              value={averageScore === null ? "—" : `${averageScore}%`}
            />
            <StatCard
              icon={<ClipboardList />}
              label="Highest score"
              value={highestScore === null ? "—" : `${highestScore}%`}
            />
          </section>
        )}

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Lesson documents</h2>
              <p className="mt-1 text-sm text-slate-500">PDFs attached only to this lesson.</p>
            </div>
            <label
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${isSavingDocument ? "cursor-not-allowed bg-slate-300" : "cursor-pointer bg-violet-700 hover:bg-violet-800"}`}
            >
              <Upload size={16} /> {isSavingDocument ? "Uploading..." : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={isSavingDocument}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadLessonDocument(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {documentError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {documentError}
            </p>
          )}
          {documents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No documents are attached to this lesson.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {documents.map((document) => (
                <div key={document.resource_id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                    <FileText size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {documentName(document.resource_url)}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">PDF document</span>
                  </span>
                  {document.signedUrl && (
                    <a
                      href={document.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${documentName(document.resource_url)}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void deleteLessonDocument(document)}
                    aria-label={`Delete ${documentName(document.resource_url)}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {
          // Flashcards
        }
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold">Flashcards</h2>
          <p className="mt-1 text-sm text-slate-500">
            The words and definitions students study for this lesson.
          </p>

          {cardError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {cardError}
            </p>
          )}

          {flashcards.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No flashcards have been added to this lesson yet.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {flashcards.map((card) => {
                const isEditing = editingCardId === card.flashcard_id;
                return (
                  <div key={card.flashcard_id} className="py-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">
                              Word
                            </span>
                            <input
                              value={editWord}
                              onChange={(event) => setEditWord(event.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">
                              Definition
                            </span>
                            <input
                              value={editDefinition}
                              onChange={(event) => setEditDefinition(event.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                            />
                          </label>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-semibold text-slate-600">
                            Image (optional)
                          </span>
                          <div className="flex flex-wrap items-center gap-3">
                            {editImagePreview ? (
                              <img
                                src={editImagePreview}
                                alt="New flashcard preview"
                                className="h-20 w-28 rounded-lg object-cover"
                              />
                            ) : !removeExistingImage && card.image_path ? (
                              <img
                                src={bucketImageUrl(card.image_path)}
                                alt="Current flashcard"
                                className="h-20 w-28 rounded-lg object-cover"
                              />
                            ) : null}
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                              <ImagePlus size={15} />{" "}
                              {card.image_path || editImageFile ? "Replace image" : "Add image"}
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(event) => {
                                  chooseEditImage(event.target.files?.[0] ?? null);
                                  event.currentTarget.value = "";
                                }}
                              />
                            </label>
                            {(card.image_path || editImageFile) && (
                              <button
                                type="button"
                                onClick={() => {
                                  chooseEditImage(null);
                                  setRemoveExistingImage(true);
                                }}
                                className="text-xs font-semibold text-rose-600"
                              >
                                Remove image
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEditingCard}
                            disabled={isSavingCard}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            <X size={14} /> Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEditingCard()}
                            disabled={isSavingCard}
                            className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60"
                          >
                            <Check size={14} /> {isSavingCard ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {card.image_path && (
                            <img
                              src={bucketImageUrl(card.image_path)}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {card.word}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {card.definition}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${card.word}`}
                            onClick={() => startEditingCard(card)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${card.word}`}
                            onClick={() => setCardToDelete(card)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-1000 ease-out hover:bg-violet-700 hover:text-white"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {
          // Per-student scores
        }
        {!isFlashcardsOnly && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold">Student results</h2>
            <p className="mt-1 text-sm text-slate-500">
              Each enrolled student's quiz score for this lesson.
            </p>

            {results.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No students are enrolled in this classroom yet.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {results.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {student.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {student.attempted
                          ? `Completed ${formatDate(student.completedAt)}`
                          : "Not attempted yet"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {student.attempted ? (
                        <span className="text-sm font-bold text-violet-700">
                          {student.scorePercent !== null
                            ? `${student.scorePercent}%`
                            : student.score}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(cardToDelete)}
        isDeleting={isDeletingCard}
        onCancel={() => setCardToDelete(null)}
        onConfirm={() => void deleteFlashcard()}
        title={`Delete "${cardToDelete?.word ?? "this flashcard"}"?`}
        description="This will permanently remove this flashcard from the lesson. This action cannot be undone."
        confirmLabel="Delete flashcard"
        deletingLabel="Deleting..."
      />
    </div>
  );
}
