import { ArrowLeft, Check, ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink, FileText, Images, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Flashcard from "../Components/Flashcard";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";

type FlashcardData = { flashcard_id: string; lesson_id: string; word: string; definition: string; image_path: string | null };
type LessonDocument = { resource_id: string; resource_url: string; signedUrl: string };

export default function FlashActivity() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [documents, setDocuments] = useState<LessonDocument[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasQuiz, setHasQuiz] = useState(true);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => new Date().toISOString());
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    const loadFlashcards = async () => {
      const [flashcardsResult, documentsResult, quizResult] = await Promise.all([
        supabase.from("flashcards").select("flashcard_id, lesson_id, word, definition, image_path").eq("lesson_id", lessonId).order("created_at"),
        supabase.from("learning_resources").select("resource_id, resource_url").eq("lesson_id", lessonId).eq("resource_type", "document").order("uploaded_date", { ascending: false }),
        // Flashcards-only lessons have no mcqs row, so the last card finishes the lesson instead of starting a quiz.
        supabase.from("mcqs").select("mcq_id").eq("lesson_id", lessonId).maybeSingle(),
      ]);
      if (flashcardsResult.error) setError(flashcardsResult.error.message);
      else setFlashcards((flashcardsResult.data ?? []) as FlashcardData[]);
      setHasQuiz(Boolean(quizResult.data));
      if (documentsResult.error) {
        console.error("Could not load lesson documents:", documentsResult.error);
      } else {
        const signedDocuments = await Promise.all((documentsResult.data ?? []).map(async (document) => {
          const { data: signedData, error: signedError } = await supabase.storage.from("documents").createSignedUrl(document.resource_url, 60 * 60);
          if (signedError) console.error("Could not sign lesson document:", signedError);
          return { ...document, signedUrl: signedData?.signedUrl ?? "" } as LessonDocument;
        }));
        setDocuments(signedDocuments);
      }
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

  // Flashcards-only lessons have no quiz to submit, so reaching the end is the completion:
  // record an unscored attempt so it counts towards the student's weekly progress.
  async function finishLesson() {
    if (!session?.user || !lessonId) return;
    setIsFinishing(true);
    const { error: attemptError } = await supabase.from("lesson_attempts").insert({
      student_id: session.user.id,
      lesson_id: lessonId,
      score: null,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });
    if (attemptError) {
      setIsFinishing(false);
      setError(attemptError.message);
      return;
    }
    // Best-effort, like the quiz: today's streak entry may already exist from opening the lesson.
    const { error: activityError } = await supabase
      .from("student_activity")
      .upsert(
        { student_id: session.user.id, source: "lesson_completed" },
        { onConflict: "student_id,activity_date", ignoreDuplicates: true },
      );
    if (activityError) console.error("Could not record learning activity:", activityError);
    navigate("/student/classrooms");
  }

  const currentCard = flashcards[index];
  const isLastCard = index === flashcards.length - 1;
  const progress = flashcards.length ? ((index + 1) / flashcards.length) * 100 : 0;
  const imageCardCount = flashcards.filter((card) => card.image_path).length;
  const currentImageUrl = currentCard?.image_path
    ? supabase.storage.from("images").getPublicUrl(currentCard.image_path).data.publicUrl
    : null;
  const documentName = (path: string) => decodeURIComponent(path.split("/").pop() ?? path).replace(/^[0-9a-f-]{36}-/i, "");

  return <div className="min-h-screen bg-white text-slate-900"><StudentBottomNav /><main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0"><header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-5xl items-center gap-3"><button type="button" onClick={() => navigate("/student/classrooms")} aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></button><div><p className="text-xs font-medium text-violet-700">Lesson study</p><h1 className="mt-1 text-base font-bold">Flashcards</h1></div></div></header><div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{isLoading ? <div className="rounded-xl border border-slate-100 bg-white p-10 text-center"><p className="text-sm text-slate-500">Loading flashcards...</p></div> : error || !currentCard ? <div className="rounded-xl border border-slate-100 bg-white p-10 text-center"><h2 className="text-lg font-bold">Flashcards unavailable</h2><p className="mt-2 text-sm text-slate-500">{error || "This lesson does not have flashcards yet."}</p><button type="button" onClick={() => navigate("/student/classrooms")} className="mt-5 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white">Back to classrooms</button></div> : <><section className="rounded-xl border border-slate-100 bg-white p-4"><div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-bold">Read every flashcard</h2><p className="mt-1 text-xs text-slate-500">Use Next and Previous to move through the lesson.</p>{!hasQuiz && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"><Layers size={12} /> Flashcards only · no quiz or score</span>}</div><div className="flex items-center gap-3">{imageCardCount >= 2 && <button type="button" onClick={() => navigate(`/lesson/${lessonId}/match`)} className="flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"><Images size={15} /> Match images</button>}<span className="text-sm font-semibold text-slate-600">{index + 1} of {flashcards.length}</span></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-700 transition-all" style={{ width: `${progress}%` }} /></div></section>{documents.length > 0 && <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4"><h2 className="text-sm font-bold">Lesson documents</h2><p className="mt-1 text-xs text-slate-500">Resources your teacher attached to this lesson.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{documents.map((document) => <a key={document.resource_id} href={document.signedUrl || undefined} target="_blank" rel="noreferrer" className={`flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition ${document.signedUrl ? "hover:border-violet-300 hover:bg-violet-50" : "pointer-events-none opacity-60"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><FileText size={17} /></span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{documentName(document.resource_url)}</span><ExternalLink size={15} className="shrink-0 text-slate-400" /></a>)}</div></section>}<section className="mt-5 flex min-h-96 items-center justify-center rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8"><Flashcard key={currentCard.flashcard_id} word={currentCard.word} definition={currentCard.definition} flashcardId={currentCard.flashcard_id} imageUrl={currentImageUrl} /></section><div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between"><button type="button" disabled={index === 0} onClick={() => setIndex((current) => current - 1)} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4"><ChevronLeft size={17} /><span className="truncate">Previous</span></button>{isLastCard ? hasQuiz ? <button type="button" onClick={() => navigate(`/quiz/${lessonId}`)} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-violet-700 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 sm:w-auto sm:px-4"><ClipboardCheck size={17} /><span className="truncate">Start quiz</span></button> : <button type="button" disabled={isFinishing} onClick={() => void finishLesson()} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-violet-700 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:px-4"><Check size={17} /><span className="truncate">{isFinishing ? "Finishing..." : "Finish lesson"}</span></button> : <button type="button" onClick={() => setIndex((current) => current + 1)} className="flex min-h-11 w-full min-w-0 items-center justify-center gap-1 rounded-lg bg-violet-700 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 sm:w-auto sm:px-4"><span>Next</span> <ChevronRight size={17} /></button>}</div></>}</div></main></div>;
}
