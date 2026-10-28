import { afterEach, describe, expect, test, vi } from "vitest";
import { ENGLISH_SPEECH, hasVoiceFor, pickVoice, speakText } from "../../src/utils/speech";

// Voices as devices report them. Android often uses underscores ("fr_FR").
const voice = (lang: string, name = lang) => ({ lang, name });

describe("pickVoice", () => {
  test("Test A - The exact language and region wins", () => {
    const voices = [voice("fr-CA"), voice("fr-FR"), voice("en-GB")];

    expect(pickVoice(voices, "fr-FR")?.lang).toBe("fr-FR");
  });

  test("Test B - Android-style names match, whatever the case or separator", () => {
    expect(pickVoice([voice("ru_RU")], "ru-RU")?.lang).toBe("ru_RU");
    expect(pickVoice([voice("ES-es")], "es-ES")?.lang).toBe("ES-es");
  });

  test("Test C - Without the exact region, the same language from another region is used", () => {
    // Many phones only have Brazilian Portuguese, not European.
    expect(pickVoice([voice("en-US"), voice("pt-BR")], "pt-PT")?.lang).toBe("pt-BR");
    expect(pickVoice([voice("en-US")], ENGLISH_SPEECH)?.lang).toBe("en-US");
  });

  test("Test D - A language never matches a different one that starts the same way", () => {
    // Finnish ("fi") must not be read by a Filipino ("fil") voice.
    expect(pickVoice([voice("fil-PH")], "fi-FI")).toBeNull();
  });

  test("Test E - No voice for the language, or no voices at all, gives null", () => {
    expect(pickVoice([voice("en-GB"), voice("fr-FR")], "ru-RU")).toBeNull();
    expect(pickVoice([], "fr-FR")).toBeNull();
  });
});

describe("hasVoiceFor", () => {
  test("Test A - True when a voice for the language is installed", () => {
    expect(hasVoiceFor([voice("es_ES")], "es-ES")).toBe(true);
  });

  test("Test B - False when the voices have loaded and none speaks it", () => {
    expect(hasVoiceFor([voice("en-GB"), voice("fr-FR")], "ru-RU")).toBe(false);
  });

  test("Test C - True while the voices haven't loaded, so no warning shows too early", () => {
    expect(hasVoiceFor([], "ru-RU")).toBe(true);
  });
});

// -- speakText, with the browser's speech replaced by a fake ------------------------

type FakeUtterance = { text: string; lang: string; voice: unknown };

function installFakeSpeech(voices: { lang: string; name: string }[]) {
  const spoken: FakeUtterance[] = [];
  const synth = {
    cancel: vi.fn(),
    speak: vi.fn((utterance: FakeUtterance) => spoken.push(utterance)),
    getVoices: () => voices,
  };

  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      lang = "";
      voice: unknown = null;

      constructor(text: string) {
        this.text = text;
      }
    },
  );

  return { synth, spoken };
}

describe("speakText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("Test A - Reads in the given language with the matching voice", () => {
    const { spoken } = installFakeSpeech([voice("en-GB"), voice("fr_FR", "Amélie")]);

    expect(speakText("facture", "fr-FR")).toBe(true);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatchObject({ text: "facture", lang: "fr-FR", voice: { name: "Amélie" } });
  });

  test("Test B - Stops anything already being read first", () => {
    const { synth } = installFakeSpeech([voice("en-GB")]);

    speakText("invoice", ENGLISH_SPEECH);

    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(synth.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      synth.speak.mock.invocationCallOrder[0],
    );
  });

  test("Test C - Before the voices load, the language alone guides the browser", () => {
    const { spoken } = installFakeSpeech([]);

    speakText("счёт", "ru-RU");

    expect(spoken[0]).toMatchObject({ lang: "ru-RU", voice: null });
  });

  test("Test D - Empty or blank text reads nothing", () => {
    const { synth } = installFakeSpeech([voice("en-GB")]);

    expect(speakText("", ENGLISH_SPEECH)).toBe(false);
    expect(speakText("   ", ENGLISH_SPEECH)).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  test("Test E - A browser without speech reads nothing and doesn't crash", () => {
    vi.stubGlobal("window", {});

    expect(speakText("invoice", ENGLISH_SPEECH)).toBe(false);
  });
});
