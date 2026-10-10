// -----------------------------------------------------------------------------
// Home
//
// The app's front door at "/". It shows nothing of its own: it waits for the
// auth context, then forwards the user to the right place:
//
//   signed out                to /login (or shows a failed Google sign-in)
//   no role chosen yet        to /select-role
//   teacher                   to /teacher-dashboard
//   student                   to /student/dashboard
//
// Route: / || Access: anyone
// -----------------------------------------------------------------------------

import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "../Components/LoadingScreen";
import { oauthErrorFromUrl } from "../utils/oauthError";

export default function Home() {
  const { session, profile, loading, profileLoading, profileError } = useAuth();

  if (loading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    const oauthError = oauthErrorFromUrl();
    if (oauthError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4 text-center">
          <p role="alert" className="max-w-md text-sm text-red-700">
            Google sign-in failed: {oauthError}
          </p>
          <Link to="/login" className="text-sm font-semibold text-violet-700 underline">
            Try signing in again
          </Link>
        </main>
      );
    }
    return <Navigate to="/login" replace />;
  }
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
        <p className="max-w-sm text-sm text-red-700">
          Your profile could not be loaded. Please sign out and try again.
        </p>
      </main>
    );
  }
  if (!profile.user_role) return <Navigate to="/select-role" replace />;
  if (profile.user_role === "teacher") return <Navigate to="/teacher-dashboard" replace />;

  return <Navigate to="/student/dashboard" replace />;
}
