import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register'

// ── Decorative SVG elements ────────────────────────────────
function CrownDiamond() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2L26 12L34 6L30 26H6L2 6L10 12L18 2Z" stroke="#C9992A" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(201,153,42,0.08)"/>
      <path d="M6 26H30" stroke="#C9992A" strokeWidth="1.2" strokeOpacity="0.5"/>
      <circle cx="18" cy="18" r="4" stroke="#E0B84A" strokeWidth="1" fill="rgba(224,184,74,0.12)"/>
      <path d="M18 14L20 16L18 22L16 16L18 14Z" stroke="#E0B84A" strokeWidth="0.8" fill="none" strokeOpacity="0.7"/>
    </svg>
  )
}

// ── Large background diamond ───────────────────────────────
function BigDiamondBg() {
  return (
    <div className="login-diamond-bg" aria-hidden="true">
      <svg viewBox="0 0 300 340" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        {/* Outer diamond outline */}
        <polygon points="150,4 296,130 150,336 4,130"
          stroke="rgba(201,153,42,0.55)" strokeWidth="1.2" fill="none"/>
        {/* Inner table octagon */}
        <polygon points="150,38 210,63 242,130 210,197 150,222 90,197 58,130 90,63"
          stroke="rgba(224,184,74,0.45)" strokeWidth="0.8" fill="rgba(201,153,42,0.03)"/>
        {/* Top star facet */}
        <polygon points="150,4 90,63 150,38 210,63"
          stroke="rgba(201,153,42,0.3)" strokeWidth="0.6" fill="rgba(224,184,74,0.05)"/>
        {/* Right-top facet */}
        <polygon points="296,130 210,63 242,130"
          stroke="rgba(201,153,42,0.3)" strokeWidth="0.6" fill="rgba(201,153,42,0.03)"/>
        {/* Right-bottom facet */}
        <polygon points="296,130 242,130 210,197"
          stroke="rgba(201,153,42,0.3)" strokeWidth="0.6" fill="rgba(224,184,74,0.04)"/>
        {/* Bottom star facet */}
        <polygon points="150,336 210,197 150,222 90,197"
          stroke="rgba(201,153,42,0.3)" strokeWidth="0.6" fill="rgba(201,153,42,0.04)"/>
        {/* Left-bottom facet */}
        <polygon points="4,130 90,197 58,130"
          stroke="rgba(201,153,42,0.3)" strokeWidth="0.6" fill="rgba(201,153,42,0.03)"/>
        {/* Left-top facet */}
        <polygon points="4,130 58,130 90,63"
          stroke="rgba(201,153,42,0.3)" strokeWidth="0.6" fill="rgba(224,184,74,0.04)"/>
        {/* Upper-left kite */}
        <polygon points="150,4 4,130 90,63"
          stroke="rgba(201,153,42,0.22)" strokeWidth="0.5" fill="rgba(201,153,42,0.015)"/>
        {/* Upper-right kite */}
        <polygon points="150,4 296,130 210,63"
          stroke="rgba(201,153,42,0.22)" strokeWidth="0.5" fill="rgba(201,153,42,0.015)"/>
        {/* Lower-left kite */}
        <polygon points="150,336 4,130 90,197"
          stroke="rgba(201,153,42,0.22)" strokeWidth="0.5" fill="rgba(201,153,42,0.015)"/>
        {/* Lower-right kite */}
        <polygon points="150,336 296,130 210,197"
          stroke="rgba(201,153,42,0.22)" strokeWidth="0.5" fill="rgba(201,153,42,0.015)"/>
        {/* Center light rays */}
        <line x1="150" y1="38"  x2="150" y2="222" stroke="rgba(224,184,74,0.15)" strokeWidth="0.5"/>
        <line x1="58"  y1="130" x2="242" y2="130" stroke="rgba(224,184,74,0.15)" strokeWidth="0.5"/>
        <line x1="90"  y1="63"  x2="210" y2="197" stroke="rgba(201,153,42,0.1)"  strokeWidth="0.4"/>
        <line x1="210" y1="63"  x2="90"  y2="197" stroke="rgba(201,153,42,0.1)"  strokeWidth="0.4"/>
        {/* Center gem dot */}
        <circle cx="150" cy="130" r="4" fill="rgba(255,215,80,0.5)"/>
        <circle cx="150" cy="130" r="8" stroke="rgba(224,184,74,0.2)" strokeWidth="0.5" fill="none"/>
        {/* Top sparkle star */}
        <line x1="150" y1="-6"  x2="150" y2="16"  stroke="rgba(255,220,80,0.95)" strokeWidth="2"/>
        <line x1="136" y1="4"   x2="164" y2="4"   stroke="rgba(255,220,80,0.95)" strokeWidth="2"/>
        <line x1="142" y1="-3"  x2="158" y2="11"  stroke="rgba(255,220,80,0.55)" strokeWidth="1"/>
        <line x1="158" y1="-3"  x2="142" y2="11"  stroke="rgba(255,220,80,0.55)" strokeWidth="1"/>
        {/* Right sparkle */}
        <line x1="304" y1="130" x2="288" y2="130" stroke="rgba(255,220,80,0.5)" strokeWidth="1.5"/>
        <line x1="296" y1="122" x2="296" y2="138" stroke="rgba(255,220,80,0.5)" strokeWidth="1.5"/>
        {/* Left sparkle */}
        <line x1="-4"  y1="130" x2="12"  y2="130" stroke="rgba(255,220,80,0.4)" strokeWidth="1"/>
        <line x1="4"   y1="122" x2="4"   y2="138" stroke="rgba(255,220,80,0.4)" strokeWidth="1"/>
        {/* Bottom sparkle */}
        <line x1="150" y1="344" x2="150" y2="328" stroke="rgba(255,220,80,0.4)" strokeWidth="1"/>
        <line x1="142" y1="336" x2="158" y2="336" stroke="rgba(255,220,80,0.4)" strokeWidth="1"/>
      </svg>
    </div>
  )
}

