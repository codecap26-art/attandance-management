import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Check, X, Tag } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'

export default function CategoryManager() {
  const { categories, loading, createCategory, updateCategory, toggleCategory, deleteCategory } = useCategories()

  const [newName,      setNewName]      = useState('')
  const [creating,     setCreating]     = useState(false)
  const [editId,       setEditId]       = useState(null)
  const [editName,     setEditName]     = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createCategory(newName)
      toast.success(`Category "${newName}" created.`)
      setNewName('')
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdate(id) {
    if (!editName.trim()) return
    try {
      await updateCategory(id, { name: editName.trim() })
      toast.success('Category updated.')
      setEditId(null)
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    }
  }

  async function handleToggle(id, currentState) {
    try {
      await toggleCategory(id, !currentState)
      toast.success(`Category ${!currentState ? 'enabled' : 'disabled'}.`)
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteCategory(id)
      toast.success('Category deleted.')
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    }
  }

  function startEdit(cat) {
    setEditId(cat.id)
    setEditName(cat.name)
  }

  return (
    <div className="space-y-6">
      {/* Create new category */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Add New Category</h3>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="e.g. Placement, Medical, Sports…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            maxLength={80}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={creating || !newName.trim()}>
            {creating ? <LoadingSpinner size="sm" /> : <Plus size={16} />}
            Add
          </button>
        </form>
      </div>

      {/* Categories list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">
            All Categories
            <span className="ml-2 text-xs font-normal text-gray-400">({categories.length})</span>
          </h3>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="md" />
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="text-center py-10">
            <Tag size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No categories yet.</p>
          </div>
        )}

        {!loading && categories.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {categories.map(cat => (
              <li key={cat.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${cat.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />

                {editId === cat.id ? (
                  <input
                    type="text"
                    className="input flex-1 h-8 text-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdate(cat.id)
                      if (e.key === 'Escape') setEditId(null)
                    }}
                  />
                ) : (
                  <span className={`flex-1 text-sm ${cat.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {cat.name}
                  </span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {editId === cat.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggle(cat.id, cat.is_active)}
                        className={`p-1.5 rounded-md transition-colors ${
                          cat.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={cat.is_active ? 'Disable category' : 'Enable category'}
                      >
                        {cat.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget?.id)}
        title="Delete Category"
        message={`Delete category "${deleteTarget?.name}"? Existing records using this category will still reference the name.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
