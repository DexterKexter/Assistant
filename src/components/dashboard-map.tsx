'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const COORDS: Record<string, [number, number]> = {
  'Дубай': [25.2048, 55.2708],
  'Чингдао': [36.0671, 120.3826],
  'Гуаньчжоу': [23.1291, 113.2644],
  'Шанхай': [31.2304, 121.4737],
  'Шэньчжень': [22.5431, 114.0579],
  'Тяньцзинь': [39.0842, 117.2009],
  'Чуньцинь': [29.4316, 106.9123],
  'Тайвань': [25.0330, 121.5654],
  'Корея': [37.5665, 126.9780],
  'Иокохама, Япония': [35.4437, 139.6380],
  'Иокохама Япония': [35.4437, 139.6380],
  'Япония': [35.6762, 139.6503],
  'Германия': [51.1657, 10.4515],
  'США': [40.7128, -74.0060],
  'Австралия': [-33.8688, 151.2093],
  'Швейцария': [46.8182, 8.2275],
  'Гонконг': [22.3193, 114.1694],
  'Шри Ланка': [7.8731, 80.7718],
  'Чэнгду': [30.5728, 104.0668],
  'Дэчжоу': [37.4513, 116.3105],
  'Чжуншань': [22.5176, 113.3926],
}

function getCoord(name: string): [number, number] | null {
  if (COORDS[name]) return COORDS[name]
  for (const [key, val] of Object.entries(COORDS)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) return val
  }
  return null
}

interface Props {
  origins: { name: string; count: number }[]
}

export function DashboardMap({ origins }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView([35, 65], 3)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)

    // Add origin markers with counts
    const allCoords: [number, number][] = []
    origins.forEach(o => {
      const coord = getCoord(o.name)
      if (!coord) return
      allCoords.push(coord)

      const size = Math.max(28, Math.min(48, 20 + o.count * 0.3))
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(99,102,241,0.85);border:2px solid white;box-shadow:0 2px 12px rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:${size > 36 ? 13 : 11}px;font-weight:700;cursor:pointer">${o.count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      L.marker(coord, { icon, interactive: true }).addTo(map).bindTooltip(
        `<b>${o.name}</b><br/><span style="opacity:0.7">${o.count} контейнеров за год</span>`,
        { permanent: false, direction: 'top', offset: [0, -size / 2 - 4], className: 'map-tooltip' }
      )
    })

    if (allCoords.length > 1) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30], maxZoom: 5 })
    }

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [origins])

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div ref={mapRef} style={{ height: 280, width: '100%' }} />
    </div>
  )
}
