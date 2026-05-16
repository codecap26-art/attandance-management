import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'
import Modal from '../common/Modal'
import { useAttendance } from '../../hooks/useAttendance'
import LoadingSpinner from '../common/LoadingSpinner'

export default function EditRecordModal({ record, categories, onClose, onSaved }) {
  const { updateRecord, loading } = useAttendance()

  const [date,     setDate]     = useState('')
  const [period,   setPeriod]   = useState(1)
  const [category, setCategory] = useState('')

  useEffect(() => {
    if (record) {
      setDate(record.date ?? '')
      setPeriod(record.period ?? 1)
      setCategory(record.category ?? '')
    }
  }, [record])

  async function handleSave(e) {
    e.preventDefault()
    try {
      await updateRecord(record.id, { date, period: Number(period), category })
      toast.success('Record updated.')
      onSaved()
    } catch (err) {
      toast.error(`Update failed: ${err.message}`)
    }
  }

  return (
    <Modal isOpen={!!record} onClose={onClose} title="Edit Attendance Record" size="sm">
      {record && (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-3">
              Editing record for <strong>{record.reg_no}</strong> — {record.students?.full_name ?? ''}
            </p>
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Period</label>
            <select
              className="input"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              required
            >
              {[1,2,3,4,5,6,7].map(p => <option key={p} value={p}>Period {p}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option value="">— Select —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : <Save size={15} />}
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
