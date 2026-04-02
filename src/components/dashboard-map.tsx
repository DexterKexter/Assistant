'use client'

import { useEffect, useRef, useState } from 'react'
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
  'Пусан': [35.1796, 129.0756],
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

// Color palette for markers
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6',
]

interface ShipmentData {
  origin: string | null
  departure_date: string | null
}

interface Props {
  shipments: ShipmentData[]
}

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

  const renderMarkers = (map: L.Map, year: string) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const origins = getOriginCounts(year)
    const allCoords: [number, number][] = []

    origins.forEach((o, i) => {
      const coord = getCoord(o.name)
      if (!coord) return
      allCoords.push(coord)

      const color = COLORS[i % COLORS.length]
      const size = Math.max(10, Math.min(18, 8 + o.count * 0.1))
      const delay = i * 80

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:${size}px;height:${size}px;animation:marker-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards;opacity:0;transform:translate(-50%,-50%) scale(0)">
            <div style="width:100%;height:100%;border-radius:50%;background:${color};box-shadow:0 0 12px ${color}60, 0 2px 8px rgba(0,0,0,0.15);border:2px solid white"></div>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const tooltipHtml = `
        <div style="display:flex;align-items:center;gap:8px;padding:2px 0">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <div>
            <div style="font-weight:700;font-size:13px;color:#0f172a">${o.name}</div>
            <div style="font-size:18px;font-weight:800;color:${color};line-height:1.2">${o.count.toLocaleString()}</div>
          </div>
        </div>
      `

      const marker = L.marker(coord, { icon, interactive: true }).addTo(map).bindTooltip(
        tooltipHtml,
        {
          permanent: false,
          direction: 'top',
          offset: [0, -size / 2 - 8],
          className: 'card-tooltip',
        }
      )
      markersRef.current.push(marker)
    })

    if (allCoords.length > 1) {
      map.flyToBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 4, duration: 0.8 })
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
    }).setView([30, 60], 3)

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

  const totalForYear = getOriginCounts(activeYear).reduce((sum, o) => sum + o.count, 0)
  const uniqueCities = getOriginCounts(activeYear).length

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8ecf8 50%, #f5f0ff 100%)' }}>
      {/* Map */}
      <div ref={mapRef} style={{ height: 360, width: '100%' }} />

      {/* Year filter overlay */}
      <div className="absolute top-4 left-4 z-[500] flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-lg border border-slate-200/50">
        {YEAR_FILTERS.map(y => (
          <button
            key={y}
            onClick={() => setActiveYear(y)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              activeYear === y
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 z-[500] flex items-center gap-2">
        <div className="bg-white/90 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-lg border border-slate-200/50 flex items-center gap-5">
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Контейнеров</p>
            <p className="text-[20px] font-bold text-slate-900 leading-tight">{totalForYear.toLocaleString()}</p>
          </div>
          <div className="w-px h-9 bg-slate-200" />
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Направлений</p>
            <p className="text-[20px] font-bold text-slate-900 leading-tight">{uniqueCities}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
