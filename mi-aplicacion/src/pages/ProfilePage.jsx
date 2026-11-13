import { Camera, ImagePlus, LogOut, Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import ProfilePhotoEditor from '../components/ProfilePhotoEditor.jsx'
import useAuth from '../hooks/useAuth.js'
import { isAdmin } from '../utils/auth.js'

const MAX_PROFILE_PHOTO_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function ProfilePage() {
  const { logout, updatePreferences, user } = useAuth()
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  function handleSelectPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setNotice('')
    setError('')
    const extension = file.name.split('.').pop()?.toLowerCase()
    const extensionIsSupported = ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
    const mimeTypeIsSupported = ACCEPTED_PROFILE_PHOTO_TYPES.includes(file.type) ||
      (file.type === 'image/jpg' && ['jpg', 'jpeg'].includes(extension))
    if (!mimeTypeIsSupported && !(file.type === '' && extensionIsSupported)) {
      setError('Elige una imagen JPG, JPEG, PNG o WEBP.')
      return
    }
    if (file.size > MAX_PROFILE_PHOTO_FILE_SIZE) {
      setError('La imagen supera el límite de 10 MB. Selecciona un archivo más ligero.')
      return
    }
    setSelectedFile(file)
  }

  async function handleSavePhoto({ dataUrl, crop }) {
    try {
      updatePreferences({ profilePhoto: dataUrl, photoCrop: crop })
      setSelectedFile(null)
      setNotice('La fotografía de perfil se guardó correctamente.')
      setError('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la fotografía.')
    }
  }

  function removePhoto() {
    try {
      updatePreferences({ profilePhoto: null, photoCrop: null })
      setNotice('Se quitó la fotografía. Se muestra el avatar predeterminado.')
      setError('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo quitar la fotografía.')
    }
  }

  return (
    <section className="profile-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">CUENTA</p>
          <h1>Perfil de usuario</h1>
        </div>
      </header>

      <article className="profile-card">
        <ProfileAvatar
          className="profile-avatar-large"
          photo={user.preferences?.profilePhoto}
          username={user.username}
        />
        <h2>{user.username}</h2>
        <p className="profile-role">{isAdmin(user) ? 'Administrador' : 'Usuario'}</p>
        <section className="profile-photo-settings">
          <div>
            <h3>Fotografía de perfil</h3>
            <p>JPG, JPEG, PNG o WEBP · hasta 10 MB antes de optimizar</p>
          </div>
          <div className="profile-photo-actions">
            <input
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="visually-hidden"
              onChange={handleSelectPhoto}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {user.preferences?.profilePhoto ? <Camera size={17} /> : <ImagePlus size={17} />}
              {user.preferences?.profilePhoto ? 'Cambiar fotografía' : 'Subir fotografía'}
            </button>
            {user.preferences?.profilePhoto && (
              <button className="danger-button" onClick={removePhoto} type="button">
                <Trash2 size={16} aria-hidden="true" /> Quitar fotografía
              </button>
            )}
          </div>
        </section>
        {notice && <p className="products-feedback success-message" role="status">{notice}</p>}
        {error && <p className="products-feedback error-message" role="alert">{error}</p>}
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
      {selectedFile && (
        <ProfilePhotoEditor
          file={selectedFile}
          onCancel={() => setSelectedFile(null)}
          onSave={handleSavePhoto}
        />
      )}
    </section>
  )
}

export default ProfilePage
