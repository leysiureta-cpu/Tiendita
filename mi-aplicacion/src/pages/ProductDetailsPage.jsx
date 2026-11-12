import { ArrowLeft, PackageOpen, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductDialog from '../components/ProductDialog.jsx'
import {
  getProducts,
  PRODUCTS_STORAGE_KEY,
  PRODUCTS_UPDATED_EVENT,
  saveProducts,
} from '../utils/dashboardData.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

function readProductList() {
  try {
    return { products: getProducts(), error: '' }
  } catch (error) {
    return {
      products: [],
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los productos.',
    }
  }
}

function ProductDetailsPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [productState, setProductState] = useState(readProductList)
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { products, error } = productState
  const product = products.find(
    (item) => String(item.id) === String(productId),
  )

  useEffect(() => {
    function refreshProducts(event) {
      if (
        event.type === 'storage' &&
        event.key &&
        event.key !== PRODUCTS_STORAGE_KEY
      ) {
        return
      }
      setProductState(readProductList())
    }

    window.addEventListener('storage', refreshProducts)
    window.addEventListener(PRODUCTS_UPDATED_EVENT, refreshProducts)
    return () => {
      window.removeEventListener('storage', refreshProducts)
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refreshProducts)
    }
  }, [])

  function handleSave(updatedProduct) {
    const currentProducts = getProducts()
    const productIndex = currentProducts.findIndex(
      (item) => String(item.id) === String(productId),
    )
    if (productIndex === -1) {
      throw new Error('No se encontró el producto que deseas actualizar.')
    }

    const nextProducts = [...currentProducts]
    nextProducts[productIndex] = { ...updatedProduct, id: currentProducts[productIndex].id }
    saveProducts(nextProducts)
    setProductState({ products: nextProducts, error: '' })
    setIsEditing(false)
    setDeleteError('')
  }

  function handleDelete() {
    try {
      const currentProducts = getProducts()
      const nextProducts = currentProducts.filter(
        (item) => String(item.id) !== String(productId),
      )
      if (nextProducts.length === currentProducts.length) {
        setProductState(readProductList())
        setDeleteError('El producto ya no está disponible en el inventario.')
        return
      }

      saveProducts(nextProducts)
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
              <Link className="secondary-button" to="/productos">
                <ArrowLeft size={17} aria-hidden="true" />
                Volver
              </Link>
            </div>
          </div>
        </article>
      )}

      {isEditing && product && (
        <ProductDialog
          mode="edit"
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          product={product}
        />
      )}

      {isConfirmingDelete && product && (
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
