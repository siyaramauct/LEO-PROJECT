import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai"; //API Key from subase secrets
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const json = (body, status = 200)=>new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
// ---------- OpenRouter free-model selection ----------
// Model families to try first, in order of preference. Any free model whose id
// contains one of these is ranked ahead of the rest. Edit to taste.
const PREFERRED_FAMILIES = [
  "deepseek",
  "qwen",
  "llama",
  "gemma",
  "mistral",
  "glm",
  "kimi"
];
// How many free models to try before giving up (keeps us within edge-function time limits)
const MAX_MODELS_TO_TRY = 5;
// Per-model timeout in ms
const MODEL_TIMEOUT_MS = 25_000;
// Used only if the live model list can't be fetched
const FALLBACK_FREE_MODELS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free"
];
// Cache the free model list between requests on the same warm instance
let cachedFreeModels = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
function rankModel(id) {
  const lower = id.toLowerCase();
  const idx = PREFERRED_FAMILIES.findIndex((f)=>lower.includes(f));
  return idx === -1 ? PREFERRED_FAMILIES.length : idx;
}
async function getFreeModels() {
  if (cachedFreeModels && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedFreeModels;
  }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error(`models endpoint returned ${res.status}`);
    const { data } = await res.json();
    const free = data.filter((m)=>m?.id && m.pricing?.prompt === "0" && m.pricing?.completion === "0" && // text output only (skip image/audio-only models)
      (m.architecture?.output_modalities?.includes("text") ?? true))// prefer chosen families, then bigger context windows
    .sort((a, b)=>rankModel(a.id) - rankModel(b.id) || (b.context_length ?? 0) - (a.context_length ?? 0)).map((m)=>m.id)// skip OpenRouter's own meta-routers
    .filter((id)=>!id.startsWith("openrouter/"));
    if (free.length === 0) throw new Error("no free models found");
    cachedFreeModels = free;
    cachedAt = Date.now();
    return free;
  } catch (err) {
    console.error("Could not fetch OpenRouter model list, using fallback list:", err.message);
    return FALLBACK_FREE_MODELS;
  }
}
async function callOpenRouterModel(model, prompt, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://your-site.com",
        "X-Title": "Flashcard Generator",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("empty response");
    return text;
  } finally{
    clearTimeout(timer);
  }
}
async function generateWithOpenRouter(prompt, apiKey) {
  const models = (await getFreeModels()).slice(0, MAX_MODELS_TO_TRY);
  const errors = [];
  for (const model of models){
    try {
      const text = await callOpenRouterModel(model, prompt, apiKey);
      return {
        text,
        model
      };
    } catch (err) {
      const msg = err.name === "AbortError" ? "timed out" : err.message;
      console.error(`OpenRouter model ${model} failed: ${msg}`);
      errors.push(`${model}: ${msg}`);
    }
  }
  throw new Error(`All free models failed. ${errors.join(" | ")}`);
}
// ---------- Gemini ----------
//first provider attempt in the main handler
async function generateWithGemini(prompt, apiKey) {
  const ai = new GoogleGenAI({
    apiKey
  });
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt
  });
  const text = response.text || "";
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
// ---------- Handler ----------
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { prompt } = await req.json();
    if (!prompt) return json({
      error: "Prompt is required"
    }, 400);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("openRouterKey");
    if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
      return json({
        error: "No API keys set in Supabase secrets"
      }, 500);
    }
    let geminiError = null;
    // 1. Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        const result = await generateWithGemini(prompt, GEMINI_API_KEY);
        return json({
          result,
          provider: "gemini",
          model: "gemini-3.6-flash"
        });
      } catch (err) {
        geminiError = err.message;
        console.error("Gemini failed, falling back to OpenRouter:", geminiError);
      }
    }
    // 2. Fall back to OpenRouter free models, best first
    if (OPENROUTER_API_KEY) {
      try {
        const { text, model } = await generateWithOpenRouter(prompt, OPENROUTER_API_KEY);
        return json({
          result: text,
          provider: "openrouter",
          model
        });
      } catch (err) {
        return json({
          error: `Both providers failed. Gemini: ${geminiError ?? "not configured"}. OpenRouter: ${err.message}`
        }, 502);
      }
    }
    return json({
      error: `Gemini failed: ${geminiError}`
    }, 502);
  } catch (err) {
    return json({
      error: err.message || "An unexpected error occurred"
    }, 500);
  }
});
