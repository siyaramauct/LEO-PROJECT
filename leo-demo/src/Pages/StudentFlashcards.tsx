import { ArrowLeft, Check, ChevronLeft, ChevronRight, Volume2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentBottomNav from "../Components/StudentBottomNav";
const speak = (text: string) => {
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(speech);
};

const cards = [
  {
    word: "Nucleus",
    definition:
      "The control center of a cell that contains genetic material and regulates the cell’s activities.",
  },
  {
    word: "Mitochondria",
    definition: "The part of a cell that releases energy from food for the cell to use.",
  },
  {
    word: "Cytoplasm",
    definition: "The jelly-like material inside a cell where many chemical reactions take place.",
  },
];

export default function StudentFlashcards() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const card = cards[index];
  const progress = ((index + 1) / cards.length) * 100;

  function advance(direction: -1 | 1) {
    setIndex((current) => Math.min(Math.max(current + direction, 0), cards.length - 1));
    setShowDefinition(false);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/student/dashboard")}
              aria-label="Back to dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>
              <h1 className="mt-1 text-base font-bold">Flashcard practice</h1>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold">Cell structure</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review key vocabulary from your current lesson.
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-600">
                {index + 1} of {cards.length}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-700 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
          <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <button
              type="button"
              onClick={() => setShowDefinition((visible) => !visible)}
              className="min-h-80 rounded-xl border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:border-violet-200 sm:p-8"
            >
              <span className="inline-flex rounded-lg bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {showDefinition ? "Definition" : "Word"}
              </span>
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <h2 className="max-w-full break-words text-3xl font-bold sm:text-4xl">
                  {showDefinition ? card.definition : card.word}
                </h2>
                {!showDefinition && (
                  <button
                    type="button"
                    aria-label={`Read ${card.word} aloud`}
                    onClick={(event) => {
                      event.stopPropagation();
                      speak(card.word);
                    }}
                    className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-violet-700 transition hover:bg-violet-50"
                  >
                    <Volume2 size={20} />
                  </button>
                )}
                <p className="mt-7 text-xs text-slate-500">
                  Select the card to {showDefinition ? "show the word" : "reveal the definition"}.
                </p>
              </div>
            </button>
            <aside className="rounded-xl border border-slate-100 bg-white p-5">
              <h2 className="text-sm font-bold">Mark your recall</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use your answer to move through the study set.
              </p>
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => advance(1)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X size={17} /> Need practice
                </button>
                <button
                  type="button"
                  onClick={() => advance(1)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
                >
                  <Check size={17} /> I know this
                </button>
              </div>
            </aside>
          </section>
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => advance(-1)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} /> Previous
            </button>
            <button
              type="button"
              disabled={index === cards.length - 1}
              onClick={() => advance(1)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
