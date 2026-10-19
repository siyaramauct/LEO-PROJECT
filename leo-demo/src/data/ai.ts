// -----------------------------------------------------------------------------
// AI
//
// Sends a prompt to the gemini-API-Query edge function, which asks Gemini (or
// a fallback model) and returns its reply. The API keys stay on the server.
//
// Every caller asks for JSON, so the reply is parsed here once (see
// utils/aiReply.ts) and each service only checks the shape it expects.
//
// Throws a DataError when the function call fails or the reply isn't JSON.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { parseAiJson } from "../utils/aiReply";
import { DataError } from "./errors";

// The model's reply as parsed JSON. Its shape is unchecked: the caller checks it.
export async function askAi(prompt: string): Promise<unknown> {
  // 1. Ask the edge function.
  const { data, error } = await supabase.functions.invoke("gemini-API-Query", {
    body: { prompt },
  });

  if (error) {
    throw new DataError("The AI request could not be completed. Please try again.", error);
  }

  // 2. Read the JSON out of its reply.
  try {
    return parseAiJson(data?.result);
  } catch (parseError) {
    throw new DataError(
      "The AI sent a reply that could not be read. Please try again.",
      parseError,
    );
  }
}
