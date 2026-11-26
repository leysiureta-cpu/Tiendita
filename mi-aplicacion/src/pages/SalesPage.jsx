import {
  Banknote,
  Check,
  Clock3,
  CreditCard,
  Landmark,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import MiniSuperLogo from '../components/MiniSuperLogo.jsx'
import useAuth from '../hooks/useAuth.js'
import { createSale, getProducts, getSalesRecords, getStoreSettings } from '../utils/api.js'

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const paymentOptions = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia', icon: Landmark },
]

function money(value) {
  return currencyFormatter.format(Number(value) || 0)
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function localDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function SaleReceipt({
  sale,
  storeSettings,
  storeSettingsError,
  onClose,
  onNewSale,
}) {
  const storeName = storeSettings?.storeName || 'Mini Súper'

  return (
    <div className="sale-dialog-backdrop" onClick={onClose}>
      <section
        aria-labelledby="sale-receipt-title"
        aria-modal="true"
        className="sale-receipt-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="sale-receipt-paper">
          <div className="sale-receipt-brand">
            {storeSettings?.logoUrl ? (
              <>
                <img alt={`Logotipo de ${storeName}`} className="sale-receipt-logo" src={storeSettings.logoUrl} />
                <strong className="sale-receipt-store-name">{storeName}</strong>
              </>
            ) : storeName === 'Mini Súper' ? (
              <MiniSuperLogo compact />
            ) : (
              <strong className="sale-receipt-store-name">{storeName}</strong>
            )}
            <p>COMPROBANTE DE VENTA</p>
          </div>
          {(storeSettings?.address || storeSettings?.phone || storeSettings?.email) && (
            <address className="sale-receipt-store-contact">
              {storeSettings.address && <span>{storeSettings.address}</span>}
              {storeSettings.phone && <span>Tel. {storeSettings.phone}</span>}
              {storeSettings.email && <span>{storeSettings.email}</span>}
            </address>
          )}
          {storeSettingsError && (
            <p className="sale-receipt-settings-error" role="status">
              No se pudo cargar la configuración de la tienda: {storeSettingsError}
            </p>
          )}
          <h2 id="sale-receipt-title">Venta {sale.number}</h2>
          <dl className="sale-receipt-meta">
            <div><dt>Fecha</dt><dd>{formatDateTime(sale.createdAt)}</dd></div>
            <div><dt>Atendió</dt><dd>{sale.user?.username ?? 'Usuario'}</dd></div>
          </dl>
          <div className="sale-receipt-items">
            <div className="sale-receipt-line sale-receipt-columns">
              <span>Producto</span><span>Cant.</span><span>Precio</span><span>Importe</span>
            </div>
            {sale.items.map((item) => (
              <div className="sale-receipt-line" key={`${sale.id}-${item.productId}`}>
                <span>{item.productName}</span>
                <span>{item.quantity}</span>
                <span>{money(item.unitPrice)}</span>
                <span>{money(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <dl className="sale-receipt-totals">
            <div><dt>Subtotal</dt><dd>{money(sale.subtotal)}</dd></div>
            <div><dt>Descuento</dt><dd>-{money(sale.discount)}</dd></div>
            <div className="sale-receipt-total"><dt>Total</dt><dd>{money(sale.total)}</dd></div>
            <div><dt>Método de pago</dt><dd>{paymentOptions.find((option) => option.id === sale.paymentMethod)?.label ?? sale.paymentMethod}</dd></div>
            {sale.paymentMethod === 'efectivo' && <>
              <div><dt>Dinero recibido</dt><dd>{money(sale.amountReceived)}</dd></div>
              <div><dt>Cambio</dt><dd>{money(sale.change)}</dd></div>
            </>}
          </dl>
          <p className="sale-receipt-thanks">
            {storeSettings?.ticketMessage || 'Gracias por su compra'}
          </p>
        </div>
        <footer className="sale-receipt-actions">
          <button className="secondary-button" onClick={() => window.print()} type="button">
            <Printer size={17} aria-hidden="true" /> Imprimir comprobante
          </button>
          <button className="primary-button" onClick={onNewSale} type="button">Nueva venta</button>
        </footer>
      </section>
    </div>
  )
}

function SalesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [productState, setProductState] = useState({ products: [], error: '' })
  const [salesState, setSalesState] = useState({ sales: [], error: '' })
  const [storeSettingsState, setStoreSettingsState] = useState({
    settings: null,
    error: '',
  })
  const [activeView, setActiveView] = useState('venta')
  const [search, setSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [cart, setCart] = useState([])
  const [discountInput, setDiscountInput] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [amountReceived, setAmountReceived] = useState('')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [saleError, setSaleError] = useState('')
  const [receiptSale, setReceiptSale] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLock = useRef(false)
  const operationId = useRef(null)
  const products = productState.products
  const sales = salesState.sales
  const query = search.trim().toLocaleLowerCase('es')
  const visibleProducts = products.filter((product) =>
    String(product.name ?? '').toLocaleLowerCase('es').includes(query) ||
    String(product.id ?? '').toLocaleLowerCase('es').includes(query),
  )
  const hasHistoryFilters = Boolean(historySearch || historyStartDate || historyEndDate)

  const visibleSales = useMemo(() => {
    const historyQuery = historySearch.trim().toLocaleLowerCase('es')
    return sales.filter((sale) => {
      const date = localDateKey(sale.createdAt ?? sale.date)
      const matchesDate = (!historyStartDate || date >= historyStartDate) &&
        (!historyEndDate || date <= historyEndDate)
      const searchableText = [
        sale.number,
        sale.id,
        sale.user?.username,
        paymentOptions.find((option) => option.id === sale.paymentMethod)?.label,
        ...(sale.items ?? []).map((item) => item.productName),
      ].join(' ').toLocaleLowerCase('es')

      return matchesDate && (!historyQuery || searchableText.includes(historyQuery))
    })
  }, [historyEndDate, historySearch, historyStartDate, sales])

  const cartItems = useMemo(() => cart.map((entry) => {
    const product = products.find((item) => String(item.id) === String(entry.productId))
    return product ? { ...product, cartQuantity: entry.quantity } : null
  }).filter(Boolean), [cart, products])

  const subtotalCents = cartItems.reduce((sum, item) =>
    sum + Math.round((Number(item.price) || 0) * 100) * item.cartQuantity, 0)
  const subtotal = subtotalCents / 100
  const discount = Number(discountInput)
  const discountIsValid = discountInput !== '' && Number.isFinite(discount) && discount >= 0 && Math.round(discount * 100) <= subtotalCents
  const discountCents = discountIsValid ? Math.round(discount * 100) : 0
  const totalCents = Math.max(0, subtotalCents - discountCents)
  const total = totalCents / 100
  const receivedCents = amountReceived === '' ? null : Math.round((Number(amountReceived) || 0) * 100)
  const cashInsufficient = paymentMethod === 'efectivo' && (receivedCents === null || receivedCents < totalCents)
  const cartHasInvalidQuantities = cartItems.some((item) =>
    !Number.isInteger(item.cartQuantity) || item.cartQuantity < 1 || item.cartQuantity > Number(item.stock),
  )
  const canRegister = cartItems.length > 0 && !cartHasInvalidQuantities && discountIsValid &&
    Boolean(paymentMethod) && !cashInsufficient &&
    (paymentMethod === 'efectivo' || paymentConfirmed) && !isSubmitting

  useEffect(() => {
    let active = true
    async function refreshStoreSettings() {
      try {
        const settings = await getStoreSettings()
        if (active) setStoreSettingsState({ settings, error: '' })
      } catch (error) {
        if (active) {
          setStoreSettingsState({
            settings: null,
            error: error instanceof Error
              ? error.message
              : 'No se pudo cargar la configuración de la tienda.',
          })
        }
      }
    }

    void refreshStoreSettings()
    window.addEventListener('focus', refreshStoreSettings)
    return () => {
      active = false
      window.removeEventListener('focus', refreshStoreSettings)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function refreshData() {
      try {
        const [nextProducts, nextSales] = await Promise.all([
          getProducts(),
          getSalesRecords(),
        ])
        if (active) {
          setProductState({ products: nextProducts, error: '' })
          setSalesState({ sales: nextSales, error: '' })
        }
      } catch (error) {
        if (active) {
          setProductState((current) => ({
            ...current,
            error: error instanceof Error ? error.message : 'No se pudieron cargar los datos.',
          }))
        }
      }
    }

    void refreshData()
    window.addEventListener('focus', refreshData)
    return () => {
      active = false
      window.removeEventListener('focus', refreshData)
    }
  }, [])

  function updateQuantity(productId, delta) {
    setSaleError('')
    setCart((current) => {
      const existing = current.find((item) => String(item.productId) === String(productId))
      if (!existing && delta > 0) return [...current, { productId, quantity: 1 }]
      return current.map((item) => String(item.productId) === String(productId)
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item).filter((item) => item.quantity > 0)
    })
  }

  function setItemQuantity(productId, value) {
    const quantity = value === '' ? 0 : Number(value)
    setSaleError('')
    setCart((current) => {
      const remaining = current.filter((item) => String(item.productId) !== String(productId))
      return Number.isInteger(quantity) && quantity > 0
        ? [...remaining, { productId, quantity }]
        : remaining
    })
  }

  function choosePayment(method) {
    setPaymentMethod(method)
    setAmountReceived('')
    setPaymentConfirmed(false)
    setSaleError('')
  }

  function startNewSale() {
    setReceiptSale(null)
    setCart([])
    setDiscountInput('0')
    setPaymentMethod('')
    setAmountReceived('')
    setPaymentConfirmed(false)
    setSaleError('')
    setActiveView('venta')
    operationId.current = null
  }

  function cancelPendingSale() {
    if (isSubmitting) return
    setCart([])
    setDiscountInput('0')
    setPaymentMethod('')
    setAmountReceived('')
    setPaymentConfirmed(false)
    setSaleError('')
    operationId.current = null
  }

  async function handleRegisterSale() {
    if (!canRegister || submitLock.current) return
    submitLock.current = true
    setIsSubmitting(true)
    setSaleError('')
    try {
      if (!operationId.current) operationId.current = window.crypto.randomUUID()
      const sale = await createSale({
        items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
        discount: discountCents / 100,
        paymentMethod,
        amountReceived: amountReceived === '' ? undefined : Number(amountReceived),
        paymentConfirmed,
        operationId: operationId.current,
      })
      operationId.current = null
      setReceiptSale(sale)
      setCart([])
      try {
        const [nextSales, nextProducts] = await Promise.all([
          getSalesRecords(),
          getProducts(),
        ])
        setSalesState({ sales: nextSales, error: '' })
        setProductState({ products: nextProducts, error: '' })
      } catch (refreshError) {
        setSalesState((current) => ({
          sales: [sale, ...current.sales.filter((item) => item.id !== sale.id)],
          error: '',
        }))
        setProductState((current) => ({
          ...current,
          error: refreshError instanceof Error
            ? `La venta se registró, pero no se pudo actualizar el inventario: ${refreshError.message}`
            : 'La venta se registró, pero no se pudo actualizar el inventario.',
        }))
      }
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : 'No se pudo registrar la venta.')
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <section className="sales-page">
      <header className="sales-page-heading">
        <div>
          <p className="products-eyebrow">OPERACIÓN DE CAJA</p>
          <h1>Punto de venta</h1>
        </div>
        <div className="sales-view-tabs" role="tablist" aria-label="Ventas">
          <button aria-selected={activeView === 'venta'} className={activeView === 'venta' ? 'active' : ''} onClick={() => setActiveView('venta')} role="tab" type="button">
            <ShoppingCart size={17} aria-hidden="true" /> Nueva venta
          </button>
          <button aria-selected={activeView === 'historial'} className={activeView === 'historial' ? 'active' : ''} onClick={() => setActiveView('historial')} role="tab" type="button">
            <Clock3 size={17} aria-hidden="true" /> Historial <span>{sales.length}</span>
          </button>
        </div>
      </header>

      {(productState.error || salesState.error) && (
        <p className="products-feedback error-message" role="alert">{productState.error || salesState.error}</p>
      )}

      {activeView === 'venta' ? (
        <div className="sales-workspace">
          <section className="sales-catalog">
            <div className="sales-section-heading">
              <div><h2>Productos</h2><p>Selecciona artículos para el carrito</p></div>
              <span>{products.length} productos</span>
            </div>
            <label className="sales-search">
              <Search size={18} aria-hidden="true" />
              <input aria-label="Buscar productos para la venta" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o ID" type="search" value={search} />
            </label>
            <div className="sales-product-list">
              {visibleProducts.length ? visibleProducts.map((product) => {
                const quantityInCart = cart.find((item) => String(item.productId) === String(product.id))?.quantity ?? 0
                const stock = Number(product.stock ?? product.quantity) || 0
                return (
                  <article className="sales-product-row" key={product.id}>
                    <div className="sales-product-copy">
                      <strong>{product.name}</strong>
                      <span>{product.category || 'Producto'} · Existencia: {stock}</span>
                    </div>
                    <strong className="sales-product-price">{money(product.price)}</strong>
                    {quantityInCart ? (
                      <div className="sales-quantity-control" aria-label={`Cantidad de ${product.name}`}>
                        <button aria-label={`Quitar uno de ${product.name}`} onClick={() => updateQuantity(product.id, -1)} type="button"><Minus size={15} /></button>
                        <input aria-label={`Cantidad de ${product.name}`} max={stock} min="1" onChange={(event) => setItemQuantity(product.id, event.target.value)} type="number" value={quantityInCart} />
                        <button aria-label={`Agregar uno de ${product.name}`} disabled={quantityInCart >= stock} onClick={() => updateQuantity(product.id, 1)} type="button"><Plus size={15} /></button>
                      </div>
                    ) : (
                      <button aria-label={`Agregar ${product.name}`} className="sales-add-button" disabled={stock <= 0} onClick={() => updateQuantity(product.id, 1)} type="button"><Plus size={18} /></button>
                    )}
                  </article>
                )
              }) : <p className="sales-empty">{products.length ? 'No se encontraron productos.' : 'Registra productos para comenzar a vender.'}</p>}
            </div>
          </section>

          <aside className="sales-checkout">
            <div className="sales-section-heading">
              <div><h2>Resumen de compra</h2><p>{cartItems.length} producto(s) en el carrito</p></div>
              <ShoppingCart size={20} aria-hidden="true" />
            </div>
            <div className="sales-cart-items">
              {cartItems.length ? cartItems.map((item) => (
                <div className="sales-cart-item" key={item.id}>
                  <div><strong>{item.name}</strong><span>{item.cartQuantity} × {money(item.price)}</span></div>
                  <strong>{money(Number(item.price) * item.cartQuantity)}</strong>
                  <button aria-label={`Quitar ${item.name} del carrito`} onClick={() => setItemQuantity(item.id, 0)} type="button"><Trash2 size={16} /></button>
                </div>
              )) : <p className="sales-cart-empty">El carrito está vacío.</p>}
            </div>
            <label className="sales-discount-field">
              <span>Descuento</span>
              <span className="sales-money-input"><span>$</span><input aria-label="Descuento en pesos" min="0" onChange={(event) => setDiscountInput(event.target.value)} step="0.01" type="number" value={discountInput} /></span>
            </label>
            {!discountIsValid && <p className="sales-inline-error">El descuento debe estar entre $0.00 y el subtotal.</p>}
            <dl className="sales-totals">
              <div><dt>Subtotal general</dt><dd>{money(subtotal)}</dd></div>
              <div><dt>Descuento</dt><dd>-{money(discountIsValid ? discount : 0)}</dd></div>
              <div className="sales-total"><dt>Total a pagar</dt><dd>{money(total)}</dd></div>
            </dl>

            <fieldset className="sales-payment-methods">
              <legend>Método de pago</legend>
              <div>
                {paymentOptions.map(({ id, label, icon: Icon }) => (
                  <button aria-pressed={paymentMethod === id} className={paymentMethod === id ? 'selected' : ''} key={id} onClick={() => choosePayment(id)} type="button">
                    <Icon size={19} aria-hidden="true" /><span>{label}</span>{paymentMethod === id && <Check className="sales-payment-check" size={16} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </fieldset>

            {paymentMethod === 'efectivo' && (
              <section className="sales-payment-detail">
                <label className="sales-discount-field">
                  <span>Dinero recibido</span>
                  <span className="sales-money-input"><span>$</span><input aria-label="Dinero recibido" min="0" onChange={(event) => setAmountReceived(event.target.value)} step="0.01" type="number" value={amountReceived} /></span>
                </label>
                <div className="sales-change-row"><span>Cambio</span><strong>{money(receivedCents === null ? 0 : Math.max(0, receivedCents - totalCents) / 100)}</strong></div>
                {cashInsufficient && <p className="sales-inline-error" role="alert">El dinero recibido es insuficiente. No se puede finalizar la venta.</p>}
              </section>
            )}
            {paymentMethod === 'tarjeta' && (
              <section className="sales-payment-detail">
                <p>El cliente realizará el pago mediante tarjeta. No se procesan datos bancarios desde esta pantalla.</p>
                <label className="sales-confirm-payment"><input checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} type="checkbox" /> Confirmo que el pago con tarjeta fue recibido.</label>
              </section>
            )}
            {paymentMethod === 'transferencia' && (
              <section className="sales-payment-detail">
                <p>El cliente realizará el pago mediante transferencia. Confirma la recepción antes de continuar.</p>
                <label className="sales-confirm-payment"><input checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} type="checkbox" /> Confirmo que la transferencia fue recibida.</label>
              </section>
            )}

            {cartHasInvalidQuantities && <p className="sales-inline-error" role="alert">Revisa las cantidades y existencias del carrito.</p>}
            {saleError && <p className="products-feedback error-message" role="alert">{saleError}</p>}
            <button className="primary-button sales-register-button" disabled={!canRegister} onClick={handleRegisterSale} type="button">
              <ReceiptText size={18} aria-hidden="true" /> {isSubmitting ? 'Registrando…' : 'Registrar venta'}
            </button>
            <button
              className="secondary-button sales-cancel-button"
              disabled={cartItems.length === 0 || isSubmitting}
              onClick={cancelPendingSale}
              type="button"
            >
              Cancelar venta
            </button>
          </aside>
        </div>
      ) : (
        <section className="sales-history-panel">
          <div className="sales-section-heading">
            <div>
              <h2>Historial de ventas</h2>
              <p>{isAdmin ? 'Ventas de todos los empleados' : 'Ventas asociadas a tu cuenta'}</p>
            </div>
            <span>{visibleSales.length} de {sales.length} ventas</span>
          </div>
          <div className="sales-history-filters">
            <label className="sales-search sales-history-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="Buscar en historial por folio, producto o cajero"
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Buscar folio, producto o cajero"
                type="search"
                value={historySearch}
              />
            </label>
            <label className="sales-history-date-filter">
              <span>Desde</span>
              <input
                aria-label="Fecha inicial del historial"
                max={historyEndDate || undefined}
                onChange={(event) => setHistoryStartDate(event.target.value)}
                type="date"
                value={historyStartDate}
              />
            </label>
            <label className="sales-history-date-filter">
              <span>Hasta</span>
              <input
                aria-label="Fecha final del historial"
                min={historyStartDate || undefined}
                onChange={(event) => setHistoryEndDate(event.target.value)}
                type="date"
                value={historyEndDate}
              />
            </label>
            <button
              className="secondary-button sales-history-reset"
              disabled={!hasHistoryFilters}
              onClick={() => {
                setHistorySearch('')
                setHistoryStartDate('')
                setHistoryEndDate('')
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          </div>
          {sales.length ? (
            visibleSales.length ? <div className="products-table-wrap">
              <table className="products-table sales-history-table">
                <thead><tr><th>Número de venta</th><th>Fecha</th><th>Atendió</th><th>Método de pago</th><th>Recibido</th><th>Cambio</th><th>Total</th><th>Comprobante</th></tr></thead>
                <tbody>{visibleSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.number ?? sale.id}</td>
                    <td>{formatDateTime(sale.createdAt ?? sale.date)}</td>
                    <td>{sale.user?.username ?? '—'}</td>
                    <td>{paymentOptions.find((option) => option.id === sale.paymentMethod)?.label ?? sale.paymentMethod ?? '—'}</td>
                    <td>{sale.paymentMethod === 'efectivo' ? money(sale.amountReceived) : '—'}</td>
                    <td>{sale.paymentMethod === 'efectivo' ? money(sale.change) : '—'}</td>
                    <td>{money(sale.total)}</td>
                    <td><button className="sales-view-receipt" onClick={() => setReceiptSale(sale)} type="button"><ReceiptText size={15} aria-hidden="true" /> Consultar</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
              : <div className="sales-empty-history"><ReceiptText size={25} aria-hidden="true" /><p>No se encontraron ventas con esos filtros.</p></div>
          ) : <div className="sales-empty-history"><ReceiptText size={25} aria-hidden="true" /><p>Aún no hay ventas registradas.</p></div>}
        </section>
      )}
      {receiptSale && (
        <SaleReceipt
          sale={receiptSale}
          storeSettings={storeSettingsState.settings}
          storeSettingsError={storeSettingsState.error}
          onClose={() => setReceiptSale(null)}
          onNewSale={startNewSale}
        />
      )}
    </section>
  )
}

export default SalesPage
