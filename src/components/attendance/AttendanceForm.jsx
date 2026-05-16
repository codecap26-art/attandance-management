import { useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Send, CheckCircle2, History, ArrowRight, UserCheck } from 'lucide-react'
import StudentSearch from './StudentSearch'
import PeriodSelector from './PeriodSelector'
import { useAttendance } from '../../hooks/useAttendance'
import { useCategories } from '../../hooks/useCategories'
import LoadingSpinner from '../common/LoadingSpinner'

const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function AttendanceForm({ prefill = null, onSuccess }) {
  const { insertBulk, loading } = useAttendance()
  const { activeCategories } = useCategories()

  const [selectedStudents, setSelectedStudents] = useState(prefill?.students ?? [])
  const [date,     setDate]     = useState(prefill?.date ?? TODAY)
  const [periods,  setPeriods]  = useState(prefill?.periods ?? [])
  const [category, setCategory] = useState(prefill?.category ?? '')

  // Saved log
  const [savedLog, setSavedLog] = useState([])

  // ── Save current student(s) ────────────────────────────
  async function saveCurrentAndNext() {
    if (selectedStudents.length === 0) { toast.error('Select a student first.'); return }
    if (!date)              { toast.error('Select a date.'); return }
    if (periods.length === 0) { toast.error('Select at least one period.'); return }
    if (!category)          { toast.error('Select a category.'); return }

    const entries = []
    for (const student of selectedStudents) {
      for (const period of periods) {
        entries.push({
          reg_no: student.reg_no,
          email: student.email,
          date,
          period,
          category,
          declared: true,
        })
      }
    }

    const toastId = toast.loading('Saving…')
    const result = await insertBulk(entries)
    toast.dismiss(toastId)

    if (result.errors.length > 0) {
      toast.error(`Error: ${result.errors[0]}`)
      return
    }

    toast.success(
      `Saved ${result.inserted} record${result.inserted !== 1 ? 's' : ''} for ${selectedStudents.map(s => s.full_name).join(', ')}`,
      { duration: 2500 }
    )

    // Add to saved log
    setSavedLog(prev => [
      ...selectedStudents.map(s => ({
        name: s.full_name,
        reg_no: s.reg_no,
        periods: [...periods],
        category,
        date,
        time: new Date().toLocaleTimeString(),
      })),
      ...prev,
    ])

    // Clear student selection only — keep date/periods/category for next
    setSelectedStudents([])
  }

  // ── Final submit (same as Save & Next but also calls onSuccess) ──
  async function handleSubmit(e) {
    e.preventDefault()
    await saveCurrentAndNext()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Step 1: Search student */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
          Select Student
        </legend>
        <StudentSearch
          selectedStudents={selectedStudents}
          onSelectionChange={setSelectedStudents}
          multiSelect
        />
      </fieldset>

      {/* Show who is selected */}
      {selectedStudents.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <UserCheck size={18} className="text-indigo-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800">
              {selectedStudents.map(s => s.full_name).join(', ')}
            </p>
            <p className="text-xs text-indigo-500">
              {selectedStudents.map(s => s.reg_no).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Date */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
          Date
        </legend>
        <input
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={TODAY}
          required
        />
      </fieldset>

      {/* Step 3: Periods */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">3</span>
          Periods
        </legend>
        <PeriodSelector selected={periods} onChange={setPeriods} />
      </fieldset>

      {/* Step 4: Category */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">4</span>
          Category
        </legend>
        <select
          className="input max-w-xs"
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        >
          <option value="">— Select category —</option>
          {activeCategories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </fieldset>

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={loading || selectedStudents.length === 0}
          onClick={saveCurrentAndNext}
        >
          {loading ? <LoadingSpinner size="sm" /> : <ArrowRight size={16} />}
          Save & Next
        </button>
        <button
          type="submit"
          className="btn-secondary"
          disabled={loading || selectedStudents.length === 0}
        >
          <Send size={16} />
          Save & Finish
        </button>
        {selectedStudents.length > 0 && periods.length > 0 && (
          <p className="text-xs text-gray-400 ml-auto">
            {selectedStudents.length} × {periods.length} = {selectedStudents.length * periods.length} records
          </p>
        )}
      </div>

      {/* Saved session log */}
      {savedLog.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <History size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600">
              Saved This Session ({savedLog.length})
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {savedLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">{entry.name}</span>
                  <span className="text-gray-400 ml-1.5 text-xs">{entry.reg_no}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  P{entry.periods.join(',')} · {entry.category}
                </span>
                <span className="text-xs text-gray-300 shrink-0">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}
