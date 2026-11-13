import { Check, RotateCcw, Sun, Moon, Monitor, ImagePlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import useAuth from '../hooks/useAuth.js'
import { PALETTES } from '../utils/appearance.js'

const themes = [
  { id: 'light', name: 'Claro', description: 'Interfaz luminosa', icon: Sun },
  { id: 'dark', name: 'Oscuro', description: 'Interfaz de baja luz', icon: Moon },
  { id: 'system', name: 'Automático', description: 'Preferencia del dispositivo', icon: Monitor },
]

function SettingsPage() {
  const { updatePreferences, user } = useAuth()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const preferences = user.preferences ?? { theme: 'light', palette: 'red' }

  function savePreference(update, successMessage) {
    try {
      updatePreferences(update)
      setNotice(successMessage)
      setError('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la preferencia.')
      setNotice('')
    }
  }

  function resetAppearance() {
    const confirmed = window.confirm(
      '¿Restablecer el tema claro y la paleta roja original? La fotografía y los datos de perfil se conservarán.',
    )
    if (!confirmed) return
    savePreference({ theme: 'light', palette: 'red' }, 'Apariencia restablecida. Tu fotografía se conservó.')
  }

  return (
    <section className="settings-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">PREFERENCIAS DE CUENTA</p>
          <h1>Configuración</h1>
        </div>
      </header>

      {notice && <p className="products-feedback success-message" role="status">{notice}</p>}
      {error && <p className="products-feedback error-message" role="alert">{error}</p>}

      <section className="settings-section" aria-labelledby="settings-profile-title">
        <header className="settings-section-heading">
          <span className="settings-section-number">01</span>
          <div>
            <h2 id="settings-profile-title">Perfil y fotografía</h2>
            <p>Personaliza la imagen que identifica tu cuenta.</p>
          </div>
        </header>
        <div className="settings-profile-row">
          <ProfileAvatar
            className="settings-profile-avatar"
            photo={preferences.profilePhoto}
            username={user.username}
          />
          <div className="settings-profile-copy">
            <strong>{user.username}</strong>
            <span>{preferences.profilePhoto ? 'Fotografía personalizada' : 'Avatar predeterminado'}</span>
          </div>
          <Link className="secondary-button" to="/perfil">
            <ImagePlus size={16} aria-hidden="true" /> Editar fotografía
          </Link>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-theme-title">
        <header className="settings-section-heading">
          <span className="settings-section-number">02</span>
          <div>
            <h2 id="settings-theme-title">Apariencia</h2>
            <p>Elige cómo se presenta Mini Súper en esta cuenta.</p>
          </div>
        </header>
        <div className="theme-choice-grid" role="group" aria-label="Modo de visualización">
          {themes.map(({ id, name, description, icon: Icon }) => (
            <button
              aria-pressed={preferences.theme === id}
              className={`theme-choice${preferences.theme === id ? ' selected' : ''}`}
              key={id}
              onClick={() => savePreference({ theme: id }, `Modo ${name.toLowerCase()} guardado.`)}
              type="button"
            >
              <span className="theme-choice-icon"><Icon size={20} aria-hidden="true" /></span>
              <span className="theme-choice-copy"><strong>{name}</strong><small>{description}</small></span>
              {preferences.theme === id && <Check className="theme-choice-check" size={17} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-palette-title">
        <header className="settings-section-heading">
          <span className="settings-section-number">03</span>
          <div>
            <h2 id="settings-palette-title">Paleta de colores</h2>
            <p>El acento elegido se aplica a botones, enlaces y estados seleccionados.</p>
          </div>
        </header>
        <div className="palette-grid" role="group" aria-label="Paleta de colores">
          {PALETTES.map((palette) => (
            <button
              aria-pressed={preferences.palette === palette.id}
              className={`palette-choice${preferences.palette === palette.id ? ' selected' : ''}`}
              key={palette.id}
              onClick={() => savePreference({ palette: palette.id }, `Paleta ${palette.name.toLowerCase()} aplicada.`)}
              style={{ '--palette-preview': palette.primary, '--palette-soft': palette.soft }}
              type="button"
            >
              <span className="palette-choice-topline">
                <span className="palette-swatches" aria-hidden="true">
                  {palette.swatches.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                </span>
                {preferences.palette === palette.id && <Check size={17} aria-hidden="true" />}
              </span>
              <strong>{palette.name}</strong>
              <span className="palette-mini-preview" aria-hidden="true">
                <i>Botón</i><b /><em />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section settings-reset-section" aria-labelledby="settings-reset-title">
        <header className="settings-section-heading">
          <span className="settings-section-number">04</span>
          <div>
            <h2 id="settings-reset-title">Restablecer apariencia</h2>
            <p>Vuelve al tema claro y a la paleta roja original. La foto y tus datos personales no cambian.</p>
          </div>
        </header>
        <button className="secondary-button settings-reset-button" onClick={resetAppearance} type="button">
          <RotateCcw size={17} aria-hidden="true" /> Restablecer apariencia
        </button>
      </section>
    </section>
  )
}

export default SettingsPage
