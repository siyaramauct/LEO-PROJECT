import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingScreen from "../Components/LoadingScreen";

export default function Home() {
  const { session, profile, loading, profileLoading, profileError } = useAuth();

  if (loading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!session) return <Navigate to="/login" replace />;
  if (profileError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-center">
        <p className="max-w-sm text-sm text-red-700">{profileError}</p>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-center">
        <p className="max-w-sm text-sm text-red-700">Your profile could not be loaded. Please sign out and try again.</p>
      </main>
    );
  }
  if (!profile.user_role) return <Navigate to="/select-role" replace />;
  if (profile.user_role === "teacher") return <Navigate to="/teacher-dashboard" replace />;

  return <Navigate to="/student/dashboard" replace />;
}
