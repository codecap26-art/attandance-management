import { useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Send, AlertCircle } from 'lucide-react'
import StudentSearch from './StudentSearch'
import PeriodSelector from './PeriodSelector'
import { useAttendance } from '../../hooks/useAttendance'
import { useCategories } from '../../hooks/useCategories'
import LoadingSpinner from '../common/LoadingSpinner'

const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function AttendanceForm({ prefill = null, onSuccess }) {
  const { insertBulk, checkDuplicates, loading } = useAttendance()
  const { activeCategories } = useCategories()

  const [selectedStudents, setSelectedStudents] = useState(prefill?.students ?? [])
  const [date,             setDate]             = useState(prefill?.date ?? TODAY)
  const [periods,          setPeriods]          = useState(prefill?.periods ?? [])
  const [category,         setCategory]         = useState(prefill?.category ?? '')
  const [declared,         setDeclared]         = useState(false)
  const [dupWarnings,      setDupWarnings]       = useState([])

  async function handleSubmit(e) {
    e.preventDefault()

    // Validation
    if (selectedStudents.length === 0) { toast.error('Select at least one student.'); return }
    if (!date)                          { toast.error('Select a date.'); return }
    if (periods.length === 0)           { toast.error('Select at least one period.'); return }
    if (!category)                      { toast.error('Select a category.'); return }
    if (!declared)                      { toast.error('You must confirm the declaration.'); return }

    // Duplicate check
    const regNos = selectedStudents.map(s => s.reg_no)
    const existing = await checkDuplicates(regNos, date, periods)

    const dups = []
    const newEntries = []

    for (const student of selectedStudents) {
      for (const period of periods) {
        const key = `${student.reg_no}|${date}|${period}`
        if (existing.includes(key)) {
          dups.push(`${student.reg_no} — Period ${period}`)
        } else {
          newEntries.push({
            reg_no:   student.reg_no,
            email:    student.email,
            date,
            period,
            category,
            declared: true,
          })
        }
      }
    }

    if (dups.length > 0) {
      setDupWarnings(dups)
    }

    if (newEntries.length === 0) {
      toast.error('All selected records already exist. Nothing to insert.')
      return
    }

    const toastId = toast.loading(`Inserting ${newEntries.length} record${newEntries.length > 1 ? 's' : ''}…`)
    const result  = await insertBulk(newEntries)
    toast.dismiss(toastId)

    if (result.errors.length > 0) {
      toast.error(`Error: ${result.errors[0]}`)
      return
    }

    toast.success(
      `${result.inserted} record${result.inserted !== 1 ? 's' : ''} saved.` +
      (dups.length > 0 ? ` ${dups.length} duplicate${dups.length !== 1 ? 's' : ''} skipped.` : '')
    )

    // Reset form
    setSelectedStudents([])
    setPeriods([])
    setDeclared(false)
    setDupWarnings([])
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Students */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
          Select Student(s)
        </legend>
        <StudentSearch
          selectedStudents={selectedStudents}
          onSelectionChange={setSelectedStudents}
          multiSelect
        />
      </fieldset>

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

      {/* Duplicate warnings */}
      {dupWarnings.length > 0 && (
        <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 mb-1">
              {dupWarnings.length} duplicate{dupWarnings.length !== 1 ? 's' : ''} will be skipped:
            </p>
            <ul className="text-xs text-yellow-700 space-y-0.5">
              {dupWarnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Declaration */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={declared}
          onChange={e => setDeclared(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700 group-hover:text-gray-900">
          I confirm that the above attendance information is correct and accurate to the best of my knowledge.
        </span>
      </label>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !declared}
        >
          {loading ? <LoadingSpinner size="sm" /> : <Send size={16} />}
          {loading ? 'Submitting…' : 'Submit Attendance'}
        </button>

        {selectedStudents.length > 0 && periods.length > 0 && (
          <p className="text-sm text-gray-500">
            {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} × {periods.length} period{periods.length !== 1 ? 's' : ''} = {selectedStudents.length * periods.length} record{selectedStudents.length * periods.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </form>
  )
}
