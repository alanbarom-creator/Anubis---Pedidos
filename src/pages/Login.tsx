import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(
        error.includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos.'
          : error
      )
      setLoading(false)
    } else {
      navigate('/finanzas')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <span>S</span>
          </div>
          <h1 className="login-title">SUMEFRA OS</h1>
          <p className="login-subtitle">Sistema de gestión SUMEFRA</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field-group">
            <label htmlFor="email" className="field-label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="field-input"
              placeholder="usuario@sumefra.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="field-group">
            <label htmlFor="password" className="field-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="field-input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-footer">
          SUMEFRA Joyería · Sistema interno
        </p>
      </div>
    </div>
  )
}
