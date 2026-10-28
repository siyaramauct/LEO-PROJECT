// -----------------------------------------------------------------------------
// Create Lesson
//
// A four-step form for building a lesson:
//   1. Details      classroom, title, description, release date, PDFs, cover
//   2. Flashcards   up to 15 words with definitions and optional images, typed
//                   or pasted as a list (FlashcardListInput), then edited as
//                   cards; a blank card can also be added by hand
//   3. Activity     pick a quiz format, or turn the quiz off for a
//                   flashcards-only lesson
//   4. Review       edit the AI-generated quiz before saving
//
// How the AI quiz is made:
//   quizGenerationService turns the flashcards into a prompt for the AI and
//   checks that the reply has exactly one complete question per flashcard
//   before step 4 opens. If anything fails, a red notice offers to try again
//   or save the lesson without a quiz.
//
// Each step checks the teacher's typing with domain/lessonValidation before
// moving on: no empty or numbers-only text, minimum lengths for the title and
// description, no repeated terms and no repeated answers in a question.
//
// Nothing is saved until the final button, so leaving part way discards the
// draft. A release date picked on the dashboard planner arrives as
// ?releaseDate=YYYY-MM-DD, and a classroom opened beforehand as ?classroomId=.
//
// Route: /create-lesson || Access: teachers
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImagePlus,
  Paperclip,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ConfirmDialog from "../Components/ConfirmDialog";
import FlashcardListInput from "../Components/FlashcardListInput";
import { MAX_FLASHCARD_IMAGE_BYTES, MAX_FLASHCARDS_PER_LESSON } from "../domain/limits";
import { useAuth } from "../context/AuthContext";
import { getTeacherClassrooms } from "../data/classrooms";
import { errorMessage } from "../data/errors";
import {
  flashcardsError,
  isValidText,
  lessonDetailsError,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
  quizError,
  sameText,
} from "../domain/lessonValidation";
import { ANSWER_OPTIONS, type DraftQuestion, type QuizFormat } from "../domain/quizDraft";
import { type WordEntry } from "../domain/wordList";
import { checkLessonLimit, createLesson } from "../services/lessonCreationService";
import { generateQuiz } from "../services/quizGenerationService";
import { bucketImageUrl } from "../utils/images";
import { clearLessonDraft, loadLessonDraft, saveLessonDraft } from "../utils/lessonDraft";
import { formatDateKey, parseFutureDateKey, toDateKey } from "../utils/releaseDate";

// -- Types --------------------------------------------------------------------

type Step = "details" | "flashcards" | "activity" | "review";

type Flashcard = {
  id: number;
  term: string;
  definition: string;
  imageFile: File | null;
  imagePreview: string | null;
};
type ClassroomOption = { classroom_id: string; classroom_name: string };
type OptionKey = "option_a" | "option_b" | "option_c" | "option_d";

// An editable copy of a generated question. The id only exists in the browser
// (for React keys and edits) and is never saved.
type EditableQuestion = DraftQuestion & { id: number };

// -- Options and styles -------------------------------------------------------

const lessonCoverOptions = [
  { id: "typing", alt: "Learner typing illustration", path: "lessonImgs/girlTypingLANG.png" },
  { id: "level-one", alt: "Level one learning illustration", path: "lessonImgs/Level1.png" },
  {
    id: "travel",
    alt: "Travel vocabulary illustration",
    path: "lessonImgs/travel-illustration.avif",
  },
  {
    id: "business-illustration",
    alt: "Business illustration",
    path: "lessonImgs/business-illustration.avif",
  },
  {
    id: "business-commerce",
    alt: "Business commerce illustration",
    path: "lessonImgs/business_commerce.avif",
  },
  {
    id: "corporate-style",
    alt: "Corporate style lesson illustration",
    path: "lessonImgs/corporateStyleLessonIlustration.avif",
  },
  { id: "cute-brain", alt: "Cute brain illustration", path: "lessonImgs/cuteBrain.png" },
  {
    id: "friends-eating",
    alt: "Two friends eating burgers at a cafe table",
    path: "lessonImgs/hand-drawn-friends-eating-illustration.png",
  },
  {
    id: "man-reading",
    alt: "Man reading a book on a rug beside a cat",
    path: "lessonImgs/haninabz-man-reading.png",
  },
].map((cover) => ({ ...cover, image: bucketImageUrl(cover.path) }));

const stepLabels = ["Lesson details", "Flashcards", "MCQ activity", "Review & edit"];

