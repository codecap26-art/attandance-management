import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useAttendance() {
  const { user, role } = useAuth()
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  /**
   * Insert a single attendance record.
   * Returns { data, error, isDuplicate }
   */
  const insertOne = useCallback(async ({ reg_no, email, date, period, category, declared }) => {
    if (!user) return { error: 'Not authenticated', isDuplicate: false }

    setLoading(true)
    setError(null)
    try {
      const record = {
        reg_no,
        email:      email ?? null,
        date,
        period:     Number(period),
        category,
        updated_by: user.email,
        role:       role ?? 'faculty',
        declared:   Boolean(declared),
      }

      const { data, error: sbError } = await supabase
        .from('attendance_logs')
        .insert(record)
        .select()
        .single()

      if (sbError) {
        // Postgres unique violation code
        if (sbError.code === '23505') {
          return { data: null, error: sbError.message, isDuplicate: true }
        }
        throw sbError
      }

      return { data, error: null, isDuplicate: false }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message, isDuplicate: false }
    } finally {
      setLoading(false)
    }
  }, [user, role])

  /**
   * Bulk insert attendance records.
   * Returns { inserted, duplicates, errors }
   */
  const insertBulk = useCallback(async (entries) => {
    if (!user || !entries || entries.length === 0) {
      return { inserted: 0, duplicates: [], errors: [] }
    }

    setLoading(true)
    setError(null)

    const records = entries.map(e => ({
      reg_no:     e.reg_no,
      email:      e.email ?? null,
      date:       e.date,
      period:     Number(e.period),
      category:   e.category,
      updated_by: user.email,
      role:       role ?? 'faculty',
      declared:   Boolean(e.declared),
    }))

    try {
      // Use upsert with ignoreDuplicates to handle conflicts gracefully
      const { data, error: sbError } = await supabase
        .from('attendance_logs')
        .upsert(records, {
          onConflict: 'reg_no,date,period',
          ignoreDuplicates: true,
        })
        .select()

      if (sbError) throw sbError

      const inserted   = data?.length ?? 0
      const duplicates = records.filter(
        r => !data?.find(d => d.reg_no === r.reg_no && d.period === r.period)
      )

      return { inserted, duplicates, errors: [] }
    } catch (err) {
      setError(err.message)
      return { inserted: 0, duplicates: [], errors: [err.message] }
    } finally {
      setLoading(false)
    }
  }, [user, role])

  /**
   * Check which (reg_no, date, period) combinations already exist.
   * Returns array of existing record keys as "reg_no|date|period"
   */
  const checkDuplicates = useCallback(async (regNos, date, periods) => {
    const { data } = await supabase
      .from('attendance_logs')
      .select('reg_no, date, period')
      .in('reg_no', regNos)
      .eq('date', date)
      .in('period', periods)

    return (data ?? []).map(r => `${r.reg_no}|${r.date}|${r.period}`)
  }, [])

  /**
   * Fetch attendance logs with optional filters (admin dashboard).
   */
  const fetchLogs = useCallback(async ({ date, startDate, endDate, updated_by, reg_no, category, page = 0, pageSize = 50, head = false } = {}) => {
    let query = supabase
      .from('attendance_logs')
      .select(`
        id, date, reg_no, email, period, category,
        updated_by, role, declared, created_at,
        students:reg_no ( full_name )
      `, { count: 'exact', head })

    if (!head) {
      query = query.order('created_at', { ascending: false })
      if (pageSize && pageSize > 0) {
        query = query.range(page * pageSize, (page + 1) * pageSize - 1)
      }
    }

    if (date)        query = query.eq('date', date)
    if (startDate)   query = query.gte('date', startDate)
    if (endDate)     query = query.lte('date', endDate)
    if (updated_by)  query = query.eq('updated_by', updated_by)
    if (reg_no)      query = query.ilike('reg_no', `%${reg_no}%`)
    if (category)    query = query.eq('category', category)

    const { data, error: sbError, count } = await query
    if (sbError) throw sbError
    return { data: data ?? [], count: count ?? 0 }
  }, [])

  /**
   * Delete an attendance record (admin only).
   */
  const deleteRecord = useCallback(async (id) => {
    const { error: sbError } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('id', id)
    if (sbError) throw sbError
  }, [])

  /**
   * Update an attendance record (admin only).
   */
  const updateRecord = useCallback(async (id, updates) => {
    const { data, error: sbError } = await supabase
      .from('attendance_logs')
      .update({ ...updates, updated_by: user?.email })
      .eq('id', id)
      .select()
      .single()
    if (sbError) throw sbError
    return data
  }, [user])

  return {
    loading,
    error,
    insertOne,
    insertBulk,
    checkDuplicates,
    fetchLogs,
    deleteRecord,
    updateRecord,
  }
}
