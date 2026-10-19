// -----------------------------------------------------------------------------
// AI Replies
//
// Reads the JSON out of a model's reply. Every prompt asks for bare JSON, but
// models sometimes wrap it in a ```json code fence or add a sentence around
// it (the free fallback models especially), so only the JSON object is kept.
//
// Pure function, so it can be tested without calling the AI.
// -----------------------------------------------------------------------------

// Returns the parsed JSON object. Throws if the reply holds no valid JSON.
export function parseAiJson(reply: unknown): unknown {
  // 1. The edge function normally sends a string, but it may already be parsed.
  if (typeof reply === "object" && reply !== null) {
    return reply;
  }

  if (typeof reply !== "string") {
    throw new Error("The AI reply was empty.");
  }

  // 2. Keep only the JSON object: from the first "{" to the last "}". This
  //    drops a code fence and any text the model added before or after it.
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");

  if (start === -1 || end < start) {
    throw new Error("The AI reply did not contain JSON.");
  }

  // 3. Parse it. JSON.parse throws if the object itself is malformed.
  return JSON.parse(reply.slice(start, end + 1));
}
