import L from 'leaflet'
import { useEffect, useRef } from 'react'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

const SINALOA_CENTER = [25, -107.5]
const INITIAL_ZOOM = 6
const SELECTED_ZOOM = 15
const markerIconOptions = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function StoreLocationMap({ latitude, longitude, onLocationChange, interactive = true }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onLocationChangeRef = useRef(onLocationChange)

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange
  }, [onLocationChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const map = L.map(container).setView(SINALOA_CENTER, INITIAL_ZOOM)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    function placeMarker(location) {
      if (!markerRef.current) {
        markerRef.current = L.marker(location, {
          draggable: true,
          icon: markerIconOptions,
        }).addTo(map)
        markerRef.current.on('dragend', (event) => {
          const position = event.target.getLatLng()
          onLocationChangeRef.current(position.lat, position.lng)
        })
      } else {
        markerRef.current.setLatLng(location)
      }

      onLocationChangeRef.current(location.lat, location.lng)
    }

    const handleMapClick = (event) => placeMarker(event.latlng)
    map.on('click', handleMapClick)

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => map.invalidateSize())
    resizeObserver?.observe(container)

    const handleWindowResize = () => map.invalidateSize()
    window.addEventListener('resize', handleWindowResize)
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      map.off('click', handleMapClick)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (latitude == null || longitude == null) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    const position = L.latLng(Number(latitude), Number(longitude))
    if (!markerRef.current) {
      markerRef.current = L.marker(position, {
        draggable: true,
        icon: markerIconOptions,
      }).addTo(map)
      markerRef.current.on('dragend', (event) => {
        const nextPosition = event.target.getLatLng()
        onLocationChangeRef.current(nextPosition.lat, nextPosition.lng)
      })
      map.setView(position, SELECTED_ZOOM)
    } else {
      markerRef.current.setLatLng(position)
    }
  }, [latitude, longitude])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getContainer().style.pointerEvents = interactive ? 'auto' : 'none'
    }
  }, [interactive])

  return (
    <div
      aria-label="Mapa interactivo para seleccionar la ubicación de la tienda"
      className="store-location-map"
      ref={containerRef}
    />
  )
}

export default StoreLocationMap
