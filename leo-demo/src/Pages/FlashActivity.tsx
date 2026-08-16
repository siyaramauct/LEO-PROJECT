import { useParams, useNavigate } from "react-router-dom";
import Flashcard from "../Components/Flashcard";
import Navbar from "../Components/Navbar";
import { useEffect, useState } from "react";
import { CheckIcon, XMarkIcon, TrophyIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { supabase } from "../supabase-client";

interface FlashcardData {
    id: number;
    lesson_id: number;
    word: string;
    definition: string;
    image_url: string | null;
    sentence: string | null;
    antonym: string | null;
    synonym: string | null;
}

export default function FlashActivity() {
    const params = useParams();
    const navigate = useNavigate();
    const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data, error } = await supabase.from("Flashcard").select("*").eq("lesson_id", params.lessonId);
            if (error) {
                console.error("Error fetching flashcards:", error);
                return;
            }
            console.log("Fetched flashcards:", data);
            setFlashcards(data);
        };
        fetchData();
    }, [params.lessonId]);

    const [flashcardIndex, setFlashcardIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);

    function advance(correct: boolean) {
        const newScore = correct ? score + 1 : score;
        
        if (flashcardIndex === flashcards.length - 1) {
            setScore(newScore);
            setFinished(true);
            return;
        }
        if (correct) setScore(newScore);
        setFlashcardIndex(i => i + 1);
    }

    function restart() {
        setFlashcardIndex(0);
        setScore(0);
        setFinished(false);
    }

    const currentFlashCard = flashcards[flashcardIndex];
    const percentage = Math.round((score / flashcards.length) * 100);

    if (finished) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center bg-gray-50">
                <Navbar />
                <div className="w-full max-w-sm mx-auto mt-12 flex flex-col items-center gap-6 px-4">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
                            <TrophyIcon className="w-10 h-10 text-violet-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mt-2">Lesson Complete!</h2>
                        <p className="text-sm text-gray-500">Lesson {params.lessonId} — Flashcards</p>
                    </div>

                    <div className="w-full bg-white rounded-2xl shadow-md p-6 flex flex-col items-center gap-4">
                        <p className="text-[11px] font-semibold text-violet-500 uppercase tracking-widest">Your Score</p>
                        <p className="text-5xl font-bold text-gray-800">
                            {score}<span className="text-2xl text-gray-400"> / {flashcards.length}</span>
                        </p>

                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-1">
                            <div
                                className="h-full rounded-full bg-violet-600 transition-all duration-700"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <p className="text-sm font-semibold text-violet-600">{percentage}%</p>

                        <p className="text-[12px] text-gray-500 text-center mt-1">
                            {percentage === 100
                                ? "Perfect score! Outstanding work."
                                : percentage >= 50
                                ? "Good effort! Keep practising."
                                : "Keep going — you'll get there!"}
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-3 mt-2">
                        <button
                            onClick={restart}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700 active:scale-95 transition-all duration-200 shadow-md"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Try Again
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="w-full py-3 rounded-xl border-2 border-violet-600 text-violet-600 text-[13px] font-semibold hover:bg-violet-50 active:scale-95 transition-all duration-200"
                        >
                            Back to Lessons
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentFlashCard) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center bg-gray-50">
                <Navbar />
                <div className="w-full max-w-sm mx-auto mt-10 px-4 text-center text-sm text-gray-500">
                    Loading flashcards...
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center">
            <Navbar />
            <div className="w-full max-w-sm mx-auto mt-6 bg-white overflow-hidden">
                <div className="w-full h-35 overflow-hidden">
                    <img
                        src="/corporateStyleLessonIlustration.avif"
                        alt="Lesson illustration"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-violet-500 text-center uppercase tracking-widest">Flashcards</span>
                    <h2 className="text-[13px] font-bold text-gray-800 leading-snug text-center">Lesson {params.lessonId}</h2>
                    <div className="mt-2">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] text-gray-400">{flashcards.length} cards</span>
                            <span className="text-[11px] font-bold text-violet-600">{flashcardIndex + 1} / {flashcards.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-violet-600 transition-all duration-500"
                                style={{ width: `${((flashcardIndex + 1) / flashcards.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <section className="w-full px-4 flex flex-col items-center justify-center min-h-[calc(100vh-25rem)] gap-8 mt-5">
                <Flashcard key={currentFlashCard.id} word={currentFlashCard.word} definition={currentFlashCard.definition} />
                <div className="flex items-center gap-12 mt-4">
                    <button
                        className="flex items-center justify-center w-16 h-16 rounded-full bg-violet-700 active:scale-95 transition-transform shadow-md"
                        aria-label="Wrong"
                        onClick={() => advance(false)}
                    >
                        <XMarkIcon className="w-8 h-8 text-white" />
                    </button>
                    <button
                        className="flex items-center justify-center w-16 h-16 rounded-full bg-violet-700 active:scale-95 transition-transform shadow-md"
                        aria-label="Correct"
                        onClick={() => advance(true)}
                    >
                        <CheckIcon className="w-8 h-8 text-white" />
                    </button>
                </div>
            </section>
        </div>
    );
}