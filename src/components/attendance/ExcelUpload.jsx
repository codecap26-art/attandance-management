import { useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Upload, FileSpreadsheet, X, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Trash2, Send, ArrowRight,
  Columns, Eye, Settings2, RotateCcw
} from 'lucide-react'
import { importFromExcel } from '../../lib/excel'
import { useAttendance } from '../../hooks/useAttendance'
import { useStudents } from '../../hooks/useStudents'
import { useCategories } from '../../hooks/useCategories'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

const REQUIRED_FIELDS = ['reg_no', 'date', 'period', 'category']
const FIELD_LABELS = {
  reg_no: 'Reg No',
  date: 'Date',
  period: 'Period',
  category: 'Category',
  email: 'Email (optional)',
}

const STEPS = ['Upload', 'Map Columns', 'Preview & Edit', 'Submit']

export default function ExcelUpload({ onSuccess }) {
  const { insertBulk, loading: submitLoading } = useAttendance()
  const { fetchByRegNos } = useStudents()
  const { activeCategories } = useCategories()
  const { user, role } = useAuth()

  const fileRef = useRef(null)
  const [step, setStep] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  // File data
  const [fileName, setFileName] = useState('')
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState('')

  // Column mapping
  const [mapping, setMapping] = useState({})

  // Preview
  const [previewRows, setPreviewRows] = useState([])
  const [validRows, setValidRows] = useState([])
  const [errorRows, setErrorRows] = useState([])
  const [declared, setDeclared] = useState(false)

  // ── Upload ─────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Please upload an .xlsx, .xls, or .csv file.')
      return
    }

    try {
      const { headers, rows, sheetNames: sheets } = await importFromExcel(file)
      if (rows.length === 0) {
        toast.error('The uploaded file has no data rows.')
        return
      }

      setFileName(file.name)
      setRawHeaders(headers)
      setRawRows(rows)
      setSheetNames(sheets)
      setActiveSheet(sheets[0])

      // Auto-map columns by fuzzy match
      const autoMap = {}
      for (const field of [...REQUIRED_FIELDS, 'email']) {
        const match = headers.find(h => {
          const low = h.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (field === 'reg_no') return ['regno', 'regnum', 'registrationnumber', 'rollno', 'rollnumber', 'registrationno'].includes(low)
          if (field === 'date') return low === 'date'
          if (field === 'period') return ['period', 'hour', 'session'].includes(low)
          if (field === 'category') return ['category', 'reason', 'type'].includes(low)
          if (field === 'email') return ['email', 'emailid', 'mail'].includes(low)
          return false
        })
        if (match) autoMap[field] = match
      }
      setMapping(autoMap)
      setStep(1)
      toast.success(`Loaded ${rows.length} rows from "${file.name}"`)
    } catch (err) {
      toast.error(`Error reading file: ${err.message}`)
    }
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  // ── Mapping ────────────────────────────────────────────
  const mappingComplete = REQUIRED_FIELDS.every(f => mapping[f])

  function applyMapping() {
    const mapped = rawRows.map((row, idx) => {
      const out = { _rowIdx: idx + 2 }
      for (const [field, header] of Object.entries(mapping)) {
        let val = row[header]
        if (val instanceof Date) val = format(val, 'yyyy-MM-dd')
        out[field] = String(val ?? '').trim()
      }
      // Normalize period to number
      out.period = parseInt(out.period, 10)
      return out
    })

    // Validate
    const valid = []
    const errors = []
    mapped.forEach(row => {
      const issues = []
      if (!row.reg_no) issues.push('Missing Reg No')
      if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) issues.push('Invalid date')
      if (isNaN(row.period) || row.period < 1 || row.period > 7) issues.push('Period must be 1–7')
      if (!row.category) issues.push('Missing category')

      if (issues.length > 0) {
        errors.push({ ...row, _issues: issues })
      } else {
        valid.push(row)
      }
    })

    setPreviewRows(mapped)
    setValidRows(valid)
    setErrorRows(errors)
    setStep(2)

    if (errors.length > 0) {
      toast(`${errors.length} row(s) have issues — review below.`, { icon: '⚠️' })
    }
  }

  // ── Edit row inline ────────────────────────────────────
  function updatePreviewRow(idx, field, value) {
    setValidRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: field === 'period' ? parseInt(value, 10) : value }
      return next
    })
  }

  function removeRow(idx) {
    setValidRows(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit() {
    if (validRows.length === 0) { toast.error('No valid rows to submit.'); return }
    if (!declared) { toast.error('Please confirm the declaration.'); return }

    const entries = validRows.map(r => ({
      reg_no: r.reg_no,
      email: r.email || null,
      date: r.date,
      period: Number(r.period),
      category: r.category,
      declared: true,
    }))

    setStep(3)
    const toastId = toast.loading(`Inserting ${entries.length} records…`)
    const result = await insertBulk(entries)
    toast.dismiss(toastId)

    if (result.errors.length > 0) {
      toast.error(`Error: ${result.errors[0]}`)
      setStep(2)
      return
    }

    toast.success(`${result.inserted} record${result.inserted !== 1 ? 's' : ''} saved!`)
    resetAll()
    onSuccess?.()
  }

  function resetAll() {
    setStep(0)
    setFileName('')
    setRawHeaders([])
    setRawRows([])
    setMapping({})
    setPreviewRows([])
    setValidRows([])
    setErrorRows([])
    setDeclared(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-1 mb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              i < step ? 'bg-green-100 text-green-700' :
              i === step ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <CheckCircle2 size={12} /> : <span className="w-4 text-center">{i + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} className={`${i < step ? 'text-green-400' : 'text-gray-300'}`} />
            )}
          </div>
        ))}
        {step > 0 && (
          <button type="button" onClick={resetAll} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
            <RotateCcw size={12} /> Start Over
          </button>
        )}
      </div>

      {/* ── Step 0: Upload ─────────────────────────────── */}
      {step === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
              : 'border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
            dragOver ? 'bg-indigo-200 rotate-3 scale-110' : 'bg-gradient-to-br from-indigo-100 to-purple-100'
          }`}>
            <Upload size={28} className={`transition-colors ${dragOver ? 'text-indigo-600' : 'text-indigo-500'}`} />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {dragOver ? 'Drop your file here!' : 'Drag & drop your Excel file here'}
          </p>
          <p className="text-xs text-gray-400">or click to browse — .xlsx, .xls, .csv supported</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</span>
            <span>•</span>
            <span>Max columns auto-detected</span>
          </div>
        </div>
      )}

      {/* ── Step 1: Map Columns ────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Settings2 size={16} className="text-indigo-500" />
            Map Your Columns
            <span className="ml-auto text-xs font-normal text-gray-400">
              {rawRows.length} rows from "{fileName}"
            </span>
          </div>

          {sheetNames.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Sheet:</label>
              <select className="input max-w-xs text-xs" value={activeSheet}
                onChange={async (e) => {
                  setActiveSheet(e.target.value)
                  const file = fileRef.current?.files?.[0]
                  if (file) {
                    const { headers, rows } = await importFromExcel(file, e.target.value)
                    setRawHeaders(headers)
                    setRawRows(rows)
                  }
                }}>
                {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="grid gap-3">
            {[...REQUIRED_FIELDS, 'email'].map(field => (
              <div key={field} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                mapping[field]
                  ? 'border-green-200 bg-green-50/50'
                  : REQUIRED_FIELDS.includes(field)
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-200 bg-gray-50/50'
              }`}>
                <div className="w-32 shrink-0">
                  <span className="text-sm font-medium text-gray-700">{FIELD_LABELS[field]}</span>
                  {REQUIRED_FIELDS.includes(field) && <span className="text-red-500 ml-0.5">*</span>}
                </div>
                <ArrowRight size={14} className="text-gray-300 shrink-0" />
                <select
                  className="input text-sm flex-1"
                  value={mapping[field] || ''}
                  onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                >
                  <option value="">— Select column —</option>
                  {rawHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {mapping[field] && (
                  <span className="text-xs text-gray-400 shrink-0 max-w-[120px] truncate" title={String(rawRows[0]?.[mapping[field]] ?? '')}>
                    e.g. "{String(rawRows[0]?.[mapping[field]] ?? '').slice(0, 20)}"
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="btn-primary" disabled={!mappingComplete} onClick={applyMapping}>
              <Eye size={16} /> Preview Data
            </button>
            {!mappingComplete && (
              <p className="text-xs text-red-500">Map all required fields (*) to continue.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Preview & Edit ─────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 size={14} className="text-green-600" />
              <span className="text-sm font-medium text-green-800">{validRows.length} valid</span>
            </div>
            {errorRows.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-sm font-medium text-red-700">{errorRows.length} errors</span>
              </div>
            )}
            <span className="text-xs text-gray-400 self-center ml-auto">
              from "{fileName}"
            </span>
          </div>

          {/* Error rows */}
          {errorRows.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-red-700 flex items-center gap-1 mb-2">
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                {errorRows.length} row(s) with issues (excluded)
              </summary>
              <div className="overflow-x-auto rounded-lg border border-red-200 max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-red-700">Row</th>
                      <th className="px-3 py-2 text-left text-red-700">Reg No</th>
                      <th className="px-3 py-2 text-left text-red-700">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {errorRows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-gray-500">{r._rowIdx}</td>
                        <td className="px-3 py-1.5 font-mono">{r.reg_no || '—'}</td>
                        <td className="px-3 py-1.5 text-red-600">{r._issues.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Valid rows table */}
          {validRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-gray-600 font-semibold text-xs">#</th>
                    <th className="px-3 py-2.5 text-left text-gray-600 font-semibold text-xs">Reg No</th>
                    <th className="px-3 py-2.5 text-left text-gray-600 font-semibold text-xs">Date</th>
                    <th className="px-3 py-2.5 text-left text-gray-600 font-semibold text-xs">Period</th>
                    <th className="px-3 py-2.5 text-left text-gray-600 font-semibold text-xs">Category</th>
                    <th className="px-3 py-2.5 text-center text-gray-600 font-semibold text-xs w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {validRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input className="input text-xs py-1 px-2 w-28" value={row.reg_no}
                          onChange={e => updatePreviewRow(i, 'reg_no', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="date" className="input text-xs py-1 px-2 w-36" value={row.date}
                          onChange={e => updatePreviewRow(i, 'date', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <select className="input text-xs py-1 px-2 w-16" value={row.period}
                          onChange={e => updatePreviewRow(i, 'period', e.target.value)}>
                          {[1,2,3,4,5,6,7].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className="input text-xs py-1 px-2 w-32" value={row.category}
                          onChange={e => updatePreviewRow(i, 'category', e.target.value)}>
                          <option value="">—</option>
                          {activeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          {/* keep original if not in list */}
                          {!activeCategories.find(c => c.name === row.category) && row.category && (
                            <option value={row.category}>{row.category}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" onClick={() => removeRow(i)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Declaration & Submit */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
            <span className="text-sm text-gray-700">
              I confirm that the above attendance information is correct and accurate.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn-primary" disabled={submitLoading || !declared || validRows.length === 0}
              onClick={handleSubmit}>
              {submitLoading ? <LoadingSpinner size="sm" /> : <Send size={16} />}
              {submitLoading ? 'Submitting…' : `Submit ${validRows.length} Records`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Submitting ─────────────────────────── */}
      {step === 3 && (
        <div className="text-center py-10">
          <LoadingSpinner />
          <p className="text-sm text-gray-500 mt-3">Submitting records…</p>
        </div>
      )}
    </div>
  )
}
