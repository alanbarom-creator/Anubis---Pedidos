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
  signUp: (email: string, password: string, nombre: string, sucursal_id: string) => Promise<{ error: string | null; message: string | null }>
  signOut: () => Promise<void>
  canAccess: (modulo: ModuloPermiso) => boolean
  isSocioOrAdmin: boolean
}

export type ModuloPermiso =
  | 'finanzas'
  | 'inventario'
  | 'ventas'
  | 'pedidos'
  | 'lotes'
  | 'comisiones'
  | 'usuarios'
  | 'reportes'

const PERMISOS: Record<ModuloPermiso, RolUsuario[]> = {
  finanzas:   ['socio', 'administrador', 'contador'],
  inventario: ['socio', 'administrador', 'gerente', 'vendedor', 'contador'],
  ventas:     ['socio', 'administrador', 'gerente', 'vendedor'],
  pedidos:    ['socio', 'administrador', 'gerente', 'vendedor'],
  lotes:      ['socio', 'administrador', 'gerente', 'vendedor'],
  comisiones: ['socio', 'administrador'],
  usuarios:   ['socio', 'administrador'],
  reportes:   ['socio', 'administrador', 'contador'],
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

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

  async function signUp(email: string, password: string, nombre: string, sucursal_id: string) {
    // Verificar si el correo está autorizado por Alan Baro
    const { data: autorizado } = await supabase
      .from('email_autorizados')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('activo', true)
      .maybeSingle()

    if (!autorizado) {
      return {
        error: 'Tu correo no está autorizado para registro. Contacta al administrador (Alan Baro) para solicitar acceso.',
        message: null,
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, sucursal_id },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) return { error: error.message, message: null }

    // Actualizar sucursal en el perfil de usuario si ya existe
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      await supabase
        .from('usuarios')
        .update({ sucursal_id })
        .eq('id', session.user.id)
    }

    return {
      error: null,
      message: 'Registro exitoso. Revisa tu correo electrónico para confirmar tu cuenta antes de ingresar.',
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function canAccess(modulo: ModuloPermiso): boolean {
    if (!perfil?.rol) return false
    return PERMISOS[modulo].includes(perfil.rol)
  }

  const isSocioOrAdmin = perfil?.rol === 'socio' || perfil?.rol === 'administrador'

  return (
    <AuthContext.Provider value={{
      user,
      session,
      perfil,
      rol: perfil?.rol ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      canAccess,
      isSocioOrAdmin,
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
