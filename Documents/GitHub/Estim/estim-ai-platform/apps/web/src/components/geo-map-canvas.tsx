'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useState } from 'react'

export type GeoSite = {
  id: string
  name: string
  lat: number
  lng: number
  status: string
}

export default function GeoMapCanvas({
  sites,
  height = 420,
}: {
  sites: GeoSite[]
  height?: number
}) {
  const [zoom, setZoom] = useState(6)

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <MapContainer
        center={[25.0, 55.0]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
        whenReady={() => setZoom(10)}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {sites.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}>
            <Popup>
              <strong>{s.name}</strong>
              <br />
              <span
                className="badge"
                style={{
                  color: s.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                  fontWeight: 700,
                }}
              >
                {s.status}
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}