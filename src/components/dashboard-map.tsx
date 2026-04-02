'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const COORDS: Record<string, [number, number]> = {
  'Дубай': [25.2, 55.3],
  'Чингдао': [36.1, 120.4],
  'Гуаньчжоу': [23.1, 113.3],
  'Шанхай': [31.2, 121.5],
  'Шэньчжень': [22.5, 114.1],
  'Тяньцзинь': [39.1, 117.2],
  'Чуньцинь': [29.4, 106.9],
  'Тайвань': [25.0, 121.6],
  'Корея': [37.6, 127.0],
  'Пусан': [35.2, 129.1],
  'Иокохама, Япония': [35.4, 139.6],
  'Иокохама Япония': [35.4, 139.6],
  'Япония': [35.7, 139.7],
  'Германия': [51.2, 10.5],
  'США': [40.7, -74.0],
  'Австралия': [-33.9, 151.2],
  'Швейцария': [46.8, 8.2],
  'Гонконг': [22.3, 114.2],
  'Шри Ланка': [7.9, 80.8],
  'Чэнгду': [30.6, 104.1],
  'Дэчжоу': [37.5, 116.3],
  'Чжуншань': [22.5, 113.4],
}

function getCoord(name: string): [number, number] | null {
  if (COORDS[name]) return COORDS[name]
  for (const [key, val] of Object.entries(COORDS)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) return val
  }
  return null
}

const COLORS = ['#6366f1', '#f97316', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#14b8a6']

interface ShipmentData { origin: string | null; departure_date: string | null }
interface Props { shipments: ShipmentData[] }

const YEAR_FILTERS = ['Все', '2024', '2025', '2026']

export function DashboardMap({ shipments }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [activeYear, setActiveYear] = useState('Все')

  const getOriginCounts = (year: string) => {
    const counts: Record<string, number> = {}
    shipments.forEach(s => {
      if (!s.origin) return
      if (year !== 'Все' && (!s.departure_date || !s.departure_date.startsWith(year))) return
      counts[s.origin] = (counts[s.origin] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  const origins = useMemo(() => getOriginCounts(activeYear), [shipments, activeYear])
  const total = origins.reduce((s, o) => s + o.count, 0)

  const renderMarkers = (map: L.Map, year: string) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const data = getOriginCounts(year)
    const allCoords: [number, number][] = []

    data.forEach((o, i) => {
      const coord = getCoord(o.name)
      if (!coord) return
      allCoords.push(coord)

      const color = COLORS[i % COLORS.length]
      const size = Math.max(12, Math.min(40, 10 + o.count * 0.08))

      const icon = L.divIcon({
        className: '',
        html: `<div class="dash-marker" style="width:${size}px;height:${size}px;background:${color};font-size:${size > 24 ? 11 : 9}px;animation-delay:${i * 60}ms;opacity:0;box-shadow:0 0 12px ${color}50, 0 2px 8px rgba(0,0,0,0.12);border:2px solid rgba(255,255,255,0.7)">${o.count > 9 ? o.count : ''}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const tooltipHtml = `
        <div style="display:flex;align-items:center;gap:8px;padding:2px 0">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <div>
            <div style="font-weight:700;font-size:13px;color:#0f172a">${o.name}</div>
            <div style="font-size:16px;font-weight:800;color:${color};line-height:1.2">${o.count.toLocaleString()}</div>
          </div>
        </div>
      `

      const marker = L.marker(coord, { icon, interactive: true }).addTo(map).bindTooltip(
        tooltipHtml,
        { permanent: false, direction: 'top', offset: [0, -size / 2 - 8], className: 'card-tooltip' }
      )
      markersRef.current.push(marker)
    })

    if (allCoords.length > 1) {
      map.flyToBounds(L.latLngBounds(allCoords), { padding: [60, 60], maxZoom: 4, duration: 0.8 })
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView([25, 60], 3)

    // Stamen Toner Lite — clean minimal style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    renderMarkers(map, activeYear)
    mapInstance.current = map

    return () => { map.remove(); mapInstance.current = null }
  }, [shipments])

  useEffect(() => {
    if (!mapInstance.current) return
    renderMarkers(mapInstance.current, activeYear)
  }, [activeYear])

  return (
    <div className="relative" style={{ height: 'calc(100vh - 120px)', minHeight: 480 }}>
      {/* Map fills entire area */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Year filter overlay */}
      <div className="absolute top-4 left-4 z-[500] flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-lg border border-slate-200/50">
        {YEAR_FILTERS.map(y => (
          <button key={y} onClick={() => setActiveYear(y)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              activeYear === y ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}>{y}</button>
        ))}
      </div>

      {/* Stats panel */}
      <div className="absolute top-4 right-4 z-[500] bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/50 w-[220px] p-4">
        <p className="text-[28px] font-bold text-slate-900 leading-none font-heading">{total.toLocaleString()}</p>
        <p className="text-[11px] text-slate-400 mt-1 mb-3">Контейнеров {activeYear === 'Все' ? 'за всё время' : `за ${activeYear}`}</p>
        <div className="space-y-2">
          {origins.slice(0, 6).map((o, i) => (
            <div key={o.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[12px] text-slate-700 flex-1 truncate">{o.name}</span>
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">{o.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
