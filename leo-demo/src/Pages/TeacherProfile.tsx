import { BarChart3, Home, Settings, User, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavItem from "../Components/NavItem";
import NotificationBell from "../Components/NotificationBell";
import SidebarItem from "../Components/SidebarItem";
import TeacherProfileContent from "../Components/TeacherProfileContent";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";

export default function TeacherProfile() {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleDeleteAccount() {
    if (!session?.user) return;
    setDeletingAccount(true);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", session.user.id);
      if (error) throw error;
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setDeletingAccount(false);
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
          <NotificationBell />
        </header>

        <main className="flex-1 bg-slate-50 px-4 py-6 sm:px-6">
          <TeacherProfileContent
            fullName={fullName}
            initials={initials}
            loggingOut={loggingOut}
            onLogout={handleLogout}
            deletingAccount={deletingAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-10 mx-auto flex max-w-4xl items-center justify-around border-t border-slate-100 bg-white px-4 py-1">
          <NavItem icon={<Home size={19} />} label="Home" to="/teacher-dashboard" />
          <NavItem icon={<Users size={19} />} label="Classes" to="/TeacherClassroom" />
          <Link
            to="/learning-hub"
            aria-label="Open the learning hub"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-white shadow-lg shadow-violet-200"
          >
            +
          </Link>
          <NavItem icon={<BarChart3 size={19} />} label="Reports" to="/class-progress" />
          <NavItem icon={<User size={19} />} label="Profile" to="/teacher-profile" active />
        </nav>
      </div>

      <div className="hidden min-h-dvh lg:flex">
        <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col bg-violet-700 px-4 py-6 text-white xl:w-64 xl:px-5">
          <div className="mb-10 px-2">
            <h1 className="text-2xl font-bold tracking-tight">LEO</h1>
            <p className="text-xs text-violet-200">Teacher Portal</p>
          </div>
          <nav className="space-y-2">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" to="/teacher-dashboard" />
            <SidebarItem icon={<Users size={18} />} label="Classes" to="/TeacherClassroom" />
            <SidebarItem
              icon={<Sparkles size={18} />}
              label="Explore"
              to="/learning-hub"
              inactiveClassName="text-white hover:bg-white/10"
            />
            <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/class-progress" />
          </nav>
          <div className="mt-auto space-y-2">
            <SidebarItem
              icon={<Settings size={18} />}
              label="Settings"
              to="/teacher-profile"
              active
            />
          </div>
        </aside>

        <main className="min-h-dvh min-w-0 flex-1 bg-slate-50">
          <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-violet-700">Teacher portal</p>
                <h1 className="mt-1 text-xl font-bold">Profile</h1>
              </div>
              <NotificationBell />
            </div>
          </header>

          <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
            <TeacherProfileContent
              fullName={fullName}
              initials={initials}
              loggingOut={loggingOut}
              onLogout={handleLogout}
              deletingAccount={deletingAccount}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
