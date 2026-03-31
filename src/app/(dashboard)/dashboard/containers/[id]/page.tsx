'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, MapPin, Calendar, Package } from 'lucide-react'
import { STATUS_LABELS, TYPE_LABELS, type Container, type ContainerItem, type ContainerStatus } from '@/types/database'

const STATUSES: ContainerStatus[] = ['loading', 'in_transit', 'customs', 'delivered']

export default function ContainerDetailPage() {
  const { id } = useParams()
  const [container, setContainer] = useState<Container | null>(null)
  const [items, setItems] = useState<ContainerItem[]>([])
  const [newItem, setNewItem] = useState({ description: '', quantity: 1, weight: 0, volume: 0, value: 0 })
  const [addOpen, setAddOpen] = useState(false)

  const supabase = createClient()

  const fetchData = async () => {
    const [{ data: c }, { data: itemsData }] = await Promise.all([
      supabase.from('containers').select('*, client:clients(name)').eq('id', id).single(),
      supabase.from('container_items').select('*').eq('container_id', id).order('created_at'),
    ])
    setContainer(c as unknown as Container)
    setItems(itemsData || [])
  }

  useEffect(() => { fetchData() }, [id])

  const updateStatus = async (status: ContainerStatus) => {
    await supabase.from('containers').update({ status }).eq('id', id)
    fetchData()
  }

  const addItem = async () => {
    await supabase.from('container_items').insert({ ...newItem, container_id: id })
    setNewItem({ description: '', quantity: 1, weight: 0, volume: 0, value: 0 })
    setAddOpen(false)
    fetchData()
  }

  const deleteItem = async (itemId: string) => {
    await supabase.from('container_items').delete().eq('id', itemId)
    fetchData()
  }

  if (!container) return <p className="text-muted-foreground">Загрузка...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/containers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{container.container_number}</h1>
        <Badge>{STATUS_LABELS[container.status]}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Информация</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Тип:</span>
              <span>{TYPE_LABELS[container.type]}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Маршрут:</span>
              <span>{container.origin || '?'} → {container.destination || '?'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Отправка:</span>
              <span>{container.departure_date || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Прибытие:</span>
              <span>{container.estimated_arrival || '—'}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Клиент: </span>
              {(container.client as unknown as { name: string })?.name || '—'}
            </div>
            {container.notes && <p className="text-sm text-muted-foreground">{container.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Статус</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {STATUSES.map((s, i) => {
                const isActive = s === container.status
                const isPast = STATUSES.indexOf(container.status) > i
                return (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                      isActive ? 'bg-neutral-900 text-white' : isPast ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-50 text-neutral-400'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : isPast ? 'bg-neutral-400' : 'bg-neutral-300'}`} />
                    {STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Товары</CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Добавить</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Добавить товар</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Описание</Label><Input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Кол-во</Label><Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: +e.target.value })} /></div>
                  <div><Label>Вес (кг)</Label><Input type="number" value={newItem.weight} onChange={(e) => setNewItem({ ...newItem, weight: +e.target.value })} /></div>
                  <div><Label>Объём (м³)</Label><Input type="number" value={newItem.volume} onChange={(e) => setNewItem({ ...newItem, volume: +e.target.value })} /></div>
                  <div><Label>Стоимость ($)</Label><Input type="number" value={newItem.value} onChange={(e) => setNewItem({ ...newItem, value: +e.target.value })} /></div>
                </div>
                <Button onClick={addItem} className="w-full">Добавить</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет товаров</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Описание</TableHead>
                  <TableHead>Кол-во</TableHead>
                  <TableHead>Вес</TableHead>
                  <TableHead>Объём</TableHead>
                  <TableHead>Стоимость</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.weight ? `${item.weight} кг` : '—'}</TableCell>
                    <TableCell>{item.volume ? `${item.volume} м³` : '—'}</TableCell>
                    <TableCell>{item.value ? `$${item.value}` : '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
