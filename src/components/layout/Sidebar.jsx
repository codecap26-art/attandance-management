import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Sparkles,
  Shield,
  Tag,
  X,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/',            label: 'Dashboard',      icon: LayoutDashboard, roles: ['faculty', 'mentor', 'admin'] },
  { to: '/attendance',  label: 'Add Attendance', icon: ClipboardList,   roles: ['faculty', 'mentor', 'admin'] },
  { to: '/bulk',        label: 'Bulk Entry',     icon: Users,           roles: ['faculty', 'mentor', 'admin'] },
  { to: '/ai-analyzer', label: 'AI Analyzer',    icon: Sparkles,        roles: ['faculty', 'mentor', 'admin'] },
  { to: '/admin',       label: 'Admin Panel',    icon: Shield,          roles: ['admin'] },
  { to: '/categories',  label: 'Categories',     icon: Tag,             roles: ['admin'] },
]

export default function Sidebar({ open, onClose }) {
  const { role } = useAuth()

  const links = NAV.filter(n => n.roles.includes(role))

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">AttendanceAI</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Role badge */}
        <div className="px-4 py-4 border-t border-gray-200 shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your role</p>
          <span className={role === 'admin' ? 'badge-admin' : role === 'mentor' ? 'badge-mentor' : 'badge-faculty'}>
            {role}
          </span>
        </div>
      </aside>
    </>
  )
}
