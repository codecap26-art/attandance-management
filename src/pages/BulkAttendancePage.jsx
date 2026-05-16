import { useState } from 'react'
import { Users, FileSpreadsheet } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import BulkAttendance from '../components/attendance/BulkAttendance'
import ExcelUpload from '../components/attendance/ExcelUpload'

const TABS = [
  { id: 'excel', label: 'Excel Upload', icon: FileSpreadsheet },
  { id: 'manual', label: 'Manual Selection', icon: Users },
]

export default function BulkAttendancePage() {
  const [tab, setTab] = useState('excel')
  const [key, setKey] = useState(0)

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Bulk Attendance Entry</h1>
              <p className="text-xs text-gray-500">Upload an Excel file or manually select students to mark attendance in bulk.</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 max-w-xs">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="card p-6">
          {tab === 'excel' && (
            <ExcelUpload key={`excel-${key}`} onSuccess={() => setKey(k => k + 1)} />
          )}
          {tab === 'manual' && (
            <BulkAttendance key={`manual-${key}`} onSuccess={() => setKey(k => k + 1)} />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
