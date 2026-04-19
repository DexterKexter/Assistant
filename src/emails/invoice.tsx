import {
  Body, Button, Column, Container, Head, Heading, Hr, Html, Link,
  Preview, Row, Section, Text,
} from 'react-email'

export interface InvoiceProps {
  clientName?: string
  invoiceNumber?: string
  dueDate?: string
  items?: { name: string; amount: number }[]
  total?: number
  payUrl?: string
}

export default function Invoice({
  clientName = 'ТОО Alma Invest Corporation',
  invoiceNumber = 'INV-2026-0412',
  dueDate = '26.04.2026',
  items = [
    { name: 'Доставка контейнера TRLU6944577', amount: 4200 },
    { name: 'Таможенное оформление', amount: 850 },
    { name: 'Страховка груза', amount: 120 },
  ],
  total = 5170,
  payUrl = 'https://assistant-gamma-one.vercel.app/pay',
}: InvoiceProps) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>Счёт {invoiceNumber} на сумму ${total.toLocaleString()}</Preview>
      <Body style={{ backgroundColor: '#f8f9fb', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '32px 16px' }}>
        <Container style={{ backgroundColor: '#fff', maxWidth: 560, margin: '0 auto', borderRadius: 16, border: '1px solid #eef0f4', padding: 32 }}>
          <Section>
            <Row>
              <Column>
                <Text style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>
                  Счёт к оплате
                </Text>
                <Heading as="h1" style={{ fontSize: 26, color: '#0f172a', margin: '4px 0 0', fontWeight: 700 }}>
                  {invoiceNumber}
                </Heading>
              </Column>
              <Column align="right">
                <Text style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>Срок оплаты</Text>
                <Text style={{ fontSize: 14, color: '#ef4444', fontWeight: 700, margin: '4px 0 0' }}>{dueDate}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ borderColor: '#eef0f4', margin: '20px 0' }} />

          <Section>
            <Text style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Получатель</Text>
            <Text style={{ fontSize: 15, color: '#0f172a', fontWeight: 600, margin: '4px 0 0' }}>{clientName}</Text>
          </Section>

          <Section style={{ marginTop: 24 }}>
            {items.map((item, i) => (
              <Row key={i} style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                <Column>
                  <Text style={{ fontSize: 13, color: '#334155', margin: 0 }}>{item.name}</Text>
                </Column>
                <Column align="right">
                  <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>
                    ${item.amount.toLocaleString()}
                  </Text>
                </Column>
              </Row>
            ))}
            <Row style={{ padding: '16px 0 0' }}>
              <Column>
                <Text style={{ fontSize: 15, color: '#0f172a', fontWeight: 700, margin: 0 }}>Итого</Text>
              </Column>
              <Column align="right">
                <Text style={{ fontSize: 22, color: '#0f172a', fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                  ${total.toLocaleString()}
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ marginTop: 24, textAlign: 'center' }}>
            <Button
              href={payUrl}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)',
                color: '#fff',
                padding: '14px 32px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Оплатить ${total.toLocaleString()}
            </Button>
          </Section>

          <Hr style={{ borderColor: '#eef0f4', margin: '24px 0 16px' }} />

          <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
            Если есть вопросы — {' '}
            <Link href="mailto:billing@logistics.kz" style={{ color: '#4f46e5' }}>billing@logistics.kz</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
