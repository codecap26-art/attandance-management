import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ onMenuClick }) {
  const { user, role, signOut } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
      {/* Left: hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Center / Left: page hint (desktop) */}
      <div className="hidden lg:flex items-center gap-2">
        <span className="text-sm text-gray-500">AI-Powered Attendance Management</span>
      </div>

      {/* Right: user info + sign out */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-medium text-gray-800 leading-tight">
            {user?.user_metadata?.full_name ?? user?.email?.split('@')[0]}
          </span>
          <span className="text-xs text-gray-400 leading-tight">{user?.email}</span>
        </div>

        {/* Avatar */}
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <User size={15} className="text-indigo-600" />
          </div>
        )}

        <button
          onClick={signOut}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  )
}
