import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { notifyClassroomStudents } from "../notifications";
import { supabase } from "../supabase-client";

/* ------------------------------------------------------------------------ */
/*  Types                                                                    */
/* ------------------------------------------------------------------------ */

// Added "review" as a 4th step: the AI-generated MCQ lands here so the
// teacher can edit it before anything is written to the database.
type Step = "details" | "flashcards" | "activity" | "review";

type Flashcard = { id: number; term: string; definition: string };
type ClassroomOption = { classroom_id: string; classroom_name: string };
type McqFormat = "basic-mcq" | "fill-blank-mcq";
type OptionKey = "option_a" | "option_b" | "option_c" | "option_d";
type CorrectOption = "A" | "B" | "C" | "D";

type GeneratedQuestion = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: CorrectOption;
};
type GeneratedMcq = { title: string; questions: GeneratedQuestion[] };

// Local, editable copy of a generated question. The `id` is only used for
// React keys and field updates in the review step — it is never sent to the DB.
type EditableQuestion = GeneratedQuestion & { id: number };

/* ------------------------------------------------------------------------ */
/*  Constants                                                                */
/* ------------------------------------------------------------------------ */

const lessonCoverOptions = [
  { id: "typing", alt: "Learner typing illustration", path: "lessonImgs/girlTypingLANG.png" },
  { id: "level-one", alt: "Level one learning illustration", path: "lessonImgs/Level1.png" },
  { id: "travel", alt: "Travel vocabulary illustration", path: "lessonImgs/travel-illustration.avif" },
  { id: "business-illustration", alt: "Business illustration", path: "lessonImgs/business-illustration.avif" },
  { id: "business-eng", alt: "Business English illustration", path: "lessonImgs/businessEng.avif" },
  { id: "corporate-style", alt: "Corporate style lesson illustration", path: "lessonImgs/corporateStyleLessonIlustration.avif" },
  { id: "cute-brain", alt: "Cute brain illustration", path: "lessonImgs/cuteBrain.png" },
].map((cover) => ({
  ...cover,
  image: supabase.storage.from("images").getPublicUrl(cover.path).data.publicUrl,
}));

const stepLabels = ["Lesson details", "Flashcards", "MCQ activity", "Review & edit"];

const mcqFormatOptions: { id: McqFormat; name: string; description: string }[] = [
  { id: "basic-mcq", name: "Basic multiple choice", description: "Learners choose the correct term or definition from the answers." },
  { id: "fill-blank-mcq", name: "Fill in the blank", description: "Learners complete a sentence by choosing the missing word." },
];

const optionKeys: OptionKey[] = ["option_a", "option_b", "option_c", "option_d"];
const correctOptions: CorrectOption[] = ["A", "B", "C", "D"];

const inputClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-700 focus:ring-2 focus:ring-slate-100";

/* ------------------------------------------------------------------------ */
/*  Helpers                                                                  */
/* ------------------------------------------------------------------------ */

