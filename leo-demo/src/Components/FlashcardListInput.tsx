// -----------------------------------------------------------------------------
// Flashcard List Input
//
// The main way a teacher adds flashcards in Create Lesson: type or paste a
// list of words with their definitions (see src/domain/wordList.ts for what a
// list can look like), and each line becomes a card in the editable list below.
// A word without a definition still becomes a card, for the teacher to finish.
//
// Words already on a card are skipped, and only as many words as there are free
// card slots are used. A summary under the box says what will be added first.
//
// Used by: CreateLesson
// -----------------------------------------------------------------------------

import { useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { MAX_FLASHCARDS_PER_LESSON } from "../domain/limits";
import { parseWordList, type WordEntry } from "../domain/wordList";

type FlashcardListInputProps = {
  existingTerms: string[]; // Words already on a card, which are skipped.
  freeSlots: number; // How many more cards the lesson can take.
  onAdd: (entries: WordEntry[]) => void;
};

const PLACEHOLDER = `passport - an official document for travelling abroad
itinerary: a plan of a journey
boarding pass - the ticket you show to get on a plane`;

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default function FlashcardListInput({
  existingTerms,
  freeSlots,
  onAdd,
}: FlashcardListInputProps) {
  const [text, setText] = useState("");
  const [addedMessage, setAddedMessage] = useState("");

  // -- What the list will become, worked out as the teacher types --

  const knownTerms = new Set(existingTerms.map((term) => term.trim().toLowerCase()));
  const listedEntries = parseWordList(text);
  const newEntries = listedEntries.filter((entry) => !knownTerms.has(entry.word.toLowerCase()));
  const entriesToAdd = newEntries.slice(0, Math.max(freeSlots, 0));

  const alreadyOnCards = listedEntries.length - newEntries.length;
  const overLimit = newEntries.length - entriesToAdd.length;
  const missingDefinitions = entriesToAdd.filter((entry) => !entry.definition).length;

  // -- Adding the cards --

  function addFlashcards() {
    if (entriesToAdd.length === 0) {
      return;
    }

    onAdd(entriesToAdd);
    setText("");
    setAddedMessage(
      missingDefinitions > 0
        ? `Added ${plural(entriesToAdd.length, "flashcard")} below. Fill in the ${plural(missingDefinitions, "missing definition")}.`
        : `Added ${plural(entriesToAdd.length, "flashcard")} below.`,
    );
  }

  // Ctrl+Enter (Cmd+Enter on a Mac) adds the cards without reaching for the mouse.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      addFlashcards();
    }
  }

  // -- Layout --

  return (
    <section
      aria-labelledby="flashcard-list-heading"
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <h4 id="flashcard-list-heading" className="text-sm font-bold text-slate-800">
        Type or paste your flashcards
      </h4>
      <p className="mt-1 text-sm leading-5 text-slate-500">
        One per line, with the definition after a dash or colon. A word on its own becomes a card
        for you to finish below.
      </p>

      <label className="mt-4 block">
        <span className="sr-only">Words and definitions</span>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setAddedMessage("");
          }}
          onKeyDown={handleKeyDown}
          rows={6}
          placeholder={PLACEHOLDER}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
        />
      </label>

      {/* What the list will become, so there are no surprises. */}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs leading-5 text-slate-500" aria-live="polite">
          {freeSlots <= 0 ? (
            <p>
              This lesson already has {MAX_FLASHCARDS_PER_LESSON} flashcards, the most it can hold.
            </p>
          ) : entriesToAdd.length === 0 ? (
            <p>
              {alreadyOnCards > 0
                ? "Every word in the list is already on a flashcard."
                : `Up to ${plural(freeSlots, "more flashcard")} can be added.`}
            </p>
          ) : (
            <>
              <p className="font-semibold text-slate-700">
                {plural(entriesToAdd.length, "flashcard")}
                {missingDefinitions > 0 && ` · ${missingDefinitions} without a definition yet`}
              </p>
              {alreadyOnCards > 0 && (
                <p>{plural(alreadyOnCards, "word")} already on a flashcard will be skipped.</p>
              )}
              {overLimit > 0 && (
                <p className="text-amber-700">
                  A lesson holds {MAX_FLASHCARDS_PER_LESSON} flashcards, so the last{" "}
                  {plural(overLimit, "word")} won't be added.
                </p>
              )}
            </>
          )}
          {addedMessage && (
            <p className="flex items-center gap-1 font-semibold text-slate-800">
              <Check size={14} className="shrink-0" /> {addedMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={addFlashcards}
          disabled={entriesToAdd.length === 0}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {entriesToAdd.length > 0
            ? `Add ${plural(entriesToAdd.length, "flashcard")}`
            : "Add flashcards"}
        </button>
      </div>
    </section>
  );
}
