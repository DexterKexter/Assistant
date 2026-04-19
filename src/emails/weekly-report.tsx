import {
  Body, Column, Container, Head, Heading, Hr, Html,
  Preview, Row, Section, Text,
} from 'react-email'

export interface WeeklyReportProps {
  managerName?: string
  weekRange?: string
  stats?: { loaded: number; inTransit: number; arrived: number; delivered: number }
  topRoutes?: { route: string; count: number }[]
}

export default function WeeklyReport({
  managerName = 'Дмитрий',
  weekRange = '12–18 апреля',
  stats = { loaded: 8, inTransit: 24, arrived: 12, delivered: 31 },
  topRoutes = [
    { route: 'Дубай → Алматы', count: 12 },
    { route: 'Чингдао → Москва', count: 9 },
    { route: 'Корея → Темир-Баба', count: 6 },
  ],
}: WeeklyReportProps) {
  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <Column style={{ width: '25%', padding: '0 4px' }}>
      <div style={{ backgroundColor: color + '12', borderRadius: 12, padding: 14, textAlign: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: 700, color, margin: 0, fontFamily: 'monospace' }}>{value}</Text>
        <Text style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      </div>
    </Column>
  )

  return (
    <Html lang="ru">
      <Head />
      <Preview>Отчёт за неделю {weekRange} — {stats.delivered} доставлено</Preview>
      <Body style={{ backgroundColor: '#f8f9fb', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '32px 16px' }}>
        <Container style={{ backgroundColor: '#fff', maxWidth: 600, margin: '0 auto', borderRadius: 16, border: '1px solid #eef0f4', padding: 32 }}>
          <Section>
            <Text style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>
              Еженедельный отчёт
            </Text>
            <Heading as="h1" style={{ fontSize: 24, color: '#0f172a', margin: '4px 0 0', fontWeight: 700 }}>
              {weekRange}
            </Heading>
            <Text style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>
              Привет, {managerName}. Вот сводка по перевозкам за прошедшую неделю.
            </Text>
          </Section>

          <Section style={{ marginTop: 24 }}>
            <Row>
              <StatCard label="Загружено" value={stats.loaded} color="#64748b" />
              <StatCard label="В пути" value={stats.inTransit} color="#6366f1" />
              <StatCard label="На границе" value={stats.arrived} color="#f59e0b" />
              <StatCard label="Доставлено" value={stats.delivered} color="#10b981" />
            </Row>
          </Section>

          <Hr style={{ borderColor: '#eef0f4', margin: '28px 0 20px' }} />

          <Section>
            <Heading as="h2" style={{ fontSize: 16, color: '#0f172a', margin: 0, fontWeight: 700 }}>
              Топ маршрутов
            </Heading>
            {topRoutes.map((r, i) => (
              <Row key={i} style={{ padding: '10px 0', borderBottom: i < topRoutes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <Column>
                  <Text style={{ fontSize: 13, color: '#334155', margin: 0 }}>{r.route}</Text>
                </Column>
                <Column align="right">
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '3px 10px', borderRadius: 6 }}>
                    {r.count} контейнеров
                  </span>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ borderColor: '#eef0f4', margin: '24px 0 0' }} />

          <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '16px 0 0' }}>
            Отчёт генерируется каждый понедельник в 9:00
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
