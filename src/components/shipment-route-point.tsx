'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { addDays, addMonths, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarDays, Check, ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-react'
import { fmtDate } from '@/lib/utils'
import { shipmentCalendarDays, shipmentDateBounds, shipmentDateError, type ShipmentDateField, type ShipmentDates } from '@/lib/shipment-dates'
import styles from './shipment-route-point.module.css'

const TITLES = { departure_date: 'Дата отправления', arrival_date: 'Прибытие на границу', delivery_date: 'Дата доставки' }

export function RoutePoint({ label, flag, stage, field, dates, containerNumber, onChange, canEdit }: {
  label: string
  flag?: string
  stage: string
  field: ShipmentDateField
  dates: ShipmentDates
  containerNumber: string | null
  onChange: (date: string) => Promise<void>
  canEdit: boolean
}) {
  const date = dates[field]
  const bounds = shipmentDateBounds(field, dates)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [focusedDate, setFocusedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const calendarRef = useRef<HTMLTableElement>(null)
  const moveFocus = useRef(false)
  const savingRef = useRef(false)
  const monthId = useId()
  const today = format(new Date(), 'yyyy-MM-dd')
  const days = open ? shipmentCalendarDays(month) : []
  const validation = draft ? shipmentDateError(draft, bounds) : null
  const clamp = (value: string) => bounds.min && value < bounds.min ? bounds.min : bounds.max && value > bounds.max ? bounds.max : value

  useEffect(() => {
    if (moveFocus.current) {
      calendarRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus()
      moveFocus.current = false
    }
  }, [focusedDate, month])

  function choose(value: string) {
    setDraft(value)
    setFocusedDate(value)
    setMonth(startOfMonth(parseISO(value)))
    setError(null)
  }

  function navigate(next: Date, focus = false) {
    const value = clamp(format(next, 'yyyy-MM-dd'))
    moveFocus.current = focus
    setFocusedDate(value)
    setMonth(startOfMonth(parseISO(value)))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (savingRef.current || !canEdit) return
    const message = shipmentDateError(draft, bounds)
    if (message) { setError(message); return }
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      await onChange(draft)
      setSaved(true)
      setOpen(false)
    } catch {
      setError('Не удалось сохранить дату. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div className={styles.route}>
      <p title={`${stage}: ${label}`} className={styles.place}>
        {flag && <span aria-hidden="true">{flag}</span>}
        <span>{label}</span>
      </p>
      <Popover.Root open={open} onOpenChange={(next, details) => {
        if (savingRef.current) { details.cancel(); return }
        if (next) {
          const initial = clamp(date || today)
          setDraft(date || '')
          setFocusedDate(initial)
          setMonth(startOfMonth(parseISO(initial)))
          setError(null)
          setSaved(false)
        }
        setOpen(next)
      }}>
        <Popover.Trigger disabled={!canEdit} className={styles.trigger} data-empty={!date || undefined}
          onClick={event => event.stopPropagation()}
          aria-label={`${date ? 'Изменить' : 'Добавить'} дату: ${stage}, ${label}${date ? `, ${fmtDate(date)}` : ''}`}
          title={`${stage}: ${date ? fmtDate(date) : 'Указать дату'}`}>
          {saved ? <Check size={12} /> : <CalendarDays size={12} />}
          {date ? fmtDate(date).slice(0, 5) : canEdit ? 'Дата' : '—'}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={12} className={styles.positioner}>
            <Popover.Popup className={styles.popup} onClick={event => event.stopPropagation()}
              initialFocus={() => calendarRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]') || true}>
              <form onSubmit={save} aria-busy={saving}>
                <div className={styles.header}>
                  <div>
                    <Popover.Title className={styles.title}>{TITLES[field]}</Popover.Title>
                    <Popover.Description className={styles.context}>{flag} {label} · {containerNumber || 'Без номера'}</Popover.Description>
                  </div>
                  <Popover.Close type="button" className={styles.iconButton} disabled={saving} aria-label="Закрыть календарь"><X size={16} /></Popover.Close>
                </div>
                <fieldset disabled={saving} className={styles.body}>
                  <div className={styles.navigation}>
                    <button type="button" className={styles.iconButton} aria-label="Предыдущий месяц"
                      disabled={!!bounds.min && format(month, 'yyyy-MM') <= bounds.min.slice(0, 7)}
                      onClick={() => navigate(addMonths(month, -1))}><ChevronLeft size={17} /></button>
                    <span id={monthId} className={styles.month} aria-live="polite">{format(month, 'LLLL yyyy', { locale: ru })}</span>
                    <button type="button" className={styles.iconButton} aria-label="Следующий месяц"
                      disabled={!!bounds.max && format(month, 'yyyy-MM') >= bounds.max.slice(0, 7)}
                      onClick={() => navigate(addMonths(month, 1))}><ChevronRight size={17} /></button>
                  </div>
                  <table ref={calendarRef} className={styles.calendar} role="grid" aria-labelledby={monthId}>
                    <thead><tr>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
                    <tbody>{Array.from({ length: 6 }, (_, week) => (
                      <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(value => {
                        const day = parseISO(value)
                        const disabledReason = shipmentDateError(value, bounds)
                        return <td key={value} role="gridcell" aria-selected={draft === value}>
                          <button type="button" className={styles.day} disabled={!!disabledReason} title={disabledReason || undefined}
                            aria-label={format(day, 'd MMMM yyyy', { locale: ru })} aria-current={value === today ? 'date' : undefined}
                            data-selected={draft === value || undefined} data-outside={day.getMonth() !== month.getMonth() || undefined}
                            tabIndex={value === focusedDate ? 0 : -1} onClick={() => choose(value)}
                            onKeyDown={event => {
                              let next: Date
                              switch (event.key) {
                                case 'ArrowLeft': next = addDays(day, -1); break
                                case 'ArrowRight': next = addDays(day, 1); break
                                case 'ArrowUp': next = addDays(day, -7); break
                                case 'ArrowDown': next = addDays(day, 7); break
                                case 'Home': next = startOfWeek(day, { weekStartsOn: 1 }); break
                                case 'End': next = endOfWeek(day, { weekStartsOn: 1 }); break
                                case 'PageUp': next = addMonths(day, event.shiftKey ? -12 : -1); break
                                case 'PageDown': next = addMonths(day, event.shiftKey ? 12 : 1); break
                                default: return
                              }
                              event.preventDefault()
                              navigate(next, true)
                            }}>{day.getDate()}</button>
                        </td>
                      })}</tr>
                    ))}</tbody>
                  </table>
                  <div className={styles.selection}>
                    <span aria-live="polite">{draft ? fmtDate(draft) : 'Дата не выбрана'}</span>
                    <button type="button" className={styles.today} disabled={!!shipmentDateError(today, bounds)}
                      title={shipmentDateError(today, bounds) || undefined} onClick={() => choose(today)}>Сегодня</button>
                  </div>
                  {(bounds.min || bounds.max) && <p className={styles.hint}>
                    {bounds.min && `Не раньше ${fmtDate(bounds.min)}`}{bounds.min && bounds.max && ' · '}{bounds.max && `Не позже ${fmtDate(bounds.max)}`}
                  </p>}
                  {field === 'delivery_date' && <p className={styles.hint}>После сохранения статус — «Доставлен».</p>}
                </fieldset>
                {(error || validation) && <p className={styles.error} role="alert">{error || validation}</p>}
                <div className={styles.footer}>
                  <Popover.Close type="button" className={styles.cancel} disabled={saving}>Отмена</Popover.Close>
                  <button type="submit" className={styles.save} disabled={saving || !draft || !!validation || draft === date}>
                    {saving ? <LoaderCircle size={15} className={styles.spinner} /> : <Check size={15} />}
                    {saving ? 'Сохранение…' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <span className="sr-only" role="status">{saved ? `${stage}: дата сохранена` : ''}</span>
    </div>
  )
}
