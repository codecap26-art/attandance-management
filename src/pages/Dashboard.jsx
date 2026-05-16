import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import {
  ClipboardList, Users, Sparkles, Shield, Tag,
  TrendingUp, Calendar, User2, ArrowRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAttendance } from '../hooks/useAttendance'
import AppLayout from '../components/layout/AppLayout'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function Dashboard() {
  const { user, role } = useAuth()
  const { fetchLogs }  = useAttendance()

  const [stats,   setStats]   = useState(null)
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  const today     = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  useEffect(() => {
    async function loadStats() {
      try {
        const [todayRes, allRes, recentRes] = await Promise.all([
          fetchLogs({ date: today,     pageSize: 1, head: true }),
          fetchLogs({ pageSize: 1, head: true }),
          fetchLogs({ pageSize: 5 }),
        ])

        setStats({
          today:       todayRes.count,
          total:       allRes.count,
        })
        setRecent(recentRes.data)
      } catch (_) {
        // Non-critical, just show zeros
        setStats({ today: 0, total: 0 })
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])  // eslint-disable-line

  const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'there'

  const QUICK_ACTIONS = [
    { to: '/attendance',  label: 'Add Attendance',  icon: ClipboardList, color: 'indigo', desc: 'Single or multiple students' },
    { to: '/bulk',        label: 'Bulk Entry',       icon: Users,         color: 'blue',   desc: 'Mark entire class at once' },
    { to: '/ai-analyzer', label: 'AI Analyzer',      icon: Sparkles,      color: 'purple', desc: 'Parse text automatically' },
    ...(role === 'admin' ? [
      { to: '/admin',       label: 'Admin Panel',     icon: Shield,        color: 'rose',   desc: 'Manage all records' },
      { to: '/categories',  label: 'Categories',      icon: Tag,           color: 'amber',  desc: 'Manage categories' },
    ] : []),
  ]

  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
    blue:   'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    rose:   'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
    amber:  'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Good {getGreeting()}, {name} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · You are signed in as <strong>{role}</strong>
          </p>
        </div>

        {/* Stats cards */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <LoadingSpinner size="sm" /> Loading stats…
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Calendar} label="Today's Records" value={stats?.today ?? 0} color="indigo" />
            <StatCard icon={TrendingUp} label="Total Records" value={stats?.total ?? 0} color="blue" />
            <StatCard icon={User2} label="Your Role" value={role?.charAt(0).toUpperCase() + role?.slice(1)} color="purple" />
            <StatCard icon={ClipboardList} label="Today's Date" value={format(new Date(), 'dd MMM')} color="green" />
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ to, label, icon: Icon, color, desc }) => (
              <Link
                key={to}
                to={to}
                className="group card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${colorMap[color]}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent records */}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Recent Records</h2>
              {role === 'admin' && (
                <Link to="/admin" className="text-xs text-indigo-600 hover:text-indigo-800">
                  View all →
                </Link>
              )}
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.date}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{r.reg_no}</td>
                      <td className="px-4 py-3 text-gray-800">{r.students?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {r.period}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                          {r.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green:  'bg-green-50 text-green-600',
  }
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
