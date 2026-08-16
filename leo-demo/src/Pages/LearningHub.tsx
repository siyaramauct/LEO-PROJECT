import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Headphones,
  Home,
  Layers,
  LogOut,
  Mic,
  Plus,
  Settings,
  Sparkles,
  Globe2,
  User,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import ArticleLinkCard, { type ArticleLink } from "../Components/ArticleLinkCard";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";

// Free-to-use Unsplash photography — no project image assets used here.
const articles: ArticleLink[] = [
  {
    title: "Practice with real audio, video and pronunciation drills",
    source: "BBC Learning English",
    description: "Free lessons and news-based English for every level, built for daily practice.",
    url: "https://www.bbc.co.uk/learningenglish",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Person listening to audio on a laptop with headphones",
    accentClassName: "bg-violet-700",
    icon: <Headphones size={16} />,
  },
  {
    title: "Structured grammar, vocabulary and free courses",
    source: "British Council LearnEnglish",
    description: "Courses and classroom-ready tips trusted by teachers worldwide.",
    url: "https://learnenglish.britishcouncil.org/",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Students sitting together in a classroom",
    accentClassName: "bg-amber-500",
    icon: <BookOpen size={16} />,
  },
  {
    title: "Bite-sized tips for building vocabulary that sticks",
    source: "FluentU Blog",
    description: "Practical techniques for keeping learners motivated between lessons.",
    url: "https://www.fluentu.com/blog/",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Stack of open books on a wooden table",
    accentClassName: "bg-rose-500",
    icon: <Sparkles size={16} />,
  },
  {
    title: "Ideas from language teaching experts",
    source: "Cambridge English Blog",
    description: "Classroom-tested strategies for teaching learners at every level.",
    url: "https://www.cambridge.org/elt/blog/",
    image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Teacher presenting confidently to a group",
    accentClassName: "bg-emerald-600",
    icon: <GraduationCap size={16} />,
  },
  {
    title: "Why we learn languages the way we do",
    source: "Duolingo Blog",
    description: "Research-backed insights on habits that make learning stick.",
    url: "https://blog.duolingo.com/",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Two people having a friendly conversation",
    accentClassName: "bg-sky-600",
    icon: <Globe2 size={16} />,
  },
  {
    title: "Talks on language, culture and connection",
    source: "TED Topics: Language",
    description: "Short talks that spark classroom discussion about communication.",
    url: "https://www.ted.com/topics/language",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Person wearing headphones listening closely",
    accentClassName: "bg-orange-500",
    icon: <Mic size={16} />,
  },
];

// The central, top-of-page hero — creating a classroom is the page's main action.
function CreateClassroomHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-violet-700 p-6 text-center text-white sm:p-10">
      <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute right-1/4 top-6 h-8 w-8 rotate-12 rounded-lg border-2 border-white/20" />
      <div className="absolute left-1/4 bottom-6 h-6 w-6 rotate-45 rounded-md border-2 border-white/20" />

      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
          <Sparkles size={13} />
          Learning Hub
        </span>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Create your next classroom</h1>
        <p className="text-sm text-white/90 sm:text-base">
          Set up a name, level and cover in a couple of minutes, then invite your learners.
          Get inspired below, then bring it to life.
        </p>
        <Link
          to="/create-classroom"
          className="mt-1 flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-violet-50"
        >
          <Plus size={19} />
          Create a classroom
        </Link>
      </div>
    </section>
  );
}

export default function LearningHub() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Mobile hub layout */}
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-6">
          <Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100">
            <ArrowLeft size={19} />
          </Link>
          <button aria-label="Notifications" className="relative rounded-full p-2 transition hover:bg-slate-100">
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" />
          </button>
        </header>

        <main className="flex-1 space-y-4 px-4 pb-5 sm:px-6">
          <CreateClassroomHero />

          <section>
            <h2 className="text-sm font-bold text-slate-900">Articles &amp; tips</h2>
            <p className="mt-1 text-xs text-slate-500">Hand-picked reading and listening for language teachers.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleLinkCard key={article.url} article={article} />
              ))}
            </div>
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" />
          <NavItem icon={<Users size={19} />} label="Classes" />
          <Link to="/learning-hub" aria-label="Open the learning hub" className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white shadow-lg shadow-violet-200">
            <Plus size={23} />
          </Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" />
          <NavItem icon={<User size={19} />} label="Profile" />
        </nav>
      </div>

      {/* Desktop hub layout */}
      <div className="hidden min-h-dvh lg:flex">
        <aside className="flex w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2"><h1 className="text-2xl font-bold tracking-tight">LEO</h1><p className="text-xs text-white">Teacher Portal</p></div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" />
            <SidebarItem icon={<Sparkles size={18} />} label="Explore" active />
            <SidebarItem icon={<BookOpen size={18} />} label="Lessons" />
            <SidebarItem icon={<Layers size={18} />} label="Flashcards" />
            <SidebarItem icon={<ClipboardList size={18} />} label="Quizzes" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" />
          </nav>
          <div className="mt-auto space-y-2"><SidebarItem icon={<Settings size={18} />} label="Settings" /><SidebarItem icon={<LogOut size={18} />} label="Logout" /></div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link>
              <div><p className="text-xs font-medium text-violet-700">Teacher Portal</p><h1 className="mt-1 text-xl font-bold">Learning Hub</h1></div>
            </div>
            <div className="flex items-center gap-4">
              <button aria-label="Notifications" className="rounded-xl p-2.5 transition hover:bg-slate-100"><Bell size={19} /></button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-bold text-white">T</div>
                <div><p className="text-sm font-semibold">Teacher Siya</p><p className="text-xs text-slate-400">Teacher</p></div>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl space-y-5 p-5">
            <CreateClassroomHero />

            <section>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-bold">Articles &amp; tips</h2>
                  <p className="mt-1 text-sm text-slate-500">Hand-picked reading and listening for language teachers.</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {articles.map((article) => (
                  <ArticleLinkCard key={article.url} article={article} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
