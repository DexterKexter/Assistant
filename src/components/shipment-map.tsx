'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// City coordinates lookup
const COORDS: Record<string, [number, number]> = {
  // Origins
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
  // Border crossings
  'Актау Порт': [43.6500, 51.1500],
  'Алтынколь': [45.3167, 82.5833],
  'Алтынкол': [45.3167, 82.5833],
  'Достык': [45.3833, 82.4833],
  'Сары-агаш': [41.1833, 68.8000],
  'Темир-Баба': [39.4833, 54.0333],
  'Калжат': [44.7500, 79.0500],
  // KZ cities
  'Алматы': [43.2220, 76.8512],
  'Астана': [51.1694, 71.4491],
  'Шымкент': [42.3417, 69.5969],
  'Актау': [43.6500, 51.1500],
  'Актобе': [50.2839, 57.1670],
  'Караганды': [49.8028, 73.1053],
  'Кызылорда': [44.8488, 65.5229],
  'Семей': [50.4269, 80.2544],
  'Оскемен': [49.9480, 82.6283],
  'Тараз': [42.9000, 71.3667],
  'Петропавл': [54.8667, 69.1333],
  'Каскелен': [43.2000, 76.6167],
  // RU cities
  'Москва': [55.7558, 37.6173],
  'Челябинск': [55.1644, 61.4368],
  'Новосибирск': [55.0084, 82.9357],
  'Екатеринбург': [56.8389, 60.6057],
  'Красноярск': [56.0153, 92.8932],
  'Омск': [54.9885, 73.3242],
  'Барнаул': [53.3481, 83.7798],
  'Иркутск': [52.2870, 104.3050],
  'Краснодар': [45.0355, 38.9753],
  'Тула': [54.1931, 37.6171],
  'Санкт-Петербург': [59.9343, 30.3351],
  'Тольятти': [53.5078, 49.4205],
  'Самара': [53.1959, 50.1002],
  'Ростов': [47.2357, 39.7015],
  'Тюмень': [57.1522, 65.5272],
  'Бийск': [52.5394, 85.2134],
  'Махачкала': [42.9849, 47.5047],
  'Грозный': [43.3179, 45.6981],
  'Киров': [58.6036, 49.6680],
  'Брянск': [53.2521, 34.3717],
  'Симферополь': [44.9521, 34.1024],
  'Минск': [53.9006, 27.5590],
  'Пинск': [52.1115, 26.1013],
  // Fallbacks
  'Казахстан': [48.0196, 66.9237],
  'Россия': [61.5240, 105.3188],
}

function getCoord(name: string | null): [number, number] | null {
  if (!name) return null
  const trimmed = name.trim()
  if (COORDS[trimmed]) return COORDS[trimmed]
  // Fuzzy match
  for (const [key, val] of Object.entries(COORDS)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase())) return val
  }
  return null
}

interface Props {
  origin: string | null
  border: string | null
  destination: string | null
}

export function ShipmentMap({ origin, border, destination }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const points: { coord: [number, number]; label: string; color: string }[] = []
    const originCoord = getCoord(origin)
    const borderCoord = getCoord(border)
    const destCoord = getCoord(destination)

    if (originCoord) points.push({ coord: originCoord, label: origin || '', color: '#6366f1' })
    if (borderCoord) points.push({ coord: borderCoord, label: border || '', color: '#f59e0b' })
    if (destCoord) points.push({ coord: destCoord, label: destination || '', color: '#22c55e' })

    if (points.length === 0) {
      points.push({ coord: [43.2220, 76.8512], label: 'Алматы', color: '#94a3b8' })
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(points[0].coord, 4)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)

    // Add markers
    points.forEach((p, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${p.color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      L.marker(p.coord, { icon }).addTo(map).bindTooltip(p.label, {
        permanent: false,
        direction: 'top',
        offset: [0, -16],
        className: 'map-tooltip',
      })
    })

    // Draw route line
    if (points.length > 1) {
      const latlngs = points.map(p => p.coord)
      L.polyline(latlngs, {
        color: '#6366f1',
        weight: 2.5,
        opacity: 0.6,
        dashArray: '8, 8',
      }).addTo(map)

      // Fit bounds
      const bounds = L.latLngBounds(latlngs)
      map.fitBounds(bounds, { padding: [40, 40] })
    }

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [origin, border, destination])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div ref={mapRef} style={{ height: 320, width: '100%' }} />
      <div className="flex items-center gap-6 px-5 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-slate-500">Отправка: <span className="text-slate-800 font-medium">{origin || '—'}</span></span>
        </div>
        {border && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-500">Граница: <span className="text-slate-800 font-medium">{border}</span></span>
          </div>
        )}
        {destination && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-500">Доставка: <span className="text-slate-800 font-medium">{destination}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}
