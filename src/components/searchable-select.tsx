'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Выберите...', autoFocus }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null)
  const [highlight, setHighlight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Sync displayed query with selected label when input isn't being edited
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement !== inputRef.current) {
      setQuery(selected?.label || '')
    }
  }, [value, selected?.label])

  // If query matches current selection or is empty, show all; otherwise filter
  const filtered = !query || query === selected?.label
    ? options
    : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      setOpen(false)
      setQuery(selected?.label || '')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, selected?.label])

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (!wrapperRef.current) return
      const r = wrapperRef.current.getBoundingClientRect()
      const popHeight = 220
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < popHeight && r.top > popHeight
      const margin = 8
      const width = Math.min(Math.max(r.width, 200), window.innerWidth - margin * 2)
      const left = Math.min(Math.max(r.left, margin), window.innerWidth - width - margin)
      setCoords({
        top: openUp ? r.top - 4 : r.bottom + 4,
        left,
        width,
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

  // Reset highlight when query changes
  useEffect(() => {
    setHighlight(0)
  }, [query])

  // Keep highlighted item in view
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  const handleSelect = (opt: Option) => {
    onChange(opt.value)
    setQuery(opt.label)
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setHighlight(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault()
        handleSelect(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(selected?.label || '')
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        ref={wrapperRef}
        className={`w-full h-9 flex items-center text-[13px] border rounded-lg px-2.5 bg-white transition-all ${
          open ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={e => { setOpen(true); e.target.select() }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
        />
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange('')
                setQuery('')
                inputRef.current?.focus()
              }}
              className="w-3.5 h-3.5 rounded-full hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5 text-slate-400" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              if (open) {
                setOpen(false)
                inputRef.current?.blur()
              } else {
                inputRef.current?.focus()
              }
            }}
            className="w-3.5 h-3.5 flex items-center justify-center"
          >
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          className="fixed z-[1200] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: coords.openUp ? undefined : coords.top,
            bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: coords.width,
          }}
        >
          <div ref={listRef} className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-slate-400 px-3 py-2 text-center">Не найдено</p>
            ) : (
              filtered.map((o, idx) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(o) }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                    o.value === value
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : idx === highlight
                      ? 'bg-slate-50 text-slate-700'
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
