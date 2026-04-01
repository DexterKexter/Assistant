'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const fmt = (d: string | null | undefined) => {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return y && m && dd ? `${dd}.${m}.${y}` : d
}

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
  departureDate?: string | null
  arrivalDate?: string | null
  deliveryDate?: string | null
}

export function ShipmentMap({ origin, border, destination, departureDate, arrivalDate, deliveryDate }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Wait for DOM to be ready
    const timer = setTimeout(() => {
    if (!mapRef.current) return

    const points: { coord: [number, number]; label: string; color: string; tooltip: string; hasDate: boolean }[] = []
    const originCoord = getCoord(origin)
    const borderCoord = getCoord(border)
    const destCoord = getCoord(destination)

    const daysBetween = (from: string | null | undefined, to: string | null | undefined) => {
      if (!from) return null
      const end = to ? new Date(to) : new Date()
      return Math.round((end.getTime() - new Date(from).getTime()) / 86400000)
    }

    // Пункт отправки: если нет даты доставки — сколько дней с отправки до сегодня
    const originDays = departureDate && !deliveryDate ? daysBetween(departureDate, null) : departureDate && deliveryDate ? daysBetween(departureDate, deliveryDate) : null
    const originDaysText = originDays !== null ? `<br/><span style="color:#93c5fd">${originDays}д ${deliveryDate ? 'всего' : 'в пути'}</span>` : ''

    if (originCoord) points.push({
      coord: originCoord, label: origin || '', color: '#6366f1',
      tooltip: `<b>Загрузка</b><br/>${origin}${departureDate ? '<br/>' + fmt(departureDate) : ''}${originDaysText}`,
      hasDate: !!departureDate,
    })

    // Граница: с отправки до границы
    const borderDays = arrivalDate && departureDate ? daysBetween(departureDate, arrivalDate) : null
    const borderDaysText = borderDays !== null ? `<br/><span style="color:#fcd34d">${borderDays}д от загрузки</span>` : ''

    if (borderCoord) points.push({
      coord: borderCoord, label: border || '', color: arrivalDate ? '#f59e0b' : '#d1d5db',
      tooltip: `<b>Граница</b><br/>${border}${arrivalDate ? '<br/>' + fmt(arrivalDate) + borderDaysText : '<br/><span style="color:#ef4444">Дата не указана</span>'}`,
      hasDate: !!arrivalDate,
    })

    // Доставка: если дата есть — с границы до доставки, если нет — с границы до сегодня
    const destDays = arrivalDate && deliveryDate ? daysBetween(arrivalDate, deliveryDate) : arrivalDate && !deliveryDate ? daysBetween(arrivalDate, null) : null
    const destDaysText = destDays !== null ? `<br/><span style="color:${deliveryDate ? '#86efac' : '#fca5a5'}">${destDays}д ${deliveryDate ? 'от границы' : 'ожидание'}</span>` : ''

    if (destCoord) points.push({
      coord: destCoord, label: destination || '', color: deliveryDate ? '#22c55e' : '#d1d5db',
      tooltip: `<b>Доставка</b><br/>${destination}${deliveryDate ? '<br/>' + fmt(deliveryDate) + destDaysText : '<br/><span style="color:#ef4444">Дата не указана</span>' + destDaysText}`,
      hasDate: !!deliveryDate,
    })

    if (points.length === 0) {
      points.push({ coord: [43.2220, 76.8512], label: 'Алматы', color: '#94a3b8', tooltip: 'Нет данных', hasDate: false })
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView(points[0].coord, 4)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Add markers
    points.forEach((p, i) => {
      const borderStyle = p.hasDate ? `border:3px solid white` : `border:3px dashed ${p.color}`
      const bgColor = p.hasDate ? p.color : p.color
      const pulseRing = !p.hasDate ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${p.color};opacity:0.3;animation:pulse-dot 2s infinite"></div>` : ''
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:24px;height:24px;border-radius:50%;background:${bgColor};${borderStyle};box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:700;cursor:pointer">${i + 1}${pulseRing}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      L.marker(p.coord, { icon, interactive: true }).addTo(map).bindTooltip(p.tooltip, {
        permanent: false,
        direction: 'auto',
        offset: [0, -14],
        className: 'map-tooltip',
        sticky: false,
      })
    })

    // Draw route line and fit all points
    const latlngs = points.map(p => p.coord)
    if (points.length > 1) {
      L.polyline(latlngs, {
        color: '#6366f1',
        weight: 2.5,
        opacity: 0.6,
        dashArray: '8, 8',
      }).addTo(map)
    }

    // Always fit bounds to show all points
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 })

    mapInstance.current = map
    }, 100) // end setTimeout

    return () => {
      clearTimeout(timer)
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [origin, border, destination])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div ref={mapRef} style={{ height: 220, width: '100%', cursor: 'default' }} />
    </div>
  )
}
