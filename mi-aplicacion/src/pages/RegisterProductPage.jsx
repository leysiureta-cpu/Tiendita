import { CheckCircle2, PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, saveProducts } from '../utils/dashboardData.js'

const categories = ['Bebidas', 'Botanas', 'Lácteos', 'Panadería']
const emptyForm = {
  name: '',
  category: '',
  price: '',
  stock: '',
}

function createProductId(products) {
  if (typeof window.crypto?.randomUUID !== 'function') {
    throw new Error('Este navegador no permite generar un ID seguro para el producto.')
  }

  let id
  do {
    id = window.crypto.randomUUID()
  } while (products.some((product) => String(product.id) === id))

  return id
}

function RegisterProductPage() {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setSuccess('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const name = form.name.trim()
    const price = Number(form.price)
    const stock = Number(form.stock)

    if (
      !name ||
      !categories.includes(form.category) ||
      form.price === '' ||
      form.stock === ''
    ) {
      setError('Completa todos los campos para registrar el producto.')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('El precio debe ser un número mayor que cero.')
      return
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError('El stock debe ser un número entero igual o mayor que cero.')
      return
    }

    try {
      const products = getProducts()
      const product = {
        id: createProductId(products),
        name,
        category: form.category,
        price,
        stock,
      }

      saveProducts([...products, product])
      setForm(emptyForm)
      setSuccess(`Producto registrado correctamente. ID: ${product.id}`)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo registrar el producto. Inténtalo nuevamente.',
      )
    }
  }

  return (
    <section className="register-product-page">
      <div className="register-product-card">
        <span className="register-product-icon" aria-hidden="true">
          <PackagePlus size={27} strokeWidth={1.8} />
        </span>
        <p className="products-eyebrow">INVENTARIO</p>
        <h1>Registrar producto</h1>
        <p className="register-product-description">
          Agrega un producto al inventario de Mini Súper.
        </p>

        {success && (
          <p className="register-product-feedback success-message" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{success}</span>
          </p>
        )}
        {error && (
          <p className="register-product-feedback error-message" role="alert">
            {error}
          </p>
        )}

        <form className="register-product-form" noValidate onSubmit={handleSubmit}>
          <label>
            <span>Nombre del producto</span>
            <input
              autoComplete="off"
              maxLength={120}
              name="name"
              onChange={handleChange}
              placeholder="Ej. Agua natural"
              required
              value={form.name}
            />
          </label>

          <label>
            <span>Catálogo o categoría</span>
            <select
              name="category"
              onChange={handleChange}
              required
              value={form.category}
            >
              <option disabled value="">
                Selecciona una categoría
              </option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="register-product-number-fields">
            <label>
              <span>Precio</span>
              <input
                min="0.01"
                name="price"
                onChange={handleChange}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={form.price}
              />
            </label>
            <label>
              <span>Stock</span>
              <input
                min="0"
                name="stock"
                onChange={handleChange}
                placeholder="0"
                required
                step="1"
                type="number"
                value={form.stock}
              />
            </label>
          </div>

          <button className="register-product-submit" type="submit">
            Guardar
          </button>
        </form>

        <Link className="register-product-back-link" to="/productos">
          Volver a consultar productos
        </Link>
      </div>
    </section>
  )
}

export default RegisterProductPage
