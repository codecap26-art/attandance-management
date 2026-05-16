import { useState } from 'react'
import { Users } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import BulkAttendance from '../components/attendance/BulkAttendance'

export default function BulkAttendancePage() {
  const [key, setKey] = useState(0)

  return (
    <AppLayout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Users size={20} className="text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">Bulk Attendance Entry</h1>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            Load all students, select multiple, apply the same date/periods/category, and submit.
          </p>
        </div>

        <div className="card p-6">
          <BulkAttendance key={key} onSuccess={() => setKey(k => k + 1)} />
        </div>
      </div>
    </AppLayout>
  )
}
