import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthContext'
import { auth, roleHome, type Role } from '../../lib/auth/auth'

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { session } = useAuth()
  const location = useLocation()
  const verifiedSession = auth.getSession()
  if (!session || !verifiedSession) return <Navigate to="/login" replace state={{ from: location }} />
  if (!roles.includes(verifiedSession.role)) return <Navigate to={roleHome[verifiedSession.role]} replace />
  return <Outlet />
}
