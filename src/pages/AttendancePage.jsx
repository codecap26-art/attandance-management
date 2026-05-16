import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import AttendanceForm from '../components/attendance/AttendanceForm'

export default function AttendancePage() {
  const [key, setKey] = useState(0)

  // Re-mount the form to reset it after a successful submission
  function handleSuccess() {
    setKey(k => k + 1)
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList size={20} className="text-indigo-600" />
            <h1 className="text-lg font-bold text-gray-900">Add Attendance</h1>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            Search for students, select date and periods, then submit.
          </p>
        </div>

        <div className="card p-6">
          <AttendanceForm key={key} onSuccess={handleSuccess} />
        </div>
      </div>
    </AppLayout>
  )
}
