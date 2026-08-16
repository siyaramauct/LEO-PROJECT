import {
  Bell,
  BookOpen,
  Users,
  BarChart3,
  Plus,
  ChevronRight,
  ClipboardCheck,
  Home,
  Layers,
  User,
  Settings,
  LogOut,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";
import StatCard from "../Components/StatCard";

const classes = [
  {
    name: "Business English",
    students: 24,
    lessons: 12,
    image: "/englishHoldingBack.jpg",
    imageAlt: "Business English learning illustration",
  },
  {
    name: "Travel English",
    students: 18,
    lessons: 8,
    image: "/travel-illustration.avif",
    imageAlt: "Travel English learning illustration",
  },
  {
    name: "B2 English Learners",
    students: 20,
    lessons: 6,
    image: "/corporateStyleLessonIlustration.avif",
    imageAlt: "English learners working together illustration",
  },
];

const activeClass = classes[0];

const teacher = {
  name: "Maryna",
  role: "Teacher",
  avatar: "T",
};

const recentLessons = [
  {
    title: "Professional Email Essentials",
    className: "Business English",
    words: 10,
    image: "/girlTypingLANG.png",
    imageAlt: "Learner completing an online English lesson",
  },
  {
    title: "Checking In at the Hotel",
    className: "Travel English",
    words: 15,
    image: "/classRoomIllustration.png",
    imageAlt: "English class learning illustration",
  },
  {
    title: "Making Plans and Suggestions",
    className: "B2 English Learners",
    words: 12,
    image: "/kidsSmilingLanguage.jpg",
    imageAlt: "Multilingual learners communicating",
  },
  {
    title: "Presenting Ideas with Confidence",
    className: "Business English",
    words: 8,
    image: "/englishHoldingBack.jpg",
    imageAlt: "English language learning illustration",
  },
];

export default function TeacherDashboard() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* =========================
          MOBILE APP
      ========================== */}
      <div className="mx-auto flex h-dvh max-w-4xl flex-col overflow-hidden bg-white pb-16 lg:hidden">

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2 sm:px-6">
          <div>
            <p className="text-sm text-slate-500">
              Welcome back
            </p>

            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              Hi, {teacher.name} 👋
            </h1>

            <p className="mt-0.5 text-[11px] text-slate-400">
              Here's what's happening in your classrooms.
            </p>
          </div>

          <button className="relative rounded-full p-2 hover:bg-slate-100">
            <Bell size={21} strokeWidth={1.8} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" />
          </button>
        </header>

        {/* =========================
            ACTIVE CLASS
        ========================== */}
        <section className="mt-2 shrink-0 px-4 sm:px-6">

          <div className="relative overflow-hidden rounded-xl bg-violet-700 p-3.5 text-white shadow-lg shadow-violet-200">

            {/* Decorative circle */}
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

            <div className="relative">

              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide">
                  Active Classroom
                </span>

                <MoreHorizontal size={18} className="opacity-80" />
              </div>

              <div className="mt-3 flex items-center justify-between">

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">
                    {activeClass.name}
                  </h2>

                  <p className="mt-1 text-xs text-violet-100">
                    {activeClass.students} students · {activeClass.lessons} lessons
                  </p>
                </div>

                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                  <img
                    src={activeClass.image}
                    alt={activeClass.imageAlt}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              <button className="mt-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-50">
                View Classroom
                <ChevronRight size={15} />
              </button>

            </div>
          </div>

        </section>

        {/* =========================
            TODAY'S OVERVIEW
        ========================== */}
        <section className="mt-3 shrink-0 px-4 sm:px-6">

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Today's Overview
            </h2>

            <button className="text-xs font-medium text-violet-700">
              View reports
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">

            {/* Lessons */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-700">
                <BookOpen size={16} />
              </div>

              <p className="mt-2 text-lg font-bold">
                12
              </p>

              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                Lessons created
              </p>
            </div>

            {/* Students */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-700">
                <Users size={16} />
              </div>

              <p className="mt-2 text-lg font-bold">
                24
              </p>

              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                Active students
              </p>
            </div>

            {/* Quizzes */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-700">
                <ClipboardCheck size={16} />
              </div>

              <p className="mt-2 text-lg font-bold">
                7
              </p>

              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                Quizzes completed
              </p>
            </div>

          </div>
        </section>

        {/* =========================
            QUICK ACTIONS
        ========================== */}
          <section className="mt-3 shrink-0 px-4 sm:px-6">

          <h2 className="mb-3 text-sm font-bold">
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 gap-2">

            <Link to="/create-lesson" className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-left transition hover:bg-violet-100">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700">
                <Plus size={20} />
              </div>

              <div>
                <p className="text-xs font-bold">
                  Create Lesson
                </p>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  Add vocabulary
                </p>
              </div>

            </Link>

            <Link to="/TeacherClassroom" className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition hover:bg-slate-100">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
                <Users size={19} />
              </div>

              <div>
                <p className="text-xs font-bold">
                  Students
                </p>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  View your students
                </p>
              </div>

            </Link>

          </div>
        </section>

        {/* =========================
            MY CLASSES
        ========================== */}
          <section className="mt-3 shrink-0 px-4 sm:px-6">

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">
              My Classes
            </h2>

            <button className="text-xs font-medium text-violet-700">
              View all
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">

            {classes.map((item) => (
              <Link
                key={item.name}
                to="/lessons"
                className="flex h-32 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white text-center shadow-sm transition hover:border-violet-200"
              >

                <div className="min-h-0 w-full flex-1 overflow-hidden bg-slate-50">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-2 min-w-0 shrink-0 px-2 pb-2">
                  <p className="truncate text-[10px] font-bold">
                    {item.name}
                  </p>

                  <p className="mt-0.5 text-[9px] text-slate-500">
                    {item.students} students
                  </p>
                </div>

              </Link>
            ))}

          </div>
        </section>

        {/* =========================
            RECENT LESSONS
        ========================== */}
          <section className="mt-3 min-h-0 flex-1 px-4 sm:px-6">

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Recent Lessons
            </h2>

            <button className="text-xs font-medium text-violet-700">
              View all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">

            {recentLessons.map((lesson) => (
              <button
                key={lesson.title}
                className="flex min-w-0 items-center rounded-xl border border-slate-100 bg-white p-2 text-left transition hover:border-violet-200"
              >

                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                  <img
                    src={lesson.image}
                    alt={lesson.imageAlt}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="ml-2 min-w-0 flex-1">

                  <p className="truncate text-[10px] font-bold">
                    {lesson.title}
                  </p>

                  <p className="mt-0.5 text-[9px] text-slate-500">
                    {lesson.words} words
                  </p>

                </div>

              </button>
            ))}

          </div>
        </section>

        {/* =========================
            MOBILE NAVIGATION
        ========================== */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">

          <NavItem
            icon={<Home size={19} />}
            label="Home"
            to="/teacher-dashboard"
            active
          />

          <NavItem
            icon={<Users size={19} />}
            label="Classes"
            to="/TeacherClassroom"
          />

          <Link
            to="/learning-hub"
            aria-label="Open the learning hub"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white shadow-lg shadow-violet-200"
          >
            <Plus size={23} />
          </Link>

          <NavItem
            icon={<BarChart3 size={19} />}
            label="Reports"
            to="/class-progress"
          />

          <NavItem
            icon={<User size={19} />}
            label="Profile"
          />

        </nav>

      </div>


      {/* =========================
          DESKTOP VERSION
      ========================== */}
      <div className="hidden min-h-dvh lg:flex">

        {/* Sidebar */}
        <aside className="flex w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">

          <div className="mb-10 px-2">
            <h1 className="text-2xl font-bold tracking-tight">
              LEO
            </h1>

            <p className="text-xs text-violet-200">
              Teacher Portal
            </p>
          </div>

          <nav className="space-y-2">

            <SidebarItem
              icon={<Home size={18} />}
              label="Dashboard"
              to="/teacher-dashboard"
              active
            />

            <SidebarItem
              icon={<Users size={18} />}
              label="Classes"
              to="/TeacherClassroom"
            />

            <SidebarItem
              icon={<Sparkles size={18} />}
              label="Explore"
              to="/learning-hub"
            />

            <SidebarItem
              icon={<BookOpen size={18} />}
              label="Lessons"
              to="/lessons"
            />

            <SidebarItem
              icon={<Layers size={18} />}
              label="Flashcards"
            />

            <SidebarItem
              icon={<ClipboardCheck size={18} />}
              label="Quizzes"
            />

            <SidebarItem
              icon={<BarChart3 size={18} />}
              label="Reports"
              to="/class-progress"
            />

          </nav>

          <div className="mt-auto space-y-2">

            <SidebarItem
              icon={<Settings size={18} />}
              label="Settings"
            />

            <SidebarItem
              icon={<LogOut size={18} />}
              label="Logout"
            />

          </div>

        </aside>


        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">

          {/* Desktop Header */}
          <header className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div className="min-w-0">
              <h2 className="text-xl font-bold">
                Dashboard
              </h2>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Manage your classrooms and create engaging vocabulary lessons.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4 self-end sm:self-auto">

              <button className="rounded-xl p-2 hover:bg-slate-100">
                <Bell size={19} />
              </button>

              <div className="flex min-w-0 items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-bold text-white">
                  {teacher.avatar}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {teacher.name}
                  </p>

                  <p className="text-xs text-slate-400">
                    {teacher.role}
                  </p>
                </div>

              </div>

            </div>

          </header>


          <div className="mx-auto flex min-h-[calc(100dvh-65px)] w-full max-w-7xl flex-col p-4">

            {/* Desktop Stats */}
            <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">

              <StatCard
                icon={<Users />}
                label="Students"
                value="62"
              />

              <StatCard
                icon={<BookOpen />}
                label="Lessons Created"
                value="26"
              />

              <StatCard
                icon={<ClipboardCheck />}
                label="Quizzes Completed"
                value="186"
              />

              <StatCard
                icon={<BarChart3 />}
                label="Average Score"
                value="78%"
                progress={78}
              />

            </div>


            {/* Main Grid */}
            <div className="mt-3 grid shrink-0 grid-cols-1 gap-3 xl:grid-cols-3">

              {/* Classes */}
              <section className="rounded-xl border border-slate-100 bg-white p-3 xl:col-span-2">

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="font-bold">
                      My Classes
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Manage your active classrooms.
                    </p>
                  </div>

                  <button className="flex items-center gap-1 rounded-xl bg-violet-700 px-4 py-2 text-xs font-semibold text-white">
                    <Plus size={15} />
                    Create Class
                  </button>

                </div>

                <div className="mt-2 space-y-1.5">

                  {classes.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center rounded-lg border border-slate-100 p-2"
                    >

                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50 p-1">
                        <img
                          src={item.image}
                          alt={item.imageAlt}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className="ml-2 flex-1">

                        <h4 className="text-sm font-bold">
                          {item.name}
                        </h4>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.students} students · {item.lessons} lessons
                        </p>

                      </div>

                      <button className="rounded-lg p-2 hover:bg-slate-50">
                        <ChevronRight size={17} />
                      </button>

                    </div>
                  ))}

                </div>

              </section>


              {/* Create Lesson */}
              <section className="rounded-xl bg-violet-700 p-3 text-white">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  <Plus size={25} />
                </div>

                <h3 className="mt-3 text-base font-bold">
                  Create a new lesson
                </h3>

                <p className="mt-2 text-xs leading-5 text-violet-100">
                  Add vocabulary words, generate a quiz, and share the lesson
                  with your classroom.
                </p>

                <button className="mt-3 w-full rounded-lg bg-white py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50">
                  Create Lesson
                </button>

              </section>

            </div>


            {/* Recent Lessons */}
            <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-100 bg-white p-3">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-bold">
                    Recent Lessons
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Lessons recently created for your classrooms.
                  </p>
                </div>

                <button className="text-xs font-semibold text-violet-700">
                  View all
                </button>

              </div>

              <div className="mt-2 space-y-1.5">

                {recentLessons.slice(0, 2).map((lesson) => (
                  <div
                    key={lesson.title}
                    className="flex items-center rounded-lg border border-slate-100 p-2"
                  >

                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      <img
                        src={lesson.image}
                        alt={lesson.imageAlt}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="ml-2 min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold">
                        {lesson.title}
                      </h4>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {lesson.className} · {lesson.words} words
                      </p>
                    </div>

                    <button className="rounded-lg p-2 hover:bg-slate-50">
                      <ChevronRight size={17} />
                    </button>

                  </div>
                ))}

              </div>

            </section>

          </div>

        </main>

      </div>

    </div>
  );
}
