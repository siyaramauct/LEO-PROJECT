import {
  BellIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  FireIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline"
import { useNavigate } from "react-router-dom"
import StudentBottomNav from "../Components/StudentBottomNav"

const quickActions = [
  {
    label: "Study Flashcards",
    shortLabel: "Study",
    path: "/student/flashcards",
    icon: RectangleStackIcon,
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  {
    label: "Take Quiz",
    shortLabel: "Quiz",
    path: "/student/quiz",
    icon: ClipboardDocumentCheckIcon,
    bg: "bg-rose-50",
    iconBg: "bg-rose-100",
    text: "text-rose-700",
  },
  {
    label: "Dictionary",
    shortLabel: "Dictionary",
    path: "/student/dictionary",
    icon: BookOpenIcon,
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    text: "text-blue-700",
  },
  {
    label: "My Progress",
    shortLabel: "Progress",
    path: "/student/progress",
    icon: ChartBarIcon,
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
    text: "text-orange-700",
  },
]

const recentLessons = [
  {
    title: "Environmental Science",
    detail: "15 words · 20 min",
    progress: "60%",
    icon: "🌱",
  },
  {
    title: "Academic Vocabulary",
    detail: "12 words · 10 min",
    progress: "90%",
    icon: "🎓",
  },
]

export default function StudentDashboard() {
  const navigate = useNavigate()

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-slate-50 pb-24 text-slate-950 md:pb-10 md:pl-56">
      <section className="flex w-full flex-col gap-5 px-4 pt-5 min-[380px]:px-5 sm:px-6 md:px-8 md:py-8 xl:mx-auto xl:max-w-[1440px] xl:px-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-normal sm:text-3xl md:text-2xl">Hi, Arka 👋</h1>
            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm md:text-xs">
              Ready to learn something new today?
            </p>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
            aria-label="Notifications"
          >
            <BellIcon className="h-5 w-5" />
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.1fr_1fr_1fr]">
          <article className="overflow-hidden rounded-2xl bg-violet-700 p-4 text-white shadow-lg shadow-violet-200 min-[380px]:p-5 sm:col-span-2 md:col-span-1 md:rounded-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-violet-100">Today's Lesson</p>
                <h2 className="mt-3 text-sm font-bold leading-snug">Biology: Cell Structure</h2>
                <p className="mt-2 text-xs text-violet-100">10 words · 15 min</p>
              </div>
              <img
                src="/business-illustration.avif"
                alt="Colorful lesson illustration"
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-white/20 min-[380px]:h-20 min-[380px]:w-20"
              />
            </div>
            <button
              onClick={() => navigate("/lesson/1")}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50 active:scale-95"
            >
              Continue Lesson
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </article>

          <article className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 min-[360px]:grid-cols-2 md:rounded-xl">
            <h2 className="text-sm font-bold min-[360px]:col-span-2">Your Progress</h2>
            <div className="rounded-xl border border-slate-100 p-3">
              <BookOpenIcon className="h-5 w-5 text-violet-700" />
              <p className="mt-3 text-[11px] font-semibold text-slate-500">Weekly Goal</p>
              <p className="mt-1 text-xs font-bold text-slate-900">4 / 7 lessons</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[57%] rounded-full bg-violet-700" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <FireIcon className="h-5 w-5 text-orange-500" />
              <p className="mt-3 text-[11px] font-semibold text-slate-500">Streak</p>
              <p className="mt-1 text-xs font-bold text-slate-900">5 days</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[72%] rounded-full bg-orange-400" />
              </div>
            </div>
          </article>

          <article className="hidden rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 xl:block">
            <h2 className="text-sm font-bold">Overall Progress</h2>
            <div className="mt-5 flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-violet-700 bg-white text-xl font-bold text-violet-700">
                67%
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Lessons Completed</p>
                <p className="mt-1 text-lg font-bold">24 / 36</p>
              </div>
            </div>
          </article>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`${action.bg} flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md active:scale-95 sm:min-h-24 md:min-h-16 md:flex-row md:justify-start md:px-4`}
              >
                <span className={`${action.iconBg} ${action.text} flex h-8 w-8 items-center justify-center rounded-lg`}>
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-bold leading-tight text-slate-800 md:text-xs">
                  <span className="md:hidden">{action.shortLabel}</span>
                  <span className="hidden md:inline">{action.label}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:rounded-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Recent Lessons</h2>
              <button onClick={() => navigate("/lessons")} className="text-xs font-bold text-violet-700">
                View all
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {recentLessons.map((lesson) => (
                <button
                  key={lesson.title}
                  onClick={() => navigate("/lessons")}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                    {lesson.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{lesson.title}</span>
                    <span className="mt-1 block text-[11px] text-slate-500">{lesson.detail}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    {lesson.progress}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </article>

          <article className="hidden rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:block">
            <h2 className="text-sm font-bold">Activity Overview</h2>
            <div className="mt-5 flex h-48 items-end gap-3 border-b border-l border-slate-200 px-3 pb-3">
              {[38, 46, 35, 68, 28, 44, 34].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg bg-violet-600" style={{ height: `${height * 2}px` }} />
                  <span className="text-[10px] text-slate-500">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
      <StudentBottomNav />
    </main>
  )
}
