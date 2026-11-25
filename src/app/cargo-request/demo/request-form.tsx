'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, FileText, Package, Paperclip, Plus, Ship, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cargoContactError, cargoFileError, cargoItemError } from '@/lib/cargo-requests'
import { editContainerNumber } from '@/lib/container-number'

interface PreviewFile { id: string; name: string; url: string; type: string }
interface DraftItem {
  id: string; name: string; quantity: string; unit: string; packages: string
  weight_kg: string; volume_m3: string; notes: string; photos: PreviewFile[]
}
const blankItem = { name: '', quantity: '1', unit: 'шт', packages: '', weight_kg: '', volume_m3: '', notes: '', photos: [] }
const optionalNumber = (value: string) => value === '' ? null : Number(value)

export default function CargoRequestDemo() {
  const [step, setStep] = useState(1)
  const [complete, setComplete] = useState(false)
  const [contact, setContact] = useState({ client_name: 'Мебель для дома', phone: '+7 (700) 000-00-00', container_number: 'BICU1234567', container_size: '40', origin: 'Гуаньчжоу', destination: 'Алматы', loading_date: '' })
  const [items, setItems] = useState<DraftItem[]>([{ ...blankItem, id: 'example-chairs', name: 'Обеденные стулья', quantity: '48', packages: '12', weight_kg: '240', volume_m3: '3.6' }])
  const [documents, setDocuments] = useState<PreviewFile[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const errorMessage = useRef<HTMLParagraphElement>(null)
  const urls = useRef(new Set<string>())

  useEffect(() => {
    const current = urls.current
    return () => current.forEach(url => URL.revokeObjectURL(url))
  }, [])
  useEffect(() => { if (step !== 1 || complete) heading.current?.focus() }, [step, complete])
  useEffect(() => { if (error) errorMessage.current?.focus() }, [error])

  function updateItem(id: string, field: keyof Omit<DraftItem, 'id' | 'photos'>, value: string) {
    setItems(current => current.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function release(file: PreviewFile) { URL.revokeObjectURL(file.url); urls.current.delete(file.url) }

  function addFiles(event: ChangeEvent<HTMLInputElement>, itemId?: string) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const existing = itemId ? items.find(item => item.id === itemId)!.photos.length : documents.length
    const limit = itemId ? 6 : 4
    if (existing + files.length > limit) { setError(itemId ? 'К одному товару можно добавить до 6 фотографий.' : 'Можно добавить до 4 документов.'); return }
    for (const file of files) {
      const validation = cargoFileError(file, !!itemId)
      if (validation) { setError(`${file.name}: ${validation}`); return }
    }
    const previews = files.map(file => {
      const url = URL.createObjectURL(file)
      urls.current.add(url)
      return { id: crypto.randomUUID(), name: file.name, url, type: file.type }
    })
    if (itemId) setItems(current => current.map(item => item.id === itemId ? { ...item, photos: [...item.photos, ...previews] } : item))
    else setDocuments(current => [...current, ...previews])
    setError('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const contactError = cargoContactError(contact, true)
    if (contactError) { setError(contactError); setStep(1); return }
    if (step === 1) { setError(''); setStep(2); return }
    for (const [index, item] of items.entries()) {
      const validation = cargoItemError({ ...item, quantity: Number(item.quantity), packages: optionalNumber(item.packages), weight_kg: optionalNumber(item.weight_kg), volume_m3: optionalNumber(item.volume_m3) })
      if (validation) { setError(`Товар ${index + 1}: ${validation}`); return }
    }
    setError('')
    setComplete(true)
  }

  return (
    <div className="min-h-dvh w-full bg-[#f6f7fa] text-slate-900">
      <header className="border-b border-slate-200/70 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8"><div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white"><Ship className="size-4" /></span><span className="text-sm font-semibold">Logistics</span></div><span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Пример формы</span></div></header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-10">
        <div className="mb-7 max-w-2xl"><p className="mb-2 text-xs font-medium uppercase tracking-wider text-indigo-600">Информация о грузе</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Заявка на груз</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">Укажите контейнер и добавьте товары. Так менеджер получит состав груза и фотографии в одном месте.</p></div>
        <p className="mb-6 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">Демонстрационная форма с вымышленными данными. Данные и файлы не отправляются и не сохраняются после закрытия страницы.</p>

        {complete ? <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
          <CheckCircle2 className="mb-5 size-10 text-emerald-600" /><h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">Пример заявки заполнен</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">В рабочей версии менеджер получит эти данные и вложения. Сейчас ничего не отправлено.</p>
          <dl className="my-6 grid grid-cols-1 gap-4 border-y border-slate-100 py-5 sm:grid-cols-3"><div><dt className="text-xs text-slate-500">Клиент</dt><dd className="mt-1 break-words text-sm font-medium">{contact.client_name}</dd></div><div><dt className="text-xs text-slate-500">Контейнер</dt><dd className="mt-1 font-mono text-sm font-medium">{contact.container_number}</dd></div><div><dt className="text-xs text-slate-500">Маршрут</dt><dd className="mt-1 break-words text-sm">{contact.origin || '—'} → {contact.destination || '—'}</dd></div></dl>
          <ul className="mb-6 divide-y divide-slate-100">{items.map(item => <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm"><div className="min-w-0"><p className="break-words font-medium">{item.name}</p><p className="mt-1 text-xs text-slate-500">Фото: {item.photos.length}{item.packages ? ` · Мест: ${item.packages}` : ''}</p></div><span className="shrink-0">{item.quantity} {item.unit}</span></li>)}</ul>
          {documents.length > 0 && <p className="mb-5 text-sm text-slate-500">Документов: {documents.length}</p>}
          {notes && <p className="mb-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{notes}</p>}
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => { setComplete(false); setStep(2) }}><ArrowLeft className="size-4" />Вернуться к форме</Button>
        </section> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <form onSubmit={submit} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ol className="grid grid-cols-2 gap-3 border-b border-slate-100 px-5 py-4 sm:px-7" aria-label="Этапы заполнения">{['Контейнер и контакты','Товары и фото'].map((title,index) => <li key={title} aria-current={step===index+1 ? 'step' : undefined} className={`flex items-center gap-2.5 text-xs font-medium ${step>=index+1 ? 'text-slate-900' : 'text-slate-400'}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${step>=index+1 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{step>index+1 ? <Check className="size-3.5" /> : index+1}</span>{title}</li>)}</ol>
            <div className="space-y-6 p-5 sm:p-7">
              <div><p className="mb-1 text-xs text-slate-400">Шаг {step} из 2</p><h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{step===1 ? 'Контейнер и контакты' : 'Что внутри контейнера?'}</h2><p className="mt-2 text-sm text-slate-500">{step===1 ? 'По этому номеру менеджер свяжет груз с перевозкой.' : 'Добавьте каждый вид товара отдельно. Фото помогут разобраться в деталях.'}</p></div>
              {error && <p ref={errorMessage} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none">{error}</p>}

              {step===1 ? <>
                <div className="rounded-xl bg-slate-50 p-4"><label className="block text-xs font-medium text-slate-600">Номер контейнера *<Input required autoComplete="off" spellCheck={false} value={contact.container_number} onChange={e=>setContact(c=>({...c,container_number:editContainerNumber(e.target.value,c.container_number)}))} placeholder="BICU1234567" maxLength={11} className="mt-2 h-12 bg-white font-mono text-lg tracking-wider md:text-lg" aria-describedby="container-hint" /></label><p id="container-hint" className="mt-2 text-xs text-slate-500">4 латинские буквы + 7 цифр. Например, BICU1234567.</p><fieldset className="mt-4"><legend className="mb-2 text-xs text-slate-500">Размер контейнера</legend><div className="flex gap-2">{['20','40'].map(size => <label key={size} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm ${contact.container_size===size ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white'}`}><input type="radio" name="size" value={size} checked={contact.container_size===size} onChange={()=>setContact(c=>({...c,container_size:size}))} className="accent-indigo-600" />{size} ft</label>)}</div></fieldset></div>
                <div className="grid gap-4 sm:grid-cols-2">{([['client_name','Имя или название компании *','text','organization',120],['phone','Телефон для связи *','tel','tel',40],['origin','Город загрузки','text','off',160],['destination','Город доставки','text','off',160]] as const).map(([key,label,type,autoComplete,maxLength]) => <label key={key} className="text-xs font-medium text-slate-600">{label}<Input type={type} autoComplete={autoComplete} required={key==='client_name'||key==='phone'} maxLength={maxLength} value={contact[key]} onChange={e=>setContact(c=>({...c,[key]:e.target.value}))} className="mt-2 h-11 bg-white" /></label>)}</div>
                <label className="block max-w-xs text-xs font-medium text-slate-600">Дата загрузки <span className="font-normal text-slate-400">· если известна</span><Input type="date" value={contact.loading_date} onChange={e=>setContact(c=>({...c,loading_date:e.target.value}))} className="mt-2 h-11 bg-white" /></label>
              </> : <>
                <div className="space-y-4">{items.map((item,index) => <fieldset key={item.id} className="min-w-0 rounded-xl border border-slate-200 p-4"><legend className="px-1.5 text-xs font-semibold text-indigo-700">Товар {index+1}</legend>
                  <div className="mb-3 flex items-center justify-between"><Package className="size-4 text-slate-400" />{items.length>1 && <button type="button" onClick={()=>{ item.photos.forEach(release); setItems(current=>current.filter(i=>i.id!==item.id)) }} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-slate-500 hover:text-red-600" aria-label={`Удалить товар ${index+1}`}><Trash2 className="size-3.5" />Удалить</button>}</div>
                  <label className="block text-xs font-medium text-slate-600">Название товара *<Input required maxLength={160} value={item.name} onChange={e=>updateItem(item.id,'name',e.target.value)} placeholder="Например, обеденные стулья" className="mt-2 h-11" /></label>
                  <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-medium text-slate-600">Количество *<Input required type="number" inputMode="decimal" min="0.001" max="999999999.999" step="0.001" value={item.quantity} onChange={e=>updateItem(item.id,'quantity',e.target.value)} className="mt-2 h-11" /></label><label className="text-xs font-medium text-slate-600">Единица<select value={item.unit} onChange={e=>updateItem(item.id,'unit',e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-indigo-500 sm:text-sm">{['шт','компл','кг','м³'].map(unit=><option key={unit}>{unit}</option>)}</select></label></div>
                  <div className="mt-4 grid grid-cols-3 gap-3">{([['packages','Мест','1'],['weight_kg','Вес, кг','0.001'],['volume_m3','Объём, м³','0.001']] as const).map(([field,label,increment])=><label key={field} className="text-xs text-slate-500">{label}<Input type="number" inputMode={field==='packages'?'numeric':'decimal'} min="0" step={increment} value={item[field]} onChange={e=>updateItem(item.id,field,e.target.value)} placeholder="—" className="mt-2 h-11" /></label>)}</div>
                  <p className="mt-2 text-[11px] text-slate-400">Места — коробки, паллеты или другая упаковка. Вес и объём всего товара.</p>
                  <div className="mt-4"><label className="relative flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500"><Camera className="size-5 shrink-0 text-indigo-500" /><span><span className="block text-sm font-medium text-slate-700">Добавить фото</span><span className="mt-0.5 block text-[11px] text-slate-500">До 6 фото · JPG, PNG, WebP · до 10 МБ</span></span><input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label={`Фото товара ${index+1}`} onChange={event=>addFiles(event,item.id)} className="absolute inset-0 w-full cursor-pointer opacity-0" /></label>
                    {item.photos.length>0 && <ul className="mt-3 flex flex-wrap gap-3">{item.photos.map(photo=><li key={photo.id} className="relative"><Image src={photo.url} alt={photo.name} unoptimized width={80} height={80} className="size-20 rounded-lg border border-slate-200 object-cover" /><button type="button" aria-label={`Удалить фото ${photo.name}`} onClick={()=>{release(photo);setItems(current=>current.map(i=>i.id===item.id?{...i,photos:i.photos.filter(p=>p.id!==photo.id)}:i))}} className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"><X className="size-3.5" /></button></li>)}</ul>}
                  </div>
                </fieldset>)}</div>
                <Button type="button" variant="outline" className="h-11 w-full rounded-xl border-dashed" disabled={items.length>=30} onClick={()=>setItems(current=>[...current,{...blankItem,id:crypto.randomUUID()}])}><Plus className="size-4" />Добавить товар</Button>
                <div className="border-t border-slate-100 pt-5"><h3 className="text-sm font-semibold">Документы и комментарий</h3><p className="mt-1 text-xs text-slate-500">Необязательно. Приложите инвойс или упаковочный лист.</p><label className="relative mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500"><Paperclip className="size-4" />Добавить документы<input type="file" accept=".pdf,.xls,.xlsx,image/jpeg,image/png,image/webp" multiple aria-label="Документы к заявке" onChange={event=>addFiles(event)} className="absolute inset-0 w-full cursor-pointer opacity-0" /></label><p className="mt-2 text-[11px] text-slate-400">До 4 файлов · PDF, Excel или фото · до 10 МБ каждый</p>
                  {documents.length>0 && <ul className="mt-3 space-y-2">{documents.map(file=><li key={file.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"><FileText className="size-4 shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate text-xs">{file.name}</span><button type="button" aria-label={`Удалить документ ${file.name}`} onClick={()=>{release(file);setDocuments(current=>current.filter(f=>f.id!==file.id))}} className="flex size-8 shrink-0 items-center justify-center"><X className="size-4 text-slate-500" /></button></li>)}</ul>}
                  <label className="mt-4 block text-xs text-slate-600">Комментарий<textarea maxLength={3000} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Хрупкий груз, особенности упаковки, дополнительные сведения…" className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-base outline-indigo-500 sm:text-sm" /></label>
                </div>
              </>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-7">
              {step===2 ? <Button type="button" variant="ghost" className="h-11" onClick={()=>{setStep(1);setError('');heading.current?.focus()}}><ArrowLeft className="size-4" />Назад</Button> : <span className="text-xs text-slate-400">* Обязательные поля</span>}
              <Button type="submit" className="h-11 rounded-xl bg-indigo-600 px-5 text-white hover:bg-indigo-700">{step===1 ? 'К товарам' : 'Проверить пример'}<ArrowRight className="size-4" /></Button>
            </div>
          </form>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6"><Package className="mb-3 size-5 text-indigo-500" /><h2 className="text-sm font-semibold">Ваша заявка</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs text-slate-400">Контейнер</dt><dd className="mt-1 break-words font-mono font-medium">{contact.container_number || 'Не указан'}<span className="ml-2 font-sans text-xs font-normal text-slate-500">{contact.container_size} ft</span></dd></div><div><dt className="text-xs text-slate-400">Маршрут</dt><dd className="mt-1 break-words text-slate-600">{contact.origin || '—'} → {contact.destination || '—'}</dd></div><div className="flex justify-between border-t border-slate-100 pt-4"><dt className="text-slate-500">Товарных позиций</dt><dd className="font-medium tabular-nums">{items.length}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Фотографий</dt><dd className="font-medium tabular-nums">{items.reduce((sum,item)=>sum+item.photos.length,0)}</dd></div></dl><p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">Фотографируйте товар и маркировку упаковки так, чтобы текст был читаемым.</p></aside>
        </div>}
        <p className="mt-6 text-center text-xs text-slate-400">Logistics · Информация о вашем грузе в одном месте</p>
      </main>
    </div>
  )
}
