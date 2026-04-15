import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ── Luxury diamond SVG (faceted, 3D-like) ──────────────────
function Diamond3D({ size = 60, opacity = 1 }: { size?: number; opacity?: number }) {
  const s = size
  return (
    <svg width={s} height={s * 1.1} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
      <defs>
        <linearGradient id="dTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95"/>
          <stop offset="60%" stopColor="#C8E8FF" stopOpacity="0.80"/>
          <stop offset="100%" stopColor="#6FB0F0" stopOpacity="0.60"/>
        </linearGradient>
        <linearGradient id="dLeft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A72B8" stopOpacity="0.65"/>
          <stop offset="100%" stopColor="#081628" stopOpacity="0.92"/>
        </linearGradient>
        <linearGradient id="dRight" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5890D0" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#0E2040" stopOpacity="0.88"/>
        </linearGradient>
        <radialGradient id="dGlow" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#C8952A" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#C8952A" stopOpacity="0"/>
        </radialGradient>
        <filter id="dDropShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#C8952A" floodOpacity="0.40"/>
        </filter>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="38" fill="url(#dGlow)"/>
      <g filter="url(#dDropShadow)">
        {/* Crown */}
        <polygon points="50,2 10,42 35,20" fill="url(#dTop)" stroke="rgba(200,200,255,0.3)" strokeWidth="0.5"/>
        <polygon points="50,2 90,42 65,20" fill="rgba(255,255,255,0.9)" stroke="rgba(220,230,255,0.3)" strokeWidth="0.5"/>
        <polygon points="50,2 35,20 50,14" fill="rgba(255,255,255,0.97)"/>
        <polygon points="50,2 65,20 50,14" fill="rgba(240,248,255,0.95)"/>
        <polygon points="10,42 35,20 18,42" fill="rgba(100,160,240,0.65)"/>
        <polygon points="90,42 65,20 82,42" fill="rgba(180,220,255,0.80)"/>
        {/* Table */}
        <polygon points="50,14 65,20 82,42 65,64 50,70 35,64 18,42 35,20"
          fill="url(#dTop)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7"/>
        {/* Pavilion */}
        <polygon points="10,42 18,42 35,64 50,108" fill="url(#dLeft)" stroke="rgba(60,100,180,0.3)" strokeWidth="0.5"/>
        <polygon points="90,42 82,42 65,64 50,108" fill="url(#dRight)" stroke="rgba(60,100,180,0.25)" strokeWidth="0.5"/>
        <polygon points="50,108 10,42 18,42" fill="rgba(8,20,45,0.70)"/>
        <polygon points="50,108 90,42 82,42" fill="rgba(12,28,56,0.65)"/>
        <polygon points="50,108 35,64 50,70 65,64" fill="rgba(10,24,50,0.80)"/>
        {/* Outline */}
        <polygon points="50,2 90,42 50,108 10,42" fill="none" stroke="rgba(180,220,255,0.45)" strokeWidth="1"/>
        <line x1="10" y1="42" x2="90" y2="42" stroke="rgba(200,230,255,0.35)" strokeWidth="0.8"/>
        {/* Fire */}
        <polygon points="50,2 35,20 18,42" fill="rgba(255,120,40,0.06)"/>
        <polygon points="90,42 65,20 82,42" fill="rgba(50,255,100,0.05)"/>
        {/* Sparkle */}
        <line x1="50" y1="-4" x2="50" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="43" y1="2" x2="57" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

// ── Ring SVG ────────────────────────────────────────────────
function Ring3D({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rGrad" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#E8C86A" stopOpacity="0.9"/>
          <stop offset="50%" stopColor="#C8952A" stopOpacity="0.75"/>
          <stop offset="100%" stopColor="#8B6010" stopOpacity="0.60"/>
        </radialGradient>
        <filter id="rGlow">
          <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#C8952A" floodOpacity="0.50"/>
        </filter>
      </defs>
      <g filter="url(#rGlow)">
        {/* Outer ring */}
        <ellipse cx="50" cy="50" rx="44" ry="44" stroke="url(#rGrad)" strokeWidth="10" fill="none"/>
        {/* Inner shadow */}
        <ellipse cx="50" cy="50" rx="38" ry="38" stroke="rgba(139,96,16,0.35)" strokeWidth="3" fill="none"/>
        <ellipse cx="50" cy="50" rx="46" ry="46" stroke="rgba(232,200,106,0.25)" strokeWidth="2" fill="none"/>
        {/* Top highlight */}
        <path d="M 20 34 A 34 34 0 0 1 80 34" stroke="rgba(255,248,220,0.70)" strokeWidth="5" fill="none" strokeLinecap="round"/>
        {/* Diamond on ring */}
        <polygon points="50,16 56,25 50,34 44,25" fill="white" stroke="rgba(200,149,42,0.60)" strokeWidth="1"/>
        <polygon points="50,16 56,25 50,21" fill="rgba(200,220,255,0.90)"/>
        <polygon points="50,34 44,25 50,28" fill="rgba(20,40,80,0.60)"/>
      </g>
    </svg>
  )
}

// ── M&P Logo SVG ───────────────────────────────────────────
function MPLogo() {
  return (
    <svg width="120" height="64" viewBox="0 0 120 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mpGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8C86A"/>
          <stop offset="50%" stopColor="#C8952A"/>
          <stop offset="100%" stopColor="#A07020"/>
        </linearGradient>
      </defs>
      {/* Elegant frame */}
      <rect x="2" y="2" width="116" height="60" rx="8" stroke="url(#mpGold)" strokeWidth="1.5" fill="rgba(200,149,42,0.06)"/>
      {/* M letter */}
      <path d="M16 46V18L30 36L44 18V46" stroke="url(#mpGold)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* & symbol */}
      <text x="52" y="40" fontFamily="Cormorant Garamond, serif" fontSize="22" fontWeight="700" fill="url(#mpGold)" textAnchor="middle">&amp;</text>
      {/* P letter */}
      <path d="M66 46V18H80C84 18 88 22 88 27C88 32 84 36 80 36H66" stroke="url(#mpGold)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Tagline */}
      <text x="60" y="58" fontFamily="Montserrat, sans-serif" fontSize="6" fontWeight="500" fill="rgba(200,149,42,0.65)" textAnchor="middle" letterSpacing="2">JOYERÍA FINA</text>
    </svg>
  )
}

// ── Anubis Logo SVG ────────────────────────────────────────
function AnubisLogo() {
  return (
    <svg width="120" height="64" viewBox="0 0 120 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="anGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8C86A"/>
          <stop offset="50%" stopColor="#C8952A"/>
          <stop offset="100%" stopColor="#A07020"/>
        </linearGradient>
      </defs>
      {/* Frame */}
      <rect x="2" y="2" width="116" height="60" rx="8" stroke="url(#anGold)" strokeWidth="1.5" fill="rgba(200,149,42,0.06)"/>
      {/* Anubis jackal head silhouette (simplified) */}
      {/* Head oval */}
      <ellipse cx="60" cy="22" rx="12" ry="10" stroke="url(#anGold)" strokeWidth="1.8" fill="rgba(200,149,42,0.10)"/>
      {/* Left ear */}
      <path d="M48 18 L44 8 L52 14" stroke="url(#anGold)" strokeWidth="1.5" fill="rgba(200,149,42,0.10)" strokeLinejoin="round"/>
      {/* Right ear */}
      <path d="M72 18 L76 8 L68 14" stroke="url(#anGold)" strokeWidth="1.5" fill="rgba(200,149,42,0.10)" strokeLinejoin="round"/>
      {/* Snout */}
      <path d="M50 24 Q60 30 70 24" stroke="url(#anGold)" strokeWidth="1.5" fill="none"/>
      {/* Eye */}
      <ellipse cx="56" cy="20" rx="2" ry="1.5" fill="url(#anGold)"/>
      <ellipse cx="64" cy="20" rx="2" ry="1.5" fill="url(#anGold)"/>
      {/* Body/collar */}
      <path d="M48 32 Q60 38 72 32 L70 44 Q60 48 50 44 Z" stroke="url(#anGold)" strokeWidth="1.5" fill="rgba(200,149,42,0.10)"/>
      {/* Collar decorations */}
      <line x1="52" y1="34" x2="52" y2="42" stroke="url(#anGold)" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="60" y1="36" x2="60" y2="44" stroke="url(#anGold)" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="68" y1="34" x2="68" y2="42" stroke="url(#anGold)" strokeWidth="1" strokeOpacity="0.6"/>
      {/* Text */}
      <text x="60" y="58" fontFamily="Cormorant Garamond, serif" fontSize="9" fontWeight="600" fill="url(#anGold)" textAnchor="middle" letterSpacing="3">ANUBIS</text>
    </svg>
  )
}

const QUICK_LINKS = [
  { label: 'Pedidos', path: '/pedidos', icon: '📋', color: '#1A52A0' },
  { label: 'Lotes', path: '/lotes', icon: '◈', color: '#C8952A' },
  { label: 'Finanzas', path: '/finanzas', icon: '₿', color: '#1A6E45' },
  { label: 'Inventario', path: '/inventario', icon: '⬡', color: '#7C4DFF' },
]

export default function InicioPage() {
  const { perfil, isSocioOrAdmin, canAccess } = useAuth()
  const navigate = useNavigate()
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const linksVisibles = QUICK_LINKS.filter(l => {
    const mod = l.label.toLowerCase() as any
    return canAccess(mod)
  })

  return (
    <div className="inicio-page">
      {/* ── Animated 3D background ── */}
      <div className="inicio-bg" aria-hidden="true">
        {/* Gold gradient orbs */}
        <div className="inicio-orb inicio-orb--1" />
        <div className="inicio-orb inicio-orb--2" />
        <div className="inicio-orb inicio-orb--3" />

        {/* Floating diamonds */}
        <div className="inicio-float inicio-float--d1"><Diamond3D size={52} opacity={0.85} /></div>
        <div className="inicio-float inicio-float--d2"><Diamond3D size={32} opacity={0.70} /></div>
        <div className="inicio-float inicio-float--d3"><Diamond3D size={68} opacity={0.65} /></div>
        <div className="inicio-float inicio-float--d4"><Diamond3D size={24} opacity={0.55} /></div>
        <div className="inicio-float inicio-float--d5"><Diamond3D size={44} opacity={0.60} /></div>
        <div className="inicio-float inicio-float--d6"><Diamond3D size={20} opacity={0.50} /></div>

        {/* Floating rings */}
        <div className="inicio-float inicio-float--r1"><Ring3D size={90} /></div>
        <div className="inicio-float inicio-float--r2"><Ring3D size={60} /></div>
        <div className="inicio-float inicio-float--r3"><Ring3D size={120} /></div>
        <div className="inicio-float inicio-float--r4"><Ring3D size={45} /></div>

        {/* Grid lines */}
        <div className="inicio-grid" />
        {/* Gold dust */}
        <div className="inicio-dust" />
      </div>

      {/* ── Main content ── */}
      <div className="inicio-content">
        {/* Welcome hero */}
        <div className="inicio-hero">
          <div className="inicio-hero-eyebrow">
            <span className="inicio-hero-dot" />
            Sistema ERP · SUMEFRA OS v2.0
          </div>

          <h1 className="inicio-hero-title">
            {saludo},<br />
            <span className="inicio-hero-name">{perfil?.nombre ?? 'Bienvenido'}</span>
          </h1>

          <p className="inicio-hero-sub">
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>

          {/* Role badge */}
          {perfil?.rol && (
            <div className="inicio-rol-badge">
              <span className="inicio-rol-dot" />
              {perfil.rol.charAt(0).toUpperCase() + perfil.rol.slice(1)}
              {perfil.sucursales && ` · ${perfil.sucursales.nombre}`}
            </div>
          )}
        </div>

        {/* Quick access cards */}
        <div className="inicio-quick-grid">
          {linksVisibles.map(link => (
            <button
              key={link.path}
              className="inicio-quick-card"
              onClick={() => navigate(link.path)}
              style={{ '--accent': link.color } as React.CSSProperties}
            >
              <div className="inicio-quick-icon">{link.icon}</div>
              <span className="inicio-quick-label">{link.label}</span>
              <div className="inicio-quick-arrow">→</div>
            </button>
          ))}
          {isSocioOrAdmin && (
            <button
              className="inicio-quick-card"
              onClick={() => navigate('/configuracion')}
              style={{ '--accent': '#8B6010' } as React.CSSProperties}
            >
              <div className="inicio-quick-icon">⚙</div>
              <span className="inicio-quick-label">Configuración</span>
              <div className="inicio-quick-arrow">→</div>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="inicio-divider">
          <span className="inicio-divider-line" />
          <span className="inicio-divider-diamond">◆</span>
          <span className="inicio-divider-line" />
        </div>

        {/* Logos dashboard */}
        <div className="inicio-logos-section">
          <p className="inicio-logos-label">Nuestras marcas</p>
          <div className="inicio-logos-row">
            <div className="inicio-logo-card">
              <MPLogo />
              <span className="inicio-logo-name">M&P Joyería</span>
            </div>
            <div className="inicio-logo-separator">
              <Diamond3D size={28} opacity={0.7} />
            </div>
            <div className="inicio-logo-card">
              <AnubisLogo />
              <span className="inicio-logo-name">Anubis Joyería</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
