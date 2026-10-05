import { ArrowLeft, Check, ChevronLeft, ChevronRight, ClipboardCheck, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Flashcard from "../Components/Flashcard";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";

type FlashcardData = { flashcard_id: string; lesson_id: string; word: string; definition: string };

export default function FlashActivity() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasQuiz, setHasQuiz] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lessonId) return;
    const loadFlashcards = async () => {
      const [{ data, error: loadError }, { data: mcq }] = await Promise.all([
        supabase.from("flashcards").select("flashcard_id, lesson_id, word, definition").eq("lesson_id", lessonId).order("created_at"),
        // Flashcards-only lessons have no mcqs row, so the last card finishes the lesson instead of starting a quiz.
        supabase.from("mcqs").select("mcq_id").eq("lesson_id", lessonId).maybeSingle(),
      ]);
      if (loadError) setError(loadError.message);
      else setFlashcards((data ?? []) as FlashcardData[]);
      setHasQuiz(Boolean(mcq));
      setIsLoading(false);

      if (session?.user) {
        void supabase
          .from("student_activity")
          .upsert(
            { student_id: session.user.id, source: "flashcard_practice" },
            { onConflict: "student_id,activity_date", ignoreDuplicates: true }
          );
      }
    };
    void loadFlashcards();
  }, [lessonId, session?.user]);

  const currentCard = flashcards[index];
  const isLastCard = index === flashcards.length - 1;
  const progress = flashcards.length ? ((index + 1) / flashcards.length) * 100 : 0;

  return <div className="min-h-screen bg-white text-slate-900"><StudentBottomNav /><main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0"><header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-5xl items-center gap-3"><button type="button" onClick={() => navigate("/student/classrooms")} aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></button><div><p className="text-xs font-medium text-violet-700">Lesson study</p><h1 className="mt-1 text-base font-bold">Flashcards</h1></div></div></header><div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{isLoading ? <div className="rounded-xl border border-slate-100 bg-white p-10 text-center"><p className="text-sm text-slate-500">Loading flashcards...</p></div> : error || !currentCard ? <div className="rounded-xl border border-slate-100 bg-white p-10 text-center"><h2 className="text-lg font-bold">Flashcards unavailable</h2><p className="mt-2 text-sm text-slate-500">{error || "This lesson does not have flashcards yet."}</p><button type="button" onClick={() => navigate("/student/classrooms")} className="mt-5 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white">Back to classrooms</button></div> : <><section className="rounded-xl border border-slate-100 bg-white p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Read every flashcard</h2><p className="mt-1 text-xs text-slate-500">Use Next and Previous to move through the lesson.</p>{!hasQuiz && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"><Layers size={12} /> Flashcards only · no quiz or score</span>}</div><span className="text-sm font-semibold text-slate-600">{index + 1} of {flashcards.length}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-700 transition-all" style={{ width: `${progress}%` }} /></div></section><section className="mt-5 flex min-h-96 items-center justify-center rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8"><Flashcard key={currentCard.flashcard_id} word={currentCard.word} definition={currentCard.definition} flashcardId={currentCard.flashcard_id} /></section><div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between"><button type="button" disabled={index === 0} onClick={() => setIndex((current) => current - 1)} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4"><ChevronLeft size={17} /><span className="truncate">Previous</span></button>{isLastCard ? hasQuiz ? <button type="button" onClick={() => navigate(`/quiz/${lessonId}`)} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-violet-700 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 sm:w-auto sm:px-4"><ClipboardCheck size={17} /><span className="truncate">Start quiz</span></button> : <button type="button" onClick={() => navigate("/student/classrooms")} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-violet-700 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 sm:w-auto sm:px-4"><Check size={17} /><span className="truncate">Finish lesson</span></button> : <button type="button" onClick={() => setIndex((current) => current + 1)} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-1 rounded-lg bg-violet-700 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 sm:w-auto sm:px-4"><span>Next</span> <ChevronRight size={17} /></button>}</div></>}</div></main></div>;
}