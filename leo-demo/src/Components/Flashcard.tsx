import { useState } from 'react';
import { SpeakerWaveIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { supabase } from "../supabase-client";

type LanguageCode = "zh" | "es" | "fr";

const languageOptions: { code: LanguageCode; label: string; name: string }[] = [
    { code: "zh", label: "中文", name: "Mandarin" },
    { code: "es", label: "ES", name: "Spanish" },
    { code: "fr", label: "FR", name: "French" },
];

type Translation = { word: string; definition: string };

// Parses the Gemini response into a well-formed { word, definition } translation.
function parseTranslation(result: unknown): Translation {
    const content = typeof result === "string" ? result : JSON.stringify(result);
    const json = content.replace(/^```json\s*|^```|```$/g, "").trim();
    const parsed = JSON.parse(json) as Translation;
    if (!parsed.word?.trim() || !parsed.definition?.trim()) throw new Error("Gemini returned an incomplete translation.");
    return parsed;
}

export default function Flashcard({ word, definition, flashcardId, imageUrl }: { word: string; definition: string; flashcardId?: string; imageUrl?: string | null }) {
    const [flipped, setFlipped] = useState(false);
    const [activeLanguage, setActiveLanguage] = useState<LanguageCode | null>(null);
    const [translations, setTranslations] = useState<Partial<Record<LanguageCode, Translation>>>({});
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationError, setTranslationError] = useState("");

    const speak = (text: string) => {
        window.speechSynthesis.cancel();

        const speech = new SpeechSynthesisUtterance(text);

        window.speechSynthesis.speak(speech);
    };

    async function handleTranslate(language: LanguageCode) {
        if (!flashcardId) return;
        setTranslationError("");

        if (activeLanguage === language) {
            setActiveLanguage(null);
            return;
        }

        if (translations[language]) {
            setActiveLanguage(language);
            return;
        }

        setIsTranslating(true);
        try {
            const { data: cached, error: cacheError } = await supabase
                .from("flashcard_translations")
                .select("translated_word, translated_definition")
                .eq("flashcard_id", flashcardId)
                .eq("language_code", language)
                .maybeSingle();

            if (cacheError) throw new Error(cacheError.message);

            if (cached) {
                const translation: Translation = { word: cached.translated_word, definition: cached.translated_definition };
                setTranslations((current) => ({ ...current, [language]: translation }));
                setActiveLanguage(language);
                return;
            }

            const languageName = languageOptions.find((option) => option.code === language)?.name ?? language;
            const prompt = `Translate the following language-learning flashcard into ${languageName}. Return only valid JSON with no Markdown or code fences, using this exact schema: {"word":"string","definition":"string"}. Word: ${JSON.stringify(word)}. Definition: ${JSON.stringify(definition)}.`;
            const { data, error: functionError } = await supabase.functions.invoke("gemini-API-Query", { body: { prompt } });
            if (functionError) throw new Error(`Could not translate this flashcard: ${functionError.message}`);
            const translation = parseTranslation(data?.result);

            setTranslations((current) => ({ ...current, [language]: translation }));
            setActiveLanguage(language);

            await supabase.from("flashcard_translations").upsert(
                {
                    flashcard_id: flashcardId,
                    language_code: language,
                    translated_word: translation.word,
                    translated_definition: translation.definition,
                },
                { onConflict: "flashcard_id,language_code", ignoreDuplicates: true },
            );
        } catch (error) {
            setTranslationError(error instanceof Error ? error.message : "This flashcard could not be translated.");
        } finally {
            setIsTranslating(false);
        }
    }

    const activeTranslation = activeLanguage ? translations[activeLanguage] : undefined;
    const displayedWord = activeTranslation?.word ?? word;
    const displayedDefinition = activeTranslation?.definition ?? definition;

    return (
        <div
            className="w-full max-w-80 h-80 cursor-pointer"
            onClick={() => setFlipped(f => !f)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFlipped(f => !f);
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Show word" : "Show definition"}
        >
            <div
                className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
                    flipped ? '[transform:rotateY(180deg)]' : ''
                }`}
            >
                {/* // Front  */}
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-white rounded-lg shadow-md p-4 [backface-visibility:hidden]">
                    {imageUrl && <img src={imageUrl} alt="" className="mb-4 h-32 w-full rounded-lg object-cover" />}
                    <h1 className="text-2xl font-bold">{displayedWord}</h1>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            speak(displayedWord);
                        }}
                        aria-label={`Read ${displayedWord} aloud`}
                        className="mt-4 flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
                    >
                        <SpeakerWaveIcon className="h-5 w-5 text-white" />
                        Read word
                    </button>
                </div>

                {/* // Back  */}
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-lg shadow-md p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    {activeTranslation && <p className="text-sm font-semibold text-violet-700">{displayedWord}</p>}
                    <p className="text-lg font-bold text-center text-gray-700">{displayedDefinition}</p>
                    <button
                    type="button"
                    onClick={(e) => {
                    e.stopPropagation();
                     speak(displayedDefinition);
                    }}
                    aria-label="Read definition aloud"
                    className="mt-4 flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
                    >
                    <SpeakerWaveIcon className="h-5 w-5 text-white" />
                    Read definition
                    </button>

                    {flashcardId && (
                        <div className="mt-4 flex flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                            {translationError && <p className="max-w-64 text-center text-xs text-red-600">{translationError}</p>}
                        </div>
                    )}

                    <a
                        href={`https://www.oxfordlearnersdictionaries.com/definition/english/${word.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                        Learn more
                    </a>
                </div>
            </div>
        </div>
    );
}
