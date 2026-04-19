import {
  Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link,
  Preview, Row, Section, Text,
} from 'react-email'

export interface ArrivalProps {
  clientName?: string
  containerNumber?: string
  station?: string
  city?: string
  arrivalDate?: string
  trackingUrl?: string
}

export default function ArrivalNotification({
  clientName = 'Сергей',
  containerNumber = 'TRLU6944577',
  station = 'Алтынколь',
  city = 'Алматы',
  arrivalDate = '19.04.2026',
  trackingUrl = 'https://assistant-gamma-one.vercel.app/dashboard/shipments',
}: ArrivalProps) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>Контейнер {containerNumber} прибыл на границу {station}</Preview>
      <Body style={{ backgroundColor: '#f8f9fb', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '32px 16px' }}>
        <Container style={{ backgroundColor: '#fff', maxWidth: 560, margin: '0 auto', borderRadius: 16, overflow: 'hidden', border: '1px solid #eef0f4' }}>
          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)', padding: '28px 32px' }}>
            <Row>
              <Column>
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', margin: 0, opacity: 0.8 }}>
                  Logistics Dashboard
                </Text>
                <Heading as="h1" style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '6px 0 0', lineHeight: 1.2 }}>
                  Контейнер на границе
                </Heading>
              </Column>
              <Column align="right">
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'monospace', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 8, margin: 0, display: 'inline-block' }}>
                  {containerNumber}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Body */}
          <Section style={{ padding: '28px 32px 16px' }}>
            <Text style={{ fontSize: 15, color: '#0f172a', margin: 0 }}>
              Здравствуйте, {clientName}.
            </Text>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '10px 0 0' }}>
              Ваш контейнер прибыл на границу Казахстана. Начинается таможенное оформление.
            </Text>
          </Section>

          {/* Info grid */}
          <Section style={{ padding: '0 32px 8px' }}>
            <Row style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 16 }}>
              <Column style={{ width: '33%' }}>
                <Text style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Погранпереход</Text>
                <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, margin: '4px 0 0' }}>{station}</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Назначение</Text>
                <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, margin: '4px 0 0' }}>{city}</Text>
              </Column>
              <Column style={{ width: '34%' }}>
                <Text style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Дата</Text>
                <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, margin: '4px 0 0' }}>{arrivalDate}</Text>
              </Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={{ padding: '24px 32px', textAlign: 'center' }}>
            <Button
              href={trackingUrl}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Отследить перевозку →
            </Button>
          </Section>

          <Hr style={{ borderColor: '#eef0f4', margin: '8px 32px' }} />

          {/* Footer */}
          <Section style={{ padding: '16px 32px 24px' }}>
            <Text style={{ fontSize: 12, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
              Вопросы? Напишите нам на{' '}
              <Link href="mailto:support@logistics.kz" style={{ color: '#4f46e5' }}>support@logistics.kz</Link>
            </Text>
            <Text style={{ fontSize: 11, color: '#cbd5e1', margin: '8px 0 0', textAlign: 'center' }}>
              © 2026 Logistics Dashboard. Алматы, Казахстан.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
