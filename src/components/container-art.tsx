import { Roboto_Condensed } from 'next/font/google'

const containerMarkingFont = Roboto_Condensed({ subsets: ['latin'], weight: '700' })

const TYPE_COLORS: Record<string, string> = {
  'Выкупной': '#6366f1',
  'Возвратный': '#f59e0b',
  'Собственный': '#10b981',
  'Малшы': '#8b5cf6',
  'Sinorail': '#3298df',
}
export const containerTypeColor = (type: string) => TYPE_COLORS[type] || TYPE_COLORS['Выкупной']

// Front view of a container, painted in the container type's colour. Shared by the new shipment and new cargo request windows.
export function ContainerArt({ size, color, number }: { size: string; color: string; number?: string | null }) {
  const containerNumber = (number || '').trim()
  const numberParts = containerNumber.match(/^([A-Z]{0,4})([0-9]{0,6})([0-9]?)/)
  return (
    <svg
      viewBox="14 12 232 116"
      role="img"
      aria-label={`Контейнер ${size} футов, верхняя половина, вид спереди${containerNumber ? `, ${containerNumber}` : ''}`}
      className="w-full"
      style={{ maxWidth: 440, height: 'auto', overflow: 'hidden' }}
    >
      <defs>
        <linearGradient id="shipment-container-paint" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity=".24" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#071b35" stopOpacity=".25" />
        </linearGradient>
        <linearGradient id="shipment-container-steel">
          <stop stopColor="#526474" />
          <stop offset=".32" stopColor="#e7edf1" />
          <stop offset=".55" stopColor="#fff" />
          <stop offset="1" stopColor="#657886" />
        </linearGradient>
      </defs>
      <ellipse cx="130" cy="245" rx="111" ry="5" fill="#0f172a" opacity=".1" />
      <rect x="18" y="16" width="224" height="224" rx="2" fill={color} />
      <rect x="18" y="16" width="224" height="224" rx="2" fill="url(#shipment-container-paint)" />
      {[30, 134].map(x => (
        <g key={x}>
          <rect x={x} y="29" width="96" height="190" fill={color} stroke="#102c46" strokeOpacity=".4" />
          <rect x={x} y="29" width="96" height="190" fill="url(#shipment-container-paint)" />
          {[46, 96, 146, 199].map(y => (
            <g key={y}>
              <path d={`M${x + 1} ${y}h94`} stroke="#102c46" strokeOpacity=".25" strokeWidth="7" />
              <path d={`M${x + 1} ${y - 4}h94`} stroke="#fff" strokeOpacity=".3" />
            </g>
          ))}
          <path d={`M${x + 8} 32v183m80-183v183`} fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2" />
        </g>
      ))}
      <path d="M130 27v194" stroke="#102c46" strokeOpacity=".65" strokeWidth="3" />
      <path d="M18 25h224M27 25v205M233 25v205M18 230h224" fill="none" stroke="#102c46" strokeOpacity=".3" strokeWidth="7" />
      <path d="M19 18h222M20 19v218M29 27h202M29 224h202" fill="none" stroke="#fff" strokeOpacity=".35" />
      {[61, 103, 133, 176].map(x => (
        <g key={x}>
          <rect x={x} y="31" width="4" height="189" rx="1" fill="#102c46" opacity=".3" />
          <rect x={x - 1.5} y="30" width="3" height="189" rx="1" fill="url(#shipment-container-steel)" />
          {[33, 93, 151, 217].map(y => (
            <rect key={y} x={x - 4} y={y} width="8" height="4" rx="1" fill="url(#shipment-container-steel)" stroke="#536876" strokeWidth=".5" />
          ))}
          <rect x={x - 4} y="173" width="8" height="10" rx="1" fill="url(#shipment-container-steel)" />
          <path d={`M${x} 178h${x < 130 ? -17 : 17}`} stroke="#233b4b" strokeWidth="4" />
          <path d={`M${x} 177h${x < 130 ? -17 : 17}`} stroke="#dce5ec" strokeWidth="2" />
        </g>
      ))}
      {[64, 119, 183].map(y => (
        <g key={y} fill={color} stroke="#102c46" strokeOpacity=".3">
          <rect x="21" y={y} width="12" height="9" rx="1" />
          <rect x="227" y={y} width="12" height="9" rx="1" />
        </g>
      ))}
      {[[18, 16], [228, 16], [18, 226], [228, 226]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="14" height="14" rx="1" fill={color} stroke="#fff" strokeOpacity=".2" />
          <ellipse cx={x + 7} cy={y + 7} rx="3.5" ry="4" fill="#102c46" opacity=".75" />
        </g>
      ))}
      <text x="38" y="116" fill="#fff" fontFamily="monospace" fontSize="10" fontWeight="700">{size} FT</text>
      {containerNumber && numberParts && <g fill="#fff" className={containerMarkingFont.className} fontWeight="700" fontSize="12">
        <text x="137" y="86">{numberParts[1]}</text>
        <text x="182" y="86">{numberParts[2]}</text>
        {numberParts[3] && <>
            <rect x="219.8" y="74" width="9" height="16" fill="none" stroke="#fff" strokeWidth=".7" />
            <text x="224.3" y="86" textAnchor="middle">{numberParts[3]}</text>
        </>}
      </g>}
    </svg>
  )
}
