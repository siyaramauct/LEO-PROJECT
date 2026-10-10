import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 text-center">
        <p className="text-sm font-semibold text-slate-500">Checking your session...</p>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
