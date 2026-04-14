import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Usuario, Rol, Modulo } from '../types'

interface AuthCtx {
  user: User | null; session: Session | null; perfil: Usuario | null
  rol: Rol | null; loading: boolean
  signIn(email: string, password: string): Promise<{ error: string | null }>
  signOut(): Promise<void>
  can(modulo: Modulo): boolean
  puedeVerCostos(): boolean
}

const PERMISOS: Record<Modulo, Rol[]> = {
  finanzas:   ['socio','administrador','contador'],
  inventario: ['socio','administrador','gerente','vendedor'],
  pedidos:    ['socio','administrador','gerente','vendedor'],
  catalogo:   ['socio','administrador','gerente','vendedor'],
  comisiones: ['socio','administrador'],
  usuarios:   ['socio'],
  reportes:   ['socio','administrador','contador'],
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null)
  const [session, setSess]  = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoad]  = useState(true)

  async function loadPerfil(uid: string) {
    const { data } = await supabase.from('usuarios').select('*,sucursales(*)').eq('id', uid).single()
    setPerfil(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSess(session); setUser(session?.user ?? null)
      if (session?.user) loadPerfil(session.user.id).finally(() => setLoad(false))
      else setLoad(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, sess) => {
      setSess(sess); setUser(sess?.user ?? null)
      if (sess?.user) await loadPerfil(sess.user.id)
      else setPerfil(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? (error.message.includes('Invalid') ? 'Correo o contraseña incorrectos' : error.message) : null }
  }
  async function signOut() { await supabase.auth.signOut() }
  function can(m: Modulo) { return perfil ? PERMISOS[m].includes(perfil.rol) : false }
  function puedeVerCostos() { return perfil ? ['socio','administrador'].includes(perfil.rol) : false }

  return <Ctx.Provider value={{ user, session, perfil, rol: perfil?.rol ?? null, loading, signIn, signOut, can, puedeVerCostos }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fuera de AuthProvider')
  return c
}
