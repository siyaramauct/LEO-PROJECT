// src/Components/GuardRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from "../../context/AuthContext.tsx";

type Props = {
  allowedRoles?: string[]
}

export function GuardRoute({ allowedRoles }: Props) {
  const { session, profile, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <div>Loading profile...</div>
  if (!profile.user_role) return <Navigate to="/select-role" replace />

  if (allowedRoles) {
    const isAuthorised = allowedRoles.some((allowed) => allowed === profile.user_role)
    if (!isAuthorised) return <Navigate to="/" replace />
  }

  return <Outlet />
}