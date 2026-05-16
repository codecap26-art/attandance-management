import { useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Send, CheckCircle2, History, ArrowRight, UserCheck, AlertCircle } from 'lucide-react'
import StudentSearch from './StudentSearch'
import PeriodSelector from './PeriodSelector'
import { useAttendance } from '../../hooks/useAttendance'
import { useCategories } from '../../hooks/useCategories'
import LoadingSpinner from '../common/LoadingSpinner'

const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function AttendanceForm({ prefill = null, onSuccess }) {
  const { insertBulk, loading } = useAttendance()
  const { activeCategories } = useCategories()

  const [selectedStudents, setSelectedStudents] = useState([])
  const [date,     setDate]     = useState(prefill?.date ?? TODAY)
  const [periods,  setPeriods]  = useState(prefill?.periods ?? [])
  const [category, setCategory] = useState(prefill?.category ?? '')
  const [savedLog, setSavedLog] = useState([])

  const savingRef = useRef(false)

  // ── Save a specific student set ────────────────────────
  const saveStudents = useCallback(async (students) => {
    if (!date || periods.length === 0 || !category || students.length === 0) return false

    const entries = []
    for (const student of students) {
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

    const result = await insertBulk(entries)

    if (result.errors.length > 0) {
      toast.error(`Save failed: ${result.errors[0]}`)
      return false
    }

    const count = result.inserted
    if (count > 0) {
      toast.success(
        `Saved ${students.map(s => s.full_name).join(', ')} — ${count} record${count > 1 ? 's' : ''}`,
        { duration: 2500 }
      )
    }
    if (result.duplicates.length > 0) {
      toast(`${result.duplicates.length} duplicate(s) skipped`, { icon: '⚠️', duration: 2000 })
    }

    setSavedLog(prev => [
      ...students.map(s => ({
        name: s.full_name,
        reg_no: s.reg_no,
        periods: [...periods],
        category,
        date,
        time: new Date().toLocaleTimeString(),
      })),
      ...prev,
    ])

    return true
  }, [date, periods, category, insertBulk])

  // ── Handle student selection change ────────────────────
  // Single-select: clicking a new student auto-saves the current one
  const handleSelectionChange = useCallback(async (newSelection) => {
    const newStudent = newSelection.length > 0 ? newSelection[newSelection.length - 1] : null
    const currentStudent = selectedStudents.length > 0 ? selectedStudents[0] : null

    // If deselecting (empty), just clear
    if (!newStudent) {
      setSelectedStudents([])
      return
    }

    // If same student clicked again, ignore
    if (currentStudent && newStudent.reg_no === currentStudent.reg_no) {
      return
    }

    // If we have a current student, auto-save them before switching
    if (currentStudent && !savingRef.current) {
      const canSave = date && periods.length > 0 && category
      if (canSave) {
        savingRef.current = true
        await saveStudents([currentStudent])
        savingRef.current = false
      } else {
        toast('Fill date, periods & category to enable auto-save', { icon: '⚠️' })
      }
    }

    // Switch to ONLY the new student
    setSelectedStudents([newStudent])
  }, [selectedStudents, date, periods, category, saveStudents])

  // ── Manual save & next ─────────────────────────────────
  async function handleSaveAndNext() {
    if (selectedStudents.length === 0) { toast.error('Select a student first.'); return }
    if (!date)              { toast.error('Select a date.'); return }
    if (periods.length === 0) { toast.error('Select at least one period.'); return }
    if (!category)          { toast.error('Select a category.'); return }

    const ok = await saveStudents(selectedStudents)
    if (ok) setSelectedStudents([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await handleSaveAndNext()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Step 1: Search student */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
          Select Student
          {date && periods.length > 0 && category && selectedStudents.length > 0 && (
            <span className="ml-2 text-xs font-normal text-green-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> Selecting next will auto-save current
            </span>
          )}
        </legend>
        <StudentSearch
          selectedStudents={selectedStudents}
          onSelectionChange={handleSelectionChange}
          multiSelect
        />
      </fieldset>

      {/* Show who is selected */}
      {selectedStudents.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
          <UserCheck size={18} className="text-indigo-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800">
              {selectedStudents.map(s => s.full_name).join(', ')}
            </p>
            <p className="text-xs text-indigo-500">
              {selectedStudents.map(s => s.reg_no).join(', ')}
            </p>
          </div>
          {(!date || periods.length === 0 || !category) && (
            <span className="text-xs text-amber-600 flex items-center gap-1 shrink-0">
              <AlertCircle size={12} /> Fill below to save
            </span>
          )}
        </div>
      )}

      {/* Step 2: Date */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
          Date
        </legend>
        <input type="date" className="input max-w-xs" value={date}
          onChange={e => setDate(e.target.value)} max={TODAY} required />
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
        <select className="input max-w-xs" value={category}
          onChange={e => setCategory(e.target.value)} required>
          <option value="">— Select category —</option>
          {activeCategories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </fieldset>

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary"
          disabled={loading || selectedStudents.length === 0}
          onClick={handleSaveAndNext}>
          {loading ? <LoadingSpinner size="sm" /> : <ArrowRight size={16} />}
          Save & Next
        </button>
        <button type="submit" className="btn-secondary"
          disabled={loading || selectedStudents.length === 0}>
          <Send size={16} /> Save & Finish
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
