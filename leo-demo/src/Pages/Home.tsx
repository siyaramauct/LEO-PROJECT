import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Home() {
  const { session, profile, loading, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!profile?.user_role) return <Navigate to="/select-role" replace />;
  if (profile.user_role === "teacher") return <Navigate to="/teacher-dashboard" replace />;

  return <Navigate to="/lessons" replace />;
}
