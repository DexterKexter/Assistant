'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search } from 'lucide-react'
import { STATUS_LABELS, TYPE_LABELS, type Container, type ContainerStatus } from '@/types/database'

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const fetchContainers = async () => {
      let query = supabase
        .from('containers')
        .select('*, client:clients(name)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (search) query = query.ilike('container_number', `%${search}%`)

      const { data } = await query
      setContainers((data as unknown as Container[]) || [])
      setLoading(false)
    }
    fetchContainers()
  }, [search, statusFilter])

  const statusColor = (s: ContainerStatus) => {
    const map: Record<ContainerStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      loading: 'secondary', in_transit: 'default', customs: 'outline', delivered: 'default',
    }
    return map[s]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Контейнеры</h1>
        <Link href="/dashboard/containers/new">
          <Button><Plus className="h-4 w-4 mr-2" />Добавить контейнер</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Поиск по номеру..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v: string | null) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : containers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Контейнеры не найдены</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Откуда</TableHead>
                  <TableHead>Куда</TableHead>
                  <TableHead>Отправка</TableHead>
                  <TableHead>Прибытие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/containers/${c.id}`)}>
                    <TableCell className="font-medium">{c.container_number}</TableCell>
                    <TableCell>{TYPE_LABELS[c.type]}</TableCell>
                    <TableCell><Badge variant={statusColor(c.status)}>{STATUS_LABELS[c.status]}</Badge></TableCell>
                    <TableCell>{(c.client as unknown as { name: string })?.name || '—'}</TableCell>
                    <TableCell>{c.origin || '—'}</TableCell>
                    <TableCell>{c.destination || '—'}</TableCell>
                    <TableCell>{c.departure_date || '—'}</TableCell>
                    <TableCell>{c.estimated_arrival || '—'}</TableCell>
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
