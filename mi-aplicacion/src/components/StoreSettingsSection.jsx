import { ImagePlus, LoaderCircle, MapPin, RotateCcw, Save, Store, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { getStoreSettings, reverseGeocodeAddress, saveStoreSettings } from '../utils/api.js'

const StoreLocationMap = lazy(() => import('./StoreLocationMap.jsx'))

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_LOGO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

const emptySettings = {
  storeName: 'Mini Súper',
  address: '',
  phone: '',
  email: '',
  ticketMessage: '',
  latitude: null,
  longitude: null,
}

function StoreSettingsSection() {
  const fileInputRef = useRef(null)
  const previewObjectUrlRef = useRef('')
  const [settings, setSettings] = useState(emptySettings)
  const [savedLogoUrl, setSavedLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [geocodeState, setGeocodeState] = useState({
    status: 'idle',
    message: '',
    result: null,
    needsConfirmation: false,
  })
  const geocodeSequenceRef = useRef(0)
  const geocodeTimerRef = useRef(null)
  const geocodeControllerRef = useRef(null)
  const addressValueRef = useRef('')
  const addressSourceRef = useRef('empty')

  useEffect(() => {
    let active = true
    getStoreSettings()
      .then((data) => {
        if (!active) return
        setSettings({
          storeName: data.storeName ?? 'Mini Súper',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          ticketMessage: data.ticketMessage ?? '',
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
        })
        addressValueRef.current = data.address ?? ''
        addressSourceRef.current = data.address ? 'saved' : 'empty'
        setSavedLogoUrl(data.logoUrl ?? '')
        setLogoPreview(data.logoUrl ?? '')
        setHasLoadedSettings(true)
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar la configuración de la tienda.')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => () => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current)
  }, [])

  useEffect(() => () => {
    clearTimeout(geocodeTimerRef.current)
    geocodeControllerRef.current?.abort()
  }, [])

  function cancelGeocode() {
    clearTimeout(geocodeTimerRef.current)
    geocodeTimerRef.current = null
    geocodeControllerRef.current?.abort()
    geocodeControllerRef.current = null
    geocodeSequenceRef.current += 1
  }

  function searchAddress(latitude, longitude, delay = 700) {
    cancelGeocode()
    const requestId = geocodeSequenceRef.current
    setGeocodeState({
      status: 'loading',
      message: 'Buscando dirección para la ubicación seleccionada…',
      result: null,
      needsConfirmation: false,
    })

    async function performLookup() {
      if (requestId !== geocodeSequenceRef.current) return
      const controller = new AbortController()
      geocodeControllerRef.current = controller

      try {
        const result = await reverseGeocodeAddress(latitude, longitude, controller.signal)
        if (controller.signal.aborted || requestId !== geocodeSequenceRef.current) return

        if (!result.found || !result.address) {
          setGeocodeState({
            status: 'not-found',
            message: 'No se encontró una dirección para este punto. Puedes escribirla manualmente.',
            result: null,
            needsConfirmation: false,
          })
          return
        }

        const canUpdateAddress = ['empty', 'geocoded'].includes(addressSourceRef.current)
        const addressMatches = addressValueRef.current.trim() === result.address
        if (canUpdateAddress) {
          addressValueRef.current = result.address
          addressSourceRef.current = 'geocoded'
          setSettings((current) => ({ ...current, address: result.address }))
        }
        setGeocodeState({
          status: 'success',
          message: canUpdateAddress
            ? 'La dirección se completó con el resultado del mapa.'
            : 'Se encontró una dirección. Conservamos el texto existente; confirma si deseas reemplazarlo.',
          result,
          needsConfirmation: !canUpdateAddress && !addressMatches,
        })
      } catch (lookupError) {
        if (controller.signal.aborted || requestId !== geocodeSequenceRef.current) return
        setGeocodeState({
          status: 'error',
          message: lookupError instanceof Error
            ? lookupError.message
            : 'No se pudo consultar la dirección. Inténtalo nuevamente.',
          result: null,
          needsConfirmation: false,
        })
      }
    }

    if (delay > 0) {
      geocodeTimerRef.current = setTimeout(() => {
        geocodeTimerRef.current = null
        void performLookup()
      }, delay)
    } else {
      void performLookup()
    }
  }

  function updateField(event) {
    const { name, value } = event.target
    if (name === 'address') {
      addressValueRef.current = value
      addressSourceRef.current = 'manual'
    }
    setSettings((current) => ({ ...current, [name]: value }))
    setNotice('')
  }

  function updateLocation(latitude, longitude) {
    setSettings((current) => ({ ...current, latitude, longitude }))
    setNotice('')
    searchAddress(latitude, longitude)
  }

  function clearLocation() {
    cancelGeocode()
    setSettings((current) => ({ ...current, latitude: null, longitude: null }))
    setGeocodeState({ status: 'idle', message: '', result: null, needsConfirmation: false })
    setNotice('')
  }

  function applySuggestedAddress() {
    const suggestedAddress = geocodeState.result?.address
    if (!suggestedAddress) return

    addressValueRef.current = suggestedAddress
    addressSourceRef.current = 'geocoded'
    setSettings((current) => ({ ...current, address: suggestedAddress }))
    setGeocodeState((current) => ({
      ...current,
      message: 'La dirección encontrada se aplicó al campo editable.',
      needsConfirmation: false,
    }))
  }

  function handleSelectLogo(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()
    const validType = ACCEPTED_LOGO_TYPES.includes(file.type) ||
      (file.type === '' && ACCEPTED_LOGO_EXTENSIONS.includes(extension))
    if (!validType) {
      setError('El logotipo debe ser una imagen JPG, PNG o WEBP.')
      clearNewLogo()
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError('El logotipo no puede superar los 2 MB.')
      clearNewLogo()
      return
    }

    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current)
    previewObjectUrlRef.current = URL.createObjectURL(file)
    setLogoPreview(previewObjectUrlRef.current)
    setLogoFile(file)
    setError('')
    setNotice('')
  }

  function clearNewLogo() {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current)
    previewObjectUrlRef.current = ''
    setLogoFile(null)
    setLogoPreview(savedLogoUrl)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (geocodeState.status === 'loading') return
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await saveStoreSettings({ ...settings, logo: logoFile })
      setSettings({
        storeName: saved.storeName ?? 'Mini Súper',
        address: saved.address ?? '',
        phone: saved.phone ?? '',
        email: saved.email ?? '',
        ticketMessage: saved.ticketMessage ?? '',
        latitude: saved.latitude ?? null,
        longitude: saved.longitude ?? null,
      })
      addressValueRef.current = saved.address ?? ''
      setSavedLogoUrl(saved.logoUrl ?? '')
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = ''
      setLogoPreview(saved.logoUrl ?? '')
      setLogoFile(null)
      setNotice('La configuración de la tienda se guardó correctamente.')
    } catch (saveError) {
      setError(saveError instanceof Error
        ? saveError.message
        : 'No se pudo guardar la configuración de la tienda.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section aria-labelledby="store-settings-title" className="settings-section store-settings-section">
      <header className="settings-section-heading">
        <span className="settings-section-number">05</span>
        <div>
          <h2 id="store-settings-title">Configuración de la tienda</h2>
          <p>Estos datos compartidos aparecen en los comprobantes de venta.</p>
        </div>
      </header>

      {notice && <p className="products-feedback success-message" role="status">{notice}</p>}
      {error && <p className="products-feedback error-message" role="alert">{error}</p>}

      <form className="store-settings-form" onSubmit={handleSubmit}>
        <fieldset disabled={isLoading || isSaving || !hasLoadedSettings}>
          <legend className="visually-hidden">Datos generales de la tienda</legend>
          <div className="store-settings-grid">
            <label>
              <span>Nombre comercial</span>
              <input
                autoComplete="organization"
                maxLength={150}
                name="storeName"
                onChange={updateField}
                required
                value={settings.storeName}
              />
            </label>
            <label>
              <span>Teléfono</span>
              <input
                autoComplete="tel"
                maxLength={40}
                name="phone"
                onChange={updateField}
                type="tel"
                value={settings.phone}
              />
            </label>
            <label>
              <span>Correo electrónico</span>
              <input
                autoComplete="email"
                maxLength={255}
                name="email"
                onChange={updateField}
                type="email"
                value={settings.email}
              />
            </label>
            <div className="store-settings-address">
              <label>
                <span>Dirección</span>
                <input
                  autoComplete="street-address"
                  maxLength={255}
                  name="address"
                  onChange={updateField}
                  value={settings.address}
                />
              </label>
              <div className="store-location-picker">
                <p className="store-location-help">
                  Haz clic en el mapa para seleccionar la ubicación de tu tienda
                </p>
                {hasLoadedSettings ? (
                  <Suspense fallback={<div className="store-location-map-placeholder" role="status">Cargando mapa…</div>}>
                    <StoreLocationMap
                      latitude={settings.latitude}
                      longitude={settings.longitude}
                      interactive={!isSaving}
                      onLocationChange={updateLocation}
                    />
                  </Suspense>
                ) : (
                  <div className="store-location-map-placeholder" role="status">
                    {isLoading ? 'Cargando mapa…' : 'No se pudo cargar la ubicación de la tienda.'}
                  </div>
                )}
                <div aria-live="polite" className="store-location-summary">
                  <MapPin aria-hidden="true" size={18} />
                  {settings.latitude != null && settings.longitude != null ? (
                    <p>
                      <strong>Ubicación seleccionada</strong>
                      <span>
                        Latitud: {Number(settings.latitude).toFixed(6)} · Longitud: {Number(settings.longitude).toFixed(6)}
                      </span>
                    </p>
                  ) : (
                    <p>
                      <strong>Sin ubicación seleccionada</strong>
                      <span>Selecciona un punto en el mapa o arrastra el marcador para ajustarlo.</span>
                    </p>
                  )}
                  <button
                    aria-label="Quitar ubicación seleccionada"
                    className="secondary-button store-location-clear"
                    disabled={settings.latitude == null || settings.longitude == null}
                    onClick={clearLocation}
                    type="button"
                  >
                    <X aria-hidden="true" size={16} />
                    Quitar ubicación
                  </button>
                </div>
                <div className="store-geocode-panel">
                  <div className="store-geocode-actions">
                    <button
                      className="secondary-button"
                      disabled={settings.latitude == null || settings.longitude == null || geocodeState.status === 'loading'}
                      onClick={() => searchAddress(settings.latitude, settings.longitude, 0)}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={15} />
                      Buscar dirección nuevamente
                    </button>
                    {geocodeState.status === 'loading' && (
                      <span className="store-geocode-loading" role="status">
                        <LoaderCircle aria-hidden="true" className="store-geocode-spinner" size={16} />
                        Buscando dirección…
                      </span>
                    )}
                  </div>
                  {geocodeState.message && geocodeState.status !== 'loading' && (
                    <p
                      className={`store-geocode-message ${geocodeState.status === 'error' ? 'error' : ''}`}
                      role={geocodeState.status === 'error' ? 'alert' : 'status'}
                    >
                      {geocodeState.message}
                    </p>
                  )}
                  {geocodeState.result?.components && (
                    <dl className="store-geocode-details">
                      {Object.entries(geocodeState.result.components).map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {geocodeState.needsConfirmation && (
                    <button className="secondary-button" onClick={applySuggestedAddress} type="button">
                      Usar dirección encontrada
                    </button>
                  )}
                </div>
              </div>
            </div>
            <label className="store-settings-ticket-message">
              <span>Mensaje al final del ticket</span>
              <textarea
                maxLength={500}
                name="ticketMessage"
                onChange={updateField}
                rows={3}
                value={settings.ticketMessage}
              />
            </label>
          </div>

          <div className="store-logo-editor">
            <div className="store-logo-preview" aria-label="Vista previa del logotipo">
              {logoPreview
                ? <img alt="Logotipo de la tienda" src={logoPreview} />
                : <Store size={32} aria-hidden="true" />}
            </div>
            <div className="store-logo-copy">
              <strong>Logotipo del negocio</strong>
              <span>JPG, PNG o WEBP · máximo 2 MB · hasta 3 000 × 3 000 px</span>
              <input
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="visually-hidden"
                onChange={handleSelectLogo}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="secondary-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <ImagePlus size={16} aria-hidden="true" />
                {savedLogoUrl || logoFile ? 'Cambiar logotipo' : 'Subir logotipo'}
              </button>
            </div>
          </div>
        </fieldset>

        <div className="store-settings-actions">
          {isLoading && <span role="status">Cargando configuración…</span>}
          <button
            className="primary-button"
            disabled={isLoading || isSaving || !hasLoadedSettings || geocodeState.status === 'loading'}
            type="submit"
          >
            <Save size={16} aria-hidden="true" />
            {isSaving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default StoreSettingsSection
