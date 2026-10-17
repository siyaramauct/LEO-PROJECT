// -----------------------------------------------------------------------------
// AI
//
// Sends a prompt to the gemini-API-Query edge function, which asks Gemini (or
// a fallback model) and returns its reply. The API keys stay on the server.
//
// Throws a DataError when the function call fails.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError } from "./errors";

// The model's reply, as the edge function returns it (usually a string).
export async function askAi(prompt: string): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("gemini-API-Query", {
    body: { prompt },
  });

  if (error) {
    throw new DataError("The AI request could not be completed. Please try again.", error);
  }

  return data?.result;
}
