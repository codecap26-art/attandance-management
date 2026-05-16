import { useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Sparkles, AlertTriangle, CheckCircle2, ChevronRight,
  Copy, RefreshCw, Wand2
} from 'lucide-react'
import { parseAttendanceText, validateAttendanceData } from '../../lib/openai'
import { useStudents } from '../../hooks/useStudents'
import { useAttendance } from '../../hooks/useAttendance'
import LoadingSpinner from '../common/LoadingSpinner'

const EXAMPLE_TEXT =
  'Students 21CS001, 21CS002 and 21CS003 attended placement drive on April 20 periods 3 and 4'

export default function AITextAnalyzer({ onParsed }) {
  const { fetchAll, fetchByRegNos } = useStudents()
  const { checkDuplicates }         = useAttendance()

  const [text,      setText]      = useState('')
  const [parsing,   setParsing]   = useState(false)
  const [result,    setResult]    = useState(null) // now an array of events
  const [warnings,  setWarnings]  = useState([])
  const [studentsMap, setStudentsMap] = useState({}) // map reg_no -> student object
  const [submitting, setSubmitting] = useState(false)
  const { insertBulk } = useAttendance()

  async function handleParse() {
    if (!text.trim()) { toast.error('Enter text to analyze.'); return }
    setParsing(true)
    setResult(null)
    setWarnings([])
    setStudentsMap({})

    try {
      const parsedArray = await parseAttendanceText(text)

      // Fetch all known reg_nos for validation
      const allStudents   = await fetchAll()
      const knownRegNos   = allStudents.map(s => s.reg_no)
      const studentObjMap = Object.fromEntries(allStudents.map(s => [s.reg_no, s]))

      // Check duplicates in DB for all events
      const checks = []
      for (const parsed of parsedArray) {
         if (parsed.students.length > 0 && parsed.periods.length > 0) {
            checks.push(checkDuplicates(parsed.students, parsed.date, parsed.periods))
         }
      }
      const existingKeysArrays = await Promise.all(checks)
      const existingKeys = existingKeysArrays.flat()

      const existingRecords = existingKeys.map(k => {
        const [reg_no, date, period] = k.split('|')
        return { reg_no, date, period: Number(period) }
      })

      const warns = validateAttendanceData(parsedArray, knownRegNos, existingRecords)
      setWarnings(warns)

      setResult(parsedArray)
      setStudentsMap(studentObjMap)
    } catch (err) {
      toast.error(`AI error: ${err.message}`)
    } finally {
      setParsing(false)
    }
  }

  async function handleUseResult() {
    if (!result || result.length === 0) return
    
    // Instead of prefilling, directly submit all events
    setSubmitting(true)
    try {
      const newEntries = []
      for (const event of result) {
        for (const regNo of event.students) {
          for (const period of event.periods) {
             newEntries.push({
               reg_no: regNo,
               email: studentsMap[regNo]?.email ?? null,
               date: event.date,
               period: period,
               category: event.category,
               declared: true,
             })
          }
        }
      }
      
      if (newEntries.length === 0) {
         toast.error("No valid entries to submit.")
         return
      }

      const toastId = toast.loading(`Inserting ${newEntries.length} records…`)
      const res = await insertBulk(newEntries)
      toast.dismiss(toastId)

      if (res.errors.length > 0) {
        toast.error(`Error: ${res.errors[0]}`)
      } else {
        toast.success(`${res.inserted} record(s) saved successfully.`)
        reset()
      }
    } catch(e) {
      toast.error(`Submit error: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setText('')
    setResult(null)
    setWarnings([])
    setStudentsMap({})
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Describe attendance in plain English</label>
          <button
            type="button"
            onClick={() => setText(EXAMPLE_TEXT)}
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
          >
            <Copy size={11} /> Use example
          </button>
        </div>
        <textarea
          className="input resize-none"
          rows={4}
          placeholder={`e.g. "${EXAMPLE_TEXT}"`}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          Include student registration numbers, date, period numbers, and activity type.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={handleParse}
          disabled={parsing || !text.trim()}
        >
          {parsing ? <LoadingSpinner size="sm" /> : <Sparkles size={16} />}
          {parsing ? 'Analyzing…' : 'Analyze with AI'}
        </button>
        {result && (
          <button type="button" className="btn-secondary" onClick={reset}>
            <RefreshCw size={16} /> Reset
          </button>
        )}
      </div>

      {/* Parsed result */}
      {result && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Wand2 size={15} className="text-indigo-500" />
            Extracted Information
          </h3>

          <div className="space-y-6">
            {result.map((event, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <h4 className="text-xs font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">Event {idx + 1}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ResultField label="Students" value={
                    event.students.length === 0
                      ? <span className="text-yellow-600 text-xs">None detected</span>
                      : event.students.map(r => (
                          <span
                            key={r}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono mr-1 mb-1 ${
                              studentsMap[r]
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                            title={studentsMap[r]?.full_name || 'Unknown student'}
                          >
                            {r}
                          </span>
                        ))
                  } />

                  <ResultField label="Date" value={
                    event.date
                      ? <span className="font-mono text-sm">{event.date}</span>
                      : <span className="text-yellow-600 text-xs">Not detected</span>
                  } />

                  <ResultField label="Periods" value={
                    event.periods.length === 0
                      ? <span className="text-yellow-600 text-xs">None detected</span>
                      : event.periods.map(p => (
                          <span key={p} className="inline-flex items-center justify-center w-7 h-7 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold mr-1">
                            {p}
                          </span>
                        ))
                  } />

                  <ResultField label="Category" value={
                    event.category
                      ? <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">{event.category}</span>
                      : <span className="text-yellow-600 text-xs">Not detected</span>
                  } />
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-medium text-yellow-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Validation Warnings
              </p>
              <ul className="text-xs text-yellow-700 space-y-0.5">
                {warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}

          {/* Use result */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              className="btn-primary"
              onClick={handleUseResult}
              disabled={result.length === 0 || submitting}
            >
              {submitting ? <LoadingSpinner size="sm" /> : <ChevronRight size={16} />}
              {submitting ? 'Submitting…' : 'Submit All Events'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-wrap items-center gap-1">{value}</div>
    </div>
  )
}
