'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, FileText } from 'lucide-react'
import { DOC_TYPE_LABELS, type Document, type Client, type Container, type DocumentType } from '@/types/database'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [containers, setContainers] = useState<Pick<Container, 'id' | 'container_number'>[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    title: '', type: 'other' as string, client_id: '', container_id: '', file_name: '', file_url: '',
  })

  const supabase = createClient()

  const fetchData = async () => {
    let query = supabase.from('documents').select('*, client:clients(name), container:containers(container_number)').order('created_at', { ascending: false })
    if (typeFilter !== 'all') query = query.eq('type', typeFilter)
    const [{ data: d }, { data: c }, { data: cont }] = await Promise.all([
      query,
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('containers').select('id, container_number').order('container_number'),
    ])
    setDocuments((d as unknown as Document[]) || [])
    setClients(c || [])
    setContainers(cont || [])
  }

  useEffect(() => { fetchData() }, [typeFilter])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('documents').insert({
      ...form,
      client_id: form.client_id || null,
      container_id: form.container_id || null,
      file_url: form.file_url || null,
      file_name: form.file_name || null,
    })
    setForm({ title: '', type: 'other', client_id: '', container_id: '', file_name: '', file_url: '' })
    setAddOpen(false)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Документы</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger><Button><Plus className="h-4 w-4 mr-2" />Добавить документ</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый документ</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><Label>Название *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Тип</Label>
                <Select value={form.type} onValueChange={(v: string | null) => v && setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Клиент</Label>
                <Select value={form.client_id} onValueChange={(v: string | null) => v && setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Контейнер</Label>
                <Select value={form.container_id} onValueChange={(v: string | null) => v && setForm({ ...form, container_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{containers.map((c) => <SelectItem key={c.id} value={c.id}>{c.container_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Имя файла</Label><Input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} placeholder="document.pdf" /></div>
              <div><Label>URL файла</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." /></div>
              <Button type="submit" className="w-full">Создать</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <Select value={typeFilter} onValueChange={(v: string | null) => v && setTypeFilter(v)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? <p className="text-sm text-muted-foreground">Нет документов</p> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Название</TableHead><TableHead>Тип</TableHead><TableHead>Клиент</TableHead><TableHead>Контейнер</TableHead><TableHead>Дата</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{d.title}</p>
                          {d.file_name && <p className="text-xs text-muted-foreground">{d.file_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{DOC_TYPE_LABELS[d.type]}</Badge></TableCell>
                    <TableCell>{(d.client as unknown as { name: string })?.name || '—'}</TableCell>
                    <TableCell>{(d.container as unknown as { container_number: string })?.container_number || '—'}</TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString('ru-RU')}</TableCell>
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
