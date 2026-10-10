import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../Components/NotificationBell";
import StudentBottomNav from "../Components/StudentBottomNav";
import StudentProfileContent from "../Components/StudentProfileContent";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";

type StudentProfileRow = { name: string | null; surname: string | null; username: string | null };

export default function StudentProfile() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [studentProfile, setStudentProfile] = useState<StudentProfileRow | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    let isCurrent = true;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, surname, username")
        .eq("id", session.user.id)
        .maybeSingle();
      if (isCurrent) setStudentProfile(data);
    };

    void loadProfile();
    return () => {
      isCurrent = false;
    };
  }, [session?.user]);

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

  const fallbackName =
    session?.user.user_metadata?.name ?? session?.user.email?.split("@")[0] ?? "Student";
  const fullName = [studentProfile?.name ?? fallbackName, studentProfile?.surname]
    .filter(Boolean)
    .join(" ");
  const initials =
    `${(studentProfile?.name ?? fallbackName)[0] ?? "S"}${studentProfile?.surname?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />

      <main className="min-h-dvh bg-slate-50 pb-20 md:ml-56 md:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-violet-700">Student portal</p>
              <h1 className="mt-1 text-xl font-bold">Profile</h1>
            </div>
            <NotificationBell />
          </div>
        </header>

        <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <StudentProfileContent
            fullName={fullName}
            username={studentProfile?.username ?? null}
            initials={initials}
            loggingOut={loggingOut}
            onLogout={handleLogout}
            deletingAccount={deletingAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>
      </main>
    </div>
  );
}
