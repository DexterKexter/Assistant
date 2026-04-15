import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Logistics — Панель управления',
    short_name: 'Logistics',
    description: 'Логистический дашборд: перевозки, клиенты, финансы, документы',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f9fb',
    theme_color: '#0f172a',
    lang: 'ru',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Перевозки',
        short_name: 'Перевозки',
        description: 'Список всех перевозок',
        url: '/dashboard/shipments',
      },
      {
        name: 'Задачи',
        short_name: 'Задачи',
        description: 'Мои задачи',
        url: '/dashboard/tasks',
      },
      {
        name: 'Чат',
        short_name: 'Чат',
        description: 'Сообщения',
        url: '/dashboard/messages',
      },
    ],
  }
}
