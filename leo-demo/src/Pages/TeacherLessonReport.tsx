import { ArrowLeft, BarChart3, Check, CheckCircle2, ClipboardList, Layers, Pencil, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DeleteAccountDialog from "../Components/DeleteAccountDialog";
import StatCard from "../Components/StatCard";
import { supabase } from "../supabase-client";

type ClassroomRow = { classroom_id: string; classroom_name: string; teacher_id: string };

type LessonRow = {
  lesson_id: string;
  title: string;
  description: string | null;
  lesson_image_path: string | null;
};

type McqRow = { mcq_id: string; title: string | null; score_ceiling: number | null };

type FlashcardRow = { flashcard_id: string; word: string; definition: string };

type StudentProfile = { id: string; name: string | null; surname: string | null; username: string | null };

type AttemptRow = { student_id: string; score: number | null; completed_at: string | null };

type StudentResult = {
  id: string;
  name: string;
  attempted: boolean;
  score: number | null;
  scorePercent: number | null;
  completedAt: string | null;
};

const NoScoresNotice = () => (
  <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Layers size={17} /></span>
    <div>
      <p className="text-sm font-bold text-slate-800">No score statistics for this lesson</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">This is a flashcards-only lesson without an MCQ activity, so students aren't scored and quiz completion isn't tracked.</p>
    </div>
  </div>
);

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : null;

export default function TeacherLessonReport() {
  const { session } = useAuth();
  const { classroomId, lessonId } = useParams<{ classroomId: string; lessonId: string }>();
  const teacherId = session?.user?.id;

  const [classroom, setClassroom] = useState<ClassroomRow | null>(null);
  const [lesson, setLesson] = useState<LessonRow | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardRow[]>([]);
  const [mcq, setMcq] = useState<McqRow | null>(null);
  // Only trust "no quiz" when the mcqs lookup itself succeeded.
  const [isFlashcardsOnly, setIsFlashcardsOnly] = useState(false);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardToDelete, setCardToDelete] = useState<FlashcardRow | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  useEffect(() => {
    if (!classroomId || !lessonId || !teacherId) return;

    const load = async () => {
      setIsLoading(true);
      setError("");

      const [classroomResult, lessonResult, enrollmentResult, flashcardsResult] = await Promise.all([
        supabase.from("classrooms").select("classroom_id, classroom_name, teacher_id").eq("classroom_id", classroomId).single(),
        supabase.from("lessons").select("lesson_id, title, description, lesson_image_path").eq("lesson_id", lessonId).eq("classroom_id", classroomId).single(),
        supabase.from("classroom_students").select("student_id").eq("classroom_id", classroomId),
        supabase.from("flashcards").select("flashcard_id, word, definition").eq("lesson_id", lessonId).order("created_at"),
      ]);

      if (classroomResult.error || !classroomResult.data || classroomResult.data.teacher_id !== teacherId) {
        setError("This classroom could not be found.");
        setIsLoading(false);
        return;
      }
      if (lessonResult.error || !lessonResult.data) {
        setError("This lesson could not be found.");
        setIsLoading(false);
        return;
      }

      setClassroom(classroomResult.data as ClassroomRow);
      setLesson(lessonResult.data as LessonRow);
      setFlashcards((flashcardsResult.data ?? []) as FlashcardRow[]);

      const studentIds = (enrollmentResult.data ?? []).map((row) => row.student_id as string);

      const [profilesResult, mcqResult] = await Promise.all([
        studentIds.length
          ? supabase.from("profiles").select("id, name, surname, username").in("id", studentIds)
          : Promise.resolve({ data: [] as StudentProfile[], error: null }),
        supabase.from("mcqs").select("mcq_id, title, score_ceiling").eq("lesson_id", lessonId).maybeSingle(),
      ]);

      const profiles = (profilesResult.data ?? []) as StudentProfile[];
      const mcqData = (mcqResult.data ?? null) as McqRow | null;
      setMcq(mcqData);
      setIsFlashcardsOnly(!mcqResult.error && !mcqData);

      let attempts: AttemptRow[] = [];
      if (studentIds.length) {
        const { data: attemptData, error: attemptError } = await supabase
          .from("lesson_attempts")
          .select("student_id, score, completed_at")
          .eq("lesson_id", lessonId)
          .in("student_id", studentIds)
          .not("completed_at", "is", null);
        if (attemptError) {
          setError(attemptError.message);
        } else {
          attempts = (attemptData ?? []) as AttemptRow[];
        }
      }

      // A student may have retaken the quiz — keep only their most recent attempt.
      const latestByStudent: Record<string, AttemptRow> = {};
      for (const attempt of attempts) {
        const existing = latestByStudent[attempt.student_id];
        if (!existing || (attempt.completed_at ?? "") > (existing.completed_at ?? "")) {
          latestByStudent[attempt.student_id] = attempt;
        }
      }

      const ceiling = mcqData?.score_ceiling ?? null;

      const studentResults: StudentResult[] = profiles.map((profile) => {
        const attempt = latestByStudent[profile.id];
        const name = `${profile.name ?? ""} ${profile.surname ?? ""}`.trim() || profile.username || "Student";
        if (!attempt) {
          return { id: profile.id, name, attempted: false, score: null, scorePercent: null, completedAt: null };
        }
        const scorePercent = ceiling && ceiling > 0 && attempt.score !== null ? Math.round((Number(attempt.score) / ceiling) * 100) : null;
        return { id: profile.id, name, attempted: true, score: attempt.score, scorePercent, completedAt: attempt.completed_at };
      });

      studentResults.sort((a, b) => {
        if (a.attempted !== b.attempted) return a.attempted ? -1 : 1;
        return (b.scorePercent ?? b.score ?? 0) - (a.scorePercent ?? a.score ?? 0);
      });

      setResults(studentResults);
      setIsLoading(false);
    };

    void load();
  }, [classroomId, lessonId, teacherId]);

  const enrolledCount = results.length;
  const attemptedResults = results.filter((student) => student.attempted);
  const attemptedCount = attemptedResults.length;
  const completionRate = enrolledCount ? Math.round((attemptedCount / enrolledCount) * 100) : 0;
  const scoredResults = attemptedResults.filter((student) => student.scorePercent !== null);
  const averageScore = scoredResults.length
    ? Math.round(scoredResults.reduce((total, student) => total + (student.scorePercent ?? 0), 0) / scoredResults.length)
    : null;
  const highestScore = scoredResults.length ? Math.max(...scoredResults.map((student) => student.scorePercent ?? 0)) : null;

  function startEditingCard(card: FlashcardRow) {
    setCardError("");
    setEditingCardId(card.flashcard_id);
    setEditWord(card.word);
    setEditDefinition(card.definition);
  }

  function cancelEditingCard() {
    setEditingCardId(null);
    setEditWord("");
    setEditDefinition("");
  }

  async function saveEditingCard() {
    if (!editingCardId || isSavingCard) return;
    const word = editWord.trim();
    const definition = editDefinition.trim();
    if (!word || !definition) {
      setCardError("A flashcard needs both a word and a definition.");
      return;
    }
    setIsSavingCard(true);
    setCardError("");
    const { error: updateError } = await supabase
      .from("flashcards")
      .update({ word, definition })
      .eq("flashcard_id", editingCardId);
    setIsSavingCard(false);
    if (updateError) {
      setCardError(updateError.message);
      return;
    }
    setFlashcards((cards) => cards.map((card) => (card.flashcard_id === editingCardId ? { ...card, word, definition } : card)));
    cancelEditingCard();
  }

  async function deleteFlashcard() {
    if (!cardToDelete || isDeletingCard) return;
    setIsDeletingCard(true);
    const { error: deleteError } = await supabase.from("flashcards").delete().eq("flashcard_id", cardToDelete.flashcard_id);
    setIsDeletingCard(false);
    if (deleteError) {
      setCardError(deleteError.message);
      setCardToDelete(null);
      return;
    }
    setFlashcards((cards) => cards.filter((card) => card.flashcard_id !== cardToDelete.flashcard_id));
    setCardToDelete(null);
  }

  const coverUrl = lesson?.lesson_image_path
    ? supabase.storage.from("images").getPublicUrl(lesson.lesson_image_path).data.publicUrl
    : "/classRoomIllustration.png";

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading lesson report...</p>
      </main>
    );
  }

  if (error || !lesson || !classroom) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-4 text-center">
        <p className="text-sm text-red-600">{error || "This lesson could not be found."}</p>
        <Link to={classroomId ? `/teacher-classroom/${classroomId}` : "/TeacherClassroom"} className="text-sm font-semibold text-violet-700">
          Back to classroom
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to={`/teacher-classroom/${classroomId}`} aria-label="Back to classroom" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100">
            <ArrowLeft size={19} />
          </Link>
          <div>
            <p className="text-xs font-medium text-violet-700">{classroom.classroom_name}</p>
            <h1 className="text-base font-bold sm:text-lg">Lesson report</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Lesson summary */}
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
          <img src={coverUrl} alt={lesson.title} className="h-32 w-full rounded-lg object-cover sm:h-24 sm:w-32" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{lesson.title}</h2>
            {lesson.description && <p className="mt-2 text-sm leading-5 text-slate-500">{lesson.description}</p>}
            <p className="mt-3 text-xs text-slate-400">{flashcards.length} word{flashcards.length === 1 ? "" : "s"} · {isFlashcardsOnly ? "Flashcards only, no MCQ activity" : mcq?.title ?? "Quiz"}</p>
          </div>
        </section>

        {/* General statistics — flashcards-only lessons have no quiz, so there is nothing to score */}
        {isFlashcardsOnly ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
            <StatCard icon={<Users />} label="Enrolled students" value={String(enrolledCount)} />
            <NoScoresNotice />
          </section>
        ) : (
          <section className="mt-4 grid gap-3 sm:grid-cols-4">
            <StatCard icon={<Users />} label="Enrolled students" value={String(enrolledCount)} />
            <StatCard icon={<CheckCircle2 />} label="Completed the quiz" value={`${attemptedCount}/${enrolledCount}`} progress={completionRate} />
            <StatCard icon={<BarChart3 />} label="Average score" value={averageScore === null ? "—" : `${averageScore}%`} />
            <StatCard icon={<ClipboardList />} label="Highest score" value={highestScore === null ? "—" : `${highestScore}%`} />
          </section>
        )}

        {/* Flashcards */}
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold">Flashcards</h2>
          <p className="mt-1 text-sm text-slate-500">The words and definitions students study for this lesson.</p>

          {cardError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{cardError}</p>}

          {flashcards.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No flashcards have been added to this lesson yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {flashcards.map((card) => {
                const isEditing = editingCardId === card.flashcard_id;
                return (
                  <div key={card.flashcard_id} className="py-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">Word</span>
                            <input value={editWord} onChange={(event) => setEditWord(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">Definition</span>
                            <input value={editDefinition} onChange={(event) => setEditDefinition(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                          </label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={cancelEditingCard} disabled={isSavingCard} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">
                            <X size={14} /> Cancel
                          </button>
                          <button type="button" onClick={() => void saveEditingCard()} disabled={isSavingCard} className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60">
                            <Check size={14} /> {isSavingCard ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{card.word}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{card.definition}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" aria-label={`Edit ${card.word}`} onClick={() => startEditingCard(card)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                            <Pencil size={15} />
                          </button>
                          <button type="button" aria-label={`Delete ${card.word}`} onClick={() => setCardToDelete(card)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-1000 ease-out hover:bg-violet-700 hover:text-white">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Per-student scores */}
        {!isFlashcardsOnly && <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold">Student results</h2>
          <p className="mt-1 text-sm text-slate-500">Each enrolled student's quiz score for this lesson.</p>

          {results.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No students are enrolled in this classroom yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {results.map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {student.attempted ? `Completed ${formatDate(student.completedAt)}` : "Not attempted yet"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {student.attempted ? (
                      <span className="text-sm font-bold text-violet-700">
                        {student.scorePercent !== null ? `${student.scorePercent}%` : student.score}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>}
      </main>

      <DeleteAccountDialog
        open={Boolean(cardToDelete)}
        isDeleting={isDeletingCard}
        onCancel={() => setCardToDelete(null)}
        onConfirm={() => void deleteFlashcard()}
        title={`Delete "${cardToDelete?.word ?? "this flashcard"}"?`}
        description="This will permanently remove this flashcard from the lesson. This action cannot be undone."
        confirmLabel="Delete flashcard"
        deletingLabel="Deleting..."
      />
    </div>
  );
}
