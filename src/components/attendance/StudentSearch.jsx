import { useState, useEffect } from 'react'
import { Search, UserCheck, X, CheckSquare, Square } from 'lucide-react'
import { useStudents } from '../../hooks/useStudents'
import LoadingSpinner from '../common/LoadingSpinner'

/**
 * Student search with real-time filtering and multi-select.
 * Props:
 *   selectedStudents   – array of student objects currently selected
 *   onSelectionChange  – callback(newSelection: Student[])
 *   multiSelect        – allow selecting multiple students (default true)
 */
export default function StudentSearch({ selectedStudents = [], onSelectionChange, multiSelect = true }) {
  const [query, setQuery] = useState('')
  const { students, loading, search, clear } = useStudents()

  useEffect(() => {
    if (query.trim()) {
      search(query)
    } else {
      clear()
    }
  }, [query, search, clear])

  function toggleStudent(student) {
    const isSelected = selectedStudents.some(s => s.reg_no === student.reg_no)
    if (isSelected) {
      onSelectionChange(selectedStudents.filter(s => s.reg_no !== student.reg_no))
    } else {
      onSelectionChange(multiSelect ? [...selectedStudents, student] : [student])
    }
  }

  function removeStudent(regNo) {
    onSelectionChange(selectedStudents.filter(s => s.reg_no !== regNo))
  }

  const isSelected = (regNo) => selectedStudents.some(s => s.reg_no === regNo)

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          className="input pl-9 pr-9"
          placeholder="Search by name or registration number…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); clear() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
          {selectedStudents.map(s => (
            <span
              key={s.reg_no}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full"
            >
              <UserCheck size={11} />
              {s.reg_no} – {s.full_name}
              <button
                onClick={() => removeStudent(s.reg_no)}
                className="ml-0.5 hover:text-indigo-900"
                aria-label={`Remove ${s.reg_no}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {multiSelect && (
            <button
              onClick={() => onSelectionChange([])}
              className="text-xs text-indigo-500 hover:text-indigo-700 px-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search results */}
      {loading && (
        <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
          <LoadingSpinner size="sm" />
          Searching…
        </div>
      )}

      {!loading && query.trim() && students.length === 0 && (
        <p className="text-sm text-gray-500 py-3 text-center">No students found for "{query}"</p>
      )}

      {!loading && students.length > 0 && (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto shadow-sm">
          {students.map(student => {
            const selected = isSelected(student.reg_no)
            return (
              <li key={student.reg_no}>
                <button
                  onClick={() => toggleStudent(student)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                    selected ? 'bg-indigo-50' : ''
                  }`}
                >
                  {multiSelect ? (
                    selected
                      ? <CheckSquare size={16} className="text-indigo-600 shrink-0" />
                      : <Square size={16} className="text-gray-300 shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                    }`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selected ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {student.full_name}
                    </p>
                    <p className="text-xs text-gray-400">{student.reg_no}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
