// -----------------------------------------------------------------------------
// Teacher Profile
//
// The teacher's account page: logging out and deleting the account are
// handled here; the page body is ProfileContent. Phones and tablets get a
// simple header with the bottom navigation, desktop gets the sidebar.
//
// Route: /teacher-profile || Access: teachers
// -----------------------------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Components/NotificationBell";
import ProfileContent from "../Components/ProfileContent";
import TeacherBottomNav from "../Components/TeacherBottomNav";
import TeacherSidebar from "../Components/TeacherSidebar";
import { useAuth } from "../context/AuthContext";
import { deleteAccount } from "../services/accountService";

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

  // accountService deletes the profile row, then signs out.
  async function handleDeleteAccount() {
    if (!session?.user) return;
    setDeletingAccount(true);
    try {
      await deleteAccount(session.user.id);
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
      {
        // -- Phone and tablet layout (under 1024px) --
      }
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col bg-white pb-16 lg:hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold text-violet-700">Teacher Portal</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Profile</h1>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 bg-slate-50 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <ProfileContent
              role="teacher"
              fullName={fullName}
              initials={initials}
              loggingOut={loggingOut}
              onLogout={handleLogout}
              deletingAccount={deletingAccount}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
        </main>

        <TeacherBottomNav active="profile" />
      </div>

      {
        // -- Desktop layout (1024px and up) --
      }
      <div className="hidden min-h-dvh lg:flex">
        <TeacherSidebar active="profile" />

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
            <ProfileContent
              role="teacher"
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
