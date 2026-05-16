import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCategories(autoLoad = true) {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: sbError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      if (sbError) throw sbError
      setCategories(data ?? [])
      return data ?? []
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoLoad) fetchAll()
  }, [autoLoad, fetchAll])

  const activeCategories = categories.filter(c => c.is_active)

  const createCategory = useCallback(async (name) => {
    if (!name?.trim()) throw new Error('Category name is required')
    const { data, error: sbError } = await supabase
      .from('categories')
      .insert({ name: name.trim(), is_active: true, created_by: user?.email })
      .select()
      .single()
    if (sbError) throw sbError
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }, [user])

  const updateCategory = useCallback(async (id, updates) => {
    const { data, error: sbError } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (sbError) throw sbError
    setCategories(prev => prev.map(c => c.id === id ? data : c))
    return data
  }, [])

  const toggleCategory = useCallback(async (id, is_active) => {
    return updateCategory(id, { is_active })
  }, [updateCategory])

  const deleteCategory = useCallback(async (id) => {
    const { error: sbError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    if (sbError) throw sbError
    setCategories(prev => prev.filter(c => c.id !== id))
  }, [])

  return {
    categories,
    activeCategories,
    loading,
    error,
    fetchAll,
    createCategory,
    updateCategory,
    toggleCategory,
    deleteCategory,
  }
}
