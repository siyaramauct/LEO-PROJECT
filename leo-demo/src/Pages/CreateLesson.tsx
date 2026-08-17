import { useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  FileImage,
  ImagePlus,
  Layers3,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react";

type Step = "details" | "flashcards" | "activity";

type Flashcard = {
  id: number;
  term: string;
  definition: string;
};

type McqFormat = {
  id: "basic-mcq" | "fill-blank-mcq";
  name: string;
  description: string;
  icon: typeof Layers3;
};

const mcqFormats: McqFormat[] = [
  { id: "basic-mcq", name: "Basic multiple choice", description: "Learners choose the correct term or definition from a set of answer options.", icon: BookOpen },
  { id: "fill-blank-mcq", name: "Fill in the blank", description: "Learners complete a sentence or definition by choosing the missing word from answer options.", icon: WandSparkles },
];

const stepLabels = ["Lesson details", "Flashcards", "MCQ activity"];

export default function CreateLesson() {
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([{ id: 1, term: "", definition: "" }]);
  const [selectedMcqFormat, setSelectedMcqFormat] = useState<McqFormat["id"] | null>(null);
  const [error, setError] = useState("");

  const activeStep = step === "details" ? 0 : step === "flashcards" ? 1 : 2;

  function updateFlashcard(id: number, field: "term" | "definition", value: string) {
    setFlashcards((cards) => cards.map((card) => (card.id === id ? { ...card, [field]: value } : card)));
  }

  function addFlashcard() {
    if (flashcards.length < 15) setFlashcards((cards) => [...cards, { id: Date.now(), term: "", definition: "" }]);
  }

  function removeFlashcard(id: number) {
    if (flashcards.length > 1) setFlashcards((cards) => cards.filter((card) => card.id !== id));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  }

  function continueToFlashcards() {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Go back" onClick={() => window.history.back()} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></button>
            <div><p className="text-xs font-semibold text-violet-700">Teacher Portal</p><h1 className="text-base font-bold sm:text-lg">Create a lesson</h1></div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><Sparkles size={16} className="text-violet-700" /> Build a learning activity</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-7 max-w-2xl"><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Make a lesson your learners will remember.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Add the lesson context, create up to 15 flashcards, then choose the MCQ activity generated from them.</p></div>

        <ol className="mb-7 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Lesson creation progress">
          {stepLabels.map((label, index) => {
            const complete = index < activeStep;
            const current = index === activeStep;
            return <li key={label} className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete || current ? "bg-violet-700 text-white" : "bg-slate-200 text-slate-500"}`}>{complete ? <Check size={15} /> : index + 1}</span><span className={`hidden text-sm font-semibold sm:block ${current ? "text-slate-900" : "text-slate-500"}`}>{label}</span>{index < stepLabels.length - 1 && <span className="h-px flex-1 bg-slate-200" />}</li>;
          })}
        </ol>

        {step === "details" && (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6"><h3 className="text-lg font-bold">Lesson details</h3><p className="mt-1 text-sm text-slate-500">Start with the information learners will see before they begin.</p></div>
              <div className="space-y-5">
                <label className="block"><span className="mb-2 block text-sm font-semibold">Lesson title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="e.g. Essential travel vocabulary" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-700 focus:ring-2 focus:ring-violet-100" /></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={280} placeholder="What will learners understand or practise in this lesson?" className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-700 focus:ring-2 focus:ring-violet-100" /></label>
                {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}
                <div className="flex justify-end"><button type="button" onClick={continueToFlashcards} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 sm:w-auto">Continue to flashcards <ChevronRight size={17} /></button></div>
              </div>
            </div>
            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><FileImage size={18} className="text-violet-700" /><h3 className="font-bold">Lesson image</h3></div><p className="mt-1 text-sm leading-5 text-slate-500">Optional. Use an image to make the lesson easier to recognise.</p><label className="mt-4 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-violet-300 hover:bg-violet-50">{imagePreview ? <img src={imagePreview} alt="Lesson cover preview" className="h-full w-full object-cover" /> : <><span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700"><ImagePlus size={21} /></span><span className="mt-3 text-sm font-semibold text-slate-700">Upload a cover image</span><span className="mt-1 text-xs text-slate-500">PNG, JPG, or WEBP</span></>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="sr-only" /></label>{imagePreview && <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-violet-700"><Upload size={16} /> Replace image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="sr-only" /></label>}</aside>
          </section>
        )}

        {step === "flashcards" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end"><div><h3 className="text-lg font-bold">Build your flashcards</h3><p className="mt-1 text-sm text-slate-500">Choose the terms and explanations learners need. You can add up to 15 cards.</p></div><span className="w-fit rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800">{flashcards.length} / 15 cards</span></div>
            <div className="mt-5 space-y-4">{flashcards.map((card, index) => <div key={card.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold text-slate-700">Flashcard {index + 1}</span>{flashcards.length > 1 && <button type="button" onClick={() => removeFlashcard(card.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove flashcard ${index + 1}`}><Trash2 size={16} /></button>}</div><div className="grid gap-3 md:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Term</span><input value={card.term} onChange={(event) => updateFlashcard(card.id, "term", event.target.value)} placeholder="e.g. Itinerary" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Definition</span><input value={card.definition} onChange={(event) => updateFlashcard(card.id, "definition", event.target.value)} placeholder="A planned route or journey" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100" /></label></div></div>)}</div>
            {flashcards.length < 15 && <button type="button" onClick={addFlashcard} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 transition hover:border-violet-700 hover:bg-violet-100"><Plus size={17} /> Add another flashcard</button>}
            {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}
            <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row"><button type="button" onClick={() => { setError(""); setStep("details"); }} className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><ChevronLeft size={17} /> Back</button><button type="button" onClick={continueToActivities} className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800">Choose MCQ format <ChevronRight size={17} /></button></div>
          </section>
        )}

        {step === "activity" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800"><Sparkles size={15} /> Flashcards complete</span><h3 className="mt-4 text-xl font-bold sm:text-2xl">Choose an MCQ activity format.</h3><p className="mt-2 text-sm leading-6 text-slate-500">Your lesson, <strong className="font-semibold text-slate-700">{title}</strong>, has {flashcards.length} flashcard{flashcards.length === 1 ? "" : "s"}. Select the question format to generate from these cards.</p></div><div className="mt-6 grid gap-4 md:grid-cols-2">{mcqFormats.map((format) => { const Icon = format.icon; const selected = format.id === selectedMcqFormat; return <button key={format.id} type="button" onClick={() => setSelectedMcqFormat(format.id)} className={`relative min-h-52 rounded-lg border p-5 text-left transition ${selected ? "border-violet-700 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"}`} aria-pressed={selected}><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-600"}`}><Icon size={20} /></span><h4 className="mt-5 font-bold">{format.name}</h4><p className="mt-2 text-sm leading-5 text-slate-500">{format.description}</p>{selected && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-700 text-white"><Check size={14} /></span>}</button>; })}</div><div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><button type="button" onClick={() => setStep("flashcards")} className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><ChevronLeft size={17} /> Edit flashcards</button>{selectedMcqFormat ? <p className="flex items-center justify-center gap-2 text-sm font-semibold text-violet-800"><Check size={17} /> MCQ format selected. Ready for generation.</p> : <p className="text-center text-sm text-slate-500">Choose the MCQ format you want to generate.</p>}</div></section>
        )}
      </main>
    </div>
  );
}