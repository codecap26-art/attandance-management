import { Shield } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import AdminDashboard from '../components/admin/AdminDashboard'

export default function AdminPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Shield size={20} className="text-rose-600" />
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            View, filter, edit, delete, and export all attendance records.
          </p>
        </div>

        <AdminDashboard />
      </div>
    </AppLayout>
  )
}
