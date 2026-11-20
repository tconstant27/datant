import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

type Auth = {
  session: Session | null
  isMember: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<Auth>({
  session: null,
  isMember: false,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifier = async (s: Session | null) => {
      setSession(s)
      if (!s) {
        setIsMember(false)
        setLoading(false)
        return
      }
      const { data } = await supabase.rpc('is_member')
      setIsMember(data === true)
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => verifier(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // évite un appel réseau dans le callback (recommandation Supabase)
      setTimeout(() => verifier(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, isMember, loading, signOut }}>{children}</AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
