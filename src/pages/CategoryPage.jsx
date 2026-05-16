import { Tag } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import CategoryManager from '../components/admin/CategoryManager'

export default function CategoryPage() {
  return (
    <AppLayout>
      <div className="max-w-lg">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Tag size={20} className="text-amber-600" />
            <h1 className="text-lg font-bold text-gray-900">Category Management</h1>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            Create, edit, enable/disable, and delete attendance categories.
          </p>
        </div>

        <CategoryManager />
      </div>
    </AppLayout>
  )
}
