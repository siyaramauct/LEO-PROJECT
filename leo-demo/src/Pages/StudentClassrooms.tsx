import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline"
import { useNavigate } from "react-router-dom"
import StudentBottomNav from "../Components/StudentBottomNav"

const classrooms = [
  {
    name: "English for Everyday Life",
    teacher: "Teacher Siya",
    members: 24,
    progress: 72,
    lessonsCompleted: 8,
    totalLessons: 12,
    nextLesson: "Ordering food and asking questions",
    image: "/kidsSmilingLanguage.jpg",
    accent: "bg-emerald-500",
  },
  {
    name: "Reading and Vocabulary",
    teacher: "Teacher Arka",
    members: 18,
    progress: 58,
    lessonsCompleted: 7,
    totalLessons: 14,
    nextLesson: "Context clues in short stories",
    image: "/fetchbook.jpg",
    accent: "bg-violet-600",
  },
  {
    name: "Digital English Lab",
    teacher: "Teacher Maryna",
    members: 16,
    progress: 84,
    lessonsCompleted: 10,
    totalLessons: 12,
    nextLesson: "Explaining a process clearly",
    image: "/girlTypingLANG.png",
    accent: "bg-sky-500",
  },
]

const classroomStats = [
  { label: "Classrooms", value: "3", icon: UserGroupIcon },
  { label: "Assigned Lessons", value: "38", icon: ClipboardDocumentListIcon },
  { label: "Completed", value: "25", icon: CheckCircleIcon },
]

export default function StudentClassrooms() {
  const navigate = useNavigate()

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-slate-50 pb-24 text-slate-950 md:pb-10 md:pl-56">
      <section className="flex w-full flex-col gap-5 px-4 pt-5 min-[380px]:px-5 sm:px-6 md:px-8 md:py-8 xl:mx-auto xl:max-w-[1440px] xl:px-10">
        <header className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 md:rounded-xl">
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_180px] sm:items-center md:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-violet-700">Student Classrooms</p>
              <h1 className="mt-2 text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">My Classrooms</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                View the classes you are enrolled in, continue assigned lessons, and keep track of what each teacher has set for you.
              </p>
            </div>
            <img
              src="/classRoomIllustration.png"
              alt="Classroom illustration"
              className="h-36 w-full rounded-xl object-cover sm:h-32"
            />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          {classroomStats.map((stat) => (
            <article key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:rounded-xl">
              <stat.icon className="h-6 w-6 text-violet-700" />
              <p className="mt-4 text-2xl font-black text-slate-950">{stat.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <article
              key={classroom.name}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 md:rounded-xl"
            >
              <img src={classroom.image} alt="" className="h-36 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-black leading-snug text-slate-950">{classroom.name}</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">{classroom.teacher}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {classroom.members} learners
                  </span>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Class progress</span>
                    <span className="text-slate-950">{classroom.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`${classroom.accent} h-full rounded-full`} style={{ width: `${classroom.progress}%` }} />
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-normal text-slate-500">Next lesson</p>
                  <p className="mt-1 text-sm font-bold leading-snug text-slate-900">{classroom.nextLesson}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {classroom.lessonsCompleted} of {classroom.totalLessons} lessons completed
                  </p>
                </div>

                <button
                  onClick={() => navigate("/lessons")}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800 active:scale-95"
                >
                  Open Lessons
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:rounded-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <BookOpenIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-950">Classroom lessons flow</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                A classroom groups learners, teachers assign lessons to that classroom, and students open the lessons from their classroom space.
              </p>
            </div>
          </div>
        </section>
      </section>
      <StudentBottomNav />
    </main>
  )
}
