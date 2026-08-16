import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  Home,
  Layers,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import ClassroomLessonRow, { type ClassroomLesson } from "../Components/ClassroomLessonRow";
import ClassroomMaterialsPanel, {
  type ClassroomMaterial,
} from "../Components/ClassroomMaterialsPanel";
import ClassroomStudentRow, { type ClassroomStudent } from "../Components/ClassroomStudentRow";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";

// Temporary classroom data until the page is connected to the data source.
const students: ClassroomStudent[] = [
  { name: "Amahle Dlamini", initials: "AD", image: "/kidsSmilingLanguage.jpg", progress: 86, lastActive: "Active today" },
  { name: "Liam Johnson", initials: "LJ", image: "/girlTypingLANG.png", progress: 74, lastActive: "Active yesterday" },
  { name: "Nandi Mokoena", initials: "NM", image: "/classRoomIllustration.png", progress: 68, lastActive: "Active 2 days ago" },
  { name: "Ethan Williams", initials: "EW", image: "/englishHoldingBack.jpg", progress: 91, lastActive: "Active today" },
];

const lessons: ClassroomLesson[] = [
  { title: "Starting conversations", image: "/classRoomIllustration.png", imageAlt: "Students in a classroom", status: "Published", words: 14, completion: 82 },
  { title: "At the grocery store", image: "/fetchbook.jpg", imageAlt: "Learner studying vocabulary", status: "Published", words: 18, completion: 71 },
  { title: "Making weekend plans", image: "/travel-illustration.avif", imageAlt: "Travel illustration", status: "Draft", words: 12, completion: 0 },
];

const initialMaterials: ClassroomMaterial[] = [
  { id: "material-1", title: "Week 1 vocabulary guide", kind: "Document", detail: "PDF · Added 12 Aug" },
  { id: "material-2", title: "Everyday English listening", kind: "Link", detail: "External link · Added 10 Aug" },
];

const classroomNames: Record<string, string> = {
  "class-001": "English for Everyday Life",
  "class-002": "Reading and Vocabulary",
  "class-003": "Digital English Lab",
  "class-004": "Academic English",
};

