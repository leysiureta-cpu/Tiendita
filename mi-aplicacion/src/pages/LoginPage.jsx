import { LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthInput from '../components/AuthInput.jsx'
import MiniSuperLogo from '../components/MiniSuperLogo.jsx'
import useAuth from '../hooks/useAuth.js'

function LoginPage() {
  const { login, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const notice =
    typeof location.state?.notice === 'string' ? location.state.notice : ''

  if (user) {
    return <Navigate to="/menu" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(form.email, form.password)
      navigate('/menu', { replace: true })
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'No se pudo iniciar sesión. Inténtalo nuevamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="welcome-top-bar" />
      <section className="auth-card login-card">
        <MiniSuperLogo compact />
        <h1>Iniciar sesión</h1>
        {notice && <p className="auth-message success-message">{notice}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthInput
            autoComplete="email"
            icon={Mail}
            label="Correo electrónico"
            name="email"
            onChange={handleChange}
            type="email"
            value={form.email}
          />
          <AuthInput
            autoComplete="current-password"
            icon={LockKeyhole}
            label="Contraseña"
            name="password"
            onChange={handleChange}
            type="password"
            value={form.password}
          />
          {error && (
            <p className="auth-message error-message" role="alert">
              {error}
            </p>
          )}
          <button className="auth-submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
        <p className="auth-switch">
          ¿No tienes una cuenta? <Link to="/registro">Registrarse</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
