import { X } from 'lucide-react'
import { useState } from 'react'

function ProductDialog({ mode, onClose, onSave, product }) {
  const [form, setForm] = useState({
    name: product.name ?? '',
    category: product.category ?? '',
    price: product.price ?? '',
    stock: product.stock ?? '',
  })
  const [error, setError] = useState('')
  const isEditing = mode === 'edit'

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    try {
      onSave({
        ...product,
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo actualizar el producto.',
      )
    }
  }

  return (
    <div className="product-dialog-backdrop">
      <section
        aria-labelledby="product-dialog-title"
        aria-modal="true"
        className="product-dialog"
        role="dialog"
      >
        <header className="product-dialog-header">
          <div>
            <p className="products-eyebrow">
              {isEditing ? 'ACTUALIZACIÓN' : 'DETALLE'}
            </p>
            <h2 id="product-dialog-title">
              {isEditing ? 'Editar producto' : product.name}
            </h2>
          </div>
          <button
            aria-label="Cerrar"
            className="product-dialog-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {isEditing ? (
          <form className="product-edit-form" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input
                autoFocus
                name="name"
                onChange={handleChange}
                required
                value={form.name}
              />
            </label>
            <label>
              Categoría
              <input
                name="category"
                onChange={handleChange}
                required
                value={form.category}
              />
            </label>
            <label>
              Precio
              <input
                min="0.01"
                name="price"
                onChange={handleChange}
                required
                step="0.01"
                type="number"
                value={form.price}
              />
            </label>
            <label>
              Stock
              <input
                min="0"
                name="stock"
                onChange={handleChange}
                required
                step="1"
                type="number"
                value={form.stock}
              />
            </label>
            {error && (
              <p className="products-feedback error-message" role="alert">
                {error}
              </p>
            )}
            <div className="product-dialog-actions">
              <button className="secondary-button" onClick={onClose} type="button">
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="product-detail-list">
              <div>
                <dt>ID</dt>
                <dd>{product.id ?? '—'}</dd>
              </div>
              <div>
                <dt>Nombre</dt>
                <dd>{product.name}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{product.category || 'Sin categoría'}</dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd>{product.price}</dd>
              </div>
              <div>
                <dt>Stock</dt>
                <dd>{product.stock}</dd>
              </div>
            </dl>
            <div className="product-dialog-actions">
              <button className="secondary-button" onClick={onClose} type="button">
                Cerrar
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default ProductDialog
