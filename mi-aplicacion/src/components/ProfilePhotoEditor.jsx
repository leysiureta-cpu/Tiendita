import { useEffect, useRef, useState } from 'react'
import { ImageUp, RotateCcw, ZoomIn } from 'lucide-react'

const STAGE_SIZE = 300
const OUTPUT_SIZE = 384
const MAX_IMAGE_DIMENSION = 8000
const MAX_OUTPUT_SIZE = 220 * 1024

function clampPosition(position, renderedSize) {
  return Math.min(0, Math.max(STAGE_SIZE - renderedSize, position))
}

function renderCrop(image, position, scale, size, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la vista previa de la fotografía.')

  const sourceX = -position.x / scale
  const sourceY = -position.y / scale
  const sourceSize = STAGE_SIZE / scale
  context.drawImage(
    image.element,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size,
  )
  return canvas.toDataURL('image/webp', quality)
}

function ProfilePhotoEditor({ file, onCancel, onSave }) {
  const stageRef = useRef(null)
  const dragRef = useRef(null)
  const [image, setImage] = useState(null)
  const [displayScale, setDisplayScale] = useState(1)
  const [imageUrl, setImageUrl] = useState('')
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!file) return undefined
    let cancelled = false
    const reader = new FileReader()
    reader.onload = () => {
      if (cancelled || typeof reader.result !== 'string') return
      const source = new Image()
      source.onload = () => {
        if (cancelled) return
        if (source.naturalWidth > MAX_IMAGE_DIMENSION || source.naturalHeight > MAX_IMAGE_DIMENSION) {
          setError('Las dimensiones máximas permitidas son 8 000 × 8 000 píxeles.')
          return
        }
        const baseScale = Math.max(STAGE_SIZE / source.naturalWidth, STAGE_SIZE / source.naturalHeight)
        setImage({ element: source, width: source.naturalWidth, height: source.naturalHeight, baseScale })
        setPosition({
          x: (STAGE_SIZE - source.naturalWidth * baseScale) / 2,
          y: (STAGE_SIZE - source.naturalHeight * baseScale) / 2,
        })
        setImageUrl(reader.result)
        setZoom(1)
        setError('')
      }
      source.onerror = () => {
        if (!cancelled) setError('No se pudo abrir la imagen. Intenta con otro archivo.')
      }
      source.src = reader.result
    }
    reader.onerror = () => {
      if (!cancelled) setError('No se pudo leer la imagen. Intenta con otro archivo.')
    }
    reader.readAsDataURL(file)

    return () => {
      cancelled = true
      reader.abort()
    }
  }, [file])

  const scale = image ? image.baseScale * zoom : 1
  const renderedWidth = image ? image.width * scale : STAGE_SIZE
  const renderedHeight = image ? image.height * scale : STAGE_SIZE

  useEffect(() => {
    if (!image || !stageRef.current) return undefined
    const stage = stageRef.current
    const updateDisplayScale = () => {
      setDisplayScale(stage.getBoundingClientRect().width / STAGE_SIZE)
    }
    updateDisplayScale()
    const observer = new ResizeObserver(updateDisplayScale)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [image])

  function drawCrop(size, quality = 0.84) {
    if (!image) return ''
    return renderCrop(image, position, scale, size, quality)
  }

  useEffect(() => {
    if (!image) return
    const frame = window.requestAnimationFrame(() => {
      try {
        setPreview(renderCrop(image, position, scale, 112, 0.78))
      } catch (previewError) {
        setError(previewError instanceof Error ? previewError.message : 'No se pudo generar la vista previa.')
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [image, position, scale])

  function moveImage(event) {
    if (!dragRef.current || !stageRef.current) return
    const bounds = stageRef.current.getBoundingClientRect()
    const ratio = STAGE_SIZE / bounds.width
    const nextX = dragRef.current.x + (event.clientX - dragRef.current.pointerX) * ratio
    const nextY = dragRef.current.y + (event.clientY - dragRef.current.pointerY) * ratio
    setPosition({
      x: clampPosition(nextX, renderedWidth),
      y: clampPosition(nextY, renderedHeight),
    })
  }

  function handlePointerDown(event) {
    if (!image) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: position.x,
      y: position.y,
    }
  }

  function handleZoomChange(event) {
    const nextZoom = Number(event.target.value)
    const nextScale = image.baseScale * nextZoom
    const nextWidth = image.width * nextScale
    const nextHeight = image.height * nextScale
    const centerX = STAGE_SIZE / 2
    const centerY = STAGE_SIZE / 2
    const relativeX = (centerX - position.x) / scale
    const relativeY = (centerY - position.y) / scale
    setPosition({
      x: clampPosition(centerX - relativeX * nextScale, nextWidth),
      y: clampPosition(centerY - relativeY * nextScale, nextHeight),
    })
    setZoom(nextZoom)
  }

  function resetPosition() {
    if (!image) return
    const resetScale = image.baseScale
    setZoom(1)
    setPosition({
      x: (STAGE_SIZE - image.width * resetScale) / 2,
      y: (STAGE_SIZE - image.height * resetScale) / 2,
    })
  }

  async function savePhoto() {
    if (!image || isSaving) return
    setIsSaving(true)
    setError('')
    try {
      let optimized = ''
      for (const [size, quality] of [[OUTPUT_SIZE, 0.82], [320, 0.76], [256, 0.7]]) {
        optimized = drawCrop(size, quality)
        const byteLength = Math.ceil((optimized.length * 3) / 4)
        if (byteLength <= MAX_OUTPUT_SIZE) break
      }
      if (!optimized || Math.ceil((optimized.length * 3) / 4) > MAX_OUTPUT_SIZE) {
        throw new Error('No se pudo optimizar la foto por debajo de 220 KB. Prueba con otra imagen.')
      }
      await onSave({
        dataUrl: optimized,
        crop: { x: position.x, y: position.y, zoom },
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la fotografía.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="photo-editor-backdrop" onClick={onCancel}>
      <section
        aria-labelledby="photo-editor-title"
        aria-modal="true"
        className="photo-editor-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="photo-editor-header">
          <div>
            <p className="products-eyebrow">PERFIL Y FOTOGRAFÍA</p>
            <h2 id="photo-editor-title">Ajustar fotografía</h2>
          </div>
          <ImageUp size={21} aria-hidden="true" />
        </header>
        {image ? (
          <>
            <div className="photo-editor-workspace">
              <div
                aria-label="Arrastra para ajustar el encuadre circular"
                className="photo-editor-stage"
                onLostPointerCapture={() => { dragRef.current = null }}
                onPointerDown={handlePointerDown}
                onPointerMove={moveImage}
                onPointerUp={() => { dragRef.current = null }}
                ref={stageRef}
                role="application"
                tabIndex={0}
              >
                <img
                  alt="Imagen para recortar"
                  draggable="false"
                  src={imageUrl}
                  style={{
                    width: renderedWidth * displayScale,
                    height: renderedHeight * displayScale,
                    left: position.x * displayScale,
                    top: position.y * displayScale,
                  }}
                />
                <span aria-hidden="true" className="photo-editor-mask" />
              </div>
              <div className="photo-editor-preview-column">
                <span>Vista previa</span>
                <div className="photo-editor-live-preview">
                  {preview && <img alt="Vista previa del avatar" src={preview} />}
                </div>
                <small>Así aparecerá tu avatar</small>
              </div>
            </div>
            <label className="photo-zoom-control">
              <span><ZoomIn size={17} aria-hidden="true" /> Zoom</span>
              <input
                aria-label="Zoom de la fotografía"
                max="3"
                min="1"
                onChange={handleZoomChange}
                step="0.01"
                type="range"
                value={zoom}
              />
              <output>{zoom.toFixed(1)}×</output>
            </label>
            <p className="photo-editor-hint">Arrastra la imagen para moverla. La foto final se optimiza a un máximo de 220 KB.</p>
          </>
        ) : (
          <p className="photo-editor-error" role="alert">{error || 'Preparando imagen…'}</p>
        )}
        {error && image && <p className="photo-editor-error" role="alert">{error}</p>}
        <footer className="photo-editor-actions">
          <button className="secondary-button" onClick={onCancel} type="button">Cancelar</button>
          <button className="secondary-button" disabled={!image} onClick={resetPosition} type="button">
            <RotateCcw size={16} aria-hidden="true" /> Restablecer posición
          </button>
          <button className="primary-button" disabled={!image || isSaving} onClick={savePhoto} type="button">
            {isSaving ? 'Guardando…' : 'Guardar fotografía'}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default ProfilePhotoEditor
