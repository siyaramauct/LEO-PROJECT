// -----------------------------------------------------------------------------
// Flash Activity
//
// The first step of every lesson for a student: study the lesson's flashcards
// one at a time. A progress bar tracks the position, any documents the teacher
// attached are listed, and lessons with at least two image cards offer the
// image-matching game.
//
// How the cards move:
//   Only one card is shown. Next and Previous change the index in state, and
//   the Flashcard is keyed by its id, so React swaps in a fresh card that
//   always starts face up. Tapping a card flips it (see Flashcard.tsx).
//
// What the last card does:
//   Lessons with a quiz show "Start quiz". Flashcards-only lessons show
//   "Finish lesson", which records an unscored attempt so the lesson still
//   counts towards the student's weekly progress.
//
// Opening the page also logs today as an active day for the streak.
//
// Route: /lesson/:lessonId || Access: students
// -----------------------------------------------------------------------------

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Images,
  Layers,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Flashcard from "../Components/Flashcard";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import { logStudyDay } from "../data/activity";
import { errorMessage } from "../data/errors";
import { getFlashcards, type LessonFlashcard } from "../data/flashcards";
import { getLessonDocuments, signDocumentUrl } from "../data/materials";
import { getQuiz } from "../data/quizzes";
import { finishLesson } from "../services/lessonService";
import { bucketImageUrl } from "../utils/images";

// -- Types --------------------------------------------------------------------

type LessonDocument = { resource_id: string; resource_url: string; signedUrl: string };

// Uploaded files are stored as "<uuid>-<name>"; show just the name.
const documentName = (path: string) =>
  decodeURIComponent(path.split("/").pop() ?? path).replace(/^[0-9a-f-]{36}-/i, "");

// The lesson's attached documents. They live in a private bucket, so each one
// gets a signed link that works for an hour. Best effort: a failure is logged
// and the lesson opens without them.
async function loadLessonDocuments(lessonId: string): Promise<LessonDocument[]> {
  const documents = await getLessonDocuments(lessonId).catch((documentsError) => {
    console.error("Could not load lesson documents:", documentsError);
    return [];
  });

  return Promise.all(
    documents.map(async (document) => ({
      resource_id: document.resource_id,
      resource_url: document.resource_url,
      signedUrl: await signDocumentUrl(document.resource_url, 60 * 60),
    })),
  );
}

// Shared look for the Previous, Next, Start quiz and Finish buttons.
const NAV_BUTTON =
  "flex min-h-11 w-full min-w-0 items-center justify-center rounded-lg px-2 py-2.5 text-sm font-semibold transition sm:w-auto sm:px-4";
const PRIMARY_BUTTON = `${NAV_BUTTON} gap-2 bg-violet-700 text-white hover:bg-violet-800`;

// -- Page ---------------------------------------------------------------------

