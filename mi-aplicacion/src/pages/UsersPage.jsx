import { Pencil, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import useAuth from '../hooks/useAuth.js'
import {
  createManagedUser,
  getManagedUsers,
  getRoles,
  updateManagedUser,
} from '../utils/api.js'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  roleId: '',
  active: true,
}

function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getManagedUsers(), getRoles()])
      .then(([userItems, roleItems]) => {
        if (active) {
          setUsers(userItems)
          setRoles(roleItems)
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los usuarios.')
      })

    return () => {
      active = false
    }
  }, [])

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setError('')
    setNotice('')
  }

  function startEditing(account) {
    setEditingUser(account)
    setForm({
      name: account.name,
      email: account.email,
      password: '',
      password_confirmation: '',
      roleId: String(account.roleId),
      active: account.active,
    })
    setError('')
    setNotice('')
  }

  function resetForm() {
    setEditingUser(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    const details = {
      name: form.name.trim(),
      email: form.email.trim(),
      roleId: Number(form.roleId),
      active: form.active,
    }
    if (form.password) {
      details.password = form.password
      details.password_confirmation = form.password_confirmation
    }

    try {
      let savedUser
      if (editingUser) {
        savedUser = await updateManagedUser(editingUser.id, details)
        setNotice('La cuenta se actualizó correctamente.')
      } else {
        if (!form.password) {
          setError('Define una contraseña de al menos 8 caracteres.')
          return
        }
        details.password = form.password
        details.password_confirmation = form.password_confirmation
        savedUser = await createManagedUser(details)
        setNotice('La cuenta se creó correctamente.')
      }
      setUsers((current) => {
        const next = editingUser
          ? current.map((account) => account.id === savedUser.id ? savedUser : account)
          : [...current, savedUser]
        return next.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      })
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error
        ? saveError.message
        : 'No se pudo guardar la cuenta.')
    }
  }

  return (
    <section className="users-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">ADMINISTRACIÓN DE ACCESOS</p>
          <h1>Usuarios y roles</h1>
        </div>
      </header>

      <form className="register-product-form user-editor-form" onSubmit={handleSubmit}>
        <h2>{editingUser ? 'Editar cuenta' : 'Registrar empleado'}</h2>
        <label>
          <span>Nombre</span>
          <input maxLength={255} name="name" onChange={handleChange} required value={form.name} />
        </label>
        <label>
          <span>Correo electrónico</span>
          <input autoComplete="email" name="email" onChange={handleChange} required type="email" value={form.email} />
        </label>
        <label>
          <span>{editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}</span>
          <input
            autoComplete="new-password"
            minLength={8}
            name="password"
            onChange={handleChange}
            required={!editingUser}
            type="password"
            value={form.password}
          />
        </label>
        {form.password && (
          <label>
            <span>Confirmar contraseña</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="password_confirmation"
              onChange={handleChange}
              required
              type="password"
              value={form.password_confirmation}
            />
          </label>
        )}
        <label>
          <span>Rol</span>
          <select
            disabled={Boolean(editingUser && Number(editingUser.id) === Number(currentUser.id))}
            name="roleId"
            onChange={handleChange}
            required
            value={form.roleId}
          >
            <option value="">Selecciona un rol</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
          </select>
        </label>
        <label className="user-active-toggle">
          <input
            checked={form.active}
            disabled={Boolean(editingUser && Number(editingUser.id) === Number(currentUser.id))}
            name="active"
            onChange={handleChange}
            type="checkbox"
          />
          Cuenta activa
        </label>
        {error && <p className="products-feedback error-message" role="alert">{error}</p>}
        {notice && <p className="products-feedback success-message" role="status">{notice}</p>}
        <div className="product-dialog-actions">
          {editingUser && <button className="secondary-button" onClick={resetForm} type="button">Cancelar</button>}
          <button className="primary-button" type="submit">
            <UserPlus size={17} aria-hidden="true" />
            {editingUser ? 'Guardar cambios' : 'Registrar cuenta'}
          </button>
        </div>
      </form>

      <div className="products-table-wrap">
        <table className="products-table">
          <thead>
            <tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr>
          </thead>
          <tbody>
            {users.map((account) => (
              <tr key={account.id}>
                <td>{account.name}</td>
                <td>{account.email}</td>
                <td>{account.roleName}</td>
                <td>{account.active ? 'Activa' : 'Inactiva'}</td>
                <td>
                  <button
                    aria-label={`Editar ${account.name}`}
                    className="product-icon-button"
                    onClick={() => startEditing(account)}
                    type="button"
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && <tr><td colSpan="5">No hay cuentas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default UsersPage
