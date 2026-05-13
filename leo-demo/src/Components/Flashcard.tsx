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
                </div>
            </div>
        </div>
    );
}