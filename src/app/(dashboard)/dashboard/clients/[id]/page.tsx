'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { STATUS_LABELS, DOC_TYPE_LABELS, type Client, type Container, type Transaction, type Document } from '@/types/database'

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [containers, setContainers] = useState<Container[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    const supabase = createClient()
    const fetch = async () => {
      const [{ data: c }, { data: cont }, { data: trans }, { data: docs }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('containers').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('client_id', id).order('date', { ascending: false }),
        supabase.from('documents').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      ])
      setClient(c)
      setContainers(cont || [])
      setTransactions(trans || [])
      setDocuments(docs || [])
    }
    fetch()
  }, [id])

  if (!client) return <p className="text-muted-foreground">Загрузка...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">{client.name}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Компания:</span> {client.company || '—'}</div>
            <div><span className="text-muted-foreground">Телефон:</span> {client.phone || '—'}</div>
            <div><span className="text-muted-foreground">Email:</span> {client.email || '—'}</div>
            <div><span className="text-muted-foreground">Адрес:</span> {client.address || '—'}</div>
            <div><span className="text-muted-foreground">Контакт:</span> {client.contact_person || '—'}</div>
          </div>
          {client.notes && <p className="text-sm text-muted-foreground mt-3">{client.notes}</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="containers">
        <TabsList>
          <TabsTrigger value="containers">Контейнеры ({containers.length})</TabsTrigger>
          <TabsTrigger value="finance">Финансы ({transactions.length})</TabsTrigger>
          <TabsTrigger value="documents">Документы ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="containers">
          <Card>
            <CardContent className="pt-6">
              {containers.length === 0 ? <p className="text-sm text-muted-foreground">Нет контейнеров</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Номер</TableHead><TableHead>Статус</TableHead><TableHead>Маршрут</TableHead><TableHead>Дата</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {containers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.container_number}</TableCell>
                        <TableCell><Badge>{STATUS_LABELS[c.status]}</Badge></TableCell>
                        <TableCell>{c.origin} → {c.destination}</TableCell>
                        <TableCell>{c.departure_date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardContent className="pt-6">
              {transactions.length === 0 ? <p className="text-sm text-muted-foreground">Нет транзакций</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Тип</TableHead><TableHead>Сумма</TableHead><TableHead>Описание</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.date}</TableCell>
                        <TableCell><Badge variant={t.type === 'income' ? 'default' : 'destructive'}>{t.type === 'income' ? 'Доход' : 'Расход'}</Badge></TableCell>
                        <TableCell className={t.type === 'income' ? 'text-green-600' : 'text-red-500'}>${t.amount}</TableCell>
                        <TableCell>{t.description || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-6">
              {documents.length === 0 ? <p className="text-sm text-muted-foreground">Нет документов</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Название</TableHead><TableHead>Тип</TableHead><TableHead>Дата</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {documents.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell><Badge variant="secondary">{DOC_TYPE_LABELS[d.type]}</Badge></TableCell>
                        <TableCell>{new Date(d.created_at).toLocaleDateString('ru-RU')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
