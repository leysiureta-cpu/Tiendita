import {
  Home,
  List,
  Menu,
  PackagePlus,
  Search,
  Settings,
  ShoppingCart,
  Store,
  UserRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import MiniSuperLogo from '../components/MiniSuperLogo.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import useAuth from '../hooks/useAuth.js'
import sections from '../utils/sections.js'

const menuActions = [
  { path: '/registrar-producto', label: 'Registrar producto', icon: ShoppingCart },
  { path: '/productos', label: 'Buscar producto', icon: Search },
  { path: '/reportes', label: 'Ver reportes', icon: List },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
]

function MainMenuPage() {
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="dashboard-logo" to="/menu" aria-label="Mini Súper, menú principal">
          <MiniSuperLogo compact />
        </Link>
        <div className="dashboard-header-actions">
          <Link
            aria-label={`Perfil de ${user.username}`}
            className="dashboard-profile-link"
            to="/perfil"
          >
            <ProfileAvatar
              className="menu-profile-avatar"
              photo={user.preferences?.profilePhoto}
              username={user.username}
            />
            <span>{user.username}</span>
          </Link>
          <button
            aria-controls="dashboard-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="dashboard-menu-toggle"
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            {isMenuOpen ? (
              <X size={23} aria-hidden="true" />
            ) : (
              <Menu size={23} aria-hidden="true" />
            )}
          </button>
        </div>
        {isMenuOpen && (
          <nav
            aria-label="Secciones de Mini Súper"
            className="dashboard-navigation"
            id="dashboard-navigation"
          >
            <NavLink className="dashboard-nav-link" onClick={closeMenu} to="/menu">
              Menú principal
            </NavLink>
            <NavLink className="dashboard-nav-link" onClick={closeMenu} to="/dashboard">
              <Home size={18} aria-hidden="true" />
              Panel de control
            </NavLink>
            <NavLink
              className="dashboard-nav-link"
              onClick={closeMenu}
              to="/registrar-producto"
            >
              <PackagePlus size={18} aria-hidden="true" />
              Registrar producto
            </NavLink>
            {sections.map(({ path, label, icon: Icon }) => (
              <NavLink
                className="dashboard-nav-link"
                key={path}
                onClick={closeMenu}
                to={path}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            <NavLink className="dashboard-nav-link" onClick={closeMenu} to="/perfil">
              <UserRound size={18} aria-hidden="true" />
              Perfil
            </NavLink>
          </nav>
        )}
      </header>

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">MINI SÚPER</p>
            <h1>Bienvenido/a, {user.username}</h1>
            <p className="dashboard-prompt">¿Qué deseas hacer hoy?</p>
          </div>
          <div className="dashboard-store-illustration" aria-hidden="true">
            <Store size={58} strokeWidth={1.4} />
          </div>
        </div>

        <nav aria-label="Acciones principales" className="dashboard-actions">
          {menuActions.map(({ path, label, icon: Icon }) => (
            <Link className="dashboard-action" key={path} to={path}>
              <Icon size={31} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  )
}

export default MainMenuPage
