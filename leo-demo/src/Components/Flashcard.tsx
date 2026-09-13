import { useState } from 'react';
import { SpeakerWaveIcon } from "@heroicons/react/24/outline";


export default function Flashcard({ word, definition }: { word: string; definition: string }) {
    const [flipped, setFlipped] = useState(false);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();

        const speech = new SpeechSynthesisUtterance(text);

        window.speechSynthesis.speak(speech);
    };

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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-4 [backface-visibility:hidden]">
                    <h1 className="text-2xl font-bold">{word}</h1>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            speak(word);
                        }}
                        aria-label={`Read ${word} aloud`}
                        className="mt-4 flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                    >
                        <SpeakerWaveIcon className="h-5 w-5" />
                        Read word
                    </button>
                </div>

                {/* // Back  */}
                <div className="absolute inset-0 flex flex-col items-center justify-center  rounded-lg shadow-md p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <p className="text-lg font-bold text-center text-gray-700">{definition}</p>
                    <button
                    type="button"
                    onClick={(e) => {
                    e.stopPropagation();
                     speak(definition);
                    }}
                    aria-label="Read definition aloud"
                    className="mt-4 flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                    >
                    <SpeakerWaveIcon className="h-5 w-5" />
                    Read definition
                    </button>
                    <a
                        href={`https://www.oxfordlearnersdictionaries.com/definition/english/${word.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-5 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                        Learn more
                    </a>
                </div>
            </div>
        </div>
    );
}