// Parses and validates the raw AI response into a well-formed GeneratedMcq.
// Throws if the shape doesn't match what the form (and the DB) expects.
function parseGeneratedMcq(result: unknown, expectedQuestions: number): GeneratedMcq {
  const content = typeof result === "string" ? result : JSON.stringify(result);
  const json = content.replace(/^```json\s*|^```|```$/g, "").trim();
  const generated = JSON.parse(json) as GeneratedMcq;
  const validOptions = ["A", "B", "C", "D"];

  if (!generated.title?.trim() || !Array.isArray(generated.questions) || generated.questions.length !== expectedQuestions) {
    throw new Error(`Gemini must return exactly ${expectedQuestions} questions.`);
  }

  const hasInvalidQuestion = generated.questions.some((question) =>
    !question.question_text?.trim()
    || !question.option_a?.trim()
    || !question.option_b?.trim()
    || !question.option_c?.trim()
    || !question.option_d?.trim()
    || !validOptions.includes(question.correct_option),
  );

  if (hasInvalidQuestion) throw new Error("Gemini returned an incomplete question.");
  return generated;
}

// Builds the Gemini prompt from the current flashcards + chosen format.
function buildMcqPrompt(format: McqFormat, flashcards: Flashcard[]): string {
  return `You are an experienced language educator and teacher. Create a strictly language learning  ${format === "basic-mcq" ? "multiple-choice" : "fill-in-the-blank multiple-choice"} activity from the ${flashcards.length} flashcards below. Create exactly one question per flashcard and use each flashcard once. Every question must have one correct answer and three plausible but clearly incorrect filler answers. Return only valid JSON with no Markdown or code fences, using this exact schema: {"title":"string","questions":[{"question_text":"string","option_a":"string","option_b":"string","option_c":"string","option_d":"string","correct_option":"A|B|C|D"}]}. The questions array must contain exactly ${flashcards.length} items. The value of correct_option must match the option that contains the correct answer. Flashcards: ${JSON.stringify(flashcards.map(({ term, definition }) => ({ term, definition })))} . Focus on the language learning aspect of the activity not the general concepts themselves.`;
}

// Validates the teacher-edited questions before they're saved to the DB.
function findIncompleteQuestion(title: string, questions: EditableQuestion[]): boolean {
  if (!title.trim() || !questions.length) return true;
  return questions.some((question) =>
    !question.question_text.trim()
    || !question.option_a.trim()
    || !question.option_b.trim()
    || !question.option_c.trim()
    || !question.option_d.trim()
    || !correctOptions.includes(question.correct_option),
  );
}

/* ------------------------------------------------------------------------ */
/*  Component                                                                */
/* ------------------------------------------------------------------------ */

export default function CreateLesson() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedClassroomId = searchParams.get("classroomId") ?? "";

  // ---- Step / navigation state ----
  const [step, setStep] = useState<Step>("details");

  // ---- Step 1: lesson details state ----
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classroomId, setClassroomId] = useState(requestedClassroomId);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [coverId, setCoverId] = useState(lessonCoverOptions[0].id);

  // ---- Step 2: flashcards state ----
  const [flashcards, setFlashcards] = useState<Flashcard[]>([{ id: 1, term: "", definition: "" }]);

  // ---- Step 3: activity format state ----
  const [selectedMcqFormat, setSelectedMcqFormat] = useState<McqFormat | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ---- Step 4: review & edit AI-generated MCQ state ----
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<EditableQuestion[]>([]);

  // ---- Shared state ----
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeStep = step === "details" ? 0 : step === "flashcards" ? 1 : step === "activity" ? 2 : 3;
  const selectedCover = lessonCoverOptions.find((cover) => cover.id === coverId) ?? lessonCoverOptions[0];
  const selectedClassroom = classrooms.find((classroom) => classroom.classroom_id === classroomId);
  const isClassroomLocked = Boolean(requestedClassroomId && selectedClassroom);

  useEffect(() => {
    if (!session?.user) return;
    const loadClassrooms = async () => {
      const { data, error: loadError } = await supabase.from("classrooms").select("classroom_id, classroom_name").eq("teacher_id", session.user.id).order("classroom_name");
      if (loadError) {
        setError("Your classrooms could not be loaded. Please try again.");
        return;
      }
      setClassrooms((data ?? []) as ClassroomOption[]);
    };
    void loadClassrooms();
  }, [session?.user]);

  /* ---------------------------------------------------------------------- */
  /*  Step 2 handlers: flashcards                                           */
  /* ---------------------------------------------------------------------- */

  function updateFlashcard(id: number, field: "term" | "definition", value: string) {
    setFlashcards((cards) => cards.map((card) => (card.id === id ? { ...card, [field]: value } : card)));
  }

  function addFlashcard() {
    if (flashcards.length < 15) setFlashcards((cards) => [...cards, { id: Date.now(), term: "", definition: "" }]);
  }

  function removeFlashcard(id: number) {
    if (flashcards.length > 1) setFlashcards((cards) => cards.filter((card) => card.id !== id));
  }

  /* ---------------------------------------------------------------------- */
  /*  Step navigation                                                       */
  /* ---------------------------------------------------------------------- */

  function continueToFlashcards() {
    if (!classroomId) {
      setError("Choose the classroom where this lesson will be created.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Add a title and a short description before continuing.");
      return;
    }
    setError("");
    setStep("flashcards");
  }

  function continueToActivities() {
    const completedCards = flashcards.filter((card) => card.term.trim() || card.definition.trim());
    const hasIncompleteCard = completedCards.some((card) => !card.term.trim() || !card.definition.trim());
    if (!completedCards.length || hasIncompleteCard) {
      setError("Add at least one complete flashcard with both a term and definition.");
      return;
    }
    setFlashcards(completedCards);
    setError("");
    setStep("activity");
  }

  /* ---------------------------------------------------------------------- */
  /*  Step 3 -> Step 4: generate the MCQ activity with AI                   */
  /* ---------------------------------------------------------------------- */

  // Calls the Gemini edge function and, on success, loads the result into the
  // editable review-step state instead of saving it straight to the database.
  async function generateActivity() {
    if (!selectedMcqFormat) return;
    setIsGenerating(true);
    setError("");
    try {
      const prompt = buildMcqPrompt(selectedMcqFormat, flashcards);
      const { data, error: functionError } = await supabase.functions.invoke("gemini-API-Query", {
        body: { prompt },
      });

      if (functionError) throw new Error(`Could not generate the activity: ${functionError.message}`);
      const generatedMcq = parseGeneratedMcq(data?.result, flashcards.length);

      setGeneratedTitle(generatedMcq.title.trim());
      setGeneratedQuestions(generatedMcq.questions.map((question, index) => ({ ...question, id: index + 1 })));
      setStep("review");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "The activity could not be generated.");
    } finally {
      setIsGenerating(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Step 4 handlers: review & edit the generated MCQ                      */
  /* ---------------------------------------------------------------------- */

  // Generic field updater for a single generated question — handles the
  // question text, any of the four options, and the correct-option marker.
  function updateGeneratedQuestion(id: number, field: keyof GeneratedQuestion, value: string) {
    setGeneratedQuestions((questions) => questions.map((question) => (question.id === id ? { ...question, [field]: value } : question)));
  }

  /* ---------------------------------------------------------------------- */
  /*  Final save: persist lesson, flashcards, and the edited MCQ            */
  /* ---------------------------------------------------------------------- */

  // Note: the AI call has already happened in generateActivity(). This
  // function only persists whatever the teacher has reviewed/edited.
  async function createLesson() {
    if (!classroomId) return;
    if (findIncompleteQuestion(generatedTitle, generatedQuestions)) {
      setError("Give the activity a title and fill in every question and option before saving.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const { data: lesson, error: lessonError } = await supabase.from("lessons").insert({
        classroom_id: classroomId,
        title: title.trim(),
        description: description.trim(),
        lesson_image_path: selectedCover.path,
      }).select("lesson_id").single();

      if (lessonError || !lesson) throw new Error(lessonError?.message ?? "The lesson could not be created.");
      const { error: flashcardError } = await supabase.from("flashcards").insert(flashcards.map((flashcard) => ({
        lesson_id: lesson.lesson_id,
        word: flashcard.term.trim(),
        definition: flashcard.definition.trim(),
      })));

      if (flashcardError) throw new Error(flashcardError.message);
      const { data: mcq, error: mcqError } = await supabase.from("mcqs").insert({
        lesson_id: lesson.lesson_id,
        score_ceiling: generatedQuestions.length,
        title: generatedTitle.trim(),
      }).select("mcq_id").single();

      if (mcqError || !mcq) throw new Error(mcqError?.message ?? "The MCQ activity could not be created.");
      const { error: questionError } = await supabase.from("questions").insert(generatedQuestions.map((question) => ({
        mcq_id: mcq.mcq_id,
        question_text: question.question_text.trim(),
        option_a: question.option_a.trim(),
        option_b: question.option_b.trim(),
        option_c: question.option_c.trim(),
        option_d: question.option_d.trim(),
        correct_option: question.correct_option,
      })));

      if (questionError) throw new Error(questionError.message);

      // Best-effort: notification delivery should never block lesson creation.
      await notifyClassroomStudents(classroomId, {
        type: "new_lesson",
        title: "New lesson available",
        body: `Your teacher added "${title.trim()}".`,
        link_url: `/lesson/${lesson.lesson_id}`,
      });

      navigate(`/teacher-classroom/${classroomId}`);
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : "The lesson could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6"><Link to={classroomId ? `/teacher-classroom/${classroomId}` : "/TeacherClassroom"} aria-label="Go back" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link><div><p className="text-xs font-medium text-slate-500">Teacher portal</p><h1 className="text-base font-bold sm:text-lg">Create lesson</h1></div></div></header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 max-w-2xl text-center sm:text-left"><h2 className="text-2xl font-bold sm:text-3xl">New lesson</h2><p className="mt-2 text-sm leading-6 text-slate-500">Set the lesson details, then add its flashcards and activity format.</p></div>

        {/* Stepper — now 4 steps wide to include the review stage */}
        <ol className="relative mb-6 grid grid-cols-4 gap-2 before:absolute before:left-[12.5%] before:right-[12.5%] before:top-3.5 before:h-px before:bg-slate-200 sm:gap-4 sm:before:hidden" aria-label="Lesson creation progress">{stepLabels.map((label, index) => { const complete = index < activeStep; const current = index === activeStep; return <li key={label} className="relative flex min-w-0 items-center justify-center gap-2 sm:justify-start"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete || current ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500"}`}>{complete ? <Check size={15} /> : index + 1}</span><span className={`hidden truncate text-sm font-semibold sm:block ${current ? "text-slate-900" : "text-slate-500"}`}>{label}</span>{index < stepLabels.length - 1 && <span className="hidden h-px min-w-2 flex-1 bg-slate-200 sm:block" />}</li>; })}</ol>

        {/* Step 1: lesson details */}
        {step === "details" && <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-6"><h3 className="text-lg font-bold">Lesson details</h3><p className="mt-1 text-sm text-slate-500">Give learners a clear title and identify where this lesson belongs.</p></div><div className="space-y-5"><label className="block"><span className="mb-2 block text-sm font-semibold">Classroom</span>{isClassroomLocked ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">{selectedClassroom?.classroom_name}</div> : <select value={classroomId} onChange={(event) => setClassroomId(event.target.value)} className={inputClassName}><option value="">Select a classroom</option>{classrooms.map((classroom) => <option key={classroom.classroom_id} value={classroom.classroom_id}>{classroom.classroom_name}</option>)}</select>}<span className="mt-1.5 block text-xs text-slate-500">{isClassroomLocked ? "This lesson will be added to the classroom you opened." : "Choose the classroom that should contain this lesson."}</span></label><label className="block"><span className="mb-2 block text-sm font-semibold">Lesson title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="e.g. Essential travel vocabulary" className={inputClassName} /></label><label className="block"><span className="mb-2 block text-sm font-semibold">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={280} placeholder="What will learners understand or practise in this lesson?" className={`${inputClassName} resize-none`} /></label>{error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</p>}<div className="flex justify-end"><button type="button" onClick={continueToFlashcards} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto">Continue <ChevronRight size={17} /></button></div></div></div><aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold">Lesson cover</h3><p className="mt-1 text-sm leading-5 text-slate-500">Choose an image learners can recognise.</p><div className="mt-4 grid grid-cols-3 gap-2">{lessonCoverOptions.map((cover) => <button key={cover.id} type="button" aria-label={`Use ${cover.alt} as the lesson cover`} aria-pressed={coverId === cover.id} onClick={() => setCoverId(cover.id)} className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition ${coverId === cover.id ? "border-slate-800" : "border-transparent hover:border-slate-300"}`}><img src={cover.image} alt={cover.alt} className="h-full w-full object-cover" />{coverId === cover.id && <span className="absolute inset-x-0 bottom-0 h-1 bg-slate-800" />}</button>)}</div><div className="mt-4 overflow-hidden rounded-lg border border-slate-200"><img src={selectedCover.image} alt={selectedCover.alt} className="aspect-[16/9] w-full object-cover" /><p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">Selected cover: {selectedCover.alt}</p></div></aside></section>}

        {/* Step 2: flashcards */}
        {step === "flashcards" && <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end"><div><h3 className="text-lg font-bold">Flashcards</h3><p className="mt-1 text-sm text-slate-500">Add up to 15 term and definition pairs.</p></div><span className="text-sm font-semibold text-slate-500">{flashcards.length} of 15</span></div><div className="mt-5 space-y-3">{flashcards.map((card, index) => <div key={card.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold text-slate-700">Flashcard {index + 1}</span>{flashcards.length > 1 && <button type="button" onClick={() => removeFlashcard(card.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700" aria-label={`Remove flashcard ${index + 1}`}><Trash2 size={16} /></button>}</div><div className="grid gap-3 md:grid-cols-2"><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Term</span><input value={card.term} onChange={(event) => updateFlashcard(card.id, "term", event.target.value)} placeholder="e.g. Itinerary" className={inputClassName} /></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Definition</span><input value={card.definition} onChange={(event) => updateFlashcard(card.id, "definition", event.target.value)} placeholder="A planned route or journey" className={inputClassName} /></label></div></div>)}</div>{flashcards.length < 15 && <button type="button" onClick={addFlashcard} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Plus size={17} /> Add flashcard</button>}{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</p>}<div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row"><button type="button" onClick={() => { setError(""); setStep("details"); }} className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><ChevronLeft size={17} /> Back</button><button type="button" onClick={continueToActivities} className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Choose activity <ChevronRight size={17} /></button></div></section>}

        {/* Step 3: choose the MCQ format, then generate it with AI */}
        {step === "activity" && <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="max-w-xl"><h3 className="text-xl font-bold">Choose the MCQ activity</h3><p className="mt-2 text-sm leading-6 text-slate-500">Your lesson has {flashcards.length} flashcard{flashcards.length === 1 ? "" : "s"}. Select the question format to generate from them.</p></div><div className="mt-6 grid gap-3 md:grid-cols-2">{mcqFormatOptions.map((format) => { const selected = selectedMcqFormat === format.id; return <button key={format.id} type="button" onClick={() => setSelectedMcqFormat(format.id)} className={`min-h-36 rounded-lg border p-5 text-left transition ${selected ? "border-slate-800 bg-slate-50 ring-2 ring-slate-100" : "border-slate-200 hover:border-slate-400"}`} aria-pressed={selected}><h4 className="font-bold">{format.name}</h4><p className="mt-2 text-sm leading-5 text-slate-500">{format.description}</p>{selected && <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700"><Check size={15} /> Selected</span>}</button>; })}</div>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</p>}<div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><button type="button" onClick={() => setStep("flashcards")} className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><ChevronLeft size={17} /> Edit flashcards</button><button type="button" disabled={!selectedMcqFormat || isGenerating} onClick={generateActivity} className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isGenerating ? "Generating..." : "Generate activity"} {!isGenerating && <ChevronRight size={17} />}</button></div></section>}

        {/* Step 4 (new): review and edit the AI-generated MCQ before saving */}
        {step === "review" && <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start"><div className="max-w-xl"><h3 className="text-lg font-bold">Review the generated activity</h3><p className="mt-1 text-sm text-slate-500">Check the questions Gemini created from your flashcards and edit anything before it's saved.</p></div><button type="button" onClick={generateActivity} disabled={isGenerating} className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"><Sparkles size={15} /> {isGenerating ? "Regenerating..." : "Regenerate"}</button></div>

          <label className="mt-5 block max-w-md"><span className="mb-2 block text-sm font-semibold">Activity title</span><input value={generatedTitle} onChange={(event) => setGeneratedTitle(event.target.value)} maxLength={100} placeholder="e.g. Travel vocabulary check" className={inputClassName} /></label>

          <div className="mt-5 space-y-3">{generatedQuestions.map((question, index) => <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold text-slate-700">Question {index + 1}</span></div><label className="mb-3 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Question text</span><textarea value={question.question_text} onChange={(event) => updateGeneratedQuestion(question.id, "question_text", event.target.value)} rows={2} className={`${inputClassName} resize-none`} /></label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Options — mark the correct answer</span><div className="grid gap-2 sm:grid-cols-2">{optionKeys.map((optionKey, optionIndex) => { const letter = correctOptions[optionIndex]; const isCorrect = question.correct_option === letter; return <label key={optionKey} className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 transition ${isCorrect ? "border-slate-800" : "border-slate-200"}`}><input type="radio" name={`correct-option-${question.id}`} checked={isCorrect} onChange={() => updateGeneratedQuestion(question.id, "correct_option", letter)} className="h-4 w-4 accent-slate-800" aria-label={`Mark option ${letter} as correct for question ${index + 1}`} /><span className="w-4 shrink-0 text-xs font-bold text-slate-500">{letter}</span><input value={question[optionKey]} onChange={(event) => updateGeneratedQuestion(question.id, optionKey, event.target.value)} placeholder={`Option ${letter}`} className="w-full flex-1 border-none bg-transparent p-0 text-sm text-slate-800 outline-none placeholder:text-slate-400" /></label>; })}</div></div>)}</div>

          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</p>}
          <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><button type="button" onClick={() => { setError(""); setStep("activity"); }} className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><ChevronLeft size={17} /> Back</button><button type="button" disabled={isSaving || isGenerating} onClick={createLesson} className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isSaving ? "Creating..." : "Create lesson"}</button></div>
        </section>}
      </main>
    </div>
  );
}