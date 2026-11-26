import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../utils/api.js'

function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getCategories()
      .then((items) => {
        if (active) setCategories(items)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar las categorías.')
      })

    return () => {
      active = false
    }
  }, [])

  function startEditing(category) {
    setCategoryId(category.id)
    setName(category.name)
    setDescription(category.description ?? '')
    setError('')
    setNotice('')
  }

  function resetForm() {
    setCategoryId(null)
    setName('')
    setDescription('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    try {
      const category = { name: name.trim(), description: description.trim() || null }
      const savedCategory = categoryId === null
        ? await createCategory(category)
        : await updateCategory(categoryId, category)
      setCategories((current) => {
        const next = categoryId === null
          ? [...current, savedCategory]
          : current.map((item) => item.id === savedCategory.id ? savedCategory : item)
        return next.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      })
      resetForm()
      setNotice(categoryId === null
        ? 'La categoría se registró correctamente.'
        : 'La categoría se actualizó correctamente.')
    } catch (saveError) {
      setError(saveError instanceof Error
        ? saveError.message
        : 'No se pudo guardar la categoría.')
    }
  }

  async function handleDelete(category) {
    setError('')
    setNotice('')
    try {
      await deleteCategory(category.id)
      setCategories((current) => current.filter((item) => item.id !== category.id))
      if (categoryId === category.id) resetForm()
      setNotice('La categoría se eliminó correctamente.')
    } catch (deleteError) {
      setError(deleteError instanceof Error
        ? deleteError.message
        : 'No se pudo eliminar la categoría.')
    }
  }

  return (
    <section className="categories-page">
      <header className="products-page-heading">
        <div>
          <p className="products-eyebrow">ADMINISTRACIÓN DEL CATÁLOGO</p>
          <h1><Tags size={25} aria-hidden="true" /> Categorías</h1>
        </div>
      </header>

      <form className="register-product-form category-editor-form" onSubmit={handleSubmit}>
        <h2>{categoryId === null ? 'Registrar categoría' : 'Editar categoría'}</h2>
        <label>
          <span>Nombre</span>
          <input
            maxLength={255}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label>
          <span>Descripción</span>
          <textarea
            maxLength={5000}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            value={description}
          />
        </label>
        {error && <p className="products-feedback error-message" role="alert">{error}</p>}
        {notice && <p className="products-feedback success-message" role="status">{notice}</p>}
        <div className="product-dialog-actions">
          {categoryId !== null && (
            <button className="secondary-button" onClick={resetForm} type="button">Cancelar</button>
          )}
          <button className="primary-button" type="submit">
            <Plus size={17} aria-hidden="true" />
            {categoryId === null ? 'Registrar' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <div className="products-table-wrap">
        <table className="products-table">
          <thead>
            <tr><th scope="col">Categoría</th><th scope="col">Descripción</th><th scope="col">Acciones</th></tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.description || '—'}</td>
                <td>
                  <div className="product-row-actions">
                    <button
                      aria-label={`Editar ${category.name}`}
                      className="product-icon-button"
                      onClick={() => startEditing(category)}
                      type="button"
                    >
                      <Pencil size={17} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`Eliminar ${category.name}`}
                      className="product-icon-button delete"
                      onClick={() => void handleDelete(category)}
                      type="button"
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length && <tr><td colSpan="3">No hay categorías registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default CategoriesPage
