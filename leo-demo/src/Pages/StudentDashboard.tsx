import { ChevronRight, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";

type StudentProfile = { name: string | null; surname: string | null };
type StudentProgress = { current_streak: number; longest_streak: number; weekly_lessons_completed: number; weekly_goal: number };

type Classroom = {
  classroom_id: string;
  classroom_name: string;
  description: string | null;
  cover_image_path: string | null;
  created_date: string | null;
};

const DASHBOARD_CLASSROOM_LIMIT = 2;
const RECENTLY_ADDED_LIMIT = 4;

type RecentlyAddedLesson = {
  lesson_id: string;
  title: string;
  classroomName: string;
  lesson_image_path: string | null;
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(() => Boolean(session?.user));
  const [studentClassroom, setStudentClassroom] = useState<Classroom | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomError, setClassroomError] = useState<string | null>(null);
  const [recentlyAddedLessons, setRecentlyAddedLessons] = useState<RecentlyAddedLesson[]>([]);
  const [recentlyAddedError, setRecentlyAddedError] = useState<string | null>(null);
  const fallbackName = session?.user.user_metadata?.name ?? session?.user.email?.split("@")[0] ?? "there";
  const studentName = studentProfile?.name ?? fallbackName;
  const weeklyPct = progress ? Math.min(100, Math.round((progress.weekly_lessons_completed / Math.max(progress.weekly_goal, 1)) * 100)) : 0;

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const loadProfile = async () => {
      const [{ data }, { data: progressData }] = await Promise.all([
        supabase.from("profiles").select("name, surname").eq("id", session.user.id).maybeSingle(),
        supabase.rpc("get_student_progress"),
      ]);
      setStudentProfile(data);
      setProgress((progressData?.[0] as StudentProgress) ?? null);
      setIsProfileLoading(false);
    };

    void loadProfile();
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    let isCurrent = true;

    const loadClassroom = async () => {
      setClassroomError(null);
      const { data: enrolments, error: enrolmentError } = await supabase
        .from("classroom_students")
        .select("classroom_id, enrolled_at")
        .eq("student_id", session.user.id)
        .order("enrolled_at", { ascending: false, nullsFirst: false })
        .limit(DASHBOARD_CLASSROOM_LIMIT);

      if (enrolmentError) {
        if (isCurrent) setClassroomError("Your classrooms could not be loaded right now.");
        return;
      }

      const classroomIds = (enrolments ?? []).map((enrolment) => enrolment.classroom_id);
      if (!classroomIds.length) {
        if (isCurrent) {
          setClassrooms([]);
          setStudentClassroom(null);
        }
        return;
      }

      const { data: classroomData, error: classroomsError } = await supabase
        .from("classrooms")
        .select("classroom_id, classroom_name, description, cover_image_path, created_date")
        .in("classroom_id", classroomIds);

      if (classroomsError) {
        if (isCurrent) setClassroomError("Your classroom details could not be loaded right now.");
        return;
      }

      const classroomsById = new Map((classroomData ?? []).map((classroom) => [classroom.classroom_id, classroom]));
      const orderedClassrooms = classroomIds
        .map((classroomId) => classroomsById.get(classroomId))
        .filter((classroom): classroom is Classroom => Boolean(classroom))
        .map((classroom) => ({
          ...classroom,
          cover_image_path: classroom.cover_image_path
            ? supabase.storage.from("images").getPublicUrl(classroom.cover_image_path).data.publicUrl
            : null,
        }));

      if (isCurrent) {
        setClassrooms(orderedClassrooms);
        // Enrolments are newest-first, so the mobile/desktop banner always shows the latest class.
        setStudentClassroom(orderedClassrooms[0] ?? null);
      }
    };

    void loadClassroom();
    return () => { isCurrent = false; };
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    let isCurrent = true;

    const loadRecentlyAdded = async () => {
      setRecentlyAddedError(null);
      const { data: enrolments, error: enrolmentError } = await supabase
        .from("classroom_students")
        .select("classroom_id")
        .eq("student_id", session.user.id);

      if (enrolmentError) {
        if (isCurrent) setRecentlyAddedError("Recently added lessons could not be loaded right now.");
        return;
      }

      const classroomIds = (enrolments ?? []).map((enrolment) => enrolment.classroom_id);
      if (!classroomIds.length) {
        if (isCurrent) setRecentlyAddedLessons([]);
        return;
      }

      const { data: lessonData, error: lessonsError } = await supabase
        .from("lessons")
        .select("lesson_id, title, lesson_image_path, classrooms(classroom_name)")
        .in("classroom_id", classroomIds)
        .order("created_at", { ascending: false })
        .limit(RECENTLY_ADDED_LIMIT);

      if (lessonsError) {
        if (isCurrent) setRecentlyAddedError("Recently added lessons could not be loaded right now.");
        return;
      }

      if (isCurrent) {
        setRecentlyAddedLessons(
          (lessonData ?? []).map((lesson) => {
            const classroom = Array.isArray(lesson.classrooms) ? lesson.classrooms[0] : lesson.classrooms;
            return {
              lesson_id: lesson.lesson_id,
              title: lesson.title,
              classroomName: classroom?.classroom_name ?? "Classroom",
              lesson_image_path: lesson.lesson_image_path
                ? supabase.storage.from("images").getPublicUrl(lesson.lesson_image_path).data.publicUrl
                : null,
            };
          })
        );
      }
    };

    void loadRecentlyAdded();
    return () => { isCurrent = false; };
  }, [session?.user]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-xs font-medium text-violet-700">Student portal</p><h1 className="mt-1 text-xl font-bold">Hi, {isProfileLoading ? "..." : studentName}</h1><p className="mt-1 text-xs text-slate-500">Continue building your English skills.</p></div><NotificationBell /></div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="relative overflow-hidden rounded-xl bg-violet-700 p-5 text-white sm:p-6"><div className="absolute inset-y-0 right-0 w-40 bg-white/10 sm:w-52" /><img src={studentClassroom?.cover_image_path ?? undefined} alt="Student learning" className="absolute inset-y-0 right-0 w-40 object-cover sm:w-52" /><div className="relative max-w-md pr-24 sm:pr-32"><p className="text-xs font-medium text-violet-100">Continue learning</p><h2 className="mt-2 text-xl font-bold">{studentClassroom?.classroom_name}</h2><p className="mt-2 text-sm text-violet-100">{studentClassroom?.description}</p><button type="button" disabled={!studentClassroom} onClick={() => studentClassroom && navigate(`/student/classrooms/${studentClassroom.classroom_id}`)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60">Open Classroom <ChevronRight size={16} /></button></div></article>
            <article className="rounded-xl border border-slate-100 bg-white p-5"><h2 className="text-sm font-bold">Learning overview</h2><div className="mt-5 grid grid-cols-2 gap-4"><div><p className="text-2xl font-bold">{progress ? `${progress.weekly_lessons_completed} / ${progress.weekly_goal}` : "—"}</p><p className="mt-1 text-xs text-slate-500">Weekly lessons</p></div><div><p className="text-2xl font-bold">{progress ? `${progress.current_streak} day${progress.current_streak === 1 ? "" : "s"}` : "—"}</p><p className="mt-1 text-xs text-slate-500">Learning streak</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-700" style={{ width: `${weeklyPct}%` }} /></div><p className="mt-2 text-xs text-slate-500">{weeklyPct}% of this week’s goal completed</p></article>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <button type="button" onClick={() => navigate("/student/flashcards")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Layers size={18} /></span>
              <span><span className="block text-sm font-semibold">Practice</span><span className="mt-1 block text-xs text-slate-500">Flashcards</span></span>
            </button>
            <button type="button" onClick={() => navigate("/quiz")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50"><img src="/girlMagnifyingGlass.png" alt="" className="h-full w-full object-contain p-0.5" /></span>
              <span><span className="block text-sm font-semibold">Quiz</span><span className="mt-1 block text-xs text-slate-500">Check learning</span></span>
            </button>
            <button type="button" onClick={() => navigate("/lessons")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50"><img src="/Level1.png" alt="" className="h-full w-full object-contain p-0.5" /></span>
              <span><span className="block text-sm font-semibold">Lessons</span><span className="mt-1 block text-xs text-slate-500">Browse all</span></span>
            </button>
            <button type="button" onClick={() => navigate("/student/classrooms")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50"><img src="/classRoomIllustration.png" alt="" className="h-full w-full object-contain p-0.5" /></span>
              <span><span className="block text-sm font-semibold">Classes</span><span className="mt-1 block text-xs text-slate-500">View enrolments</span></span>
            </button>
            <button type="button" onClick={() => navigate("/student/hub")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50"><img src="/Nerd-amico.png" alt="" className="h-full w-full object-contain p-0.5" /></span>
              <span><span className="block text-sm font-semibold">Hub</span><span className="mt-1 block text-xs text-slate-500">Free resources</span></span>
            </button>
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-2"><article className="rounded-xl border border-slate-100 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold">My classrooms</h2><p className="mt-1 text-sm text-slate-500">Your {DASHBOARD_CLASSROOM_LIMIT} most recent enrolments.</p></div><button type="button" onClick={() => navigate("/student/classrooms")} className="text-sm font-semibold text-violet-700">View all</button></div>{classroomError ? <p role="alert" className="mt-4 text-sm text-red-700">{classroomError}</p> : classrooms.length === 0 ? <p className="mt-4 text-sm text-slate-500">You have not been enrolled in a classroom yet.</p> : <div className="mt-4 space-y-2">{classrooms.map((classroom) => <button key={classroom.classroom_id} type="button" onClick={() => navigate(`/student/classrooms/${classroom.classroom_id}`)} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50">{classroom.cover_image_path ? <img src={classroom.cover_image_path} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" /> : <div className="h-11 w-14 shrink-0 rounded-lg bg-violet-50" />}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{classroom.classroom_name}</span><span className="mt-1 block truncate text-xs text-slate-500">{classroom.description ?? "Classroom"}</span></span><ChevronRight size={16} className="text-slate-400" /></button>)}</div>}</article><article className="rounded-xl border border-slate-100 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold">Recently added</h2><p className="mt-1 text-sm text-slate-500">Newest lessons added to your classrooms.</p></div><button type="button" onClick={() => navigate("/lessons")} className="text-sm font-semibold text-violet-700">View all</button></div>{recentlyAddedError ? <p role="alert" className="mt-4 text-sm text-red-700">{recentlyAddedError}</p> : recentlyAddedLessons.length === 0 ? <p className="mt-4 text-sm text-slate-500">No lessons have been added to your classrooms yet.</p> : <div className="mt-4 space-y-2">{recentlyAddedLessons.map((lesson) => <button key={lesson.lesson_id} type="button" onClick={() => navigate(`/lesson/${lesson.lesson_id}`)} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50">{lesson.lesson_image_path ? <img src={lesson.lesson_image_path} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" /> : <div className="h-11 w-14 shrink-0 rounded-lg bg-violet-50" />}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{lesson.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{lesson.classroomName}</span></span><ChevronRight size={16} className="text-slate-400" /></button>)}</div>}</article></section>
        </div>
      </main>
    </div>
  );
}
