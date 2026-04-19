import {
  Body, Button, Container, Head, Heading, Html, Img, Link,
  Preview, Section, Tailwind, Text,
} from 'react-email'

export interface WelcomeProps {
  name?: string
  loginUrl?: string
}

export default function Welcome({
  name = 'Дмитрий',
  loginUrl = 'https://assistant-gamma-one.vercel.app/login',
}: WelcomeProps) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>Добро пожаловать в Logistics Dashboard, {name}!</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans py-8 px-4">
          <Container className="bg-white max-w-[560px] mx-auto rounded-2xl border border-slate-100 overflow-hidden">
            <Section className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-8 py-12 text-center">
              <Img
                src="https://api.dicebear.com/7.x/shapes/svg?seed=welcome&backgroundColor=ffffff"
                alt="Logo"
                width={72}
                height={72}
                className="mx-auto rounded-2xl"
              />
              <Heading className="text-white text-[28px] font-bold mt-6 mb-0">
                Добро пожаловать!
              </Heading>
              <Text className="text-white/80 text-[14px] mt-2 mb-0">
                Начните управлять перевозками
              </Text>
            </Section>

            <Section className="px-8 py-8">
              <Text className="text-[15px] text-slate-900 leading-[1.6] m-0">
                Привет, <strong>{name}</strong> 👋
              </Text>
              <Text className="text-[14px] text-slate-600 leading-[1.7] mt-3 mb-0">
                Рады видеть вас в Logistics Dashboard. Ваш аккаунт создан, и теперь вы можете отслеживать контейнеры,
                управлять клиентами и видеть аналитику перевозок в реальном времени.
              </Text>

              <Section className="mt-6 mb-6">
                <Text className="text-[12px] text-slate-400 uppercase tracking-wider font-semibold m-0">
                  Что можно делать
                </Text>
                <div className="mt-3 space-y-2">
                  <Text className="text-[13px] text-slate-700 m-0 py-2 border-b border-slate-100">
                    📦 Отслеживать контейнеры от загрузки до доставки
                  </Text>
                  <Text className="text-[13px] text-slate-700 m-0 py-2 border-b border-slate-100">
                    💰 Управлять финансами и инвойсами
                  </Text>
                  <Text className="text-[13px] text-slate-700 m-0 py-2 border-b border-slate-100">
                    📊 Получать отчёты по клиентам и маршрутам
                  </Text>
                  <Text className="text-[13px] text-slate-700 m-0 py-2">
                    🔔 Видеть уведомления о смене статуса
                  </Text>
                </div>
              </Section>

              <Section className="text-center mt-8">
                <Button
                  href={loginUrl}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[14px] font-semibold no-underline inline-block"
                >
                  Войти в дашборд
                </Button>
              </Section>
            </Section>

            <Section className="bg-slate-50 px-8 py-5 text-center">
              <Text className="text-[11px] text-slate-400 m-0">
                Нужна помощь? Напишите{' '}
                <Link href="mailto:support@logistics.kz" className="text-indigo-500">
                  support@logistics.kz
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
