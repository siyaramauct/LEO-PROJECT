// -----------------------------------------------------------------------------
// Word Lists
//
// The rules for the word list box in Create Lesson, where a teacher types or
// pastes their flashcards: reading the list into words and definitions. A pure
// function: no React, no Supabase, so the rules can be tested on their own.
//
// A list can be:
//   one word per line         itinerary
//   a word and a definition   passport - an official document for travel
//                             passport: an official document for travel
//                             passport<Tab>an official document (from a sheet)
//   a comma-separated line    apple, banana, cherry
// Numbers and bullets at the start of a line ("1.", "2)", "-", "•") are ignored.
// -----------------------------------------------------------------------------

// A word from the list. An empty definition is filled in by the teacher on the card.
export type WordEntry = { word: string; definition: string };

// What separates a word from its definition: a tab, a colon, or a dash or
// equals sign with spaces around it (so "well-known" stays one word).
const DEFINITION_SEPARATOR = /\t|:|\s[-–—=]\s/;

// "1.", "2)", "-", "*" or "•" at the start of a line, from a numbered or bulleted list.
const LIST_MARKER = /^\s*(\d+[.)]|[-*•])\s+/;

// Reads a pasted or typed list into words and any definitions, in order.
// Blank lines are skipped, and a word that appears twice (in any letter case)
// is kept once, with the first definition given for it.
export function parseWordList(text: string): WordEntry[] {
  const entries: WordEntry[] = [];
  const seenWords = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    // 1. Drop any list number or bullet.
    const line = rawLine.replace(LIST_MARKER, "").trim();
    if (!line) {
      continue;
    }

    // 2. One entry per line, or several when the line is a comma-separated list.
    for (const entry of readLine(line)) {
      const key = entry.word.toLowerCase();
      if (!entry.word || seenWords.has(key)) {
        continue;
      }

      seenWords.add(key);
      entries.push(entry);
    }
  }

  return entries;
}

// A line with a separator is one word and its definition. A line without one
// is a single word, or several if it is a comma- or semicolon-separated list.
function readLine(line: string): WordEntry[] {
  const separator = DEFINITION_SEPARATOR.exec(line);

  if (separator) {
    return [
      {
        word: line.slice(0, separator.index).trim(),
        definition: line.slice(separator.index + separator[0].length).trim(),
      },
    ];
  }

  return line
    .split(/[,;]/)
    .map((word) => ({ word: word.trim(), definition: "" }))
    .filter((entry) => entry.word);
}
