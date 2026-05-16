import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const DEBOUNCE_MS = 300

export function useStudents() {
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const timerRef = useRef(null)

  const search = useCallback((query) => {
    clearTimeout(timerRef.current)

    if (!query || query.trim().length === 0) {
      setStudents([])
      return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const q = query.trim()
        const { data, error: sbError } = await supabase
          .from('students')
          .select('id, full_name, reg_no, email')
          .or(`full_name.ilike.%${q}%,reg_no.ilike.%${q}%`)
          .order('reg_no', { ascending: true })
          .limit(50)

        if (sbError) throw sbError
        setStudents(data ?? [])
      } catch (err) {
        setError(err.message)
        setStudents([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
  }, [])

  /** Fetch all students (for bulk operations or admin). */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: sbError } = await supabase
        .from('students')
        .select('id, full_name, reg_no, email')
        .order('reg_no', { ascending: true })

      if (sbError) throw sbError
      setStudents(data ?? [])
      return data ?? []
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /** Fetch students by reg_nos array. */
  const fetchByRegNos = useCallback(async (regNos) => {
    if (!regNos || regNos.length === 0) return []
    const { data, error: sbError } = await supabase
      .from('students')
      .select('id, full_name, reg_no, email')
      .in('reg_no', regNos)

    if (sbError) throw sbError
    return data ?? []
  }, [])

  const clear = useCallback(() => setStudents([]), [])

  return { students, loading, error, search, fetchAll, fetchByRegNos, clear }
}
