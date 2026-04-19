import {
  Body, CodeBlock, Container, dracula, Head, Heading, Html,
  Preview, Section, Text,
} from 'react-email'

export default function CodeSnippet() {
  const code = `import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase
  .from('shipments')
  .select('*')
  .eq('is_completed', false)

if (error) throw error
console.log('Active shipments:', data.length)`

  return (
    <Html lang="en">
      <Head />
      <Preview>Ваш API-ключ был использован в новом коде</Preview>
      <Body style={{ backgroundColor: '#f8f9fb', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '32px 16px' }}>
        <Container style={{ backgroundColor: '#fff', maxWidth: 600, margin: '0 auto', borderRadius: 16, border: '1px solid #eef0f4', padding: 32 }}>
          <Section>
            <Heading as="h1" style={{ fontSize: 20, color: '#0f172a', margin: 0, fontWeight: 700 }}>
              Пример использования API
            </Heading>
            <Text style={{ fontSize: 14, color: '#64748b', margin: '8px 0 20px' }}>
              React Email 6 поддерживает подсветку синтаксиса через компонент <code style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>CodeBlock</code>.
            </Text>
          </Section>

          <Section>
            <CodeBlock
              code={code}
              language="typescript"
              theme={dracula}
              lineNumbers
            />
          </Section>

          <Section style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              Всё рендерится в HTML — поддержка во всех почтовых клиентах.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
