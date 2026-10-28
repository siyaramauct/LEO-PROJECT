// -----------------------------------------------------------------------------
// Speech
//
// Reads flashcards aloud with the browser's built-in speech (the Web Speech
// API). Each piece of text is spoken in its own language: English for the
// cards themselves, and the translation's language when one is showing.
// Without a language, phones read everything in their default voice, so a
// French translation would come out in an English accent, or not at all.
//
// The voice is picked from those installed on the device: the exact language
// and region if there is one (fr-FR), otherwise the same language from another
// region (fr-CA). Devices name voices differently ("fr-FR", "fr_FR", "FR-fr"),
// so names are compared without regard to case or separator.
//
// Some browsers have no speech at all; then nothing is read and the read-aloud
// buttons are hidden (see canSpeak).
// -----------------------------------------------------------------------------

// The cards are written in English.
export const ENGLISH_SPEECH = "en-GB";

type VoiceLike = { lang: string };

// "fr_FR" and "FR-fr" both become "fr-fr".
function normalise(tag: string) {
  return tag.trim().toLowerCase().replace(/_/g, "-");
}

// The language part of a tag: "fr" from "fr-FR". Compared whole, so Finnish
// ("fi") never matches Filipino ("fil").
function languageOf(tag: string) {
  return normalise(tag).split("-")[0];
}

// The best installed voice for a language, or null if the device has none.
export function pickVoice<Voice extends VoiceLike>(
  voices: readonly Voice[],
  lang: string,
): Voice | null {
  const exact = voices.find((voice) => normalise(voice.lang) === normalise(lang));
  if (exact) {
    return exact;
  }

  return voices.find((voice) => languageOf(voice.lang) === languageOf(lang)) ?? null;
}

// Whether the device can read this language aloud. Browsers load their voices
// a moment after the page, so an empty list means "not known yet", not "none".
export function hasVoiceFor(voices: readonly VoiceLike[], lang: string): boolean {
  return voices.length === 0 || pickVoice(voices, lang) !== null;
}

// True when this browser can speak at all.
export function canSpeak(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

// The voices installed on the device; empty if there's no speech or they
// haven't loaded yet.
export function installedVoices(): SpeechSynthesisVoice[] {
  return canSpeak() ? window.speechSynthesis.getVoices() : [];
}

// Reads text aloud in a language, stopping anything already being read.
// Returns false, reading nothing, when there's no speech or no text.
export function speakText(text: string, lang: string): boolean {
  if (!canSpeak() || !text.trim()) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  // No matching voice: the browser still chooses one from the language alone.
  const voice = pickVoice(window.speechSynthesis.getVoices(), lang);
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}
