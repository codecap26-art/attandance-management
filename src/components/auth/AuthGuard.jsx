import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../common/LoadingSpinner'

/**
 * Protects routes. Redirects to /login if unauthenticated.
 * Optional `roles` prop restricts by role (e.g. roles={['admin']}).
 */
export default function AuthGuard({ children, roles }) {
  const { user, role, loading, isAllowedDomain } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Domain restriction: sign out and redirect if wrong domain
  if (!isAllowedDomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-6">
            Only <strong>@{import.meta.env.VITE_ALLOWED_DOMAIN || 'college.edu'}</strong> accounts are
            allowed to access this system.
          </p>
          <SignOutButton />
        </div>
      </div>
    )
  }

  // Role not assigned yet
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Awaiting Role Assignment</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your account has been authenticated but no role has been assigned yet. Please contact
            the admin to get access.
          </p>
          <p className="text-xs text-gray-400 mb-4 font-mono">{user.email}</p>
          <SignOutButton />
        </div>
      </div>
    )
  }

  // Role restriction check
  if (roles && !roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}

function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button className="btn-secondary w-full justify-center" onClick={signOut}>
      Sign out
    </button>
  )
}
