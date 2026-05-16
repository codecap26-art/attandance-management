import { useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Upload, FileSpreadsheet, Download, X,
  CheckCircle2, Send, ArrowRight, RotateCcw,
  Settings2, Database
} from 'lucide-react'
import { importFromExcel } from '../../lib/excel'
import * as XLSX from 'xlsx'
import { useAttendance } from '../../hooks/useAttendance'
import { useCategories } from '../../hooks/useCategories'
import LoadingSpinner from '../common/LoadingSpinner'

const TODAY = format(new Date(), 'yyyy-MM-dd')

const STEPS = ['Upload', 'Map Columns', 'Preview & Download']

export default function ExcelUpload({ onSuccess }) {
  const { insertBulk, loading: submitLoading } = useAttendance()
  const { activeCategories } = useCategories()

  const fileRef = useRef(null)
  const [step, setStep] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  // File data
  const [fileName, setFileName] = useState('')
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])

  // Column mapping
  const [nameCol, setNameCol] = useState('')
  const [regNoCol, setRegNoCol] = useState('')
  const [hoursCol, setHoursCol] = useState('')

  // Transformed data
  const [expandedRows, setExpandedRows] = useState([])

  // Database upload
  const [date, setDate] = useState(TODAY)
  const [category, setCategory] = useState('')
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
      const { headers, rows } = await importFromExcel(file)
      if (rows.length === 0) {
        toast.error('The uploaded file has no data rows.')
        return
      }

      setFileName(file.name)
      setRawHeaders(headers)
      setRawRows(rows)

      // Auto-detect columns
      for (const h of headers) {
        const low = h.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (['name', 'fullname', 'studentname'].includes(low)) setNameCol(h)
        if (['registernumber', 'regno', 'regnum', 'rollno', 'rollnumber', 'registrationno', 'regnumber'].includes(low)) setRegNoCol(h)
        if (['attendancehours', 'hours', 'period', 'periods', 'attendanceperiods'].includes(low)) setHoursCol(h)
      }

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

  // ── Transform ──────────────────────────────────────────
  function transformData() {
    if (!nameCol || !regNoCol || !hoursCol) {
      toast.error('Please map all three columns.')
      return
    }

    const expanded = []
    for (const row of rawRows) {
      const name = String(row[nameCol] ?? '').trim()
      const regNo = String(row[regNoCol] ?? '').trim()
      const hoursRaw = String(row[hoursCol] ?? '').trim()

      if (!regNo || !hoursRaw) continue

      // Split comma-separated hours
      const hours = hoursRaw.split(/[,\s]+/).map(h => h.trim()).filter(h => h.length > 0)

      for (const hour of hours) {
        expanded.push({
          Name: name,
          'Register number': regNo,
          'Attendance hours': hour,
        })
      }
    }

    if (expanded.length === 0) {
      toast.error('No data to transform. Check your column mapping.')
      return
    }

    setExpandedRows(expanded)
    setStep(2)
    toast.success(`Expanded to ${expanded.length} rows`)
  }

  // ── Download ───────────────────────────────────────────
  function downloadExcel() {
    if (expandedRows.length === 0) return

    const worksheet = XLSX.utils.json_to_sheet(expandedRows)
    worksheet['!cols'] = [
      { wch: 22 },  // Name
      { wch: 20 },  // Register number
      { wch: 18 },  // Attendance hours
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const baseName = fileName.replace(/\.[^.]+$/, '')
    a.download = `${baseName}_expanded.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Excel file downloaded!')
  }

  // ── Submit to Database ─────────────────────────────────
  async function handleSubmitToDb() {
    if (expandedRows.length === 0) { toast.error('No data to submit.'); return }
    if (!date) { toast.error('Select a date.'); return }
    if (!category) { toast.error('Select a category.'); return }
    if (!declared) { toast.error('Please confirm the declaration.'); return }

    const entries = expandedRows.map(row => ({
      reg_no: row['Register number'],
      email: null,
      date,
      period: Number(row['Attendance hours']),
      category,
      declared: true,
    }))

    const toastId = toast.loading(`Inserting ${entries.length} records…`)
    const result = await insertBulk(entries)
    toast.dismiss(toastId)

    if (result.errors.length > 0) {
      toast.error(`Error: ${result.errors[0]}`)
      return
    }

    toast.success(
      `${result.inserted} record${result.inserted !== 1 ? 's' : ''} saved!` +
      (result.duplicates.length > 0 ? ` ${result.duplicates.length} duplicate(s) skipped.` : '')
    )
    resetAll()
    onSuccess?.()
  }

  function resetAll() {
    setStep(0)
    setFileName('')
    setRawHeaders([])
    setRawRows([])
    setNameCol('')
    setRegNoCol('')
    setHoursCol('')
    setExpandedRows([])
    setDate(TODAY)
    setCategory('')
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
              <ArrowRight size={14} className={`${i < step ? 'text-green-400' : 'text-gray-300'}`} />
            )}
          </div>
        ))}
        {step > 0 && (
          <button type="button" onClick={resetAll}
            className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
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
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
            dragOver ? 'bg-indigo-200 rotate-3 scale-110' : 'bg-gradient-to-br from-indigo-100 to-purple-100'
          }`}>
            <Upload size={28} className={`transition-colors ${dragOver ? 'text-indigo-600' : 'text-indigo-500'}`} />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {dragOver ? 'Drop your file here!' : 'Drag & drop your Excel file here'}
          </p>
          <p className="text-xs text-gray-400">or click to browse — .xlsx, .xls, .csv</p>

          {/* Expected format hint */}
          <div className="mt-5 mx-auto max-w-sm">
            <p className="text-xs text-gray-500 font-medium mb-2">Expected format:</p>
            <div className="overflow-hidden rounded-lg border border-gray-200 text-xs">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">Name</th>
                    <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">Register number</th>
                    <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">Attendance hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-3 py-1">Saran S</td><td className="px-3 py-1 font-mono">7376252CS101</td><td className="px-3 py-1">1,2,3</td></tr>
                  <tr><td className="px-3 py-1">Subash P</td><td className="px-3 py-1 font-mono">7376252AD244</td><td className="px-3 py-1">6,7,5</td></tr>
                </tbody>
              </table>
            </div>
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

          {/* Name */}
          <MappingRow label="Name" required value={nameCol} onChange={setNameCol}
            headers={rawHeaders} sample={rawRows[0]?.[nameCol]}
            valid={!!nameCol} />

          {/* Register Number */}
          <MappingRow label="Register Number" required value={regNoCol} onChange={setRegNoCol}
            headers={rawHeaders} sample={rawRows[0]?.[regNoCol]}
            valid={!!regNoCol} />

          {/* Attendance Hours */}
          <MappingRow label="Attendance Hours" required value={hoursCol} onChange={setHoursCol}
            headers={rawHeaders} sample={rawRows[0]?.[hoursCol]}
            valid={!!hoursCol} />

          {/* Uploaded file data */}
          {nameCol && regNoCol && hoursCol && rawRows.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <FileSpreadsheet size={13} /> Uploaded Data ({rawRows.length} rows)
              </p>
              <div className="overflow-x-auto rounded-lg border border-orange-200 max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-orange-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-orange-700 font-semibold w-8">#</th>
                      <th className="px-3 py-2 text-left text-orange-700 font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-orange-700 font-semibold">Register number</th>
                      <th className="px-3 py-2 text-left text-orange-700 font-semibold">Attendance hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {rawRows.map((row, i) => (
                      <tr key={i} className="hover:bg-orange-50/50 transition-colors">
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-1.5 text-gray-800">{String(row[nameCol] ?? '')}</td>
                        <td className="px-3 py-1.5 font-mono text-gray-700">{String(row[regNoCol] ?? '')}</td>
                        <td className="px-3 py-1.5 font-semibold text-orange-600">{String(row[hoursCol] ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="btn-primary"
              disabled={!nameCol || !regNoCol || !hoursCol}
              onClick={transformData}>
              <ArrowRight size={16} /> Transform Data
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview & Download ─────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <FileSpreadsheet size={14} className="text-orange-500" />
              <span className="text-sm font-medium text-orange-700">{rawRows.length} input rows</span>
            </div>
            <ArrowRight size={16} className="text-gray-300" />
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 size={14} className="text-green-600" />
              <span className="text-sm font-medium text-green-800">{expandedRows.length} expanded rows</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-600 font-semibold text-xs w-10">#</th>
                  <th className="px-4 py-2.5 text-left text-gray-600 font-semibold text-xs">Name</th>
                  <th className="px-4 py-2.5 text-left text-gray-600 font-semibold text-xs">Register number</th>
                  <th className="px-4 py-2.5 text-left text-gray-600 font-semibold text-xs">Attendance hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expandedRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2 text-gray-800">{row.Name}</td>
                    <td className="px-4 py-2 font-mono text-sm text-gray-700">{row['Register number']}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {row['Attendance hours']}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upload to Database */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-4">
            <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <Database size={16} /> Upload to Database
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={date}
                  onChange={e => setDate(e.target.value)} max={TODAY} required />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={category}
                  onChange={e => setCategory(e.target.value)} required>
                  <option value="">— Select category —</option>
                  {activeCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
              <span className="text-xs text-indigo-700">
                I confirm that the above attendance information is correct and accurate.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn-primary"
              disabled={submitLoading || !declared || !date || !category}
              onClick={handleSubmitToDb}>
              {submitLoading ? <LoadingSpinner size="sm" /> : <Send size={16} />}
              {submitLoading ? 'Submitting…' : `Submit ${expandedRows.length} Records`}
            </button>
            <button type="button" className="btn-secondary" onClick={downloadExcel}>
              <Download size={16} /> Download Excel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Reusable column mapping row */
function MappingRow({ label, required, value, onChange, headers, sample, valid }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      valid ? 'border-green-200 bg-green-50/50' :
      required ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-gray-50/50'
    }`}>
      <div className="w-36 shrink-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      <ArrowRight size={14} className="text-gray-300 shrink-0" />
      <select className="input text-sm flex-1" value={value}
        onChange={e => onChange(e.target.value)}>
        <option value="">— Select column —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      {value && sample !== undefined && (
        <span className="text-xs text-gray-400 shrink-0 truncate max-w-[140px]"
          title={String(sample ?? '')}>
          e.g. "{String(sample ?? '').slice(0, 20)}"
        </span>
      )}
    </div>
  )
}
