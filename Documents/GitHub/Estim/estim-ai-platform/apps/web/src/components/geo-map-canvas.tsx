'use client'

import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

export type GeoSite = {
  id: string
  name: string
  lat: number
  lng: number
  status: string
}

const MARKER_COLORS: Record<string, string> = {
  active: '#22c55e',
  mobilizing: '#3b82f6',
  closing: '#f59e0b',
}

function markerIcon(status: string) {
  const color = MARKER_COLORS[status] ?? '#6366f1'
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 0 0 4px ${color}33"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  })
}

function computeView(sites: GeoSite[]): { center: [number, number]; zoom: number } {
  if (sites.length === 0) return { center: [39.5, -98.35], zoom: 4 }
  const center: [number, number] = [
    sites.reduce((sum, site) => sum + site.lat, 0) / sites.length,
    sites.reduce((sum, site) => sum + site.lng, 0) / sites.length,
  ]
  const zoom = sites.length === 1 ? 9 : sites.length <= 3 ? 5 : 4
  return { center, zoom }
}

/**
 * Client-only Leaflet canvas. Loaded through `next/dynamic` with `ssr: false`
 * because react-leaflet touches `window` at module scope.
 */
export default function GeoMapCanvas({
  sites,
  height = 420,
}: {
  sites: GeoSite[]
  height?: number
}) {
  const view = computeView(sites)

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <MapContainer
        key={sites.map((site) => site.id).join('|') || 'empty'}
        center={view.center}
        zoom={view.zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sites.map((site) => (
          <Marker key={site.id} position={[site.lat, site.lng]} icon={markerIcon(site.status)}>
            <Popup>
              <strong>{site.name}</strong>
              <br />
              <span style={{ textTransform: 'capitalize' }}>{site.status}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
