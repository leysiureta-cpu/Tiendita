import {
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Search,
  UserRoundCheck,
  UserRoundPlus,
  UserRoundX,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  createEmployee,
  getEmployee,
  getEmployees,
  resetEmployeePassword,
  updateEmployee,
} from '../utils/api.js'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' })

function formatRegistrationDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

function EmployeesPage() {
  const [employeesState, setEmployeesState] = useState({
    employees: [],
    loading: true,
    error: '',
  })
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formState, setFormState] = useState(null)
  const [formError, setFormError] = useState('')
  const [detailsState, setDetailsState] = useState({
    open: false,
    employee: null,
    loading: false,
    error: '',
  })
  const detailsRequest = useRef(0)
  const [savingEmployeeId, setSavingEmployeeId] = useState(null)
  const [savingForm, setSavingForm] = useState(false)
  const [passwordResetState, setPasswordResetState] = useState(null)
  const [passwordResetError, setPasswordResetError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(async () => {
      setEmployeesState((current) => ({ ...current, loading: true, error: '' }))
      try {
        const employees = await getEmployees(search)
        if (active) setEmployeesState({ employees, loading: false, error: '' })
      } catch (error) {
        if (active) {
          setEmployeesState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error
              ? error.message
              : 'No se pudieron cargar los empleados.',
          }))
        }
      }
    }, search.trim() ? 200 : 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [reloadKey, search])

  function openCreateForm() {
    setFormState({ employee: null, form: emptyForm })
    setFormError('')
    setActionError('')
  }

  function openEditForm(employee) {
    setFormState({
      employee,
      form: { ...emptyForm, name: employee.name, email: employee.email },
    })
    setFormError('')
    setActionError('')
  }

  function openPasswordReset(employee) {
    setPasswordResetState({
      employee,
      password: '',
      password_confirmation: '',
    })
    setPasswordResetError('')
    setActionError('')
  }

  function handleFormChange(event) {
    const { name, value } = event.target
    setFormState((current) => ({
      ...current,
      form: { ...current.form, [name]: value },
    }))
    setFormError('')
  }

  async function handleFormSubmit(event) {
    event.preventDefault()
    if (!formState || savingForm) return

    setFormError('')
    setActionError('')
    const { employee, form } = formState
    const details = {
      name: form.name.trim(),
      email: form.email.trim(),
    }
    if (!employee) {
      details.password = form.password
      details.password_confirmation = form.password_confirmation
    }

    setSavingForm(true)
    try {
      if (employee) {
        await updateEmployee(employee.id, details)
        setNotice('Los datos del empleado se actualizaron correctamente.')
      } else {
        await createEmployee(details)
        setNotice('El empleado se registró correctamente.')
      }
      setFormState(null)
      setReloadKey((current) => current + 1)
    } catch (error) {
      setFormError(error instanceof Error
        ? error.message
        : 'No se pudo guardar el empleado.')
    } finally {
      setSavingForm(false)
    }
  }

  async function handlePasswordResetSubmit(event) {
    event.preventDefault()
    if (!passwordResetState || savingPassword) return

    setPasswordResetError('')
    setSavingPassword(true)
    try {
      await resetEmployeePassword(passwordResetState.employee.id, {
        password: passwordResetState.password,
        password_confirmation: passwordResetState.password_confirmation,
      })
      setNotice(`Se restableció la contraseña de ${passwordResetState.employee.name}.`)
      setPasswordResetState(null)
    } catch (error) {
      setPasswordResetError(error instanceof Error
        ? error.message
        : 'No se pudo restablecer la contraseña.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function showDetails(employee) {
    const requestId = detailsRequest.current + 1
    detailsRequest.current = requestId
    setDetailsState({ open: true, employee: null, loading: true, error: '' })
    try {
      const details = await getEmployee(employee.id)
      if (detailsRequest.current === requestId) {
        setDetailsState({ open: true, employee: details, loading: false, error: '' })
      }
    } catch (error) {
      if (detailsRequest.current === requestId) {
        setDetailsState({
          open: true,
          employee: null,
          loading: false,
          error: error instanceof Error
            ? error.message
            : 'No se pudieron consultar los detalles.',
        })
      }
    }
  }

  function closeDetails() {
    detailsRequest.current += 1
    setDetailsState((current) => ({ ...current, open: false }))
  }

  async function toggleEmployeeStatus(employee) {
    setSavingEmployeeId(employee.id)
    setActionError('')
    setNotice('')
    try {
      await updateEmployee(employee.id, { active: !employee.active })
      setNotice(
        employee.active
          ? 'La cuenta del empleado se desactivó.'
          : 'La cuenta del empleado se activó.',
      )
      setReloadKey((current) => current + 1)
    } catch (error) {
      setActionError(error instanceof Error
        ? error.message
        : 'No se pudo actualizar el estado del empleado.')
    } finally {
      setSavingEmployeeId(null)
    }
  }

  const { employees, loading, error: loadError } = employeesState

  return (
    <section className="products-page employees-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">ADMINISTRACIÓN DE EMPLEADOS</p>
          <h1>Administración de empleados</h1>
        </div>
        <button className="primary-button products-add-button" onClick={openCreateForm} type="button">
          <Plus size={18} aria-hidden="true" />
          Registrar empleado
        </button>
      </header>

      <div className="products-toolbar employees-toolbar">
        <label className="products-search employees-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Buscar empleados por nombre o correo"
            onChange={(event) => {
              setSearch(event.target.value)
              setNotice('')
              setActionError('')
            }}
            placeholder="Buscar por nombre o correo"
            type="search"
            value={search}
          />
        </label>
      </div>

      {(loadError || actionError) && (
        <p className="products-feedback error-message" role="alert">
          {loadError || actionError}
        </p>
      )}
      {notice && <p className="products-feedback success-message" role="status">{notice}</p>}

      <div className="products-table-wrap">
        <table className="products-table employees-table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nombre</th>
              <th scope="col">Correo electrónico</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Fecha de registro</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7">Cargando empleados…</td></tr>
            ) : employees.length ? (
              employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.id}</td>
                  <td>{employee.name}</td>
                  <td>{employee.email}</td>
                  <td>{employee.roleName}</td>
                  <td>
                    <span className={`employee-status${employee.active ? '' : ' inactive'}`}>
                      {employee.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>{formatRegistrationDate(employee.registeredAt)}</td>
                  <td>
                    <div className="product-row-actions">
                      <button
                        aria-label={`Ver detalles de ${employee.name}`}
                        className="product-icon-button"
                        onClick={() => void showDetails(employee)}
                        type="button"
                      >
                        <Eye size={17} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Editar ${employee.name}`}
                        className="product-icon-button"
                        onClick={() => openEditForm(employee)}
                        type="button"
                      >
                        <Pencil size={17} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Restablecer contraseña de ${employee.name}`}
                        className="product-icon-button"
                        onClick={() => openPasswordReset(employee)}
                        type="button"
                      >
                        <KeyRound size={17} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`${employee.active ? 'Desactivar' : 'Activar'} ${employee.name}`}
                        className="product-icon-button"
                        disabled={savingEmployeeId !== null}
                        onClick={() => void toggleEmployeeStatus(employee)}
                        type="button"
                      >
                        {employee.active
                          ? <UserRoundX size={17} aria-hidden="true" />
                          : <UserRoundCheck size={17} aria-hidden="true" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">
                  {loadError
                    ? 'No se pudieron cargar los empleados.'
                    : search.trim()
                      ? 'No se encontraron empleados.'
                      : 'No hay empleados registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formState && (
        <div className="product-dialog-backdrop" onClick={() => setFormState(null)}>
          <section
            aria-labelledby="employee-form-title"
            aria-modal="true"
            className="product-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="product-dialog-header">
              <h2 id="employee-form-title">
                {formState.employee ? 'Editar empleado' : 'Registrar empleado'}
              </h2>
              <button
                aria-label="Cerrar formulario"
                className="product-dialog-close"
                onClick={() => setFormState(null)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <form className="product-edit-form" onSubmit={handleFormSubmit}>
              <label>
                <span>Nombre</span>
                <input
                  autoComplete="name"
                  maxLength={255}
                  name="name"
                  onChange={handleFormChange}
                  required
                  value={formState.form.name}
                />
              </label>
              <label>
                <span>Correo electrónico</span>
                <input
                  autoComplete="email"
                  name="email"
                  onChange={handleFormChange}
                  required
                  type="email"
                  value={formState.form.email}
                />
              </label>
              {!formState.employee && (
                <>
                  <label>
                    <span>Contraseña inicial</span>
                    <input
                      autoComplete="new-password"
                      minLength={8}
                      name="password"
                      onChange={handleFormChange}
                      required
                      type="password"
                      value={formState.form.password}
                    />
                  </label>
                  <label>
                    <span>Confirmar contraseña</span>
                    <input
                      autoComplete="new-password"
                      minLength={8}
                      name="password_confirmation"
                      onChange={handleFormChange}
                      required
                      type="password"
                      value={formState.form.password_confirmation}
                    />
                  </label>
                </>
              )}
              {formError && <p className="products-feedback error-message" role="alert">{formError}</p>}
              <div className="product-dialog-actions">
                <button className="secondary-button" onClick={() => setFormState(null)} type="button">
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  {formState.employee
                    ? <Pencil size={16} aria-hidden="true" />
                    : <UserRoundPlus size={16} aria-hidden="true" />}
                  {formState.employee ? 'Guardar cambios' : 'Registrar empleado'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detailsState.open && (
        <div className="product-dialog-backdrop" onClick={closeDetails}>
          <section
            aria-labelledby="employee-details-title"
            aria-modal="true"
            className="product-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="product-dialog-header">
              <h2 id="employee-details-title">Detalles del empleado</h2>
              <button
                aria-label="Cerrar detalles"
                className="product-dialog-close"
                onClick={closeDetails}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            {detailsState.loading && <p>Cargando detalles…</p>}
            {detailsState.error && <p className="products-feedback error-message" role="alert">{detailsState.error}</p>}
            {detailsState.employee && (
              <dl className="product-detail-list">
                <div><dt>ID</dt><dd>{detailsState.employee.id}</dd></div>
                <div><dt>Nombre</dt><dd>{detailsState.employee.name}</dd></div>
                <div><dt>Correo electrónico</dt><dd>{detailsState.employee.email}</dd></div>
                <div><dt>Rol</dt><dd>{detailsState.employee.roleName}</dd></div>
                <div><dt>Estado</dt><dd>{detailsState.employee.active ? 'Activa' : 'Inactiva'}</dd></div>
                <div>
                  <dt>Fecha de registro</dt>
                  <dd>{formatRegistrationDate(detailsState.employee.registeredAt)}</dd>
                </div>
              </dl>
            )}
          </section>
        </div>
      )}

      {passwordResetState && (
        <div className="product-dialog-backdrop" onClick={() => setPasswordResetState(null)}>
          <section
            aria-labelledby="employee-password-title"
            aria-modal="true"
            className="product-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="product-dialog-header">
              <h2 id="employee-password-title">Restablecer contraseña</h2>
              <button
                aria-label="Cerrar restablecimiento de contraseña"
                className="product-dialog-close"
                onClick={() => setPasswordResetState(null)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <form className="product-edit-form" onSubmit={handlePasswordResetSubmit}>
              <p>Define una nueva contraseña para {passwordResetState.employee.name}. No se muestra la contraseña anterior.</p>
              <label>
                <span>Nueva contraseña</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPasswordResetState((current) => ({
                    ...current,
                    password: event.target.value,
                  }))}
                  required
                  type="password"
                  value={passwordResetState.password}
                />
              </label>
              <label>
                <span>Confirmar nueva contraseña</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPasswordResetState((current) => ({
                    ...current,
                    password_confirmation: event.target.value,
                  }))}
                  required
                  type="password"
                  value={passwordResetState.password_confirmation}
                />
              </label>
              {passwordResetError && (
                <p className="products-feedback error-message" role="alert">{passwordResetError}</p>
              )}
              <div className="product-dialog-actions">
                <button
                  className="secondary-button"
                  disabled={savingPassword}
                  onClick={() => setPasswordResetState(null)}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="primary-button" disabled={savingPassword} type="submit">
                  <KeyRound size={16} aria-hidden="true" />
                  {savingPassword ? 'Restableciendo…' : 'Restablecer contraseña'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default EmployeesPage
