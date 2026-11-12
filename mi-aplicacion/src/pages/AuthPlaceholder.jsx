import { Link } from 'react-router-dom'
import MiniSuperLogo from '../components/MiniSuperLogo.jsx'

function AuthPlaceholder({ title }) {
  return (
    <main className="auth-page">
      <div className="welcome-top-bar" />
      <section className="auth-content">
        <MiniSuperLogo compact />
        <h1>{title}</h1>
        <Link className="auth-back-link" to="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}

export default AuthPlaceholder
