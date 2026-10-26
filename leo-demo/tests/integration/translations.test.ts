// -----------------------------------------------------------------------------
// Translation Tests
//
// Flashcard translations through the app's real service
// (src/services/translationService.ts) and the shared cache it reads and
// writes (src/data/translations.ts), signed in as students so RLS applies.
//
// The AI is replaced with a mock (vi.mock below): each test decides what "the
// AI" replies, so the tests are fast, free and repeatable, while the cache,
// RLS and the service's own logic all run for real.
// -----------------------------------------------------------------------------

import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { askAi } from "../../src/data/ai";
import { DataError } from "../../src/data/errors";
import { cacheTranslation, getCachedTranslation } from "../../src/data/translations";
import { translateFlashcard } from "../../src/services/translationService";
import { supabase } from "../../src/supabase-client";
import {
  admin,
  seedClassroom,
  seedEnrolment,
  seedFlashcards,
  seedLesson,
  seedUser,
  signInAs,
  type TestUser,
} from "./helpers";

// Replace the AI with a mock for this whole file. translationService imports
// askAi from this module, so it gets the mock too.
vi.mock("../../src/data/ai", () => ({ askAi: vi.fn() }));

const mockedAskAi = vi.mocked(askAi);

// -- Shared steps ---------------------------------------------------------------------

let teacher: TestUser;
let student: TestUser; // Enrolled in the classroom.
let classmate: TestUser; // Also enrolled.
let classroomId: string;

beforeAll(async () => {
  teacher = await seedUser("teacher");
  student = await seedUser("student");
  classmate = await seedUser("student");

  classroomId = await seedClassroom(teacher, "Business English");
  await seedEnrolment(student, classroomId);
  await seedEnrolment(classmate, classroomId);
});

beforeEach(() => {
  mockedAskAi.mockReset();
});

// A released lesson with one flashcard to translate. Each test gets its own
// card, so cached translations from one test can't affect another.
async function newFlashcard(word = "invoice", { scheduled = false } = {}) {
  const lessonId = await seedLesson(classroomId, { scheduled });
  const [card] = await seedFlashcards(lessonId, [word]);

  return card;
}

// What translateFlashcard needs, for a card and a language.
function translateInput(card: { flashcard_id: string; word: string; definition: string }) {
  return {
    flashcardId: card.flashcard_id,
    word: card.word,
    definition: card.definition,
    languageCode: "fr",
    languageName: "French",
  };
}

// The cached row, read as admin so RLS can't hide it.
async function cachedRow(flashcardId: string, languageCode: string) {
  const { data } = await admin
    .from("flashcard_translations")
    .select("translated_word, translated_definition")
    .eq("flashcard_id", flashcardId)
    .eq("language_code", languageCode)
    .maybeSingle();

  return data;
}

// -- Translating a flashcard ----------------------------------------------------------

