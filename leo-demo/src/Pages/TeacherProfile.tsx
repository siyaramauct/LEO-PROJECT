import {
  Bell,
  BookOpen,
  BarChart3,
  Home,
  Languages,
  LogOut,
  LockKeyhole,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavItem from "../Components/NavItem";
import SidebarItem from "../Components/SidebarItem";
import { useAuth } from "../../context/AuthContext.tsx";

export default function TeacherProfile() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(" ") || "Teacher";
  const initials = `${profile?.name?.[0] ?? "T"}${profile?.surname?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold text-violet-700">Teacher Portal</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Profile</h1>
          </div>
          <button type="button" aria-label="Notifications" className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100">
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-700" />
          </button>
        </header>

        <main className="flex-1 bg-slate-50 px-4 py-6 sm:px-6">
          <ProfileContent fullName={fullName} initials={initials} loggingOut={loggingOut} onLogout={handleLogout} />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-10 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" to="/teacher-dashboard" />
          <NavItem icon={<Users size={19} />} label="Classes" to="/TeacherClassroom" />
          <Link to="/learning-hub" aria-label="Open the learning hub" className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white shadow-lg shadow-violet-200">+</Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" to="/class-progress" />
          <NavItem icon={<User size={19} />} label="Profile" to="/teacher-profile" active />
        </nav>
      </div>

      <div className="hidden min-h-dvh lg:flex">
        <aside className="flex w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2"><h1 className="text-2xl font-bold tracking-tight">LEO</h1><p className="text-xs text-violet-200">Teacher Portal</p></div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" to="/teacher-dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" to="/TeacherClassroom" />
            <SidebarItem icon={<BookOpen size={18} />} label="Lessons" to="/lessons" />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/class-progress" />
            <SidebarItem icon={<User size={18} />} label="Profile" to="/teacher-profile" active />
          </nav>
          <div className="mt-auto space-y-2">
            <SidebarItem icon={<Settings size={18} />} label="Settings" />
            <SidebarItem icon={<LogOut size={18} />} label={loggingOut ? "Logging out..." : "Logout"} onClick={() => void handleLogout()} />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="border-b border-slate-100 bg-white px-6 py-5"><h2 className="text-xl font-bold">Profile</h2><p className="mt-1 text-sm text-slate-500">Manage your teacher account and preferences.</p></header>
          <div className="mx-auto w-full max-w-5xl p-6"><ProfileContent fullName={fullName} initials={initials} loggingOut={loggingOut} onLogout={handleLogout} /></div>
        </main>
      </div>
    </div>
  );
}

function ProfileContent({ fullName, initials, loggingOut, onLogout }: { fullName: string; initials: string; loggingOut: boolean; onLogout: () => Promise<void> }) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-violet-700 p-5 text-white shadow-lg shadow-violet-100 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-violet-700">{initials}</div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Teacher account</p><h3 className="mt-1 text-xl font-bold">{fullName}</h3><p className="mt-1 text-sm text-violet-100">Your learning workspace</p></div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><User size={19} className="text-violet-700" /><div><h3 className="font-bold">Personal information</h3><p className="mt-1 text-sm text-slate-500">Your account details are shown below.</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ProfileField label="First name" value={fullName.split(" ")[0] || "Teacher"} />
          <ProfileField label="Last name" value={fullName.split(" ").slice(1).join(" ") || "Not provided"} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="font-bold">Preferences</h3>
        <div className="mt-4 divide-y divide-slate-100">
          <ProfileOption icon={<Bell size={18} />} title="Notifications" description="Stay informed about classroom activity" />
          <ProfileOption icon={<LockKeyhole size={18} />} title="Password and security" description="Update your sign-in details" />
          <ProfileOption icon={<Languages size={18} />} title="Language" description="English" />
        </div>
      </section>

      <button type="button" onClick={() => void onLogout()} disabled={loggingOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"><LogOut size={18} />{loggingOut ? "Logging out..." : "Log out"}</button>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}

function ProfileOption({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <button type="button" className="flex w-full items-center gap-3 py-4 text-left"><span className="text-violet-700">{icon}</span><span className="flex-1"><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span><span className="text-lg text-slate-300">›</span></button>;
}