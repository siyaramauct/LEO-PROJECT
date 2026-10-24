import { describe, expect, test } from "vitest";
import { parseWordList } from "../../src/domain/wordList";

describe("parseWordList", () => {
  test("Test A - one word per line gives words that still need definitions", () => {
    expect(parseWordList("itinerary\npassport\n")).toEqual([
      { word: "itinerary", definition: "" },
      { word: "passport", definition: "" },
    ]);
  });

  test("Test B - a dash, colon, equals sign or tab separates a word from its definition", () => {
    const list = [
      "passport - an official travel document",
      "visa: permission to enter a country",
      "fare = the price of a journey",
      "luggage\tbags you travel with",
      "customs – where bags are checked",
    ].join("\n");

    expect(parseWordList(list)).toEqual([
      { word: "passport", definition: "an official travel document" },
      { word: "visa", definition: "permission to enter a country" },
      { word: "fare", definition: "the price of a journey" },
      { word: "luggage", definition: "bags you travel with" },
      { word: "customs", definition: "where bags are checked" },
    ]);
  });

  test("Test C - a hyphen inside a word is not a separator", () => {
    expect(parseWordList("check-in\nwell-known")).toEqual([
      { word: "check-in", definition: "" },
      { word: "well-known", definition: "" },
    ]);
  });

  test("Test D - a comma- or semicolon-separated line gives one word each", () => {
    expect(parseWordList("apple, banana; cherry")).toEqual([
      { word: "apple", definition: "" },
      { word: "banana", definition: "" },
      { word: "cherry", definition: "" },
    ]);
  });

  test("Test E - commas inside a definition stay in the definition", () => {
    expect(parseWordList("receipt - proof you paid, usually printed")).toEqual([
      { word: "receipt", definition: "proof you paid, usually printed" },
    ]);
  });

  test("Test F - list numbers and bullets are removed", () => {
    expect(parseWordList("1. invoice\n2) deadline\n- profit\n• budget\n* loss")).toEqual([
      { word: "invoice", definition: "" },
      { word: "deadline", definition: "" },
      { word: "profit", definition: "" },
      { word: "budget", definition: "" },
      { word: "loss", definition: "" },
    ]);
  });

  test("Test G - blank lines are skipped and repeated words kept once, first one wins", () => {
    expect(parseWordList("Hotel - a place to stay\n\n   \nhotel\nHOTEL - an inn")).toEqual([
      { word: "Hotel", definition: "a place to stay" },
    ]);
  });

  test("Test H - empty or space-only text gives no words", () => {
    expect(parseWordList("")).toEqual([]);
    expect(parseWordList("  \n\t\n")).toEqual([]);
  });

  test("Test I - Windows line endings work like normal ones", () => {
    expect(parseWordList("ticket\r\nplatform")).toEqual([
      { word: "ticket", definition: "" },
      { word: "platform", definition: "" },
    ]);
  });
});
