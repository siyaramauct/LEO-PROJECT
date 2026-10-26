// -----------------------------------------------------------------------------
// Flashcard
//
// One study card that flips over when clicked. The front shows the word (and
// an optional image); the back shows the definition. Both sides can be read
// aloud, and the back can be translated into French, Russian, Spanish or
// Portuguese.
//
// How the flip works:
//   The outer div is the click target. The inner div holds both faces stacked
//   on top of each other and keeps them in 3D space (preserve-3d). The back
//   face starts rotated 180 degrees, and both faces hide their reverse side
//   (backface-visibility: hidden), so only one is visible at a time. Flipping
//   rotates the inner div by 180 degrees over 500ms, turning the back to face
//   the viewer. Space and Enter flip the card too, for keyboard users.
//
// How translation works:
//   1. Each language is fetched once per card and kept in state.
//   2. The shared flashcard_translations table is checked first.
//   3. Otherwise the Gemini edge function translates the card, and the result
//      is saved to that table for the next student.
//
// Used by: FlashActivity
// -----------------------------------------------------------------------------

import { useState } from "react";
import { LanguageIcon, SpeakerWaveIcon } from "@heroicons/react/24/outline";
import type { Translation } from "../data/translations";
import { translateFlashcard } from "../services/translationService";
import { errorMessage } from "../data/errors";

// -- Translation languages ----------------------------------------------------

type LanguageCode = "fr" | "ru" | "es" | "pt";

const languageOptions: { code: LanguageCode; label: string; name: string }[] = [
  { code: "fr", label: "FR", name: "French" },
  { code: "ru", label: "RU", name: "Russian" },
  { code: "es", label: "ES", name: "Spanish" },
  { code: "pt", label: "PT", name: "Portuguese" },
];

// -- Styles -------------------------------------------------------------------

const READ_ALOUD_BUTTON =
  "mt-4 flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700";

// -- Component ----------------------------------------------------------------

type FlashcardProps = {
  word: string;
  definition: string;
  flashcardId?: string; // Needed for translation; without it the language buttons are hidden.
  imageUrl?: string | null;
};

export default function Flashcard({ word, definition, flashcardId, imageUrl }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode | null>(null);
  const [translations, setTranslations] = useState<Partial<Record<LanguageCode, Translation>>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");

  // Reads text aloud with the browser's built-in speech, stopping anything
  // already being read first.
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  // Shows the card in another language, or back in English if that language
  // is already showing.
  async function handleTranslate(language: LanguageCode) {
    if (!flashcardId) return;
    setTranslationError("");

    // Clicking the active language switches back to English.
    if (activeLanguage === language) {
      setActiveLanguage(null);
      return;
    }

    // Already translated during this visit: just show it.
    if (translations[language]) {
      setActiveLanguage(language);
      return;
    }

    setIsTranslating(true);

    try {
      // translationService uses a saved translation, or asks the AI and saves it.
      const languageName =
        languageOptions.find((option) => option.code === language)?.name ?? language;

      const translation = await translateFlashcard({
        flashcardId,
        word,
        definition,
        languageCode: language,
        languageName,
      });

      setTranslations((current) => ({ ...current, [language]: translation }));
      setActiveLanguage(language);
    } catch (error) {
      setTranslationError(
        errorMessage(error, "This flashcard couldn't be translated. Please try again."),
      );
    } finally {
      setIsTranslating(false);
    }
  }

  // What the card shows: the active translation, or the original English.
  const activeTranslation = activeLanguage ? translations[activeLanguage] : undefined;
  const displayedWord = activeTranslation?.word ?? word;
  const displayedDefinition = activeTranslation?.definition ?? definition;

  const flip = () => setFlipped((current) => !current);

  // -- Front face: image, word and read-aloud --

  const front = (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-white rounded-lg shadow-md p-4 [backface-visibility:hidden]">
      {imageUrl && (
        <img src={imageUrl} alt="" className="mb-4 h-32 w-full rounded-lg object-cover" />
      )}
      <h1 className="text-2xl font-bold">{displayedWord}</h1>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation(); // Don't flip the card.
          speak(displayedWord);
        }}
        aria-label={`Read ${displayedWord} aloud`}
        className={READ_ALOUD_BUTTON}
      >
        <SpeakerWaveIcon className="h-5 w-5 text-white" />
        Read word
      </button>
    </div>
  );

  // -- Back face: definition, read-aloud, translation and dictionary link --
  // Pre-rotated 180 degrees so it faces the viewer once the card is flipped.

  const back = (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-lg shadow-md p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
      {activeTranslation && (
        <p className="text-sm font-semibold text-violet-700">{displayedWord}</p>
      )}
      <p className="text-lg font-bold text-center text-gray-700">{displayedDefinition}</p>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          speak(displayedDefinition);
        }}
        aria-label="Read definition aloud"
        className={READ_ALOUD_BUTTON}
      >
        <SpeakerWaveIcon className="h-5 w-5 text-white" />
        Read definition
      </button>

      {flashcardId && (
        // Clicks inside the language picker must not flip the card.
        <div
          className="mt-4 flex flex-col items-center gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-1.5">
            <LanguageIcon className="h-4 w-4 text-slate-400" />
            {languageOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                disabled={isTranslating}
                onClick={() => void handleTranslate(option.code)}
                aria-label={`Translate to ${option.name}`}
                aria-pressed={activeLanguage === option.code}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  activeLanguage === option.code
                    ? "bg-violet-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {isTranslating && <p className="text-xs text-slate-400">Translating...</p>}
          {translationError && (
            <p className="max-w-64 text-center text-xs text-red-600">{translationError}</p>
          )}
        </div>
      )}

      <a
        href={`https://www.oxfordlearnersdictionaries.com/definition/english/${word.toLowerCase()}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="mt-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Learn more
      </a>
    </div>
  );

  // -- Card --
  // The outer div is the click target; the inner div is the layer that rotates.

  return (
    <div
      className="w-full max-w-80 h-80 cursor-pointer"
      onClick={flip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault(); // Stop Space from scrolling the page.
          flip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={flipped ? "Show word" : "Show definition"}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {front}
        {back}
      </div>
    </div>
  );
}
