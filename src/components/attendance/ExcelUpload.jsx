import { useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { 
  Upload, FileSpreadsheet, CheckCircle2, 
  X, Send, ArrowRight, RotateCcw, Database 
} from 'lucide-react'
import { importFromExcel } from '../../lib/excel'
import * as XLSX from 'xlsx'
import { useAttendance } from '../../hooks/useAttendance'
import { useCategories } from '../../hooks/useCategories'
import { useStudents } from '../../hooks/useStudents'
import LoadingSpinner from '../common/LoadingSpinner'

const TODAY = format(new Date(), 'yyyy-MM-dd')

/** Robust helper to parse various Excel date formats into yyyy-MM-dd */
const parseDateValue = (val) => {
  if (!val) return null;
  
  // 1. Handle Excel Serial Numbers (Numbers)
  if (typeof val === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      return format(new Date(date.y, date.m - 1, date.d), 'yyyy-MM-dd');
    } catch (e) { return null; }
  }

  // 2. Handle Strings
  const str = String(val).trim();
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1]);
    const m = parseInt(dmyMatch[2]) - 1;
    let y = parseInt(dmyMatch[3]);
    if (y < 100) y += 2000;
    const date = new Date(y, m, d);
    return !isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : null;
  }

  // Fallback to standard JS parsing
  const date = new Date(val);
  return !isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : null;
};

