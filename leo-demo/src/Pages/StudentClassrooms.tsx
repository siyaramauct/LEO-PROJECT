import { Bell, BookOpen, Check, ChevronRight, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StudentBottomNav from "../Components/StudentBottomNav";
import { supabase } from "../supabase-client";

type Classroom = { classroom_id: string; classroom_name: string; description: string | null; cover_image_path: string | null };
type Lesson = { lesson_id: string; classroom_id: string; title: string; description: string | null; lesson_image_path: string | null };

export default function StudentClassrooms() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [flashcardCounts, setFlashcardCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    const loadClassrooms = async () => {
      setIsLoading(true);
      setError("");
      const { data: enrolments, error: enrolmentError } = await supabase.from("classroom_students").select("classroom_id").eq("student_id", session.user.id);
      if (enrolmentError) {
        setError(enrolmentError.message);
        setIsLoading(false);
        return;
      }
      const classroomIds = (enrolments ?? []).map((enrolment) => enrolment.classroom_id);
      if (!classroomIds.length) {
        setClassrooms([]);
        setLessons([]);
        setIsLoading(false);
        return;
      }
      const [classroomResult, lessonResult] = await Promise.all([
        supabase.from("classrooms").select("classroom_id, classroom_name, description, cover_image_path").in("classroom_id", classroomIds),
        supabase.from("lessons").select("lesson_id, classroom_id, title, description, lesson_image_path").in("classroom_id", classroomIds),
      ]);
      if (classroomResult.error || lessonResult.error) {
        setError(classroomResult.error?.message ?? lessonResult.error?.message ?? "Could not load your classrooms.");
      } else {
        const enrolledLessons = (lessonResult.data ?? []) as Lesson[];
        setClassrooms((classroomResult.data ?? []) as Classroom[]);
        setLessons(enrolledLessons);
        const lessonIds = enrolledLessons.map((lesson) => lesson.lesson_id);
        if (lessonIds.length) {
          const [{ data: attempts }, { data: flashcards }] = await Promise.all([
            supabase.from("lesson_attempts").select("lesson_id").eq("student_id", session.user.id).in("lesson_id", lessonIds).not("completed_at", "is", null),
            supabase.from("flashcards").select("flashcard_id, lesson_id").in("lesson_id", lessonIds),
          ]);
          setCompletedLessonIds([...new Set((attempts ?? []).map((attempt) => attempt.lesson_id))]);
          const counts: Record<string, number> = {};
          for (const card of flashcards ?? []) counts[card.lesson_id] = (counts[card.lesson_id] ?? 0) + 1;
          setFlashcardCounts(counts);
        }
      }
      setIsLoading(false);
    };
    void loadClassrooms();
  }, [session?.user]);

  const completedLessons = completedLessonIds.length;
  const lessonCount = lessons.length;

  return <div className="min-h-screen bg-white text-slate-900"><StudentBottomNav /><main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0"><header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="text-xs font-medium text-violet-700">Student portal</p><h1 className="mt-1 text-xl font-bold">My classrooms</h1><p className="mt-1 text-xs text-slate-500">Lessons shared with you by your teachers.</p></div><button type="button" aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><Bell size={19} /></button></div></header><div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><section className="grid gap-3 sm:grid-cols-3"><article className="rounded-xl border border-slate-100 bg-white p-4"><Users size={19} className="text-violet-700" /><p className="mt-4 text-2xl font-bold">{classrooms.length}</p><p className="mt-1 text-xs text-slate-500">Classrooms</p></article><article className="rounded-xl border border-slate-100 bg-white p-4"><BookOpen size={19} className="text-violet-700" /><p className="mt-4 text-2xl font-bold">{lessonCount}</p><p className="mt-1 text-xs text-slate-500">Available lessons</p></article><article className="rounded-xl border border-slate-100 bg-white p-4"><Check size={19} className="text-violet-700" /><p className="mt-4 text-2xl font-bold">{completedLessons}</p><p className="mt-1 text-xs text-slate-500">Completed lessons</p></article></section>{isLoading && <p className="py-12 text-center text-sm text-slate-500">Loading your classrooms...</p>}{error && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{!isLoading && !error && (classrooms.length === 0 ? <section className="mt-5 rounded-xl border border-slate-100 bg-white px-5 py-12 text-center"><Users size={26} className="mx-auto text-slate-300" /><h2 className="mt-3 text-sm font-semibold">No classrooms yet</h2><p className="mt-1 text-xs text-slate-500">Your teacher will add you to a classroom before lessons appear here.</p></section> : <section className="mt-5 space-y-4">{classrooms.map((classroom) => { const classroomLessons = lessons.filter((lesson) => lesson.classroom_id === classroom.classroom_id); const cover = classroom.cover_image_path ? supabase.storage.from("images").getPublicUrl(classroom.cover_image_path).data.publicUrl : "/classRoomIllustration.png"; return <article key={classroom.classroom_id} className="overflow-hidden rounded-xl border border-slate-100 bg-white"><div className="grid gap-4 p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-5"><img src={cover} alt={classroom.classroom_name} className="h-32 w-full rounded-lg object-cover sm:h-full" /><div><h2 className="text-lg font-bold">{classroom.classroom_name}</h2>{classroom.description && <p className="mt-2 text-sm leading-6 text-slate-500">{classroom.description}</p>}<p className="mt-3 text-xs font-semibold text-slate-500">{classroomLessons.length} lesson{classroomLessons.length === 1 ? "" : "s"} available</p></div></div><div className="border-t border-slate-100 p-4 sm:p-5">{classroomLessons.length === 0 ? <p className="text-sm text-slate-500">No lessons have been added to this classroom yet.</p> : <div className="space-y-2">{classroomLessons.map((lesson) => { const image = lesson.lesson_image_path ? supabase.storage.from("images").getPublicUrl(lesson.lesson_image_path).data.publicUrl : "/Level1.png"; return <div key={lesson.lesson_id} className="flex flex-col gap-3 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center"><img src={image} alt="" className="h-14 w-full rounded-lg object-cover sm:w-20" /><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{lesson.title}</h3><p className="mt-1 line-clamp-1 text-xs text-slate-500">{lesson.description ?? "Vocabulary practice"}</p><p className="mt-1 text-xs text-slate-400">{flashcardCounts[lesson.lesson_id] ?? 0} flashcards</p></div><button type="button" onClick={() => navigate(`/lesson/${lesson.lesson_id}`)} className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800">Start lesson <ChevronRight size={15} /></button></div>; })}</div>}</div></article>; })}</section>)}</div></main></div>;
}