export default function FlashActivity() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [flashcards, setFlashcards] = useState<LessonFlashcard[]>([]);
  const [documents, setDocuments] = useState<LessonDocument[]>([]);
  const [index, setIndex] = useState(0); // Position of the card on screen.
  const [isLoading, setIsLoading] = useState(true);
  const [hasQuiz, setHasQuiz] = useState(true);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => new Date().toISOString());
  const [isFinishing, setIsFinishing] = useState(false);

  // -- Load the lesson --
  //
  // The flashcards, whether the lesson has a quiz, and any attached documents
  // load together. Opening the lesson also counts today towards the streak.
  useEffect(() => {
    if (!lessonId) return;

    const loadLesson = async () => {
      try {
        const [cards, quiz, lessonDocuments] = await Promise.all([
          getFlashcards(lessonId),
          // A failed quiz lookup counts as no quiz.
          getQuiz(lessonId).catch(() => null),
          loadLessonDocuments(lessonId),
        ]);

        setFlashcards(cards);
        setHasQuiz(quiz !== null);
        setDocuments(lessonDocuments);
      } catch (loadError) {
        console.error("Failed to load flashcards:", loadError);
        setError(errorMessage(loadError, "The flashcards could not be loaded right now."));
      } finally {
        setIsLoading(false);
      }

      if (session?.user) {
        void logStudyDay(session.user.id, "flashcard_practice");
      }
    };

    void loadLesson();
  }, [lessonId, session?.user]);

  // -- Finish a flashcards-only lesson --
  // lessonService saves an attempt with no score, which marks the lesson done.

  async function handleFinish() {
    if (!session?.user || !lessonId) return;
    setIsFinishing(true);

    try {
      await finishLesson({ studentId: session.user.id, lessonId, startedAt });
      navigate("/student/classrooms");
    } catch (finishError) {
      console.error("Failed to finish lesson:", finishError);
      setError(errorMessage(finishError, "The lesson could not be completed."));
      setIsFinishing(false);
    }
  }

  // -- Derived values --

  const currentCard = flashcards[index];
  const isLastCard = index === flashcards.length - 1;
  const progress = flashcards.length ? ((index + 1) / flashcards.length) * 100 : 0;
  const imageCardCount = flashcards.filter((card) => card.image_path).length;
  const currentImageUrl = currentCard?.image_path ? bucketImageUrl(currentCard.image_path) : null;

  // -- Progress panel --
  // Stacks on phones so the match button never squeezes the instructions.

  const progressPanel = (
    <section className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-sm font-bold">Read every flashcard</h2>
          <p className="mt-1 text-xs text-slate-500">
            Use Next and Previous to move through the lesson.
          </p>
          {!hasQuiz && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              <Layers size={12} /> Flashcards only · no quiz or score
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          {imageCardCount >= 2 && (
            <button
              type="button"
              onClick={() => navigate(`/lesson/${lessonId}/match`)}
              className="flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
            >
              <Images size={15} /> Match images
            </button>
          )}
          <span className="text-sm font-semibold text-slate-600">
            {index + 1} of {flashcards.length}
          </span>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-700 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );

  // -- Lesson documents --

  const documentsPanel = documents.length > 0 && (
    <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
      <h2 className="text-sm font-bold">Lesson documents</h2>
      <p className="mt-1 text-xs text-slate-500">Resources your teacher attached to this lesson.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {documents.map((document) => (
          <a
            key={document.resource_id}
            href={document.signedUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition ${document.signedUrl ? "hover:border-violet-300 hover:bg-violet-50" : "pointer-events-none opacity-60"}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <FileText size={17} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
              {documentName(document.resource_url)}
            </span>
            <ExternalLink size={15} className="shrink-0 text-slate-400" />
          </a>
        ))}
      </div>
    </section>
  );

  // -- Card stage --
  // The key makes React mount a new Flashcard for each card, so every card
  // starts face up and with no translation selected.

  const cardStage = currentCard && (
    <section className="mt-5 flex min-h-96 items-center justify-center rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
      <Flashcard
        key={currentCard.flashcard_id}
        word={currentCard.word}
        definition={currentCard.definition}
        flashcardId={currentCard.flashcard_id}
        imageUrl={currentImageUrl}
      />
    </section>
  );

  // -- Previous and Next --
  // Two equal columns on phones; pushed to either side from sm up.

  let forwardButton;
  if (!isLastCard) {
    forwardButton = (
      <button
        type="button"
        onClick={() => setIndex((current) => current + 1)}
        className={`${NAV_BUTTON} gap-1 bg-violet-700 text-white hover:bg-violet-800`}
      >
        <span>Next</span> <ChevronRight size={17} />
      </button>
    );
  } else if (hasQuiz) {
    forwardButton = (
      <button
        type="button"
        onClick={() => navigate(`/quiz/${lessonId}`)}
        className={PRIMARY_BUTTON}
      >
        <ClipboardCheck size={17} />
        <span className="truncate">Start quiz</span>
      </button>
    );
  } else {
    forwardButton = (
      <button
        type="button"
        disabled={isFinishing}
        onClick={() => void handleFinish()}
        className={`${PRIMARY_BUTTON} disabled:cursor-not-allowed disabled:bg-slate-300`}
      >
        <Check size={17} />
        <span className="truncate">{isFinishing ? "Finishing..." : "Finish lesson"}</span>
      </button>
    );
  }

  const cardNavigation = (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
      <button
        type="button"
        disabled={index === 0}
        onClick={() => setIndex((current) => current - 1)}
        className={`${NAV_BUTTON} gap-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronLeft size={17} />
        <span className="truncate">Previous</span>
      </button>
      {forwardButton}
    </div>
  );

  // -- Status messages --

  const statusCard = (children: ReactNode) => (
    <div className="rounded-xl border border-slate-100 bg-white p-10 text-center">{children}</div>
  );

  let content;
  if (isLoading) {
    content = statusCard(<p className="text-sm text-slate-500">Loading flashcards...</p>);
  } else if (error || !currentCard) {
    content = statusCard(
      <>
        <h2 className="text-lg font-bold">Flashcards unavailable</h2>
        <p className="mt-2 text-sm text-slate-500">
          {error || "This lesson does not have flashcards yet."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/student/classrooms")}
          className="mt-5 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Back to classrooms
        </button>
      </>,
    );
  } else {
    content = (
      <>
        {progressPanel}
        {documentsPanel}
        {cardStage}
        {cardNavigation}
      </>
    );
  }

  // -- Layout --

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/student/classrooms")}
              aria-label="Back to classrooms"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>
            <div>
              <p className="text-xs font-medium text-violet-700">Lesson study</p>
              <h1 className="mt-1 text-base font-bold">Flashcards</h1>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{content}</div>
      </main>
    </div>
  );
}
