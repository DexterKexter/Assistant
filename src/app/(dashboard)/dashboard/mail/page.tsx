import { render } from 'react-email'
import fs from 'node:fs/promises'
import path from 'node:path'
import ArrivalNotification from '@/emails/arrival-notification'
import Invoice from '@/emails/invoice'
import Welcome from '@/emails/welcome'
import WeeklyReport from '@/emails/weekly-report'
import CodeSnippet from '@/emails/code-snippet'
import { MailClient, type Template } from './mail-client'

export const dynamic = 'force-dynamic'

async function source(file: string) {
  try {
    return await fs.readFile(path.join(process.cwd(), 'src/emails', file), 'utf8')
  } catch {
    return ''
  }
}

async function buildTemplate(
  id: string,
  name: string,
  description: string,
  subject: string,
  file: string,
  features: string[],
  element: React.ReactElement
): Promise<Template> {
  const [html, text, code] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
    source(file),
  ])
  return { id, name, description, subject, file, features, html, text, code }
}

export default async function MailPage() {
  const templates = await Promise.all([
    buildTemplate(
      'arrival',
      'Прибытие контейнера',
      'Уведомление клиенту о прибытии контейнера на границу КЗ',
      'Контейнер TRLU6944577 прибыл на границу Алтынколь',
      'arrival-notification.tsx',
      ['Html', 'Head', 'Preview', 'Body', 'Container', 'Section', 'Row', 'Column', 'Heading', 'Text', 'Button', 'Hr', 'Link'],
      <ArrivalNotification />
    ),
    buildTemplate(
      'invoice',
      'Инвойс',
      'Счёт на оплату услуг перевозки',
      'Счёт INV-2026-0412 на $5 170',
      'invoice.tsx',
      ['Row/Column таблица', 'Форматированные суммы', 'Gradient CTA кнопка'],
      <Invoice />
    ),
    buildTemplate(
      'welcome',
      'Приветствие',
      'Письмо новому пользователю с Tailwind-стилями',
      'Добро пожаловать в Logistics Dashboard!',
      'welcome.tsx',
      ['Tailwind wrapper', 'Gradient hero', 'Img component', 'Feature list'],
      <Welcome />
    ),
    buildTemplate(
      'report',
      'Еженедельный отчёт',
      'Сводка по перевозкам для менеджера',
      'Отчёт за 12–18 апреля — 31 доставлено',
      'weekly-report.tsx',
      ['Grid со статистикой', 'Цветные бейджи', 'Таблица маршрутов'],
      <WeeklyReport />
    ),
    buildTemplate(
      'code',
      'Код с подсветкой',
      'Showcase компонента CodeBlock с dracula-темой',
      'Пример кода из дашборда',
      'code-snippet.tsx',
      ['CodeBlock', 'Prism highlighting', 'Theme dracula', 'Line numbers'],
      <CodeSnippet />
    ),
  ])

  return <MailClient templates={templates} />
}
