import { Bell, BookOpen, ChevronRight, ClipboardCheck, Layers, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentBottomNav from "../Components/StudentBottomNav";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../supabase-client";

type StudentProfile = { name: string | null; surname: string | null };

const classrooms = [
  { name: "English for Everyday Life", teacher: "Teacher Siya", progress: "72%", detail: "8 of 12 lessons done", image: "/kidsSmilingLanguage.jpg" },
  { name: "Reading and Vocabulary", teacher: "Teacher Arka", progress: "58%", detail: "7 of 14 lessons done", image: "/fetchbook.jpg" },
];

const recentLessons = [
  { title: "Environmental Science", detail: "15 words · 20 min", progress: "60%", image: "/business-illustration.avif" },
  { title: "Academic Vocabulary", detail: "12 words · 10 min", progress: "90%", image: "/girlTypingLANG.png" },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(() => Boolean(session?.user));
  const fallbackName = session?.user.user_metadata?.name ?? session?.user.email?.split("@")[0] ?? "there";
  const studentName = studentProfile?.name ?? fallbackName;

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("name, surname").eq("id", session.user.id).maybeSingle();
      setStudentProfile(data);
      setIsProfileLoading(false);
    };

    void loadProfile();
  }, [session?.user]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-xs font-medium text-violet-700">Student portal</p><h1 className="mt-1 text-xl font-bold">Hi, {isProfileLoading ? "..." : studentName}</h1><p className="mt-1 text-xs text-slate-500">Continue building your English skills.</p></div><button type="button" aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><Bell size={19} /></button></div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="relative overflow-hidden rounded-xl bg-violet-700 p-5 text-white sm:p-6"><div className="absolute inset-y-0 right-0 w-40 bg-white/10 sm:w-52" /><img src="/corporateStyleLessonIlustration.avif" alt="Student learning" className="absolute inset-y-0 right-0 w-40 object-cover sm:w-52" /><div className="relative max-w-md pr-24 sm:pr-32"><p className="text-xs font-medium text-violet-100">Continue learning</p><h2 className="mt-2 text-xl font-bold">Biology: Cell Structure</h2><p className="mt-2 text-sm text-violet-100">Review 10 key words, then complete the quiz.</p><button type="button" onClick={() => navigate("/lesson/1")} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">Open lesson <ChevronRight size={16} /></button></div></article>
            <article className="rounded-xl border border-slate-100 bg-white p-5"><h2 className="text-sm font-bold">Learning overview</h2><div className="mt-5 grid grid-cols-2 gap-4"><div><p className="text-2xl font-bold">4 / 7</p><p className="mt-1 text-xs text-slate-500">Weekly lessons</p></div><div><p className="text-2xl font-bold">5 days</p><p className="mt-1 text-xs text-slate-500">Learning streak</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[57%] rounded-full bg-violet-700" /></div><p className="mt-2 text-xs text-slate-500">57% of this week’s goal completed</p></article>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><button type="button" onClick={() => navigate("/student/flashcards")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Layers size={18} /></span><span><span className="block text-sm font-semibold">Practice</span><span className="mt-1 block text-xs text-slate-500">Flashcards</span></span></button><button type="button" onClick={() => navigate("/quiz")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><ClipboardCheck size={18} /></span><span><span className="block text-sm font-semibold">Quiz</span><span className="mt-1 block text-xs text-slate-500">Check learning</span></span></button><button type="button" onClick={() => navigate("/lessons")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><BookOpen size={18} /></span><span><span className="block text-sm font-semibold">Lessons</span><span className="mt-1 block text-xs text-slate-500">Browse all</span></span></button><button type="button" onClick={() => navigate("/student/classrooms")} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Users size={18} /></span><span><span className="block text-sm font-semibold">Classes</span><span className="mt-1 block text-xs text-slate-500">View enrolments</span></span></button></section>

          <section className="mt-5 grid gap-4 lg:grid-cols-2"><article className="rounded-xl border border-slate-100 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold">My classrooms</h2><p className="mt-1 text-sm text-slate-500">Continue where your teacher left off.</p></div><button type="button" onClick={() => navigate("/student/classrooms")} className="text-sm font-semibold text-violet-700">View all</button></div><div className="mt-4 space-y-2">{classrooms.map((classroom) => <button key={classroom.name} type="button" onClick={() => navigate("/student/classrooms")} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50"><img src={classroom.image} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{classroom.name}</span><span className="mt-1 block text-xs text-slate-500">{classroom.teacher} · {classroom.detail}</span></span><span className="text-xs font-semibold text-violet-700">{classroom.progress}</span><ChevronRight size={16} className="text-slate-400" /></button>)}</div></article><article className="rounded-xl border border-slate-100 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold">Recent lessons</h2><p className="mt-1 text-sm text-slate-500">Pick up a recent learning activity.</p></div><button type="button" onClick={() => navigate("/lessons")} className="text-sm font-semibold text-violet-700">View all</button></div><div className="mt-4 space-y-2">{recentLessons.map((lesson) => <button key={lesson.title} type="button" onClick={() => navigate("/lessons")} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50"><img src={lesson.image} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{lesson.title}</span><span className="mt-1 block text-xs text-slate-500">{lesson.detail}</span></span><span className="text-xs font-semibold text-violet-700">{lesson.progress}</span><ChevronRight size={16} className="text-slate-400" /></button>)}</div></article></section>
        </div>
      </main>
    </div>
  );
}