function ScatterDiamonds() {
  return (
    <div className="login-bg" aria-hidden="true">
      <div className="login-bg-radial" />
      <BigDiamondBg />
      {/* Floating small gems */}
      <div className="gem gem-diamond gem-1" />
      <div className="gem gem-diamond gem-2" />
      <div className="gem gem-diamond gem-3" />
      <div className="gem gem-diamond gem-4" />
      <div className="gem gem-diamond gem-5" />
      <div className="gem gem-diamond gem-6" />
      <div className="gem gem-diamond gem-9" />
      <div className="gem gem-diamond gem-10" />
      <div className="gem gem-ring gem-7" />
      <div className="gem gem-ring gem-8" />
      <div className="gem gem-ring gem-11" />
      <div className="gem gem-ring gem-12" />
      {/* Sparkle lines */}
      <div className="login-sparkle-line login-sparkle-line--1" />
      <div className="login-sparkle-line login-sparkle-line--2" />
      {/* Gold dust particles */}
      <div className="login-dust" />
    </div>
  )
}

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register state
  const [regNombre, setRegNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [regSucursalId, setRegSucursalId] = useState('')
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [sucursalesLoaded, setSucursalesLoaded] = useState(false)

  // Common state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadSucursales() {
    if (sucursalesLoaded) return
    const { data } = await supabase
      .from('sucursales')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
    setSucursales(data ?? [])
    setSucursalesLoaded(true)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setSuccess(null)
    if (m === 'register') loadSucursales()
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.includes('Invalid login credentials') ? 'Correo o contraseña incorrectos.' : error)
      setLoading(false)
    } else {
      navigate('/finanzas')
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (regPassword !== regPassword2) return setError('Las contraseñas no coinciden.')
    if (regPassword.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (!regSucursalId) return setError('Selecciona tu sucursal.')

    setLoading(true)
    const { error: err, message } = await signUp(regEmail, regPassword, regNombre, regSucursalId)
    if (err) {
      setError(err)
    } else {
      setSuccess(message ?? 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.')
      setRegNombre('')
      setRegEmail('')
      setRegPassword('')
      setRegPassword2('')
      setRegSucursalId('')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <ScatterDiamonds />

      <div className="login-wrapper">
        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-logo-ring">
              <div className="login-logo">
                <CrownDiamond />
              </div>
            </div>
            <h1 className="login-title">SUMEFRA</h1>
          </div>

          {/* Mode tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'login-tab--active' : ''}`}
              onClick={() => switchMode('login')}
              type="button"
            >
              Iniciar sesión
            </button>
            <button
              className={`login-tab ${mode === 'register' ? 'login-tab--active' : ''}`}
              onClick={() => switchMode('register')}
              type="button"
            >
              Registrarse
            </button>
          </div>

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="login-form">
              <div className="field-group">
                <label htmlFor="email" className="field-label">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  className="field-input"
                  placeholder="usuario@sumefra.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="field-group">
                <label htmlFor="password" className="field-label">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  className="field-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 5h2v5H7V5zm0 6h2v2H7v-2z"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-login" disabled={loading}>
                {loading
                  ? <span className="btn-login-loading"><span /><span /><span /></span>
                  : 'Ingresar'}
              </button>
            </form>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="login-form">
              <div className="field-group">
                <label htmlFor="reg-nombre" className="field-label">Nombre completo</label>
                <input
                  id="reg-nombre"
                  type="text"
                  value={regNombre}
                  onChange={e => { setRegNombre(e.target.value); setError(null) }}
                  className="field-input"
                  placeholder="Tu nombre"
                  required
                  autoFocus
                />
              </div>

              <div className="field-group">
                <label htmlFor="reg-email" className="field-label">Correo electrónico</label>
                <input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={e => { setRegEmail(e.target.value); setError(null) }}
                  className="field-input"
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="field-group">
                <label htmlFor="reg-sucursal" className="field-label">Sucursal</label>
                <select
                  id="reg-sucursal"
                  value={regSucursalId}
                  onChange={e => setRegSucursalId(e.target.value)}
                  className="field-input"
                  required
                >
                  <option value="">Selecciona tu sucursal...</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="reg-password" className="field-label">Contraseña</label>
                <input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={e => { setRegPassword(e.target.value); setError(null) }}
                  className="field-input"
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="field-group">
                <label htmlFor="reg-password2" className="field-label">Confirmar contraseña</label>
                <input
                  id="reg-password2"
                  type="password"
                  value={regPassword2}
                  onChange={e => { setRegPassword2(e.target.value); setError(null) }}
                  className="field-input"
                  placeholder="Repite tu contraseña"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 5h2v5H7V5zm0 6h2v2H7v-2z"/>
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="login-success" role="status">
                  ✓ {success}
                </div>
              )}

              {!success && (
                <button type="submit" className="btn-login" disabled={loading}>
                  {loading
                    ? <span className="btn-login-loading"><span /><span /><span /></span>
                    : 'Solicitar acceso'}
                </button>
              )}

              <p className="login-note">
                Al registrarte recibirás un correo de confirmación. El administrador activará tu acceso.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
