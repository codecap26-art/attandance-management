import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GraduationCap, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function Login() {
  const { user, role, loading, signInWithGoogle, signInWithEmail } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user && role) navigate('/', { replace: true })
  }, [user, role, loading, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleGoogleLogin() {
    try {
      setIsSubmitting(true)
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error(`Login failed: ${error.message}`)
        setIsSubmitting(false)
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      toast.error(`Login error: ${err.message}`)
      setIsSubmitting(false)
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const { error } = await signInWithEmail(email, password)
      if (error) {
        toast.error(`Login failed: ${error.message}`)
        setIsSubmitting(false)
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      toast.error(`Login error: ${err.message}`)
      setIsSubmitting(false)
    }
  }

  const domain = import.meta.env.VITE_ALLOWED_DOMAIN || 'college.edu'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">AttendanceAI</h1>
          <p className="text-sm text-gray-500">AI-Powered College Attendance Management</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sign in with your email or Google account to access the system.
          </p>

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-4">
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:border-indigo-500"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:border-indigo-500"
                required
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : null}
              {isSubmitting ? 'Signing in...' : 'Sign in with Email'}
            </button>
          </form>

          <div className="text-center text-sm text-gray-500 mb-4">or</div>

          <button
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20445C17.64 8.56667 17.5827 7.95222 17.4764 7.36H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20445Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59319 3.68182 9C3.68182 8.40681 3.78409 7.83 3.96409 7.29V4.95819H0.957275C0.347727 6.17319 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95819L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
              </svg>
            )}
            {isSubmitting ? 'Signing in...' : 'Sign in with Google'}
          </button>

          {/* Domain restriction notice */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <ShieldCheck size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Only <strong>@{domain}</strong> accounts are permitted. Student accounts are not allowed.
            </p>
          </div>
        </div>

        {/* Roles info */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { role: 'Faculty', desc: 'Add & view attendance' },
            { role: 'Mentor',  desc: 'Track mentee records' },
            { role: 'Admin',   desc: 'Full system access' },
          ].map(({ role: r, desc }) => (
            <div key={r} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <p className="text-xs font-semibold text-gray-700">{r}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Students do not have access to this system.
        </p>
      </div>
    </div>
  )
}