const mcqFormatOptions: { id: QuizFormat; name: string; description: string }[] = [
  {
    id: "match-definition-mcq",
    name: "Match the definition",
    description: "Learners read a definition and choose the word it describes.",
  },
  {
    id: "fill-blank-mcq",
    name: "Fill in the blank",
    description: "Learners complete a sentence by choosing the missing word.",
  },
  {
    id: "mixed-mcq",
    name: "Mixed",
    description: "Both question types, taking turns, for more varied practice.",
  },
];

const optionKeys: OptionKey[] = ["option_a", "option_b", "option_c", "option_d"];

const PRIMARY_BUTTON =
  "flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300";
const BACK_BUTTON =
  "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100";

// Fields share one shape; only the border colours change.
const FIELD_BASE =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400";

const inputClassName = `${FIELD_BASE} border-slate-200 focus:border-violet-600`;

// The flashcard Term and Definition boxes focus in grey, like the word list box above them.
const flashcardInputClassName = `${FIELD_BASE} border-slate-200 focus:border-slate-500`;

// A field that breaks a rule after a failed Continue or Save: a solid red outline.
const INVALID_BORDER = "border-red-700 ring-1 ring-red-700 focus:border-red-700";

function fieldClassName(isInvalid: boolean, validClassName = inputClassName) {
  return isInvalid ? `${FIELD_BASE} ${INVALID_BORDER}` : validClassName;
}

// -- Helpers ------------------------------------------------------------------

function emptyFlashcard(id: number): Flashcard {
  return { id, term: "", definition: "", imageFile: null, imagePreview: null };
}

// A card the teacher has started: anything typed, or an image added.
function isStartedFlashcard(card: Flashcard) {
  return Boolean(card.term.trim() || card.definition.trim() || card.imageFile);
}

// -- Small building blocks ----------------------------------------------------

