import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Filter, Download, Trash2, Pencil, ChevronLeft, ChevronRight,
  CheckSquare, Square, RefreshCw, X
} from 'lucide-react'
import { useAttendance } from '../../hooks/useAttendance'
import { useCategories } from '../../hooks/useCategories'
import { exportToExcel, exportToXlsx } from '../../lib/excel'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import EditRecordModal from './EditRecordModal'

const PAGE_SIZE = 50

export default function AdminDashboard() {
  const { fetchLogs, deleteRecord, loading } = useAttendance()
  const { categories } = useCategories()

  const [records,       setRecords]       = useState([])
  const [total,         setTotal]         = useState(0)
  const [page,          setPage]          = useState(0)
  const [selected,      setSelected]      = useState(new Set())
  const [editRecord,    setEditRecord]    = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  // Filters
  const [filterStartDate,   setFilterStartDate]   = useState('')
  const [filterEndDate,     setFilterEndDate]     = useState('')
  const [filterRegNo,       setFilterRegNo]       = useState('')
  const [filterBy,          setFilterBy]          = useState('')
  const [filterCategory,    setFilterCategory]    = useState('')
  const [exporting,         setExporting]         = useState(false)

  const loadRecords = useCallback(async (pg = 0) => {
    try {
      const { data, count } = await fetchLogs({
        startDate:   filterStartDate || undefined,
        endDate:     filterEndDate   || undefined,
        reg_no:      filterRegNo     || undefined,
        updated_by:  filterBy        || undefined,
        category:    filterCategory  || undefined,
        page:        pg,
        pageSize:    PAGE_SIZE,
      })
      setRecords(data)
      setTotal(count)
      setPage(pg)
      setSelected(new Set())
    } catch (err) {
      toast.error(`Failed to load records: ${err.message}`)
    }
  }, [fetchLogs, filterStartDate, filterEndDate, filterRegNo, filterBy, filterCategory])

  useEffect(() => { loadRecords(0) }, [loadRecords])

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === records.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(records.map(r => r.id)))
    }
  }

  async function handleDelete(id) {
    try {
      await deleteRecord(id)
      toast.success('Record deleted.')
      loadRecords(page)
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`)
    }
  }

  async function handleExport() {
    if (records.length === 0) { toast.error('No records to export.'); return }

    try {
      setExporting(true)
      let toExport = []

      if (selected.size > 0) {
        toExport = records.filter(r => selected.has(r.id))
      } else {
        const { data } = await fetchLogs({
          startDate:   filterStartDate || undefined,
          endDate:     filterEndDate   || undefined,
          reg_no:      filterRegNo     || undefined,
          updated_by:  filterBy        || undefined,
          category:    filterCategory  || undefined,
          pageSize:    0,
          head:        false
        })
        toExport = data
      }

      if (toExport.length === 0) { 
        toast.error('No records retrieved for export.')
        return 
      }

      const mapped = toExport.map(r => ({
        date:         r.date,
        reg_no:       r.reg_no,
        student_name: r.students?.full_name ?? '',
        period:       r.period,
        category:     r.category,
      }))
      exportToExcel(mapped, `attendance_${format(new Date(), 'yyyyMMdd_HHmmss')}`)
      toast.success(`Exported ${toExport.length} record${toExport.length !== 1 ? 's' : ''}.`)
    } catch (err) {
      toast.error(`Export failed: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  async function handleXlsxExport() {
    if (records.length === 0) { toast.error('No records to export.'); return }

    try {
      setExporting(true)
      let toExport = []

      if (selected.size > 0) {
        toExport = records.filter(r => selected.has(r.id))
      } else {
        const { data } = await fetchLogs({
          startDate:   filterStartDate || undefined,
          endDate:     filterEndDate   || undefined,
          reg_no:      filterRegNo     || undefined,
          updated_by:  filterBy        || undefined,
          category:    filterCategory  || undefined,
          pageSize:    0,
          head:        false
        })
        toExport = data
      }

      if (toExport.length === 0) { 
        toast.error('No records retrieved for export.')
        return 
      }

      const mapped = toExport.map(r => ({
        date:         r.date,
        reg_no:       r.reg_no,
        student_name: r.students?.full_name ?? '',
        period:       r.period,
        category:     r.category,
      }))
      let filterParts = []
      if (filterStartDate) filterParts.push(`from_${filterStartDate}`)
      if (filterEndDate) filterParts.push(`to_${filterEndDate}`)
      if (filterRegNo) filterParts.push(filterRegNo)
      if (filterCategory) filterParts.push(filterCategory)
      
      let baseName = 'attendance'
      if (filterParts.length > 0) {
        baseName += '_' + filterParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '')
      } else {
        baseName += '_' + format(new Date(), 'yyyyMMdd')
      }

      await exportToXlsx(mapped, baseName)
      toast.success(`Exported ${toExport.length} record${toExport.length !== 1 ? 's' : ''} to .xlsx.`)
    } catch (err) {
      toast.error(`Export failed: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const allSelected = records.length > 0 && selected.size === records.length

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="input w-36"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
              />
              <span className="text-gray-400 mt-2">to</span>
              <input
                type="date"
                className="input w-36"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Reg No</label>
            <input
              type="text"
              className="input w-36"
              placeholder="e.g. 21CS"
              value={filterRegNo}
              onChange={e => setFilterRegNo(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Faculty email</label>
            <input
              type="text"
              className="input w-48"
              placeholder="Search by email…"
              value={filterBy}
              onChange={e => setFilterBy(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input w-44"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary h-9" onClick={() => loadRecords(0)}>
              <Filter size={15} /> Apply
            </button>
            <button
              className="btn-secondary h-9"
              onClick={() => {
                setFilterStartDate('')
                setFilterEndDate('')
                setFilterRegNo('')
                setFilterBy('')
                setFilterCategory('')
              }}
            >
              <X size={15} /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">
            {total} record{total !== 1 ? 's' : ''} found
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
          <button
            className="btn-secondary h-8 text-xs px-3"
            onClick={() => loadRecords(page)}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-success h-8 text-xs px-3"
            onClick={handleExport}
            disabled={records.length === 0 || exporting}
          >
            {exporting ? <LoadingSpinner size="sm" /> : <Download size={14} />}
            Export {selected.size > 0 ? `${selected.size} selected` : 'all'} to Excel
          </button>
          <button
            className="bg-green-700 hover:bg-green-800 text-white font-medium h-8 text-xs px-3 rounded-lg flex items-center gap-2"
            onClick={handleXlsxExport}
            disabled={records.length === 0 || exporting}
          >
            {exporting ? <LoadingSpinner size="sm" /> : <Download size={14} />}
            Download as .xlsx
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleSelectAll} aria-label="Select all">
                    {allSelected
                      ? <CheckSquare size={16} className="text-indigo-600" />
                      : <Square size={16} className="text-gray-300" />
                    }
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Reg No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Period</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Added by</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Role</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wide text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <LoadingSpinner size="md" className="mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No records found. Try adjusting the filters.
                  </td>
                </tr>
              )}
              {!loading && records.map(r => (
                <tr
                  key={r.id}
                  className={`transition-colors ${selected.has(r.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(r.id)}>
                      {selected.has(r.id)
                        ? <CheckSquare size={16} className="text-indigo-600" />
                        : <Square size={16} className="text-gray-300" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.date}</td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{r.reg_no}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-[160px] truncate">
                    {r.students?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      {r.period}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                      {r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{r.updated_by}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      r.role === 'admin' ? 'text-purple-600'
                      : r.role === 'mentor' ? 'text-teal-600'
                      : 'text-blue-600'
                    }`}>
                      {r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditRecord(r)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Page {page + 1} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary h-8 text-xs px-3"
                onClick={() => loadRecords(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                className="btn-secondary h-8 text-xs px-3"
                onClick={() => loadRecords(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditRecordModal
        record={editRecord}
        categories={categories.filter(c => c.is_active).map(c => c.name)}
        onClose={() => setEditRecord(null)}
        onSaved={() => { setEditRecord(null); loadRecords(page) }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget?.id)}
        title="Delete Attendance Record"
        message={`Delete attendance for ${deleteTarget?.reg_no} on ${deleteTarget?.date} period ${deleteTarget?.period}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
