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

// ── Realistic faceted diamond (photorealistic gradients) ───
function BigDiamondBg() {
  return (
    <div className="login-diamond-bg" aria-hidden="true">
      <svg viewBox="0 0 300 340" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          {/* Table — bright center */}
          <radialGradient id="gTbl" cx="50%" cy="38%" r="62%">
            <stop offset="0%"   stopColor="#FFFFFF"  stopOpacity="0.98"/>
            <stop offset="35%"  stopColor="#E8F5FF"  stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#A8D4F8"  stopOpacity="0.85"/>
          </radialGradient>
          {/* Crown top-left — icy blue */}
          <linearGradient id="gCtl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#FFFFFF"  stopOpacity="0.92"/>
            <stop offset="55%"  stopColor="#C0E4FF"  stopOpacity="0.78"/>
            <stop offset="100%" stopColor="#70B0F0"  stopOpacity="0.62"/>
          </linearGradient>
          {/* Crown top-right — brightest (main light) */}
          <linearGradient id="gCtr" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FFFFFF"  stopOpacity="0.96"/>
            <stop offset="50%"  stopColor="#D8EEFF"  stopOpacity="0.88"/>
            <stop offset="100%" stopColor="#92C6F8"  stopOpacity="0.72"/>
          </linearGradient>
          {/* Crown left */}
          <linearGradient id="gCl" x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%"   stopColor="#80B8F0"  stopOpacity="0.72"/>
            <stop offset="100%" stopColor="#B8DCFF"  stopOpacity="0.78"/>
          </linearGradient>
          {/* Crown right */}
          <linearGradient id="gCr" x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0%"   stopColor="#E4F2FF"  stopOpacity="0.90"/>
            <stop offset="100%" stopColor="#A4CCFF"  stopOpacity="0.76"/>
          </linearGradient>
          {/* Pavilion left — deep blue */}
          <linearGradient id="gPl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#3870B8"  stopOpacity="0.58"/>
            <stop offset="50%"  stopColor="#1A4898"  stopOpacity="0.72"/>
            <stop offset="100%" stopColor="#060E20"  stopOpacity="0.92"/>
          </linearGradient>
          {/* Pavilion right */}
          <linearGradient id="gPr" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4880C8"  stopOpacity="0.55"/>
            <stop offset="50%"  stopColor="#2258A8"  stopOpacity="0.68"/>
            <stop offset="100%" stopColor="#0C1C3C"  stopOpacity="0.90"/>
          </linearGradient>
          {/* Pavilion bottom — darkest */}
          <linearGradient id="gPb" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%"   stopColor="#163060"  stopOpacity="0.72"/>
            <stop offset="100%" stopColor="#010204"  stopOpacity="0.98"/>
          </linearGradient>
          {/* Specular highlight */}
          <radialGradient id="gSp1" cx="32%" cy="22%" r="48%">
            <stop offset="0%"   stopColor="#FFFFFF"  stopOpacity="0.88"/>
            <stop offset="45%"  stopColor="#FFFFFF"  stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#FFFFFF"  stopOpacity="0"/>
          </radialGradient>
          {/* Secondary highlight */}
          <radialGradient id="gSp2" cx="68%" cy="38%" r="28%">
            <stop offset="0%"   stopColor="#FFFFFF"  stopOpacity="0.52"/>
            <stop offset="100%" stopColor="#FFFFFF"  stopOpacity="0"/>
          </radialGradient>
          {/* Ambient glow */}
          <radialGradient id="gGlow" cx="50%" cy="44%" r="55%">
            <stop offset="0%"   stopColor="#C0E0FF"  stopOpacity="0.22"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          {/* Drop shadow */}
          <filter id="fDrop" x="-25%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#4090C8" floodOpacity="0.38"/>
          </filter>
        </defs>

        {/* Soft ambient glow */}
        <ellipse cx="150" cy="162" rx="148" ry="118" fill="url(#gGlow)"/>

        <g filter="url(#fDrop)">
          {/* ── CROWN (upper half) ── */}
          <polygon points="150,5 5,148 98,62"    fill="url(#gCtl)" stroke="rgba(190,225,255,0.32)" strokeWidth="0.6"/>
          <polygon points="150,5 295,148 202,62"  fill="url(#gCtr)" stroke="rgba(200,230,255,0.24)" strokeWidth="0.6"/>
          <polygon points="150,5 98,62 150,42"    fill="rgba(255,255,255,0.90)" stroke="rgba(210,235,255,0.42)" strokeWidth="0.5"/>
          <polygon points="150,5 202,62 150,42"   fill="rgba(255,255,255,0.96)" stroke="rgba(255,255,255,0.50)" strokeWidth="0.5"/>
          <polygon points="5,148 98,62 78,148"    fill="url(#gCl)"  stroke="rgba(175,215,255,0.28)" strokeWidth="0.5"/>
          <polygon points="295,148 202,62 222,148" fill="url(#gCr)" stroke="rgba(195,225,255,0.28)" strokeWidth="0.5"/>

          {/* ── TABLE (center octagon) ── */}
          <polygon points="150,42 202,62 222,148 202,234 150,254 98,234 78,148 98,62"
            fill="url(#gTbl)" stroke="rgba(255,255,255,0.65)" strokeWidth="0.9"/>

          {/* ── PAVILION (lower half) ── */}
          <polygon points="5,148 78,148 98,234 150,330"   fill="url(#gPl)" stroke="rgba(55,95,175,0.32)" strokeWidth="0.5"/>
          <polygon points="295,148 222,148 202,234 150,330" fill="url(#gPr)" stroke="rgba(55,95,175,0.28)" strokeWidth="0.5"/>
          <polygon points="150,330 5,148 78,148"           fill="rgba(12,26,56,0.70)"  stroke="rgba(45,80,160,0.28)" strokeWidth="0.5"/>
          <polygon points="150,330 295,148 222,148"         fill="rgba(16,36,72,0.66)"  stroke="rgba(45,80,160,0.24)" strokeWidth="0.5"/>
          <polygon points="150,330 98,234 150,254 202,234"  fill="url(#gPb)" stroke="rgba(38,66,138,0.32)" strokeWidth="0.5"/>

          {/* Outer outline */}
          <polygon points="150,5 295,148 150,330 5,148" fill="none" stroke="rgba(180,220,255,0.48)" strokeWidth="1.2"/>
          {/* Girdle */}
          <line x1="5" y1="148" x2="295" y2="148" stroke="rgba(210,235,255,0.38)" strokeWidth="1"/>

          {/* Fire (prismatic dispersal — very subtle) */}
          <polygon points="150,5 98,62 78,148"    fill="rgba(255,70,50,0.055)"/>
          <polygon points="295,148 202,62 222,148" fill="rgba(50,255,70,0.045)"/>
          <polygon points="5,148 78,148 98,234"    fill="rgba(50,70,255,0.060)"/>
          <polygon points="150,330 202,234 295,148" fill="rgba(255,200,50,0.045)"/>

          {/* Specular highlights */}
          <polygon points="150,5 295,148 150,330 5,148" fill="url(#gSp1)"/>
          <polygon points="150,5 295,148 150,330 5,148" fill="url(#gSp2)"/>
        </g>

        {/* ── SPARKLE STARS ── */}
        {/* Top — brightest */}
        <line x1="150" y1="-10" x2="150" y2="22"  stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="130" y1="6"   x2="170" y2="6"   stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="138" y1="-6"  x2="162" y2="18"  stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.65"/>
        <line x1="162" y1="-6"  x2="138" y2="18"  stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.65"/>
        {/* Right */}
        <line x1="305" y1="148" x2="285" y2="148" stroke="rgba(255,255,255,0.88)" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="295" y1="138" x2="295" y2="158" stroke="rgba(255,255,255,0.88)" strokeWidth="2.2" strokeLinecap="round"/>
        {/* Left */}
        <line x1="-5"  y1="148" x2="15"  y2="148" stroke="rgba(255,255,255,0.70)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="5"   y1="138" x2="5"   y2="158" stroke="rgba(255,255,255,0.70)" strokeWidth="1.8" strokeLinecap="round"/>
        {/* Bottom */}
        <line x1="150" y1="348" x2="150" y2="320" stroke="rgba(255,255,255,0.68)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="140" y1="334" x2="160" y2="334" stroke="rgba(255,255,255,0.68)" strokeWidth="1.8" strokeLinecap="round"/>
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
  // Lista estática de sucursales como base; se sobreescribe con datos reales de Supabase
  const SUCURSALES_DEFAULT = [
    'Sumefra',
    'Anubis Aguascalientes',
    'Anubis Centro',
    'Anubis Galerías',
    'Anubis Sahuaro Grande',
    'Anubis Sahuaro Chico',
    'M&P Galerías',
  ]
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>(
    SUCURSALES_DEFAULT.map(n => ({ id: n, nombre: n }))
  )

  // Common state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadSucursales() {
    try {
      const { data } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')
      if (data && data.length > 0) setSucursales(data)
    } catch {
      // Si falla, se mantiene la lista estática predefinida
    }
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
