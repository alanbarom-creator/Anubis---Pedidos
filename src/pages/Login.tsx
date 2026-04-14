import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const { error } = await signIn(email, password)
    if (error) { setError(error); setLoading(false) }
    else navigate('/finanzas')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">S</div>
          <h1 className="login-title">SUMEFRA OS</h1>
          <p className="login-sub">Sistema ERP · Joyería SUMEFRA</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label className="field-label">Correo electrónico</label>
            <input type="email" className="field-input" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="correo@sumefra.com"
              required autoFocus autoComplete="email" />
          </div>
          <div className="field">
            <label className="field-label">Contraseña</label>
            <input type="password" className="field-input" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              required autoComplete="current-password" />
          </div>
          {error && <div className="alert alert--error">⚠ {error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="login-footer">SUMEFRA Joyería · Acceso interno</p>
      </div>
    </div>
  )
}
