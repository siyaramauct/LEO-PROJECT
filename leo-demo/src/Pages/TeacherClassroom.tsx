
import {
  Bell,
  BookOpen,
  ClipboardList,
  Plus,
  Search,
  Sparkles,
  Users,
  Home,
  BarChart3,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { Link } from "react-router-dom";
import ClassroomDesktopCard from "../Components/ClassroomDesktopCard";
import ClassroomMobileCard, {
  type Classroom,
} from "../Components/ClassroomMobileCard";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";


/* =========================================================
   MOCK DATA
   Replace this later with your Supabase data.
========================================================= */

const classrooms: Classroom[] = [
  {
    id: "class-001",
    name: "English for Everyday Life",
    description: "Practical vocabulary and conversations for daily situations.",
    studentCount: 24,
    lessonCount: 12,
    joinCode: "EVERY24",
    createdDate: "12 February 2026",
    image: "/fetchbook.jpg",
    imageAlt: "Illustration of a learner reading and studying",
    imageClassName: "object-cover object-right",
  },
  {
    id: "class-002",
    name: "Reading and Vocabulary",
    description: "Build confidence through reading, word study and discussion.",
    studentCount: 18,
    lessonCount: 8,
    joinCode: "READ18",
    createdDate: "20 February 2026",
    image: "/libIl.jpg",
    imageAlt: "Illustration of a library with bookshelves",
    imageClassName: "object-cover object-center",
  },
  {
    id: "class-003",
    name: "Digital English Lab",
    description: "Interactive listening, speaking and vocabulary practice.",
    studentCount: 20,
    lessonCount: 6,
    joinCode: "DIGI20",
    createdDate: "5 March 2026",
    image: "/Nerd-amico.png",
    imageAlt: "Illustration of a learner using a laptop",
    imageClassName: "object-contain p-1",
  },
  {
    id: "class-004",
    name: "Academic English",
    description: "Develop academic vocabulary for study and presentations.",
    studentCount: 16,
    lessonCount: 10,
    joinCode: "ACADEMY",
    createdDate: "14 March 2026",
    image: "/business-illustration.avif",
    imageAlt: "Illustration for professional English learning",
    imageClassName: "object-contain p-1",
  },
];


/* =========================================================
   MAIN PAGE
========================================================= */

export default function TeacherClassrooms() {
  const totalStudents = classrooms.reduce(
    (total, classroom) => total + classroom.studentCount,
    0
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ===================================================
          MOBILE
      =================================================== */}

      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col overflow-y-auto bg-white pb-16 lg:hidden">

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4 sm:px-6">

          <div>
            <p className="text-sm text-slate-500">
              Teacher Portal
            </p>

            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              My Classrooms
            </h1>

            <p className="mt-0.5 text-[11px] text-slate-400">
              Manage the classrooms you teach.
            </p>
          </div>

          <button
            aria-label="Notifications"
            className="relative rounded-full p-2 transition hover:bg-slate-100"
          >
            <Bell size={21} strokeWidth={1.8} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" />
          </button>

        </header>

        {/* Search */}
        <section className="mt-4 shrink-0 px-4 sm:px-6">

          <div className="relative">

            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search classrooms..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />

          </div>

        </section>


        {/* Create Classroom */}
        <section className="mt-2 shrink-0 px-4 sm:px-6">

          <Link to="/create-classroom" className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 py-2.5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-800">

            <Plus size={17} />

            Create Classroom

          </Link>

        </section>


        {/* Classroom List */}
        <section className="mt-4 min-h-0 flex-1 px-4 sm:px-6">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-sm font-bold">
              Your Classrooms
            </h2>

            <span className="text-xs text-slate-400">
              {classrooms.length} classrooms
            </span>

          </div>


          <div className="space-y-2">

            {classrooms.map((classroom) => (
              <ClassroomMobileCard
                key={classroom.id}
                classroom={classroom}
              />
            ))}

          </div>

        </section>


        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">

          <NavItem
            icon={<Home size={19} />}
            label="Home"
          />

          <NavItem
            icon={<Users size={19} />}
            label="Classes"
            active
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
          />

          <NavItem
            icon={<User size={19} />}
            label="Profile"
          />

        </nav>

      </div>


      {/* ===================================================
          DESKTOP
      =================================================== */}

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
              inactiveClassName="text-white hover:bg-white/10"
            />

            <SidebarItem
              icon={<Users size={18} />}
              label="Classes"
              active
            />

            <Link
              to="/learning-hub"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              <Sparkles size={18} />
              <span>Explore</span>
            </Link>

            <SidebarItem
              icon={<BookOpen size={18} />}
              label="Lessons"
              inactiveClassName="text-white hover:bg-white/10"
            />

            <SidebarItem
              icon={<ClipboardList size={18} />}
              label="Flashcards"
              inactiveClassName="text-white hover:bg-white/10"
            />

            <SidebarItem
              icon={<ClipboardList size={18} />}
              label="Quizzes"
              inactiveClassName="text-white hover:bg-white/10"
            />

            <SidebarItem
              icon={<BarChart3 size={18} />}
              label="Reports"
              inactiveClassName="text-white hover:bg-white/10"
            />

          </nav>


          <div className="mt-auto space-y-2">

            <SidebarItem
              icon={<Settings size={18} />}
              label="Settings"
              inactiveClassName="text-white hover:bg-white/10"
            />

            <SidebarItem
              icon={<LogOut size={18} />}
              label="Logout"
              inactiveClassName="text-white hover:bg-white/10"
            />

          </div>

        </aside>


        {/* Desktop Main */}
        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">

          {/* Header */}
          <header className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div>

              <p className="text-xs font-medium text-violet-700">
                Teacher Portal
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                My Classrooms
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View and manage the classrooms you teach.
              </p>

            </div>


            <div className="flex items-center gap-4">

              <button
                aria-label="Notifications"
                className="rounded-xl p-2.5 transition hover:bg-slate-100"
              >
                <Bell size={19} />
              </button>


              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-bold text-white">
                  T
                </div>

                <div>

                  <p className="text-sm font-semibold">
                    Teacher Siya
                  </p>

                  <p className="text-xs text-slate-400">
                    Teacher
                  </p>

                </div>

              </div>

            </div>

          </header>


          <div className="mx-auto w-full max-w-7xl p-4">

            {/* Page top actions */}
            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-bold">
                  Your Classrooms
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {classrooms.length} classrooms · {totalStudents} students
                </p>

              </div>


              <Link to="/create-classroom" className="flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-800">

                <Plus size={18} />

                Create Classroom

              </Link>

            </div>


            {/* Search + Filters */}
            <div className="mt-3 flex items-center justify-between">

              <div className="relative w-72">

                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search classrooms..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />

              </div>


              <p className="text-xs text-slate-400">
                Showing all classrooms
              </p>

            </div>


            {/* Classroom Grid */}
            <section className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">

              {classrooms.map((classroom) => (
                <ClassroomDesktopCard
                  key={classroom.id}
                  classroom={classroom}
                />
              ))}

            </section>

          </div>

        </main>

      </div>

    </div>
  );
}


