import {
  BarChart3,
  Boxes,
  Home,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import AuthProvider from './context/AuthProvider.jsx'
import useAuth from './hooks/useAuth.js'
import MiniSuperLogo from './components/MiniSuperLogo.jsx'
import ProfileAvatar from './components/ProfileAvatar.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MainMenuPage from './pages/MainMenuPage.jsx'
import ProductDetailsPage from './pages/ProductDetailsPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import CategoriesPage from './pages/CategoriesPage.jsx'
import EmployeesPage from './pages/EmployeesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import RegisterProductPage from './pages/RegisterProductPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import SalesPage from './pages/SalesPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import SectionPlaceholder from './pages/SectionPlaceholder.jsx'
import UsersPage from './pages/UsersPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import { getRoleLabel } from './utils/auth.js'
import sections from './utils/sections.js'
import './App.css'

const mainNavigation = [
  { path: '/dashboard', label: 'Inicio', icon: Home },
  { path: '/productos', label: 'Productos', icon: PackagePlus },
  { path: '/inventario', label: 'Inventario', icon: Boxes },
  { path: '/reportes', label: 'Reporte', icon: BarChart3 },
  { path: '/perfil', label: 'Perfil', icon: UserRound },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
]

const additionalSections = sections.filter(
  ({ path }) => !mainNavigation.some((item) => item.path === path),
)

function SectionApp() {
  const { authError, logout, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const visibleMainNavigation = mainNavigation.filter(
    ({ path }) => path !== '/reportes' || isAdmin,
  )
  const visibleAdditionalSections = additionalSections.filter(({ path }) => {
    if (['/categorias', '/usuarios', '/empleados'].includes(path)) return isAdmin
    return true
  })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          className="dashboard-sidebar-brand"
          to="/menu"
          aria-label="Mini Súper, menú principal"
        >
          <MiniSuperLogo compact />
        </Link>

        <nav className="main-navigation" aria-label="Secciones principales">
          <span className="navigation-label">MENÚ PRINCIPAL</span>
          {visibleMainNavigation.map(({ path, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-link${isActive ? ' active' : ''}`
              }
              aria-label={label}
              key={path}
              to={path}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          <NavLink
            className={({ isActive }) =>
              `navigation-link${isActive ? ' active' : ''}`
            }
            aria-label="Menú principal"
            to="/menu"
          >
            <LayoutDashboard size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>Menú principal</span>
          </NavLink>
          <span className="navigation-label additional-navigation-label">
            OTRAS SECCIONES
          </span>
          {visibleAdditionalSections.map(({ path, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-link${isActive ? ' active' : ''}`
              }
              aria-label={label}
              key={path}
              to={path}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              className={({ isActive }) =>
                `navigation-link${isActive ? ' active' : ''}`
              }
              aria-label="Registrar producto"
              to="/registrar-producto"
            >
              <PackagePlus size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>Registrar producto</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-account">
          <div className="sidebar-account-identity">
            <ProfileAvatar
              className="sidebar-account-avatar"
              photo={user.preferences?.profilePhoto}
              username={user.username}
            />
            <strong>{user.username}</strong>
          </div>
          <span>{getRoleLabel(user)}</span>
          <Link
            aria-label="Cerrar sesión"
            className="sidebar-logout"
            onClick={(event) => {
              event.preventDefault()
              void logout()
            }}
            to="/login"
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </Link>
        </div>
      </aside>

      <main className="main-content dashboard-main-content">
        {authError && <p className="auth-message error-message" role="alert">{authError}</p>}
        <header className="dashboard-topbar">
          <Link
            aria-label="Buscar productos"
            className="dashboard-topbar-icon"
            to="/productos"
          >
            <Search size={20} aria-hidden="true" />
          </Link>
          <Link
            aria-label={`Perfil de ${user.username}`}
            className="dashboard-topbar-icon"
            to="/perfil"
          >
            <ProfileAvatar
              className="topbar-profile-avatar"
              photo={user.preferences?.profilePhoto}
              username={user.username}
            />
          </Link>
        </header>
        <Routes>
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<InventoryPage />} path="/inventario" />
          <Route element={<ProductDetailsPage />} path="/productos/:productId" />
          <Route element={<ProductsPage />} path="/productos" />
          <Route element={<AdminRoute><RegisterProductPage /></AdminRoute>} path="/registrar-producto" />
          <Route element={<ProfilePage />} path="/perfil" />
          <Route element={<AdminRoute><ReportsPage /></AdminRoute>} path="/reportes" />
          <Route element={<AdminRoute><CategoriesPage /></AdminRoute>} path="/categorias" />
          <Route element={<AdminRoute><UsersPage /></AdminRoute>} path="/usuarios" />
          <Route element={<AdminRoute><EmployeesPage /></AdminRoute>} path="/empleados" />
          <Route element={<SalesPage />} path="/ventas" />
          <Route element={<SettingsPage />} path="/configuracion" />
          {sections
            .filter(
              (section) =>
                section.path !== '/productos' &&
                section.path !== '/reportes' &&
                section.path !== '/inventario' &&
                section.path !== '/ventas' &&
                section.path !== '/configuracion' &&
                section.path !== '/categorias' &&
                section.path !== '/usuarios' &&
                section.path !== '/empleados',
            )
            .map((section) => (
            <Route
              element={<SectionPlaceholder section={section} />}
              key={section.path}
              path={section.path}
            />
            ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function ProtectedSectionApp() {
  const { authLoading, user } = useAuth()
  if (authLoading) return null
  return user ? <SectionApp /> : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />
}

function ProtectedMenuPage() {
  const { authLoading, user } = useAuth()
  if (authLoading) return null
  return user ? <MainMenuPage /> : <Navigate to="/login" replace />
}

function WelcomeRoute() {
  const { authLoading, user } = useAuth()
  if (authLoading) return null
  return user ? <Navigate to="/menu" replace /> : <WelcomePage />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomeRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/menu" element={<ProtectedMenuPage />} />
          <Route path="/*" element={<ProtectedSectionApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
