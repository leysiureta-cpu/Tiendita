import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { isAdmin } from '../utils/auth.js'

function ProfilePage() {
  const { logout, user } = useAuth()

  return (
    <section className="profile-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">CUENTA</p>
          <h1>Perfil de usuario</h1>
        </div>
      </header>

      <article className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          <UserRound size={36} />
        </div>
        <h2>{user.username}</h2>
        <p className="profile-role">{isAdmin(user) ? 'Administrador' : 'Usuario'}</p>
        <dl className="profile-details">
          <div>
            <dt>
              <UserRound size={17} aria-hidden="true" />
              Nombre de usuario
            </dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>
              <Mail size={17} aria-hidden="true" />
              Correo electrónico
            </dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>
              <ShieldCheck size={17} aria-hidden="true" />
              Rol
            </dt>
            <dd>{isAdmin(user) ? 'Administrador' : 'Usuario'}</dd>
          </div>
        </dl>
        <div className="profile-actions">
          <Link className="secondary-button" to="/dashboard">
            Volver al panel
          </Link>
          <Link className="danger-button" onClick={logout} to="/login">
            <LogOut size={17} aria-hidden="true" />
            Cerrar sesión
          </Link>
        </div>
      </article>
    </section>
  )
}

export default ProfilePage
