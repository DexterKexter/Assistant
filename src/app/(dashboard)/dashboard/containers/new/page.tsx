'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TYPE_LABELS } from '@/types/database'
import type { Client } from '@/types/database'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewContainerPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    container_number: '',
    type: '40ft' as string,
    origin: '',
    destination: '',
    departure_date: '',
    estimated_arrival: '',
    client_id: '',
    notes: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      setClients(data || [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('containers').insert({
      ...form,
      client_id: form.client_id || null,
      departure_date: form.departure_date || null,
      estimated_arrival: form.estimated_arrival || null,
    })
    if (!error) {
      router.push('/dashboard/containers')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/containers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Новый контейнер</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Номер контейнера *</Label>
                <Input required value={form.container_number} onChange={(e) => setForm({ ...form, container_number: e.target.value })} placeholder="MSKU1234567" />
              </div>
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={form.type} onValueChange={(v: string | null) => v && setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Откуда</Label>
                <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Шанхай" />
              </div>
              <div className="space-y-2">
                <Label>Куда</Label>
                <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Алматы" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Дата отправки</Label>
                <Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ожидаемое прибытие</Label>
                <Input type="date" value={form.estimated_arrival} onChange={(e) => setForm({ ...form, estimated_arrival: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Клиент</Label>
              <Select value={form.client_id} onValueChange={(v: string | null) => v && setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Выберите клиента" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? 'Сохранение...' : 'Создать контейнер'}</Button>
              <Link href="/dashboard/containers"><Button variant="outline">Отмена</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
