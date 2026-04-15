'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Выберите...' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  // Close on outside click (accounting for the portalled popover)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reposition popover on scroll/resize while open
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      const popHeight = 260
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < popHeight && r.top > popHeight
      setCoords({
        top: openUp ? r.top - 4 : r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 200),
        openUp,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-9 flex items-center justify-between text-[13px] border border-slate-200 rounded-lg px-2.5 text-slate-800 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all text-left"
      >
        <span className={selected ? 'text-slate-800 truncate' : 'text-slate-400 truncate'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false) }}
              className="w-3.5 h-3.5 rounded-full hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5 text-slate-400" />
            </span>
          )}
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          className="fixed z-[200] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: coords.openUp ? undefined : coords.top,
            bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: coords.width,
          }}
        >
          {options.length > 5 && (
            <div className="p-1.5 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full text-[12px] border border-slate-100 rounded-md pl-6 pr-2 py-1 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-slate-50"
                />
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-slate-400 px-3 py-2 text-center">Не найдено</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                    o.value === value
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
