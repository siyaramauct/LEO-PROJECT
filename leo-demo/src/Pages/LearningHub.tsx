import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Headphones,
  Mic,
  Sparkles,
  Globe2,
} from "lucide-react";
import { Link } from "react-router-dom";
import ArticleLinkCard, { type ArticleLink } from "../Components/ArticleLinkCard";
import CreateClassroomHero from "../Components/CreateClassroomHero";
import NotificationBell from "../Components/NotificationBell";
import UserIdentity from "../Components/UserIdentity";
import TeacherBottomNav from "../Components/TeacherBottomNav";
import TeacherSidebar from "../Components/TeacherSidebar";

// Free-to-use Unsplash photography — no project image assets used here.
const articles: ArticleLink[] = [
  {
    title: "Practice with real audio, video and pronunciation drills",
    source: "BBC Learning English",
    description: "Free lessons and news-based English for every level, built for daily practice.",
    url: "https://www.bbc.co.uk/learningenglish",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Person listening to audio on a laptop with headphones",
    accentClassName: "bg-violet-700",
    icon: <Headphones size={16} />,
  },
  {
    title: "Structured grammar, vocabulary and free courses",
    source: "British Council LearnEnglish",
    description: "Courses and classroom-ready tips trusted by teachers worldwide.",
    url: "https://learnenglish.britishcouncil.org/",
    image:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Students sitting together in a classroom",
    accentClassName: "bg-amber-500",
    icon: <BookOpen size={16} />,
  },
  {
    title: "Bite-sized tips for building vocabulary that sticks",
    source: "FluentU Blog",
    description: "Practical techniques for keeping learners motivated between lessons.",
    url: "https://www.fluentu.com/blog/",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Stack of open books on a wooden table",
    accentClassName: "bg-rose-500",
    icon: <Sparkles size={16} />,
  },
  {
    title: "Ideas from language teaching experts",
    source: "Cambridge English Blog",
    description: "Classroom-tested strategies for teaching learners at every level.",
    url: "https://www.cambridge.org/elt/blog/",
    image:
      "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Teacher presenting confidently to a group",
    accentClassName: "bg-emerald-600",
    icon: <GraduationCap size={16} />,
  },
  {
    title: "Why we learn languages the way we do",
    source: "Duolingo Blog",
    description: "Research-backed insights on habits that make learning stick.",
    url: "https://blog.duolingo.com/",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Two people having a friendly conversation",
    accentClassName: "bg-sky-600",
    icon: <Globe2 size={16} />,
  },
  {
    title: "Talks on language, culture and connection",
    source: "TED Topics: Language",
    description: "Short talks that spark classroom discussion about communication.",
    url: "https://www.ted.com/topics/language",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=60",
    imageAlt: "Person wearing headphones listening closely",
    accentClassName: "bg-orange-500",
    icon: <Mic size={16} />,
  },
];

export default function LearningHub() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {
        // Mobile hub layout
      }
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-6">
          <Link
            to="/TeacherClassroom"
            aria-label="Back to classrooms"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={19} />
          </Link>
          <NotificationBell />
        </header>

        <main className="flex-1 space-y-4 px-4 pb-5 sm:px-6">
          <CreateClassroomHero />

          <section>
            <h2 className="text-sm font-bold text-slate-900">Articles &amp; tips</h2>
            <p className="mt-1 text-xs text-slate-500">
              Hand-picked reading and listening for language teachers.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleLinkCard key={article.url} article={article} />
              ))}
            </div>
          </section>
        </main>

        <TeacherBottomNav active="explore" />
      </div>

      {
        // Desktop hub layout
      }
      <div className="hidden min-h-dvh lg:flex">
        <TeacherSidebar active="explore" />

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <Link
                to="/TeacherClassroom"
                aria-label="Back to classrooms"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeft size={19} />
              </Link>
              <div>
                <p className="text-xs font-medium text-violet-700">Teacher Portal</p>
                <h1 className="mt-1 text-xl font-bold">Learning Hub</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="flex items-center gap-3">
                <UserIdentity />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl space-y-5 p-5">
            <CreateClassroomHero />

            <section>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-bold">Articles &amp; tips</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Hand-picked reading and listening for language teachers.
                  </p>
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
