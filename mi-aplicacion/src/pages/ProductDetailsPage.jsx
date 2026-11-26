import { ArrowLeft, PackageOpen, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import ProductDialog from '../components/ProductDialog.jsx'
import { deleteProduct, getProducts, updateProduct } from '../utils/api.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

function ProductDetailsPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [productState, setProductState] = useState({ products: [], error: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { products, error } = productState
  const product = products.find(
    (item) => String(item.id) === String(productId),
  )

  useEffect(() => {
    let active = true
    async function refreshProducts() {
      try {
        const nextProducts = await getProducts()
        if (active) setProductState({ products: nextProducts, error: '' })
      } catch (loadError) {
        if (active) {
          setProductState({
            products: [],
            error: loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar los productos.',
          })
        }
      }
    }

    void refreshProducts()
    window.addEventListener('focus', refreshProducts)
    return () => {
      active = false
      window.removeEventListener('focus', refreshProducts)
    }
  }, [])

  async function handleSave(updatedProduct) {
    const savedProduct = await updateProduct(productId, {
      name: updatedProduct.name,
      categoryId: updatedProduct.categoryId,
      price: updatedProduct.price,
      stock: updatedProduct.stock,
    })
    const nextProducts = products.map((item) =>
      String(item.id) === String(savedProduct.id) ? savedProduct : item,
    )
    setProductState({ products: nextProducts, error: '' })
    setIsEditing(false)
    setDeleteError('')
  }

  async function handleDelete() {
    try {
      await deleteProduct(productId)
      setIsConfirmingDelete(false)
      navigate('/productos')
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error
          ? deleteFailure.message
          : 'No se pudo eliminar el producto.',
      )
    }
  }

  return (
    <section className="product-detail-page">
      <header className="product-detail-page-heading">
        <p className="products-eyebrow">CATÁLOGO DE INVENTARIO</p>
        <h1>Detalle del producto</h1>
      </header>

      {error ? (
        <div className="products-empty-state">
          <h2>No se pudieron cargar los datos del producto</h2>
          <p role="alert">{error}</p>
          <Link className="secondary-button" to="/productos">
            <ArrowLeft size={17} aria-hidden="true" />
            Volver
          </Link>
        </div>
      ) : !product ? (
        <div className="products-empty-state">
          <span className="products-empty-icon">
            <PackageOpen size={29} aria-hidden="true" />
          </span>
          <h2>No se encontró el producto</h2>
          <p>Puede que haya sido eliminado o que el enlace no sea válido.</p>
          <Link className="secondary-button" to="/productos">
            <ArrowLeft size={17} aria-hidden="true" />
            Volver a consultar productos
          </Link>
        </div>
      ) : (
        <article className="product-detail-card">
          <div
            aria-label={`Imagen representativa de ${product.name}`}
            className="product-detail-image"
            role="img"
          >
            <span className="product-detail-category">{product.category}</span>
            <PackageOpen size={92} strokeWidth={1.2} aria-hidden="true" />
            <span className="product-detail-image-name">{product.name}</span>
          </div>

          <div className="product-detail-information">
            <p className="products-eyebrow">INFORMACIÓN DEL PRODUCTO</p>
            <h2>{product.name}</h2>
            <dl className="product-detail-list">
              <div>
                <dt>ID</dt>
                <dd>{product.id}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{product.category || 'Sin categoría'}</dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd>
                  {Number.isFinite(Number(product.price))
                    ? currencyFormatter.format(Number(product.price))
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Stock disponible</dt>
                <dd>{product.stock ?? '—'}</dd>
              </div>
            </dl>

            <div className="product-detail-actions">
              {isAdmin && (
                <>
                  <button
                    className="primary-button"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    <Pencil size={17} aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      setDeleteError('')
                      setIsConfirmingDelete(true)
                    }}
                    type="button"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    Eliminar
                  </button>
                </>
              )}
              <Link className="secondary-button" to="/productos">
                <ArrowLeft size={17} aria-hidden="true" />
                Volver
              </Link>
            </div>
          </div>
        </article>
      )}

      {isAdmin && isEditing && product && (
        <ProductDialog
          mode="edit"
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          product={product}
        />
      )}

      {isAdmin && isConfirmingDelete && product && (
        <div className="product-dialog-backdrop">
          <section
            aria-labelledby="detail-delete-title"
            aria-modal="true"
            className="product-dialog delete-confirmation"
            role="dialog"
          >
            <h2 id="detail-delete-title">Eliminar producto</h2>
            <p>
              ¿Deseas eliminar <strong>{product.name}</strong>? Esta acción no se
              puede deshacer.
            </p>
            {deleteError && (
              <p className="products-feedback error-message" role="alert">
                {deleteError}
              </p>
            )}
            <div className="product-dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setIsConfirmingDelete(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                onClick={handleDelete}
                type="button"
              >
                Eliminar
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ProductDetailsPage