export default function ExcelUpload({ onSuccess }) {
  const { insertBulk, loading: submitLoading } = useAttendance()
  const { activeCategories } = useCategories()
  const { fetchByRegNos } = useStudents()

  const fileRef = useRef(null)
  const [fileData, setFileData] = useState(null) // { fileName, headers, rows }
  const [mapping, setMapping] = useState({ reg: '', hrs: '', dt: '', cat: '' })
  const [previewRows, setPreviewRows] = useState([])
  const [isValidating, setIsValidating] = useState(false)
  
  // Global fallbacks
  const [globalDate, setGlobalDate] = useState(TODAY)
  const [globalCategory, setGlobalCategory] = useState('')
  const [declared, setDeclared] = useState(false)

  // 1. Handle File Upload
  const handleFile = async (file) => {
    if (!file) return
    try {
      const { headers, rows } = await importFromExcel(file)
      if (rows.length === 0) return toast.error('File is empty')

      // Auto-detect columns using 7376 pattern
      let detReg = '', detHrs = '', detDt = '', detCat = ''
      for (const h of headers) {
        const low = h.toLowerCase().replace(/[^a-z0-9]/g, '')
        const val = String(rows[0]?.[h] ?? '')
        if (!detReg && (low.includes('reg') || low.includes('roll') || val.startsWith('7376'))) detReg = h
        if (!detHrs && (low.includes('hour') || low.includes('period'))) detHrs = h
        if (!detDt && low.includes('date')) detDt = h
        if (!detCat && (low.includes('category') || low.includes('type'))) detCat = h
      }

      setFileData({ fileName: file.name, headers, rows })
      setMapping({ reg: detReg, hrs: detHrs, dt: detDt, cat: detCat })
      setPreviewRows([]) // Clear previous preview
      toast.success(`Loaded ${file.name}`)
    } catch (err) {
      toast.error('Error reading file')
    }
  }

  // 2. Transform & Authenticate (Single Action)
  const generatePreview = async () => {
    if (!mapping.reg || !mapping.hrs) return toast.error('Map Reg No and Hours first')
    
    setIsValidating(true)
    const expanded = []
    const regNos = new Set()

    fileData.rows.forEach(row => {
      const regNo = String(row[mapping.reg] ?? '').trim()
      const hrsRaw = String(row[mapping.hrs] ?? '').trim()
      if (!regNo || !hrsRaw) return

      regNos.add(regNo)
      
      // Use row-level category if available, otherwise fallback to global
      const rowCat = mapping.cat && row[mapping.cat] 
        ? String(row[mapping.cat] ?? '').trim() 
        : globalCategory

      hrsRaw.split(/[,\s]+/).forEach(h => {
        if (h.trim()) expanded.push({
          reg: regNo,
          hour: h.trim(),
          date: rowDt || globalDate,
          category: rowCat || globalCategory,
          name: 'Checking...',
          isValid: false
        })
      })
    })

    try {
      const students = await fetchByRegNos(Array.from(regNos))
      const studentMap = new Map(students.map(s => [s.reg_no.toLowerCase(), s.full_name]))
      
      expanded.forEach(row => {
        const name = studentMap.get(row.reg.toLowerCase())
        row.name = name || 'Not Found'
        row.isValid = !!name
      })
      
      setPreviewRows(expanded)
    } catch (e) {
      toast.error('Auth failed')
    } finally {
      setIsValidating(false)
    }
  }

  // 3. Final Submit
  const handleSubmit = async () => {
    if (!declared) return toast.error('Please confirm the declaration')
    const validOnes = previewRows.filter(r => r.isValid)
    if (validOnes.length === 0) return toast.error('No valid records')

    const toastId = toast.loading(`Saving ${validOnes.length} records...`)
    const result = await insertBulk(validOnes.map(r => ({
      reg_no: r.reg,
      date: r.date,
      period: Number(r.hour),
      category: r.category || globalCategory,
      declared: true
    })))
    
    toast.dismiss(toastId)
    if (result.errors.length === 0) {
      toast.success(`Successfully saved ${result.inserted} records!`)
      setFileData(null)
      setPreviewRows([])
      onSuccess?.()
    } else {
      toast.error(result.errors[0])
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* 1. UPLOAD AREA */}
      {!fileData ? (
        <div 
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-indigo-200 rounded-3xl p-12 text-center bg-indigo-50/30 hover:bg-indigo-50 transition-all cursor-pointer group"
        >
          <input ref={fileRef} type="file" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <Upload className="mx-auto text-indigo-400 group-hover:scale-110 transition-transform mb-4" size={48} />
          <h3 className="text-lg font-bold text-indigo-900">Drop Attendance Excel Here</h3>
          <p className="text-sm text-indigo-500/70">Automatic Register Number (7376...) & Hours detection</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet /> {fileData.fileName}
              </h2>
              <p className="text-indigo-100 text-xs">{fileData.rows.length} rows detected</p>
            </div>
            <button onClick={() => setFileData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <RotateCcw size={20} />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* ONLY DEFAULT VALUES */}
            <div className="max-w-xl mx-auto p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 justify-center">
                <CheckCircle2 size={14} /> Set Attendance Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 mb-1 block uppercase">Attendance Date</label>
                  <input type="date" className="w-full text-sm p-2.5 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" value={globalDate} onChange={e => setGlobalDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 mb-1 block uppercase">Attendance Category</label>
                  <select className="w-full text-sm p-2.5 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-200 outline-none bg-white transition-all" value={globalCategory} onChange={e => setGlobalCategory(e.target.value)}>
                    <option value="">— Select Category —</option>
                    {activeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              {(!mapping.reg || !mapping.hrs) ? (
                <p className="text-[10px] text-center text-red-500 font-medium">
                  ⚠️ Auto-detection failed. Please ensure file has "Register Number" and "Hours" columns.
                </p>
              ) : (
                <div className="text-[10px] text-center space-y-1">
                  <p className="text-green-600 font-medium italic">
                    ✓ Found: "{mapping.reg}" & "{mapping.hrs}"
                  </p>
                  {mapping.cat && (
                    <p className="text-indigo-400 italic">
                      ℹ Also using "{mapping.cat}" from file for categories.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 3. GENERATE PREVIEW BUTTON */}
            <button 
              onClick={generatePreview}
              disabled={isValidating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isValidating ? <LoadingSpinner size="sm" /> : <ArrowRight size={18} />}
              {isValidating ? 'Authenticating Students...' : 'Analyze & Show Preview'}
            </button>

            {/* 4. PREVIEW TABLE */}
            {previewRows.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Reg No</th>
                        <th className="px-4 py-3 text-left w-24 text-center">Hrs</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Name (from DB)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {previewRows.map((row, i) => (
                        <tr key={i} className={row.isValid ? 'hover:bg-indigo-50/30' : 'bg-red-50/30'}>
                          <td className="px-4 py-2 text-gray-400 text-xs">{i+1}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              className="text-xs p-1 border rounded w-32 font-mono bg-transparent"
                              value={row.reg}
                              onChange={(e) => {
                                const newRows = [...previewRows]
                                newRows[i].reg = e.target.value
                                setPreviewRows(newRows)
                              }}
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">{row.hour}</span>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="date" 
                              className="text-xs p-1 border rounded bg-transparent"
                              value={row.date}
                              onChange={(e) => {
                                const newRows = [...previewRows]
                                newRows[i].date = e.target.value
                                setPreviewRows(newRows)
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {row.isValid ? 
                              <span className="text-[10px] font-bold text-green-600 flex items-center gap-1 uppercase"><CheckCircle2 size={12}/> OK</span> :
                              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 uppercase"><X size={12}/> ERROR</span>
                            }
                          </td>
                          <td className={`px-4 py-2 font-bold ${row.isValid ? 'text-gray-800' : 'text-red-600'}`}>{row.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 5. FINAL DECLARE & SUBMIT */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded-lg text-indigo-600" checked={declared} onChange={e => setDeclared(e.target.checked)} />
                    <span className="text-sm font-medium text-gray-700">I verify that this attendance data is correct</span>
                  </label>
                  <button 
                    disabled={!declared || submitLoading}
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
                  >
                    {submitLoading ? <LoadingSpinner size="sm" /> : <Send size={18} />}
                    Finalize & Save Attendance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