describe("Translating a flashcard", () => {
  test("Test A - The first request asks the AI, returns its translation and saves it", async () => {
    const card = await newFlashcard();
    mockedAskAi.mockResolvedValue({ word: "facture", definition: "Une note envoyée à un client" });

    await signInAs(student);
    const translation = await translateFlashcard(translateInput(card));

    expect(translation).toEqual({ word: "facture", definition: "Une note envoyée à un client" });

    // The prompt names the language and includes the card's word and definition.
    expect(mockedAskAi).toHaveBeenCalledTimes(1);
    const prompt = mockedAskAi.mock.calls[0][0];
    expect(prompt).toContain("French");
    expect(prompt).toContain('"invoice"');
    expect(prompt).toContain(`"${card.definition}"`);

    expect(await cachedRow(card.flashcard_id, "fr")).toEqual({
      translated_word: "facture",
      translated_definition: "Une note envoyée à un client",
    });
  });

  test("Test B - The next student gets the saved translation without asking the AI", async () => {
    const card = await newFlashcard();
    mockedAskAi.mockResolvedValue({ word: "facture", definition: "Une note envoyée à un client" });

    await signInAs(student);
    await translateFlashcard(translateInput(card));

    await signInAs(classmate);
    const translation = await translateFlashcard(translateInput(card));

    expect(translation.word).toBe("facture");
    expect(mockedAskAi).toHaveBeenCalledTimes(1); // Only the first student's request.
  });

  test("Test C - Each language is saved separately", async () => {
    const card = await newFlashcard();
    mockedAskAi
      .mockResolvedValueOnce({ word: "facture", definition: "Une note" })
      .mockResolvedValueOnce({ word: "factura", definition: "Una nota" });

    await signInAs(student);
    await translateFlashcard(translateInput(card));
    const spanish = await translateFlashcard({
      ...translateInput(card),
      languageCode: "es",
      languageName: "Spanish",
    });

    expect(spanish.word).toBe("factura");
    expect(mockedAskAi).toHaveBeenCalledTimes(2);
    expect((await cachedRow(card.flashcard_id, "es"))?.translated_word).toBe("factura");
  });

  test("Test D - An incomplete AI reply is refused, and nothing is saved", async () => {
    const card = await newFlashcard();
    mockedAskAi.mockResolvedValue({ word: "facture", definition: "   " });

    await signInAs(student);
    await expect(translateFlashcard(translateInput(card))).rejects.toThrow(
      "The AI returned an incomplete translation.",
    );

    expect(await cachedRow(card.flashcard_id, "fr")).toBeNull();
  });

  test("Test E - When the AI can't be reached, the student sees why, and nothing is saved", async () => {
    const card = await newFlashcard();
    mockedAskAi.mockRejectedValue(
      new DataError("The AI request could not be completed. Please try again."),
    );

    await signInAs(student);
    await expect(translateFlashcard(translateInput(card))).rejects.toThrow(
      "The AI request could not be completed.",
    );

    expect(await cachedRow(card.flashcard_id, "fr")).toBeNull();
  });

  // Guards migration 20261026130000: the table accepts every language the
  // flashcards offer (languageOptions in src/Components/Flashcard.tsx).
  test("Test F - Russian and Portuguese translations are saved like the others", async () => {
    const card = await newFlashcard();
    mockedAskAi
      .mockResolvedValueOnce({ word: "счёт", definition: "Документ для оплаты" })
      .mockResolvedValueOnce({ word: "fatura", definition: "Um documento de cobrança" });

    await signInAs(student);
    await translateFlashcard({
      ...translateInput(card),
      languageCode: "ru",
      languageName: "Russian",
    });
    await translateFlashcard({
      ...translateInput(card),
      languageCode: "pt",
      languageName: "Portuguese",
    });

    expect(await cachedRow(card.flashcard_id, "ru")).not.toBeNull();
    expect(await cachedRow(card.flashcard_id, "pt")).not.toBeNull();
  });
});

// -- Fetching and saving translations -------------------------------------------------

describe("Fetching and saving translations", () => {
  test("Test A - Nothing is found before a card is translated; the saved one after", async () => {
    const card = await newFlashcard();

    await signInAs(student);
    expect(await getCachedTranslation(card.flashcard_id, "fr")).toBeNull();

    await cacheTranslation(card.flashcard_id, "fr", { word: "facture", definition: "Une note" });

    expect(await getCachedTranslation(card.flashcard_id, "fr")).toEqual({
      word: "facture",
      definition: "Une note",
    });
  });

  test("Test B - When two students save at once, the first translation is kept", async () => {
    const card = await newFlashcard();

    await signInAs(student);
    await cacheTranslation(card.flashcard_id, "fr", { word: "facture", definition: "Une note" });

    await signInAs(classmate);
    await cacheTranslation(card.flashcard_id, "fr", { word: "addition", definition: "Autre" });

    expect((await cachedRow(card.flashcard_id, "fr"))?.translated_word).toBe("facture");
  });

  test("Test C - A student can't overwrite a saved translation", async () => {
    const card = await newFlashcard();

    await signInAs(student);
    await cacheTranslation(card.flashcard_id, "fr", { word: "facture", definition: "Une note" });

    await signInAs(classmate);
    // RLS doesn't raise an error for a refused update; it changes nothing.
    await supabase
      .from("flashcard_translations")
      .update({ translated_word: "vandalised" })
      .eq("flashcard_id", card.flashcard_id);

    expect((await cachedRow(card.flashcard_id, "fr"))?.translated_word).toBe("facture");
  });
});
