import { UserRound, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import MiniSuperLogo from '../components/MiniSuperLogo.jsx'

function WelcomePage() {
  return (
    <main className="welcome-page">
      <div className="welcome-top-bar" />
      <section className="welcome-content" aria-label="Bienvenida a Mini Súper">
        <MiniSuperLogo />
        <div className="welcome-actions">
          <Link className="welcome-button login-button" to="/login">
            <UserRound size={19} strokeWidth={2} aria-hidden="true" />
            <span>Iniciar sesión</span>
          </Link>
          <Link className="welcome-button register-button" to="/registro">
            <UserRoundPlus size={19} strokeWidth={2} aria-hidden="true" />
            <span>Registrarse</span>
          </Link>
        </div>
      </section>
    </main>
  )
}

export default WelcomePage