// Solid red with white text, so a problem can't be missed.
function FormError({ message, className = "" }: { message: string; className?: string }) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm ${className}`}
    >
      <AlertCircle size={18} className="mt-px shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

// Shown when quiz generation fails, in step 3 or after "Regenerate" in step 4.
function GenerationFailedNotice({ onUseFlashcardsOnly }: { onUseFlashcardsOnly: () => void }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <p className="leading-5">
        <span className="font-semibold">Something went wrong generating the activity.</span> Please
        try again, or{" "}
        <button
          type="button"
          onClick={onUseFlashcardsOnly}
          className="font-semibold underline underline-offset-2 transition hover:text-red-800"
        >
          create the lesson with flashcards only
        </button>
        .
      </p>
    </div>
  );
}

// -- Page ---------------------------------------------------------------------

export default function CreateLesson() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedClassroomId = searchParams.get("classroomId") ?? "";
  const userId = session?.user.id ?? "";

  // An unfinished lesson kept from before the page was reloaded or left, if
  // any (see utils/lessonDraft.ts). Read once; the state below starts from it,
  // so the teacher just carries on where they were.
  const [draft] = useState(() => loadLessonDraft(userId, requestedClassroomId));
  const [showDraftNotice, setShowDraftNotice] = useState(draft !== null);
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);

  // -- State: which step is showing --
  const [step, setStep] = useState<Step>(draft?.step ?? "details");

  // -- State: step 1, details --
  const [title, setTitle] = useState(draft?.title ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [classroomId, setClassroomId] = useState(draft?.classroomId || requestedClassroomId);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [coverId, setCoverId] = useState(draft?.coverId ?? lessonCoverOptions[0].id);
  const [lessonDocuments, setLessonDocuments] = useState<File[]>([]);
  // "" means today (release immediately); a day picked on the dashboard arrives
  // in the URL. A kept date that has since passed becomes today.
  const [releaseDate, setReleaseDate] = useState(() =>
    parseFutureDateKey(searchParams.get("releaseDate") ?? draft?.releaseDate ?? null),
  );

  // -- State: step 2, flashcards --
  // Starts empty: the teacher fills it from the word list box.
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() =>
    (draft?.flashcards ?? []).map((card) => ({ ...emptyFlashcard(card.id), ...card })),
  );

  // -- State: step 3, activity --
  // With includeMcq off, the lesson is saved without a quiz.
  const [includeMcq, setIncludeMcq] = useState(draft?.includeMcq ?? true);
  const [selectedMcqFormat, setSelectedMcqFormat] = useState<QuizFormat | null>(
    draft?.mcqFormat ?? null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);

  // -- State: step 4, review --
  const [generatedTitle, setGeneratedTitle] = useState(draft?.quizTitle ?? "");
  const [generatedQuestions, setGeneratedQuestions] = useState<EditableQuestion[]>(
    draft?.questions ?? [],
  );

  // -- State: shared --
  const [error, setError] = useState("");
  // After a Continue or Save that failed the text rules, fields at fault are
  // outlined in red; each outline clears as soon as its field is fixed.
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingLessonLimit, setIsCheckingLessonLimit] = useState(false);

  // -- Derived values --

  const activeStep =
    step === "details" ? 0 : step === "flashcards" ? 1 : step === "activity" ? 2 : 3;
  // Without an MCQ there is nothing to review, so the stepper drops its last step.
  const visibleStepLabels = includeMcq ? stepLabels : stepLabels.slice(0, 3);
  const selectedCover =
    lessonCoverOptions.find((cover) => cover.id === coverId) ?? lessonCoverOptions[0];
  const selectedClassroom = classrooms.find((classroom) => classroom.classroom_id === classroomId);
  const isClassroomLocked = Boolean(requestedClassroomId && selectedClassroom);
  // The date picker shows today while releaseDate is "" (release now).
  const todayKey = toDateKey(new Date());
  const saveLabel = releaseDate
    ? isSaving
      ? "Scheduling..."
      : "Schedule lesson"
    : isSaving
      ? "Creating..."
      : "Create lesson";

  // -- Fields at fault, for the red outlines --

  const isTitleInvalid = showFieldErrors && !isValidText(title, MIN_TITLE_LENGTH);
  const isDescriptionInvalid = showFieldErrors && !isValidText(description, MIN_DESCRIPTION_LENGTH);
  const isClassroomInvalid = showFieldErrors && !classroomId;
  const isQuizTitleInvalid = showFieldErrors && !isValidText(generatedTitle, MIN_TITLE_LENGTH);

  // A started card's term is at fault when it breaks the text rules or repeats
  // an earlier card's term; its definition when it breaks them or repeats the term.
  function flashcardFaults(card: Flashcard, index: number) {
    if (!showFieldErrors || !isStartedFlashcard(card)) {
      return { term: false, definition: false };
    }

    const repeatsEarlierTerm = flashcards
      .slice(0, index)
      .some((other) => isStartedFlashcard(other) && sameText(other.term, card.term));

    return {
      term: !isValidText(card.term) || repeatsEarlierTerm,
      definition: !isValidText(card.definition) || sameText(card.term, card.definition),
    };
  }

  // An option is at fault when it breaks the text rules or matches another option.
  function isOptionInvalid(question: EditableQuestion, optionKey: OptionKey) {
    if (!showFieldErrors) {
      return false;
    }

    const value = question[optionKey];
    const repeatsAnother = optionKeys.some(
      (otherKey) => otherKey !== optionKey && sameText(question[otherKey], value),
    );

    return !isValidText(value) || repeatsAnother;
  }

  // The teacher's classrooms, for the classroom picker. Keyed on the user's id,
  // so a refreshed session for the same teacher doesn't load them again.
  useEffect(() => {
    if (!userId) return;

    const loadClassrooms = async () => {
      try {
        setClassrooms(await getTeacherClassrooms(userId));
      } catch (loadError) {
        console.error("Failed to load classrooms:", loadError);
        setError("Your classrooms could not be loaded. Please try again.");
      }
    };

    void loadClassrooms();
  }, [userId]);

  // Keeps the form as a draft whenever it changes, once there's something
  // worth keeping. Pictures and PDFs are files, so they aren't kept.
  useEffect(() => {
    const hasContent = title.trim() || description.trim() || flashcards.some(isStartedFlashcard);
    if (!userId || !hasContent) {
      return;
    }

    saveLessonDraft(userId, {
      step,
      title,
      description,
      classroomId,
      coverId,
      releaseDate,
      flashcards: flashcards.map(({ id, term, definition }) => ({ id, term, definition })),
      includeMcq,
      mcqFormat: selectedMcqFormat,
      quizTitle: generatedTitle,
      questions: generatedQuestions,
    });
  }, [
    userId,
    step,
    title,
    description,
    classroomId,
    coverId,
    releaseDate,
    flashcards,
    includeMcq,
    selectedMcqFormat,
    generatedTitle,
    generatedQuestions,
  ]);

  // Throws the kept draft away and empties the form, back on the first step.
  function startOver() {
    clearLessonDraft(userId);

    // Image previews are temporary browser URLs, so release them.
    flashcards.forEach((card) => {
      if (card.imagePreview) {
        URL.revokeObjectURL(card.imagePreview);
      }
    });

    setStep("details");
    setTitle("");
    setDescription("");
    setClassroomId(requestedClassroomId);
    setCoverId(lessonCoverOptions[0].id);
    setLessonDocuments([]);
    setReleaseDate(parseFutureDateKey(searchParams.get("releaseDate")));
    setFlashcards([]);
    setIncludeMcq(true);
    setSelectedMcqFormat(null);
    setGeneratedTitle("");
    setGeneratedQuestions([]);
    setGenerationFailed(false);
    setError("");
    setShowFieldErrors(false);
    setShowDraftNotice(false);
    setConfirmingStartOver(false);
    window.scrollTo({ top: 0 });
  }

  // -- Step 2: flashcards --

  function updateFlashcard(id: number, field: "term" | "definition", value: string) {
    setFlashcards((cards) =>
      cards.map((card) => (card.id === id ? { ...card, [field]: value } : card)),
    );
  }

  // Cards from the word list box. They replace any blank cards added by hand
  // and go after the cards the teacher has started.
  function addWordListFlashcards(entries: WordEntry[]) {
    setError("");
    setFlashcards((cards) => {
      const startedCards = cards.filter(isStartedFlashcard);
      const addedCards = entries.map((entry, index) => ({
        ...emptyFlashcard(Date.now() + index),
        term: entry.word,
        definition: entry.definition,
      }));

      return [...startedCards, ...addedCards].slice(0, MAX_FLASHCARDS_PER_LESSON);
    });
  }

  function addFlashcard() {
    if (flashcards.length < MAX_FLASHCARDS_PER_LESSON) {
      setFlashcards((cards) => [...cards, emptyFlashcard(Date.now())]);
    }
  }

  // Any card can go, even the last: the word list box is always there to refill.
  function removeFlashcard(id: number) {
    setFlashcards((cards) => {
      const removedCard = cards.find((card) => card.id === id);
      if (removedCard?.imagePreview) URL.revokeObjectURL(removedCard.imagePreview);
      return cards.filter((card) => card.id !== id);
    });
  }

  // Sets or clears a card's image. Previews are temporary browser URLs, so
  // the old one is released whenever it is replaced.
  function setFlashcardImage(id: number, file: File | null) {
    setError("");
    if (file && (!file.type.startsWith("image/") || file.size > MAX_FLASHCARD_IMAGE_BYTES)) {
      setError("Flashcard images must be image files smaller than 5 MB.");
      return;
    }
    setFlashcards((cards) =>
      cards.map((card) => {
        if (card.id !== id) return card;
        if (card.imagePreview) URL.revokeObjectURL(card.imagePreview);
        return { ...card, imageFile: file, imagePreview: file ? URL.createObjectURL(file) : null };
      }),
    );
  }

  // Adds PDFs, skipping any already in the list (same name, size and date).
  function addLessonDocuments(files: File[]) {
    setError("");
    const invalidFile = files.find(
      (file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"),
    );
    if (invalidFile) {
      setError(`"${invalidFile.name}" is not a PDF document.`);
      return;
    }
    setLessonDocuments((current) => {
      const knownFiles = new Set(
        current.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
      );
      return [
        ...current,
        ...files.filter(
          (file) => !knownFiles.has(`${file.name}:${file.size}:${file.lastModified}`),
        ),
      ];
    });
  }

  function removeLessonDocument(fileToRemove: File) {
    setLessonDocuments((current) => current.filter((file) => file !== fileToRemove));
  }

  // -- Moving between steps --

  // Step 1 to 2: check the details, and that the classroom isn't at its lesson limit.
  async function continueToFlashcards() {
    if (!classroomId) {
      setError("Choose the classroom where this lesson will be created.");
      setShowFieldErrors(true);
      return;
    }
    const detailsProblem = lessonDetailsError(title, description);
    if (detailsProblem) {
      setError(detailsProblem);
      setShowFieldErrors(true);
      return;
    }
    setIsCheckingLessonLimit(true);

    try {
      await checkLessonLimit(classroomId);

      setError("");
      setShowFieldErrors(false);
      setStep("flashcards");
    } catch (limitError) {
      setError(
        errorMessage(limitError, "The lesson limit could not be checked. Please try again."),
      );
    } finally {
      setIsCheckingLessonLimit(false);
    }
  }

  // Step 2 to 3: blank cards are dropped; every started card (typed in, or
  // given an image) must pass the flashcard rules in lessonValidation.
  function continueToActivities() {
    const startedCards = flashcards.filter(isStartedFlashcard);
    const flashcardProblem = flashcardsError(startedCards);
    if (flashcardProblem) {
      setError(flashcardProblem);
      setShowFieldErrors(true);
      return;
    }
    setFlashcards(startedCards);
    setError("");
    setShowFieldErrors(false);
    setStep("activity");
  }

  // -- Step 3 to 4: generate the quiz with AI --

  // quizGenerationService asks the AI for the quiz and checks it; a good quiz
  // opens in the review step. Nothing is saved yet.
  async function generateActivity() {
    if (!selectedMcqFormat) return;
    setIsGenerating(true);
    setGenerationFailed(false);
    setError("");
    try {
      const quiz = await generateQuiz({
        format: selectedMcqFormat,
        flashcards,
        lessonTitle: title,
        lessonDescription: description,
      });

      setGeneratedTitle(quiz.title);
      setGeneratedQuestions(
        quiz.questions.map((question, index) => ({ ...question, id: index + 1 })),
      );
      setStep("review");
    } catch (generationError) {
      console.error("Failed to generate the quiz:", generationError);
      setGenerationFailed(true);
    } finally {
      setIsGenerating(false);
    }
  }

  // Fallback offered when generation fails: drop the MCQ and save flashcards only.
  function switchToFlashcardsOnly() {
    setGenerationFailed(false);
    setIncludeMcq(false);
    setStep("activity");
  }

  // -- Step 4: review --

  // Updates one field of one question: its text, an option, or the correct answer.
  function updateGeneratedQuestion(id: number, field: keyof DraftQuestion, value: string) {
    setGeneratedQuestions((questions) =>
      questions.map((question) =>
        question.id === id ? { ...question, [field]: value } : question,
      ),
    );
  }

  // -- Final save --
  // lessonAuthoringService saves the lesson, its PDFs, flashcards and quiz in
  // order, stopping at the first failure, then tells the students if the lesson
  // is released now.
  async function handleCreateLesson() {
    if (!classroomId) return;

    const quizProblem = includeMcq ? quizError(generatedTitle, generatedQuestions) : null;
    if (quizProblem) {
      setError(quizProblem);
      setShowFieldErrors(true);
      return;
    }
    setShowFieldErrors(false);

    setIsSaving(true);
    setError("");

    try {
      await createLesson({
        classroomId,
        title,
        description,
        coverImagePath: selectedCover.path,
        releaseDateKey: releaseDate,
        documents: lessonDocuments,
        flashcards,
        quiz: includeMcq ? { title: generatedTitle, questions: generatedQuestions } : null,
      });

      clearLessonDraft(userId);
      navigate(`/teacher-classroom/${classroomId}`);
    } catch (creationError) {
      console.error("Failed to create lesson:", creationError);
      setError(errorMessage(creationError, "The lesson could not be created."));
    } finally {
      setIsSaving(false);
    }
  }

  // -- Layout --

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to={classroomId ? `/teacher-classroom/${classroomId}` : "/TeacherClassroom"}
            aria-label="Go back"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={19} />
          </Link>
          <div>
            <p className="text-xs font-medium text-slate-500">Teacher portal</p>
            <h1 className="text-base font-bold sm:text-lg">Create lesson</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 max-w-2xl text-center sm:text-left">
          <h2 className="text-2xl font-bold sm:text-3xl">New lesson</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Set the lesson details, then add its flashcards and activity format.
          </p>
        </div>

        {/* Shown when an unfinished lesson was restored, with a way to discard it. */}
        {showDraftNotice && (
          <div
            role="status"
            className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="min-w-0 text-sm leading-5 text-slate-500">
              <span className="font-semibold text-slate-800">Draft restored.</span> Re-add any
              images or PDFs.
            </p>
            <button
              type="button"
              onClick={() => setConfirmingStartOver(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw size={14} /> Start over
            </button>
          </div>
        )}

        {
          // Step indicator: four steps, or three when the lesson has no quiz.
          // Phones show only the numbered circles.
        }
        <ol
          className={`relative mb-6 grid gap-2 before:absolute before:top-3.5 before:h-px before:bg-slate-200 sm:gap-4 sm:before:hidden ${includeMcq ? "grid-cols-4 before:left-[12.5%] before:right-[12.5%]" : "grid-cols-3 before:left-[16.67%] before:right-[16.67%]"}`}
          aria-label="Lesson creation progress"
        >
          {visibleStepLabels.map((label, index) => {
            const complete = index < activeStep;
            const current = index === activeStep;
            return (
              <li
                key={label}
                className="relative flex min-w-0 items-center justify-center gap-2 sm:justify-start"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete || current ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {complete ? <Check size={15} /> : index + 1}
                </span>
                <span
                  className={`hidden truncate text-sm font-semibold sm:block ${current ? "text-slate-900" : "text-slate-500"}`}
                >
                  {label}
                </span>
                {index < visibleStepLabels.length - 1 && (
                  <span className="hidden h-px min-w-2 flex-1 bg-slate-200 sm:block" />
                )}
              </li>
            );
          })}
        </ol>

        {
          // Step 1: lesson details
        }
        {step === "details" && (
          <section className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_240px] lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold">Lesson details</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Give learners a clear title and identify where this lesson belongs.
                </p>
              </div>
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Classroom</span>
                  {isClassroomLocked ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                      {selectedClassroom?.classroom_name}
                    </div>
                  ) : (
                    <select
                      value={classroomId}
                      onChange={(event) => setClassroomId(event.target.value)}
                      aria-invalid={isClassroomInvalid}
                      className={fieldClassName(isClassroomInvalid)}
                    >
                      <option value="">Select a classroom</option>
                      {classrooms.map((classroom) => (
                        <option key={classroom.classroom_id} value={classroom.classroom_id}>
                          {classroom.classroom_name}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="mt-1.5 block text-xs text-slate-500">
                    {isClassroomLocked
                      ? "This lesson will be added to the classroom you opened."
                      : "Choose the classroom that should contain this lesson."}
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Lesson title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={80}
                    placeholder="e.g. Essential travel vocabulary"
                    aria-invalid={isTitleInvalid}
                    className={fieldClassName(isTitleInvalid)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    maxLength={280}
                    placeholder="What will learners understand or practise in this lesson?"
                    aria-invalid={isDescriptionInvalid}
                    className={`${fieldClassName(isDescriptionInvalid)} resize-none`}
                  />
                </label>
                <div>
                  <label htmlFor="release-date" className="mb-2 block text-sm font-semibold">
                    Release date
                  </label>
                  <div className="flex gap-2">
                    {/* Defaults to today. Picking (or clearing back to) today
                        parses to "" so the lesson releases immediately. */}
                    <input
                      id="release-date"
                      type="date"
                      value={releaseDate || todayKey}
                      min={todayKey}
                      onChange={(event) => setReleaseDate(parseFutureDateKey(event.target.value))}
                      className={inputClassName}
                    />
                    {/* Only needed once a later day is picked, to jump back to today. */}
                    {releaseDate && (
                      <button
                        type="button"
                        onClick={() => setReleaseDate("")}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Release now
                      </button>
                    )}
                  </div>
                  <span className="mt-1.5 block text-xs text-slate-500">
                    {releaseDate
                      ? `Students can open this lesson from ${formatDateKey(releaseDate)}.`
                      : "Today: the lesson is released as soon as it is created."}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="block text-sm font-semibold">Lesson documents</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Attach PDF resources now or add them later from the lesson report.
                      </span>
                    </div>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                      <Paperclip size={15} /> Add PDFs
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          addLessonDocuments(Array.from(event.target.files ?? []));
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {lessonDocuments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {lessonDocuments.map((file) => (
                        <div
                          key={`${file.name}:${file.size}:${file.lastModified}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <FileText size={16} className="shrink-0 text-violet-700" />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeLessonDocument(file)}
                            aria-label={`Remove ${file.name}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {error && <FormError message={error} className="" />}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void continueToFlashcards()}
                    disabled={isCheckingLessonLimit}
                    className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
                  >
                    {isCheckingLessonLimit ? "Checking..." : "Continue"} <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>
            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold">Lesson cover</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Choose an image learners can recognise.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {lessonCoverOptions.map((cover) => (
                  <button
                    key={cover.id}
                    type="button"
                    aria-label={`Use ${cover.alt} as the lesson cover`}
                    aria-pressed={coverId === cover.id}
                    onClick={() => setCoverId(cover.id)}
                    className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition ${coverId === cover.id ? "border-slate-800" : "border-transparent hover:border-slate-300"}`}
                  >
                    <img src={cover.image} alt={cover.alt} className="h-full w-full object-cover" />
                    {coverId === cover.id && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-slate-800" />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <img
                  src={selectedCover.image}
                  alt={selectedCover.alt}
                  className="aspect-[16/9] w-full object-cover"
                />
                <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                  Selected cover: {selectedCover.alt}
                </p>
              </div>
            </aside>
          </section>
        )}

        {
          // Step 2: flashcards
        }
        {step === "flashcards" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-lg font-bold">Flashcards</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Add up to {MAX_FLASHCARDS_PER_LESSON} term and definition pairs. They're used to
                  make the lesson's activity. Images are optional and enable the matching activity.
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-500">
                {flashcards.length} of {MAX_FLASHCARDS_PER_LESSON}
              </span>
            </div>

            <div className="mt-5">
              <FlashcardListInput
                existingTerms={flashcards.map((card) => card.term)}
                freeSlots={MAX_FLASHCARDS_PER_LESSON - flashcards.filter(isStartedFlashcard).length}
                onAdd={addWordListFlashcards}
              />
            </div>

            <h4 className="mt-6 text-sm font-bold text-slate-700">Your flashcards</h4>
            {flashcards.length === 0 && (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Your flashcards will appear here once you add them above.
              </p>
            )}
            <div className="mt-3 space-y-3">
              {flashcards.map((card, index) => (
                <div key={card.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Flashcard {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFlashcard(card.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 ease-out hover:bg-red-600 hover:text-white focus-visible:bg-red-600 focus-visible:text-white focus-visible:outline-none"
                      aria-label={`Remove flashcard ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Term
                      </span>
                      <input
                        value={card.term}
                        onChange={(event) => updateFlashcard(card.id, "term", event.target.value)}
                        placeholder="e.g. Itinerary"
                        aria-invalid={flashcardFaults(card, index).term}
                        className={fieldClassName(
                          flashcardFaults(card, index).term,
                          flashcardInputClassName,
                        )}
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Definition
                      </span>
                      <input
                        value={card.definition}
                        onChange={(event) =>
                          updateFlashcard(card.id, "definition", event.target.value)
                        }
                        placeholder="A planned route or journey"
                        aria-invalid={flashcardFaults(card, index).definition}
                        className={fieldClassName(
                          flashcardFaults(card, index).definition,
                          flashcardInputClassName,
                        )}
                      />
                    </label>
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Image (optional)
                      </span>
                      {card.imagePreview ? (
                        <div className="relative h-24 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <img
                            src={card.imagePreview}
                            alt="Flashcard preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFlashcardImage(card.id, null)}
                            aria-label={`Remove image from flashcard ${index + 1}`}
                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs font-semibold text-slate-600 transition hover:border-slate-500">
                          <ImagePlus size={20} className="mb-1" /> Add image
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => {
                              setFlashcardImage(card.id, event.target.files?.[0] ?? null);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {flashcards.length < MAX_FLASHCARDS_PER_LESSON && (
              <button
                type="button"
                onClick={addFlashcard}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={17} /> Add a blank card
              </button>
            )}
            {error && <FormError message={error} className="mt-4" />}
            <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowFieldErrors(false);
                  setStep("details");
                }}
                className={BACK_BUTTON}
              >
                <ChevronLeft size={17} /> Back
              </button>
              <button type="button" onClick={continueToActivities} className={PRIMARY_BUTTON}>
                Choose activity <ChevronRight size={17} />
              </button>
            </div>
          </section>
        )}

        {
          // Step 3: choose the MCQ format, then generate it with AI
        }
        {step === "activity" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="max-w-xl">
              <h3 className="text-xl font-bold">Choose the MCQ activity</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your lesson has {flashcards.length} flashcard{flashcards.length === 1 ? "" : "s"}.{" "}
                {includeMcq
                  ? "Select the question format to generate from them."
                  : "Students will study the flashcards without a quiz."}
              </p>
            </div>
            <div className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <p id="include-mcq-label" className="text-sm font-bold">
                  Include an MCQ activity
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Turn this off to create a flashcards-only lesson. Flashcards-only lessons have no
                  quiz, so no scores are recorded for them.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeMcq}
                aria-labelledby="include-mcq-label"
                onClick={() => {
                  setError("");
                  setGenerationFailed(false);
                  setIncludeMcq((current) => !current);
                }}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${includeMcq ? "bg-slate-800" : "bg-slate-300"}`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${includeMcq ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            {includeMcq && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {mcqFormatOptions.map((format) => {
                  const selected = selectedMcqFormat === format.id;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => setSelectedMcqFormat(format.id)}
                      className={`flex flex-col rounded-lg border p-4 text-left transition sm:p-5 ${selected ? "border-slate-800 bg-slate-50 ring-2 ring-slate-100" : "border-slate-200 hover:border-slate-400"}`}
                      aria-pressed={selected}
                    >
                      <h4 className="font-bold">{format.name}</h4>
                      <p className="mt-2 text-sm leading-5 text-slate-500">{format.description}</p>
                    </button>
                  );
                })}
              </div>
            )}
            {generationFailed && (
              <GenerationFailedNotice onUseFlashcardsOnly={switchToFlashcardsOnly} />
            )}
            {error && <FormError message={error} className="mt-4" />}
            <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setGenerationFailed(false);
                  setStep("flashcards");
                }}
                className={BACK_BUTTON}
              >
                <ChevronLeft size={17} /> Edit flashcards
              </button>
              {includeMcq ? (
                <button
                  type="button"
                  disabled={!selectedMcqFormat || isGenerating}
                  onClick={generateActivity}
                  className={PRIMARY_BUTTON}
                >
                  {isGenerating ? "Generating..." : "Generate activity"}{" "}
                  {!isGenerating && <ChevronRight size={17} />}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCreateLesson}
                  className={PRIMARY_BUTTON}
                >
                  {saveLabel}
                </button>
              )}
            </div>
          </section>
        )}

        {
          // Step 4: review and edit the generated quiz before saving
        }
        {step === "review" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start">
              <div className="max-w-xl">
                <h3 className="text-lg font-bold">Review the generated activity</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Check the questions Gemini created from your flashcards and edit anything before
                  it's saved.
                </p>
              </div>
              <button
                type="button"
                onClick={generateActivity}
                disabled={isGenerating}
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <Sparkles size={15} /> {isGenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>

            <label className="mt-5 block max-w-md">
              <span className="mb-2 block text-sm font-semibold">Activity title</span>
              <input
                value={generatedTitle}
                onChange={(event) => setGeneratedTitle(event.target.value)}
                maxLength={100}
                placeholder="e.g. Travel vocabulary check"
                aria-invalid={isQuizTitleInvalid}
                className={fieldClassName(isQuizTitleInvalid)}
              />
            </label>

            <div className="mt-5 space-y-3">
              {generatedQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Question {index + 1}</span>
                  </div>
                  <label className="mb-3 block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Question text
                    </span>
                    <textarea
                      value={question.question_text}
                      onChange={(event) =>
                        updateGeneratedQuestion(question.id, "question_text", event.target.value)
                      }
                      rows={2}
                      aria-invalid={showFieldErrors && !isValidText(question.question_text)}
                      className={`${fieldClassName(
                        showFieldErrors && !isValidText(question.question_text),
                      )} resize-none`}
                    />
                  </label>
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Options: mark the correct answer
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {optionKeys.map((optionKey, optionIndex) => {
                      const letter = ANSWER_OPTIONS[optionIndex];
                      const isCorrect = question.correct_option === letter;
                      const isInvalid = isOptionInvalid(question, optionKey);
                      return (
                        <label
                          key={optionKey}
                          className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 transition ${isInvalid ? INVALID_BORDER : `focus-within:border-violet-600 ${isCorrect ? "border-slate-800" : "border-slate-200"}`}`}
                        >
                          <input
                            type="radio"
                            name={`correct-option-${question.id}`}
                            checked={isCorrect}
                            onChange={() =>
                              updateGeneratedQuestion(question.id, "correct_option", letter)
                            }
                            className="h-4 w-4 accent-slate-800"
                            aria-label={`Mark option ${letter} as correct for question ${index + 1}`}
                          />
                          <span className="w-4 shrink-0 text-xs font-bold text-slate-500">
                            {letter}
                          </span>
                          <input
                            value={question[optionKey]}
                            onChange={(event) =>
                              updateGeneratedQuestion(question.id, optionKey, event.target.value)
                            }
                            placeholder={`Option ${letter}`}
                            aria-invalid={isInvalid}
                            className="w-full flex-1 border-none bg-transparent p-0 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {generationFailed && (
              <GenerationFailedNotice onUseFlashcardsOnly={switchToFlashcardsOnly} />
            )}
            {error && <FormError message={error} className="mt-4" />}
            <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowFieldErrors(false);
                  setGenerationFailed(false);
                  setStep("activity");
                }}
                className={BACK_BUTTON}
              >
                <ChevronLeft size={17} /> Back
              </button>
              <button
                type="button"
                disabled={isSaving || isGenerating}
                onClick={handleCreateLesson}
                className={PRIMARY_BUTTON}
              >
                {saveLabel}
              </button>
            </div>
          </section>
        )}
      </main>

      <ConfirmDialog
        open={confirmingStartOver}
        isDeleting={false}
        onCancel={() => setConfirmingStartOver(false)}
        onConfirm={startOver}
        title="Start a new lesson?"
        description="This clears everything in this draft and takes you back to the first step. It can't be undone."
        confirmLabel="Start over"
        deletingLabel="Clearing..."
      />
    </div>
  );
}
