import { useState } from 'react';


export default function Flashcard({ word, definition }: { word: string; definition: string }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div
            className="w-full max-w-80 h-80 cursor-pointer"
            onClick={() => setFlipped(f => !f)}
        >
            <div
                className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
                    flipped ? '[transform:rotateY(180deg)]' : ''
                }`}
            >
                {/* // Front  */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-4  [backface-visibility:hidden]">
                    <h1 className="text-2xl font-bold">{word}</h1>
                </div>

                {/* // Back  */}
                <div className="absolute inset-0 flex flex-col items-center justify-center  rounded-lg shadow-md p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <p className="text-lg font-bold text-center text-gray-700">{definition}</p>
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