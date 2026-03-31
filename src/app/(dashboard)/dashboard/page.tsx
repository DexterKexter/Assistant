'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Container, Users, DollarSign, TrendingUp } from 'lucide-react'
import { STATUS_LABELS, type Container as ContainerType, type Transaction } from '@/types/database'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalContainers: 0,
    inTransit: 0,
    delivered: 0,
    totalClients: 0,
    totalIncome: 0,
    totalExpense: 0,
  })
  const [recentContainers, setRecentContainers] = useState<ContainerType[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const supabase = createClient()

    const fetchData = async () => {
      const [
        { count: totalContainers },
        { count: inTransit },
        { count: delivered },
        { count: totalClients },
        { data: containers },
        { data: transactions },
        { data: incomeData },
        { data: expenseData },
      ] = await Promise.all([
        supabase.from('containers').select('*', { count: 'exact', head: true }),
        supabase.from('containers').select('*', { count: 'exact', head: true }).eq('status', 'in_transit'),
        supabase.from('containers').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('containers').select('*, client:clients(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('*, client:clients(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('amount').eq('type', 'income'),
        supabase.from('transactions').select('amount').eq('type', 'expense'),
      ])

      const totalIncome = incomeData?.reduce((sum, t) => sum + t.amount, 0) || 0
      const totalExpense = expenseData?.reduce((sum, t) => sum + t.amount, 0) || 0

      setStats({
        totalContainers: totalContainers || 0,
        inTransit: inTransit || 0,
        delivered: delivered || 0,
        totalClients: totalClients || 0,
        totalIncome,
        totalExpense,
      })
      setRecentContainers((containers as ContainerType[]) || [])
      setRecentTransactions((transactions as Transaction[]) || [])
    }

    fetchData()
  }, [])

  const statCards = [
    { title: 'Контейнеры', value: stats.totalContainers, icon: Container, description: `В пути: ${stats.inTransit}` },
    { title: 'Доставлено', value: stats.delivered, icon: TrendingUp, description: 'Всего доставлено' },
    { title: 'Клиенты', value: stats.totalClients, icon: Users, description: 'Всего клиентов' },
    { title: 'Баланс', value: `$${(stats.totalIncome - stats.totalExpense).toLocaleString()}`, icon: DollarSign, description: `Доходы: $${stats.totalIncome.toLocaleString()}` },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Обзор</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Последние контейнеры</CardTitle>
          </CardHeader>
          <CardContent>
            {recentContainers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет контейнеров</p>
            ) : (
              <div className="space-y-3">
                {recentContainers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.container_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {(c.client as unknown as { name: string })?.name || 'Без клиента'}
                      </p>
                    </div>
                    <Badge variant={c.status === 'delivered' ? 'default' : 'secondary'}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Последние транзакции</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет транзакций</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.description || t.category || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {(t.client as unknown as { name: string })?.name || '—'} · {t.date}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
