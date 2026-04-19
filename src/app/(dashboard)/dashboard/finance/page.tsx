'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { TRANSACTION_CATEGORIES, type Transaction, type Client, type Shipment } from '@/types/database'

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [shipments, setShipments] = useState<Pick<Shipment, 'id' | 'container_number'>[]>([])
  const [filter, setFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    type: 'income' as string, amount: '', currency: 'USD', description: '',
    category: '', client_id: '', shipment_id: '', date: new Date().toISOString().split('T')[0],
  })

  const supabase = createClient()

  const fetchData = async () => {
    let query = supabase.from('transactions').select('*, client:clients(name)').order('date', { ascending: false })
    if (filter !== 'all') query = query.eq('type', filter)
    const [{ data: t }, { data: c }, { data: cont }] = await Promise.all([
      query,
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('shipments').select('id, container_number').order('container_number'),
    ])
    setTransactions((t as unknown as Transaction[]) || [])
    setClients(c || [])
    setShipments(cont || [])
  }

  useEffect(() => { fetchData() }, [filter])

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('transactions').insert({
      ...form,
      amount: parseFloat(form.amount),
      client_id: form.client_id || null,
      shipment_id: form.shipment_id || null,
    })
    setForm({ type: 'income', amount: '', currency: 'USD', description: '', category: '', client_id: '', shipment_id: '', date: new Date().toISOString().split('T')[0] })
    setAddOpen(false)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Финансы</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Добавить транзакцию</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Новая транзакция</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><Label>Тип</Label>
                <Select value={form.type} onValueChange={(v: string | null) => v && setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Доход</SelectItem><SelectItem value="expense">Расход</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Сумма *</Label><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Валюта</Label>
                  <Select value={form.currency} onValueChange={(v: string | null) => v && setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="RUB">RUB</SelectItem><SelectItem value="CNY">CNY</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Описание</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Категория</Label>
                <Select value={form.category} onValueChange={(v: string | null) => v && setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{TRANSACTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Клиент</Label>
                <Select value={form.client_id} onValueChange={(v: string | null) => v && setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Контейнер</Label>
                <Select value={form.shipment_id} onValueChange={(v: string | null) => v && setForm({ ...form, shipment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{shipments.map((c) => <SelectItem key={c.id} value={c.id}>{c.container_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Дата</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <Button type="submit" className="w-full">Создать</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Доходы</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Расходы</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">${totalExpense.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Баланс</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>${balance.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Select value={filter} onValueChange={(v: string | null) => v && setFilter(v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="income">Доходы</SelectItem>
              <SelectItem value="expense">Расходы</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? <p className="text-sm text-muted-foreground">Нет транзакций</p> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Дата</TableHead><TableHead>Тип</TableHead><TableHead>Сумма</TableHead><TableHead>Описание</TableHead><TableHead>Категория</TableHead><TableHead>Клиент</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell><Badge variant={t.type === 'income' ? 'default' : 'destructive'}>{t.type === 'income' ? 'Доход' : 'Расход'}</Badge></TableCell>
                    <TableCell className={`font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>{t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}</TableCell>
                    <TableCell>{t.description || '—'}</TableCell>
                    <TableCell>{t.category || '—'}</TableCell>
                    <TableCell>{(t.client as unknown as { name: string })?.name || '—'}</TableCell>
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
