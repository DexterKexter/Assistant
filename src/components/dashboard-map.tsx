'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import DottedMap from 'dotted-map/without-countries'
import mapJson from './map-precomputed.json'

/* ── Coordinate dictionary ── */
const COORDS: Record<string, { lat: number; lng: number }> = {
  // Origins
  'Дубай':     { lat: 25.2, lng: 55.3 },
  'Чингдао':   { lat: 36.1, lng: 120.4 },
  'Гуаньчжоу': { lat: 23.1, lng: 113.3 },
  'Шанхай':    { lat: 31.2, lng: 121.5 },
  'Шэньчжень': { lat: 22.5, lng: 114.1 },
  'Тяньцзинь': { lat: 39.1, lng: 117.2 },
  'Чуньцинь':  { lat: 29.4, lng: 106.9 },
  'Тайвань':   { lat: 25.0, lng: 121.6 },
  'Корея':     { lat: 37.6, lng: 127.0 },
  'Пусан':     { lat: 35.2, lng: 129.1 },
  'Иокохама, Япония': { lat: 35.4, lng: 139.6 },
  'Иокохама Япония':  { lat: 35.4, lng: 139.6 },
  'Япония':    { lat: 35.7, lng: 139.7 },
  'Германия':  { lat: 51.2, lng: 10.5 },
  'США':       { lat: 40.7, lng: -74.0 },
  'Австралия': { lat: -33.9, lng: 151.2 },
  'Швейцария': { lat: 46.8, lng: 8.2 },
  'Гонконг':   { lat: 22.3, lng: 114.2 },
  'Шри Ланка': { lat: 7.9, lng: 80.8 },
  'Чэнгду':    { lat: 30.6, lng: 104.1 },
  'Дэчжоу':    { lat: 37.5, lng: 116.3 },
  'Чжуншань':  { lat: 22.5, lng: 113.4 },
  // Destinations — KZ
  'Алматы':      { lat: 43.2, lng: 76.9 },
  'Астана':      { lat: 51.1, lng: 71.4 },
  'Шымкент':     { lat: 42.3, lng: 69.6 },
  'Караганда':   { lat: 49.8, lng: 73.1 },
  'Атырау':      { lat: 47.1, lng: 51.9 },
  'Актау':       { lat: 43.6, lng: 51.1 },
  'Актобе':      { lat: 50.3, lng: 57.2 },
  'Тараз':       { lat: 42.9, lng: 71.4 },
  'Костанай':    { lat: 53.2, lng: 63.6 },
  'Павлодар':    { lat: 52.3, lng: 76.9 },
  'Семей':       { lat: 50.4, lng: 80.2 },
  // Destinations — RU
  'Москва':         { lat: 55.8, lng: 37.6 },
  'Челябинск':      { lat: 55.2, lng: 61.4 },
  'Новосибирск':    { lat: 55.0, lng: 82.9 },
  'Екатеринбург':   { lat: 56.8, lng: 60.6 },
  'Самара':         { lat: 53.2, lng: 50.1 },
  'Казань':         { lat: 55.8, lng: 49.1 },
  'Санкт-Петербург': { lat: 59.9, lng: 30.3 },
  'Красноярск':     { lat: 56.0, lng: 92.9 },
  'Омск':           { lat: 54.9, lng: 73.4 },
  'Уфа':            { lat: 54.7, lng: 55.9 },
  'Тула':           { lat: 54.2, lng: 37.6 },
  'Бийск':          { lat: 52.5, lng: 85.2 },
  'Барнаул':        { lat: 53.4, lng: 83.8 },
  'Оренбург':       { lat: 51.8, lng: 55.1 },
  'Пермь':          { lat: 58.0, lng: 56.2 },
  'Тюмень':         { lat: 57.2, lng: 65.5 },
  'Воронеж':        { lat: 51.7, lng: 39.2 },
  'Краснодар':      { lat: 45.0, lng: 39.0 },
  'Ростов-на-Дону': { lat: 47.2, lng: 39.7 },
  'Волгоград':      { lat: 48.7, lng: 44.5 },
  // Destinations — other
  'Ташкент':     { lat: 41.3, lng: 69.3 },
  'Бишкек':      { lat: 42.9, lng: 74.6 },
  // Stations
  'Актау Порт':  { lat: 43.6, lng: 51.1 },
  'Алтынколь':   { lat: 45.4, lng: 82.6 },
  'Сары-агаш':   { lat: 41.5, lng: 68.5 },
  'Темир-Баба':  { lat: 39.5, lng: 54.4 },
}

function getCoord(name: string) {
  if (!name) return null
  if (COORDS[name]) return COORDS[name]
  for (const [key, val] of Object.entries(COORDS)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) return val
  }
  return null
}

/* ── Precompute SVG positions once ── */
const svgPosCache = new Map<string, { x: number; y: number }>()