export default function ClassroomDetail() {
  // The route identifies which classroom heading to display.
  const { classroomId } = useParams();
  const [materials, setMaterials] = useState(initialMaterials);

  const classroomName = classroomNames[classroomId ?? ""] ?? "English for Everyday Life";

  // Material controls update local state until uploads are persisted remotely.
  const addFile = (file: File) => {
    setMaterials((currentMaterials) => [
      { id: `${file.name}-${Date.now()}`, title: file.name, kind: "Document", detail: "Document · Added just now" },
      ...currentMaterials,
    ]);
  };

  const addLink = (url: string) => {
    const linkTitle = new URL(url.includes("://") ? url : `https://${url}`).hostname;
    setMaterials((currentMaterials) => [
      { id: `${url}-${Date.now()}`, title: linkTitle, kind: "Link", detail: "External link · Added just now" },
      ...currentMaterials,
    ]);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Mobile classroom layout */}
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

        <main className="px-4 pb-5 sm:px-6">
          {/* Classroom identity banner */}
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-4 text-white">
            <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute bottom-3 right-24 h-8 w-8 rotate-12 rounded-lg border-2 border-white/20" />
            <div className="absolute bottom-0 left-8 h-11 w-24 rounded-t-full bg-white/10" />
            <div className="absolute inset-y-0 right-0 w-28 overflow-hidden bg-white">
              <img src="/fetchbook.jpg" alt="English learning illustration" className="block h-full w-full object-cover" />
            </div>
            <p className="relative z-10 pr-28 text-xs font-medium text-white">Classroom</p>
            <div className="relative z-10 mt-3 pr-28">
              <h1 className="text-xl font-bold">{classroomName}</h1>
              <p className="mt-1 text-xs text-white">Practical vocabulary and conversations for daily situations.</p>
            </div>
          </section>

          {/* Shared documents and external learning links */}
          <div className="mt-3">
            <ClassroomMaterialsPanel materials={materials} onFileUpload={addFile} onAddLink={addLink} />
          </div>

          {/* Compact student progress list */}
          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Students</h2>
                <p className="mt-1 text-xs text-slate-500">24 enrolled · 4 active this week</p>
              </div>
              <button className="text-xs font-semibold text-violet-700">View all</button>
            </div>
            <div className="mt-2">
              {students.slice(0, 3).map((student) => <ClassroomStudentRow key={student.name} student={student} />)}
            </div>
          </section>

          {/* Recent classroom lessons */}
          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Lessons</h2>
                <p className="mt-1 text-xs text-slate-500">Latest learning content for this class.</p>
              </div>
              <button className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"><Plus size={14} /> Lesson</button>
            </div>
            <div className="mt-2">{lessons.map((lesson) => <ClassroomLessonRow key={lesson.title} lesson={lesson} />)}</div>
          </section>
        </main>

        {/* Persistent mobile navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" />
          <NavItem icon={<Users size={19} />} label="Classes" active />
          <Link to="/learning-hub" aria-label="Open the learning hub" className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white"><Plus size={23} /></Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" />
          <NavItem icon={<User size={19} />} label="Profile" />
        </nav>
      </div>

      {/* Desktop classroom workspace */}
      <div className="hidden min-h-dvh lg:flex">
        <aside className="flex w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2"><h1 className="text-2xl font-bold tracking-tight">LEO</h1><p className="text-xs text-white">Teacher Portal</p></div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" active />
            <Link to="/learning-hub" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white transition hover:bg-white/10"><Sparkles size={18} /><span>Explore</span></Link>
            <SidebarItem icon={<BookOpen size={18} />} label="Lessons" />
            <SidebarItem icon={<Layers size={18} />} label="Flashcards" />
            <SidebarItem icon={<ClipboardList size={18} />} label="Quizzes" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" />
          </nav>
          <div className="mt-auto space-y-2"><SidebarItem icon={<Settings size={18} />} label="Settings" /><SidebarItem icon={<LogOut size={18} />} label="Logout" /></div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3"><Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link><div><p className="text-xs font-medium text-violet-700">Teacher Portal</p><h1 className="mt-1 text-xl font-bold">Classroom overview</h1></div></div>
            <div className="flex items-center gap-4"><button aria-label="Notifications" className="rounded-xl p-2.5 transition hover:bg-slate-100"><Bell size={19} /></button><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-bold text-white">T</div><div><p className="text-sm font-semibold">Teacher Siya</p><p className="text-xs text-slate-400">Teacher</p></div></div></div>
          </header>

          <div className="mx-auto w-full max-w-7xl p-5">
            {/* Desktop classroom identity banner */}
            <section className="relative flex items-center justify-between gap-6 overflow-hidden rounded-xl bg-violet-700 p-5 text-white">
              <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute bottom-0 right-48 h-20 w-32 rounded-t-full bg-white/10" />
              <div className="absolute right-60 top-6 h-10 w-10 rotate-12 rounded-lg border-2 border-white/20" />
              <div className="relative min-w-0"><p className="text-xs font-medium text-white">Active classroom</p><h2 className="mt-2 text-2xl font-bold">{classroomName}</h2><p className="mt-2 max-w-2xl text-sm text-white">Practical vocabulary and conversations for daily situations.</p><p className="mt-4 text-xs font-semibold text-white">24 students · 12 lessons · Join code EVERY24</p></div>
              <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm"><img src="/fetchbook.jpg" alt="English learning illustration" className="block h-full w-full object-cover" /></div>
            </section>

            {/* Full-width materials workspace */}
            <div className="mt-4">
              <ClassroomMaterialsPanel materials={materials} onFileUpload={addFile} onAddLink={addLink} />
            </div>

            {/* Student progress workspace */}
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className="rounded-xl border border-slate-100 bg-white p-4 xl:col-span-3">
                <div className="flex items-start justify-between"><div><h2 className="text-base font-bold">Students</h2><p className="mt-1 text-sm text-slate-500">Monitor attendance and lesson progress.</p></div><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">View all students</button></div>
                <div className="mt-2">{students.map((student) => <ClassroomStudentRow key={student.name} student={student} />)}</div>
              </section>
            </div>

            {/* Classroom lesson catalogue */}
            <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between"><div><h2 className="text-base font-bold">Lessons in this classroom</h2><p className="mt-1 text-sm text-slate-500">Published lessons and drafts available to your learners.</p></div><button className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"><Plus size={15} /> Create lesson</button></div>
              <div className="mt-2">{lessons.map((lesson) => <ClassroomLessonRow key={lesson.title} lesson={lesson} />)}</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}