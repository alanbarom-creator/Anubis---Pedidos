import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Usuario, RolUsuario } from '../types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  perfil: Usuario | null
  rol: RolUsuario | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  canAccess: (modulo: ModuloPermiso) => boolean
}

// Módulos del sistema y qué roles tienen acceso
export type ModuloPermiso =
  | 'finanzas'
  | 'inventario'
  | 'ventas'
  | 'pedidos'
  | 'comisiones'
  | 'usuarios'
  | 'reportes'

const PERMISOS: Record<ModuloPermiso, RolUsuario[]> = {
  finanzas:    ['socio', 'administrador', 'contador'],
  inventario:  ['socio', 'administrador'],
  ventas:      ['socio', 'administrador', 'gerente', 'vendedor'],
  pedidos:     ['socio', 'administrador', 'gerente', 'vendedor'],
  comisiones:  ['socio', 'administrador'],
  usuarios:    ['socio'],
  reportes:    ['socio', 'administrador', 'contador'],
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  async function cargarPerfil(userId: string) {
    const { data } = await supabase
      .from('usuarios')
      .select('*, sucursales(*)')
      .eq('id', userId)
      .single()
    setPerfil(data ?? null)
  }

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await cargarPerfil(session.user.id)
        } else {
          setPerfil(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function canAccess(modulo: ModuloPermiso): boolean {
    if (!perfil?.rol) return false
    return PERMISOS[modulo].includes(perfil.rol)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      perfil,
      rol: perfil?.rol ?? null,
      loading,
      signIn,
      signOut,
      canAccess,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
