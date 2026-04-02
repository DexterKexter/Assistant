'use client'

import { useMemo, useState } from 'react'

// Mercator projection helpers
function lonToX(lon: number, w: number): number {
  return ((lon + 180) / 360) * w
}
function latToY(lat: number, h: number): number {
  const latRad = (lat * Math.PI) / 180
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
  return h / 2 - (mercN * h) / (2 * Math.PI)
}

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

interface ShipmentData {
  origin: string | null
  departure_date: string | null
}

interface Props {
  shipments: ShipmentData[]
}

const YEAR_FILTERS = ['Все', '2024', '2025', '2026']

// Generate dot grid for world map background
function generateDotGrid(w: number, h: number, spacing: number) {
  const dots: { x: number; y: number; visible: boolean }[] = []
  // Rough land mass boundaries for dot visibility
  for (let y = spacing; y < h; y += spacing) {
    for (let x = spacing; x < w; x += spacing) {
      // Convert back to lat/lon to check if on land (rough approximation)
      const lon = (x / w) * 360 - 180
      const mercN = ((h / 2 - y) * 2 * Math.PI) / h
      const lat = (Math.atan(Math.exp(mercN)) - Math.PI / 4) * 2 * (180 / Math.PI)

      // Rough land check
      const isLand =
        // North America
        (lat > 15 && lat < 72 && lon > -170 && lon < -50) ||
        // South America
        (lat > -56 && lat < 15 && lon > -82 && lon < -34) ||
        // Europe
        (lat > 35 && lat < 72 && lon > -12 && lon < 40) ||
        // Africa
        (lat > -35 && lat < 38 && lon > -18 && lon < 52) ||
        // Asia
        (lat > 5 && lat < 75 && lon > 40 && lon < 180) ||
        // Southeast Asia / Indonesia
        (lat > -10 && lat < 20 && lon > 95 && lon < 145) ||
        // Australia
        (lat > -45 && lat < -10 && lon > 112 && lon < 155) ||
        // Middle East
        (lat > 12 && lat < 42 && lon > 25 && lon < 65)

      dots.push({ x, y, visible: isLand })
    }
  }
  return dots
}

export function DashboardMap({ shipments }: Props) {
  const [activeYear, setActiveYear] = useState('Все')
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)

  const W = 900
  const H = 500

  const dots = useMemo(() => generateDotGrid(W, H, 10), [])

  const origins = useMemo(() => {
    const counts: Record<string, number> = {}
    shipments.forEach(s => {
      if (!s.origin) return
      if (activeYear !== 'Все' && (!s.departure_date || !s.departure_date.startsWith(activeYear))) return
      counts[s.origin] = (counts[s.origin] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, coord: getCoord(name) }))
      .filter(o => o.coord)
      .sort((a, b) => b.count - a.count)
  }, [shipments, activeYear])

  const total = origins.reduce((s, o) => s + o.count, 0)

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#f0f2f8]">
      {/* Year filter */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-lg border border-slate-200/50">
        {YEAR_FILTERS.map(y => (
          <button key={y} onClick={() => setActiveYear(y)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              activeYear === y ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}>{y}</button>
        ))}
      </div>

      {/* Stats panel */}
      <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/50 w-[220px] p-4">
        <p className="text-[28px] font-bold text-slate-900 leading-none font-heading">{total.toLocaleString()}</p>
        <p className="text-[11px] text-slate-400 mt-1 mb-3">Контейнеров {activeYear === 'Все' ? 'за всё время' : `за ${activeYear}`}</p>
        <div className="space-y-2">
          {origins.slice(0, 6).map((o, i) => {
            const pct = Math.round((o.count / (origins[0]?.count || 1)) * 100)
            const color = COLORS[i % COLORS.length]
            return (
              <div key={o.name} className="flex items-center gap-2"
                onMouseEnter={() => setHoveredCity(o.name)}
                onMouseLeave={() => setHoveredCity(null)}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[12px] text-slate-700 flex-1 truncate">{o.name}</span>
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">{o.count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* SVG Map */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 400 }}>
        {/* Background dots */}
        {dots.map((d, i) =>
          d.visible ? (
            <circle key={i} cx={d.x} cy={d.y} r={2.2} fill="#c8cfe0" opacity={0.5} />
          ) : null
        )}

        {/* City markers */}
        {origins.map((o, i) => {
          if (!o.coord) return null
          const x = lonToX(o.coord[1], W)
          const y = latToY(o.coord[0], H)
          const color = COLORS[i % COLORS.length]
          const r = Math.max(4, Math.min(12, 3 + o.count * 0.05))
          const isHovered = hoveredCity === o.name

          return (
            <g key={o.name}
              onMouseEnter={() => setHoveredCity(o.name)}
              onMouseLeave={() => setHoveredCity(null)}
              style={{ cursor: 'pointer' }}>
              {/* Glow */}
              <circle cx={x} cy={y} r={r * 2.5} fill={color} opacity={0.08}>
                <animate attributeName="r" values={`${r * 2};${r * 3};${r * 2}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite" />
              </circle>
              {/* Main dot */}
              <circle cx={x} cy={y} r={isHovered ? r * 1.4 : r} fill={color}
                stroke="white" strokeWidth={1.5}
                style={{ transition: 'r 0.2s ease, filter 0.2s ease', filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none' }}>
                <animate attributeName="r" from="0" to={String(r)} dur="0.5s" begin={`${i * 0.08}s`} fill="freeze" />
              </circle>

              {/* Label on hover */}
              {isHovered && (
                <g>
                  <rect x={x - 50} y={y - r - 38} width={100} height={30} rx={8}
                    fill="white" stroke="#e2e8f0" strokeWidth={1}
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }} />
                  <text x={x} y={y - r - 26} textAnchor="middle"
                    style={{ fontSize: 10, fontWeight: 700, fill: '#0f172a', fontFamily: 'var(--font-sans)' }}>
                    {o.name}
                  </text>
                  <text x={x} y={y - r - 14} textAnchor="middle"
                    style={{ fontSize: 12, fontWeight: 800, fill: color, fontFamily: 'var(--font-heading)' }}>
                    {o.count.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
