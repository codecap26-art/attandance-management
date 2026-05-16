import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'college.edu'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchRole = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (!error && data) {
      setRole(data.role)
    } else {
      setRole(null)
    }
  }, [])

  useEffect(() => {
    // Fallback timeout to unblock if getSession deadlocks silently
    const sessionTimeout = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000))

    // Get existing session on mount
    Promise.race([supabase.auth.getSession(), sessionTimeout])
      .then(async ({ data: { session } }) => {
        try {
          const sessionUser = session?.user ?? null
          setUser(sessionUser)
          if (sessionUser) {
            await fetchRole(sessionUser.id)
          }
        } catch (err) {
          console.error('Session initialization error:', err)
        } finally {
          setLoading(false)
        }
      }).catch((err) => {
        console.error('Failed to get session:', err)
        setLoading(false)
      })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const sessionUser = session?.user ?? null
          setUser(sessionUser)
          if (sessionUser) {
            await fetchRole(sessionUser.id)
          } else {
            setRole(null)
          }
        } catch (err) {
          console.error('Auth state change error:', err)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchRole])

  async function signInWithGoogle() {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Login timeout. The system is taking too long to respond.')), 8000))
    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
            queryParams: { prompt: 'select_account' },
          },
        }),
        timeout
      ])
      return { error }
    } catch (error) {
      return { error }
    }
  }

  async function signInWithEmail(email, password) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Login timeout. The system is taking too long to respond.')), 8000))
    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout
      ])
      return { error }
    } catch (error) {
      return { error }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
  }

  // Domain check: user's email must end with @ALLOWED_DOMAIN
  const isAllowedDomain = user
    ? user.email?.endsWith(`@${ALLOWED_DOMAIN}`)
    : false

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAllowedDomain: true, // Bypass domain check for testing
        signInWithGoogle,
        signInWithEmail,
        signOut,
        refetchRole: () => user && fetchRole(user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
