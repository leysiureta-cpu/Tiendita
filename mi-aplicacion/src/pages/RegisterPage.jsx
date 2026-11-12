import { LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthInput from '../components/AuthInput.jsx'
import MiniSuperLogo from '../components/MiniSuperLogo.jsx'
import useAuth from '../hooks/useAuth.js'

const emptyForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function RegisterPage() {
  const { register, user } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/menu" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      await register(form)
      setForm(emptyForm)
      setSuccess('Tu cuenta se creó correctamente. Ya puedes iniciar sesión.')
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'No se pudo crear la cuenta. Inténtalo nuevamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="welcome-top-bar" />
      <section className="auth-card register-card">
        <div className="register-logo">
          <MiniSuperLogo compact />
        </div>
        <h1>Registro de usuario</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthInput
            autoComplete="name"
            icon={UserRound}
            label="Nombre de usuario"
            name="username"
            onChange={handleChange}
            value={form.username}
          />
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
            autoComplete="new-password"
            icon={LockKeyhole}
            label="Contraseña"
            name="password"
            onChange={handleChange}
            type="password"
            value={form.password}
          />
          <AuthInput
            autoComplete="new-password"
            icon={LockKeyhole}
            label="Confirmar contraseña"
            name="confirmPassword"
            onChange={handleChange}
            type="password"
            value={form.confirmPassword}
          />
          {error && (
            <p className="auth-message error-message" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="auth-message success-message" role="status">
              {success}
            </p>
          )}
          <button className="auth-submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Guardando…' : 'Entrar'}
          </button>
        </form>
        <p className="auth-switch">
          ¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  )
}

export default RegisterPage