function buildSvgPosCache() {
  if (svgPosCache.size > 0) return
  // Add all known coords as pins to one map and extract positions
  const entries = Object.entries(COORDS)
  for (const [name, coord] of entries) {
    const map = new DottedMap({ map: mapJson as any })
    map.addPin({ lat: coord.lat, lng: coord.lng, svgOptions: { color: '#000', radius: 0.1 } })
    const pts = map.getPoints()
    const pin = pts.find((p: any) => p.lat !== undefined && Math.abs(p.lat - coord.lat) < 1.5)
    if (pin) svgPosCache.set(name, { x: pin.x, y: pin.y })
  }
}

function getSvgPos(name: string): { x: number; y: number } | null {
  buildSvgPosCache()
  if (svgPosCache.has(name)) return svgPosCache.get(name)!
  // Try fuzzy match
  for (const [key, pos] of svgPosCache.entries()) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) return pos
  }
  return null
}

/* ── Bezier curve ── */
function bezierPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const arc = Math.min(dist * 0.35, 18)
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2 - arc
  return `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`
}

/* ── Constants ── */
const COLORS = ['#6366f1', '#f97316', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#14b8a6']
const YEAR_FILTERS = ['Все', '2024', '2025', '2026']

/* ── Types ── */
interface ShipmentData { origin: string | null; departure_date: string | null; destination_city: string | null; destination_station: string | null }
interface Props { shipments: ShipmentData[] }
interface OriginPin { name: string; count: number; svgPos: { x: number; y: number }; color: string; idx: number }
interface RouteInfo { dest: string; destPos: { x: number; y: number }; count: number }

/* ── Component ── */
export function DashboardMap({ shipments }: Props) {
  const [activeYear, setActiveYear] = useState('Все')
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (activeYear === 'Все') return shipments
    return shipments.filter(s => s.departure_date?.startsWith(activeYear))
  }, [shipments, activeYear])

  /* All origins with SVG positions */
  const origins: OriginPin[] = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(s => { if (s.origin) counts[s.origin] = (counts[s.origin] || 0) + 1 })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count], idx) => {
        const svgPos = getSvgPos(name)
        return svgPos ? { name, count, svgPos, color: COLORS[idx % COLORS.length], idx } : null
      })
      .filter(Boolean) as OriginPin[]
  }, [filtered])

  const total = origins.reduce((s, o) => s + o.count, 0)

  /* Precompute ALL routes per origin (so hover is instant) */
  const routesByOrigin = useMemo(() => {
    const map = new Map<string, RouteInfo[]>()
    const byOrigin: Record<string, Record<string, number>> = {}
    filtered.forEach(s => {
      if (!s.origin) return
      const dest = s.destination_city || s.destination_station
      if (!dest) return
      if (!byOrigin[s.origin]) byOrigin[s.origin] = {}
      byOrigin[s.origin][dest] = (byOrigin[s.origin][dest] || 0) + 1
    })
    for (const [origin, dests] of Object.entries(byOrigin)) {
      const routes: RouteInfo[] = []
      for (const [dest, count] of Object.entries(dests)) {
        const destPos = getSvgPos(dest)
        if (destPos) routes.push({ dest, destPos, count })
      }
      routes.sort((a, b) => b.count - a.count)
      map.set(origin, routes)
    }
    return map
  }, [filtered])

  /* Base map dots */
  const mapDots = useMemo(() => {
    const map = new DottedMap({ map: mapJson as any })
    return map.getPoints().map((p: any) => ({ x: p.x as number, y: p.y as number }))
  }, [])

  /* Current routes & tooltip position */
  const activeOrigin = origins.find(o => o.name === selectedOrigin)
  const activeRoutes = selectedOrigin ? (routesByOrigin.get(selectedOrigin) || []) : []

  const tooltipPos = useMemo(() => {
    if (!activeOrigin || !svgRef.current || !containerRef.current) return null
    const svgRect = svgRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const rawX = activeOrigin.svgPos.x / 198 * svgRect.width + (svgRect.left - containerRect.left)
    const rawY = activeOrigin.svgPos.y / 100 * svgRect.height + (svgRect.top - containerRect.top)
    // Clamp: keep tooltip within container bounds
    const tooltipW = 140
    const tooltipH = 80
    const px = Math.max(tooltipW / 2 + 8, Math.min(rawX, containerRect.width - tooltipW / 2 - 8))
    const showBelow = rawY < tooltipH + 16
    return { px, py: rawY, showBelow }
  }, [activeOrigin])

  return (
    <div className="flex flex-col">
      {/* Filter row */}
      <div className="flex items-center gap-1 px-4 py-2">
        {YEAR_FILTERS.map(y => (
          <button key={y} onClick={() => setActiveYear(y)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              activeYear === y ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}>{y}</button>
        ))}
      </div>

      {/* Map + Stats */}
      <div className="flex">
        {/* SVG Map */}
        <div ref={containerRef} className="relative flex-1 min-w-0 overflow-hidden pt-8 px-4 pb-4">
          <svg ref={svgRef} viewBox="0 0 198 100" className="w-full h-auto block" xmlns="http://www.w3.org/2000/svg">
            {/* Base dots — single path for performance */}
            <g opacity={selectedOrigin ? 0.35 : 0.6}>
              {mapDots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={0.38} fill="#b0b8c8" />
              ))}
            </g>

            {/* Route curves — only when hovered */}
            {activeOrigin && activeRoutes.map((r, i) => (
              <g key={`route-${r.dest}`}>
                <path
                  d={bezierPath(activeOrigin.svgPos, r.destPos)}
                  fill="none"
                  stroke={activeOrigin.color}
                  strokeWidth={Math.max(0.15, Math.min(0.5, r.count * 0.005))}
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                  strokeDasharray="200"
                  strokeDashoffset="200"
                  style={{ animation: `routeDraw 0.6s ease-out ${i * 0.04}s forwards` }}
                />
                {/* Destination dot */}
                <circle
                  cx={r.destPos.x} cy={r.destPos.y} r={0.7}
                  fill={activeOrigin.color} opacity={0}
                  style={{ animation: `fadeIn 0.3s ease-out ${i * 0.04 + 0.2}s forwards` }}
                />
                <circle cx={r.destPos.x} cy={r.destPos.y} r={0.25} fill="white" opacity={0}
                  style={{ animation: `fadeIn 0.3s ease-out ${i * 0.04 + 0.25}s forwards` }}
                />
                {/* Dest label — only top 6 */}
                {i < 6 && (
                  <text
                    x={r.destPos.x} y={r.destPos.y - 1.5}
                    textAnchor="middle" fill="#475569" fontSize="1.6" fontWeight="600"
                    fontFamily="system-ui, sans-serif" opacity={0}
                    style={{ animation: `fadeIn 0.3s ease-out ${i * 0.04 + 0.3}s forwards` }}
                  >
                    {r.dest}
                  </text>
                )}
              </g>
            ))}

            {/* Origin pins — no glow filters for performance */}
            {origins.slice(0, 12).map((o) => {
              const isActive = selectedOrigin === o.name
              const isDimmed = selectedOrigin !== null && !isActive
              const r = Math.max(0.8, Math.min(2.5, 0.6 + o.count * 0.005))
              return (
                <g key={o.name}
                  onClick={() => setSelectedOrigin(prev => prev === o.name ? null : o.name)}
                  cursor="pointer"
                >
                  {/* Pulse ring — simple, no animate */}
                  {isActive && (
                    <circle cx={o.svgPos.x} cy={o.svgPos.y} r={r * 2.5} fill={o.color} opacity={0.12} />
                  )}
                  {/* Main dot */}
                  <circle
                    cx={o.svgPos.x} cy={o.svgPos.y}
                    r={isActive ? r * 1.4 : r}
                    fill={o.color}
                    opacity={isDimmed ? 0.25 : 0.9}
                  />
                  {/* Inner white */}
                  <circle cx={o.svgPos.x} cy={o.svgPos.y} r={r * 0.3} fill="white" opacity={isDimmed ? 0.15 : 0.85} />
                  {/* Hit area */}
                  <circle cx={o.svgPos.x} cy={o.svgPos.y} r={4} fill="transparent" />
                </g>
              )
            })}
          </svg>

          {/* Tooltip — compact, clamped to container */}
          {activeOrigin && tooltipPos && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: tooltipPos.px,
                top: tooltipPos.showBelow ? tooltipPos.py + 12 : tooltipPos.py - 8,
                transform: tooltipPos.showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              }}
            >
              <div className="bg-white/95 backdrop-blur-md rounded-lg px-2.5 py-1.5 shadow-lg border border-slate-200/60 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: activeOrigin.color }} />
                  <span className="text-[11px] font-bold text-slate-800">{activeOrigin.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{activeOrigin.count}</span>
                </div>
                {activeRoutes.length > 0 && (
                  <div className="mt-1 space-y-px">
                    {activeRoutes.slice(0, 3).map(r => (
                      <div key={r.dest} className="flex items-center gap-1 text-[9px] text-slate-500">
                        <span className="text-slate-300">→</span>
                        <span>{r.dest}</span>
                        <span className="ml-auto font-semibold text-slate-400">{r.count}</span>
                      </div>
                    ))}
                    {activeRoutes.length > 3 && (
                      <div className="text-[8px] text-slate-400">+{activeRoutes.length - 3} ещё</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats panel — hidden on mobile */}
        <div className="hidden md:flex w-[200px] xl:w-[230px] shrink-0 border-l border-slate-200/50 p-4 flex-col justify-center">
          <p className="text-[28px] font-bold text-slate-900 leading-none font-heading">{total.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1 mb-4">Контейнеров {activeYear === 'Все' ? 'за всё время' : `за ${activeYear}`}</p>
          <div className="space-y-2.5">
            {origins.slice(0, 6).map((o) => (
              <div key={o.name}
                className={`flex items-center gap-2 cursor-pointer rounded-md px-1 -mx-1 py-0.5 transition-all ${
                  selectedOrigin === o.name ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedOrigin(prev => prev === o.name ? null : o.name)}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: o.color }} />
                <span className="text-[12px] text-slate-700 flex-1 truncate">{o.name}</span>
                <span className="text-[12px] font-semibold text-slate-500 shrink-0">{o.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes routeDraw { to { stroke-dashoffset: 0; } }
        @keyframes fadeIn { to { opacity: 0.9; } }
      `}</style>
    </div>
  )
}
