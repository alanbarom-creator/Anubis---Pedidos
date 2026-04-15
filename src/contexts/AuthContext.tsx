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
  | 'inicio'
  | 'configuracion'

const PERMISOS: Record<ModuloPermiso, RolUsuario[]> = {
  inicio:        ['socio', 'administrador', 'gerente', 'vendedor', 'contador'],
  finanzas:      ['socio', 'administrador', 'contador'],
  inventario:    ['socio', 'administrador', 'gerente', 'vendedor', 'contador'],
  ventas:        ['socio', 'administrador', 'gerente', 'vendedor'],
  pedidos:       ['socio', 'administrador', 'gerente', 'vendedor'],
  lotes:         ['socio', 'administrador', 'gerente', 'vendedor'],
  comisiones:    ['socio', 'administrador'],
  usuarios:      ['socio', 'administrador'],
  reportes:      ['socio', 'administrador', 'contador'],
  configuracion: ['socio', 'administrador'],
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  async function cargarPerfil(userId: string) {
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('*, sucursales(*)')
        .eq('id', userId)
        .single()
      setPerfil(data ?? null)
    } catch {
      setPerfil(null)
    }
  }

  useEffect(() => {
    // Failsafe: si Supabase no responde en 7s, desbloquear la app
    const failsafe = setTimeout(() => setLoading(false), 7000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(failsafe)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          cargarPerfil(session.user.id).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        clearTimeout(failsafe)
        setLoading(false)
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
        // Asegurar que loading quede false al cambiar estado de auth
        setLoading(false)
      }
    )

    return () => {
      clearTimeout(failsafe)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    // Verificar que la cuenta esté activa (aprobada por administrador)
    if (data.user) {
      const { data: p } = await supabase
        .from('usuarios')
        .select('activo')
        .eq('id', data.user.id)
        .maybeSingle()
      if (p && !p.activo) {
        await supabase.auth.signOut()
        return { error: 'Tu cuenta está pendiente de activación por el administrador. Te notificaremos cuando esté lista.' }
      }
    }

    return { error: null }
  }

  async function signUp(email: string, password: string, nombre: string, sucursal_id: string) {
    // Registro abierto — cualquiera puede solicitar acceso.
    // El administrador activa la cuenta desde el portal (módulo Usuarios).
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, sucursal_id },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) return { error: error.message, message: null }

    return {
      error: null,
      message: 'Solicitud enviada. Revisa tu correo para confirmar tu cuenta. El administrador activará tu acceso en breve.',
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
