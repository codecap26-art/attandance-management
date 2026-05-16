import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// In-memory storage fallback for when localStorage is blocked (e.g., full disk)
const memoryStorage = new Map()

const customStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key) ?? memoryStorage.get(key) ?? null
    } catch (error) {
      return memoryStorage.get(key) ?? null
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value)
    } catch (error) {
      console.warn('localStorage setItem failed, falling back to memory')
    }
    memoryStorage.set(key, value)
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      console.warn('localStorage removeItem failed, falling back to memory')
    }
    memoryStorage.delete(key)
  }
}

// Custom dummy lock to prevent navigator.locks from hanging on full disks
const dummyLock = async (name, acquireTimeout, fn) => {
  return await fn()
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: customStorage,
    lock: dummyLock,
  },
})
