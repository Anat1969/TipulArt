import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, SUPABASE_KEY, SUPABASE_URL } from './supabase'

type AuthState = {
  session: Session | null
  ready: boolean
  googleEnabled: boolean | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({ session: null, ready: false, googleEnabled: null, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    // בדיקה מוקדמת אם כניסה עם Google פעילה בפרויקט.
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => r.json())
      .then((j) => setGoogleEnabled(Boolean(j?.external?.google)))
      .catch(() => setGoogleEnabled(false))
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ session, ready, googleEnabled, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
