import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Users, CheckSquare, Square, Send, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import PeriodSelector from './PeriodSelector'
import { useStudents } from '../../hooks/useStudents'
import { useAttendance } from '../../hooks/useAttendance'
import { useCategories } from '../../hooks/useCategories'
import LoadingSpinner from '../common/LoadingSpinner'

const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function BulkAttendance({ prefill = null, onSuccess }) {
  const { fetchAll, loading: studentsLoading } = useStudents()
  const { insertBulk, checkDuplicates, loading: submitLoading } = useAttendance()
  const { activeCategories } = useCategories()

  const [allStudents,  setAllStudents]  = useState([])
  const [selected,     setSelected]     = useState(new Set())
  const [searchQuery,  setSearchQuery]  = useState('')
  const [date,         setDate]         = useState(prefill?.date ?? TODAY)
  const [periods,      setPeriods]      = useState(prefill?.periods ?? [])
  const [category,     setCategory]     = useState(prefill?.category ?? '')
  const [categoryOverrides, setCategoryOverrides] = useState({})
  const [declared,     setDeclared]     = useState(false)
  const [loaded,       setLoaded]       = useState(false)
  const [dupWarnings,  setDupWarnings]  = useState([])
  const [showPaste,    setShowPaste]    = useState(false)
  const [pasteText,    setPasteText]    = useState('')

  async function loadStudents() {
    const data = await fetchAll()
    setAllStudents(data)
    setLoaded(true)
  }

  const filteredStudents = allStudents.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return s.full_name.toLowerCase().includes(q) || s.reg_no.toLowerCase().includes(q)
  })

  function toggleStudent(regNo) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(regNo)) next.delete(regNo)
      else next.add(regNo)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filteredStudents.map(s => s.reg_no)))
  }

  function deselectAll() {
    setSelected(new Set())
    setCategoryOverrides({})
  }

  function handlePasteSubmit() {
    if (!pasteText.trim()) return
    const extracted = pasteText.match(/[a-zA-Z0-9]+/g) || []
    const validRegs = extracted.map(s => s.toUpperCase())
    
    const matchedRegs = validRegs.filter(reg => 
      allStudents.some(s => s.reg_no.toUpperCase() === reg)
    ).map(reg => allStudents.find(s => s.reg_no.toUpperCase() === reg).reg_no)

    const matchedCount = matchedRegs.length

    if (matchedCount > 0) {
      setSelected(prev => {
        const next = new Set(prev)
        matchedRegs.forEach(reg => next.add(reg))
        return next
      })
      toast.success(`Selected ${matchedCount} matching students.`)
      setPasteText('')
      setShowPaste(false)
    } else {
      toast.error('No matching students found.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (selected.size === 0)  { toast.error('Select at least one student.'); return }
    if (!date)                { toast.error('Select a date.'); return }
    if (periods.length === 0) { toast.error('Select at least one period.'); return }
    if (!category)            { toast.error('Select a category.'); return }
    if (!declared)            { toast.error('You must confirm the declaration.'); return }

    const regNos   = Array.from(selected)
    const existing = await checkDuplicates(regNos, date, periods)

    const dups       = []
    const newEntries = []
    const studentMap = Object.fromEntries(allStudents.map(s => [s.reg_no, s]))

    for (const regNo of regNos) {
      for (const period of periods) {
        const key = `${regNo}|${date}|${period}`
        if (existing.includes(key)) {
          dups.push(`${regNo} — Period ${period}`)
        } else {
          newEntries.push({
            reg_no:   regNo,
            email:    studentMap[regNo]?.email ?? null,
            date,
            period,
            category: categoryOverrides[regNo] || category,
            declared: true,
          })
        }
      }
    }

    setDupWarnings(dups)

    if (newEntries.length === 0) {
      toast.error('All selected records already exist.')
      return
    }

    const toastId = toast.loading(`Inserting ${newEntries.length} records…`)
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

    setSelected(new Set())
    setDeclared(false)
    setDupWarnings([])
    onSuccess?.()
  }

  const loading = studentsLoading || submitLoading

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Load students */}
      {!loaded && (
        <div className="text-center py-8">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">Load all students to begin bulk selection.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={loadStudents}
            disabled={studentsLoading}
          >
            {studentsLoading ? <LoadingSpinner size="sm" /> : <Users size={16} />}
            {studentsLoading ? 'Loading…' : 'Load All Students'}
          </button>
        </div>
      )}

      {loaded && (
        <>
          {/* Student list */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
              Select Students
              <span className="ml-auto text-xs font-normal text-gray-500">
                {selected.size} / {allStudents.length} selected
              </span>
            </legend>

            {/* Filter */}
            <input
              type="text"
              className="input mb-3"
              placeholder="Filter students…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            {/* Select all / deselect all / paste */}
            <div className="flex flex-wrap gap-3 mb-2 items-center">
              <button type="button" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium" onClick={selectAll}>
                Select all ({filteredStudents.length})
              </button>
              <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={deselectAll}>
                Deselect all
              </button>
              <button 
                type="button" 
                className={`text-xs font-medium ml-auto flex items-center gap-1 ${showPaste ? 'text-indigo-800' : 'text-indigo-600 hover:text-indigo-800'}`}
                onClick={() => setShowPaste(!showPaste)}
              >
                <Users size={12} /> Paste Reg Nos
              </button>
            </div>

            {/* Paste Input Area */}
            {showPaste && (
              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg animate-in fade-in slide-in-from-top-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Paste Registration Numbers
                </label>
                <textarea
                  className="input text-sm resize-none mb-2"
                  rows={2}
                  placeholder="e.g. 21CS001, 21CS002"
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    className="btn-secondary text-xs h-7 px-2"
                    onClick={() => { setShowPaste(false); setPasteText(''); }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary text-xs h-7 px-3"
                    onClick={handlePasteSubmit}
                  >
                    Select Students
                  </button>
                </div>
              </div>
            )}

            {/* Student list */}
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {filteredStudents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No students found.</p>
              )}
              {filteredStudents.map(student => {
                const sel = selected.has(student.reg_no)
                return (
                  <label
                    key={student.reg_no}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 ${
                      sel ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleStudent(student.reg_no)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
                      <p className="text-xs text-gray-400">{student.reg_no}</p>
                    </div>
                    {sel && (
                      <div className="shrink-0" onClick={e => e.stopPropagation()}>
                        <select
                          className="text-xs border-gray-300 rounded py-1 pl-2 pr-6 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                          value={categoryOverrides[student.reg_no] || ''}
                          onChange={(e) => setCategoryOverrides(prev => ({
                            ...prev,
                            [student.reg_no]: e.target.value
                          }))}
                        >
                          <option value="">Default ({category || 'None'})</option>
                          {activeCategories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          </fieldset>

          {/* Date */}
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

          {/* Periods */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">3</span>
              Periods
            </legend>
            <PeriodSelector selected={periods} onChange={setPeriods} />
          </fieldset>

          {/* Category */}
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
              <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  {dupWarnings.length} duplicate{dupWarnings.length !== 1 ? 's' : ''} will be skipped
                </p>
                <ul className="text-xs text-yellow-700 space-y-0.5 max-h-24 overflow-y-auto">
                  {dupWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Declaration */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={declared}
              onChange={e => setDeclared(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              I confirm that the above attendance information is correct and accurate to the best of my knowledge.
            </span>
          </label>

          {/* Summary + Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !declared}
            >
              {submitLoading ? <LoadingSpinner size="sm" /> : <Send size={16} />}
              {submitLoading ? 'Submitting…' : 'Submit Bulk Attendance'}
            </button>
            {selected.size > 0 && periods.length > 0 && (
              <p className="text-sm text-gray-500">
                {selected.size} × {periods.length} = {selected.size * periods.length} records
              </p>
            )}
          </div>
        </>
      )}
    </form>
  )
}
