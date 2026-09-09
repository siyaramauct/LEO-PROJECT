import {
  ArrowLeft,
  BarChart3,
  Bell,
  Home,
  Plus,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import ClassroomForm from "../Components/ClassroomForm";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";
import UserIdentity from "../Components/UserIdentity";
  

  export default function CreateClassroom() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-6">
          <Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link>
          <button aria-label="Notifications" className="relative rounded-full p-2 transition hover:bg-slate-100"><Bell size={20} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" /></button>
        </header>

        <main className="flex-1 px-4 pb-5 sm:px-6">
          <section className="relative overflow-hidden rounded-xl bg-violet-700 p-4 text-white">
            <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-8 h-10 w-24 rounded-t-full bg-white/10" />
            <div className="relative pr-20"><p className="text-xs font-medium text-white">Teacher Portal</p><h1 className="mt-2 text-xl font-bold">Create a classroom</h1><p className="mt-1 text-xs text-white">Set up a focused space for your learners.</p></div>
            <div className="absolute inset-y-0 right-0 w-20 overflow-hidden bg-white"><img src="/classRoomIllustration.png" alt="Classroom illustration" className="block h-full w-full object-cover" /></div>
          </section>

          <section className="mt-3 rounded-xl border border-slate-100 bg-white p-4"><ClassroomForm idPrefix="mobile" /></section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" to="/teacher-dashboard" />
          <NavItem icon={<Users size={19} />} label="Classes" to="/TeacherClassroom" active />
          <Link to="/learning-hub" aria-label="Open the learning hub" className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white"><Plus size={23} /></Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" to="/class-progress" />
          <NavItem icon={<User size={19} />} label="Profile" />
        </nav>
      </div>

      <div className="hidden min-h-dvh lg:flex">
        <aside className="flex w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2"><h1 className="text-2xl font-bold tracking-tight">LEO</h1><p className="text-xs text-white">Teacher Portal</p></div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" to="/teacher-dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" to="/TeacherClassroom" active />
            <SidebarItem icon={<Sparkles size={18} />} label="Explore" to="/learning-hub" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/class-progress" />
          </nav>
          <div className="mt-auto space-y-2"><SidebarItem icon={<Settings size={18} />} label="Settings" to="/teacher-profile" /></div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex items-center gap-3"><Link to="/TeacherClassroom" aria-label="Back to classrooms" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={19} /></Link><div><p className="text-xs font-medium text-violet-700">Teacher Portal</p><h1 className="mt-1 text-xl font-bold">Create a classroom</h1></div></div>
            <div className="flex items-center gap-4"><button aria-label="Notifications" className="rounded-xl p-2.5 transition hover:bg-slate-100"><Bell size={19} /></button><UserIdentity /></div>
          </header>

          <div className="mx-auto w-full max-w-5xl p-5">
            <section className="rounded-xl border border-slate-100 bg-white p-5">
              <div className="mb-5"><h2 className="text-lg font-bold">Classroom details</h2><p className="mt-1 text-sm text-slate-500">Give your learners clear context before they join.</p></div>
              <ClassroomForm idPrefix="desktop" />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}