// -----------------------------------------------------------------------------
// Guard Route
//
// Protects groups of pages in main.tsx. It waits for the auth context to finish
// loading, then either shows the requested page or redirects:
//
//   not signed in             to /login
//   profile failed to load    to /
//   no role chosen yet        to /select-role
//   wrong role for the page   to /
//
// Used by: main.tsx
// -----------------------------------------------------------------------------

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

type Props = {
  allowedRoles?: string[];
};

export function GuardRoute({ allowedRoles }: Props) {
  const { session, profile, loading, profileLoading, profileError } = useAuth();

  // Checked in order; the first match wins.
  if (loading || profileLoading) return <LoadingScreen label="Checking your learning space" />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileError) return <Navigate to="/" replace />;
  if (!profile) return <LoadingScreen label="Finding your learner profile" />;
  if (!profile.user_role) return <Navigate to="/select-role" replace />;

  // Signed in with a role: only the roles listed for this group may continue.
  if (allowedRoles) {
    const isAuthorised = allowedRoles.some((allowed) => allowed === profile.user_role);
    if (!isAuthorised) return <Navigate to="/" replace />;
  }

  // Outlet renders whichever child route matched.
  return <Outlet />;
}
