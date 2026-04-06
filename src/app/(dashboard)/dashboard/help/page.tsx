'use client'

import { useState } from 'react'
import { Search, Ship, LayoutGrid, Users, Wallet, FileText, MessageSquare, CheckSquare, BarChart3, Bell, Shield, ChevronDown, ChevronRight, HelpCircle, MapPin, Calendar, Filter, Kanban, List, Truck } from 'lucide-react'

interface Section {
  id: string
  icon: any
  iconColor: string
  title: string
  items: { q: string; a: string }[]
}

const SECTIONS: Section[] = [
  {
    id: 'overview',
    icon: LayoutGrid,
    iconColor: '#6366f1',
    title: 'Обзор (Дашборд)',
    items: [
      { q: 'Что показывает дашборд?', a: 'Главная страница отображает 4 карточки со статистикой (загружено, в пути, на границе, доставлено), список активных перевозок, топ перевозчиков и популярные маршруты.' },
      { q: 'Что за карта на дашборде?', a: 'Интерактивная карта показывает пункты отправки контейнеров. Кликните на точку, чтобы увидеть маршруты из этого пункта. Можно фильтровать по годам.' },
      { q: 'Как обновляются данные?', a: 'Данные обновляются при каждом заходе на страницу. Статистика считается в реальном времени из базы данных.' },
    ],
  },
  {
    id: 'shipments',
    icon: Ship,
    iconColor: '#6366f1',
    title: 'Перевозки',
    items: [
      { q: 'Как создать перевозку?', a: 'Нажмите кнопку "Новая перевозка" на странице перевозок. Заполните номер контейнера, выберите клиента, перевозчика, укажите маршрут и даты.' },
      { q: 'Какие статусы есть?', a: 'Загрузка (серый) — контейнер готовится. В пути (индиго) — отправлен. На границе (янтарный) — прибыл на погранпереход КЗ. Транзит КЗ (янтарный) — для РФ клиентов, Казахстан = транзит. Доставлен (зелёный) — контейнер у клиента.' },
      { q: 'Как менять даты?', a: 'Кликните на дату в таблице — откроется date-picker. Можно менять дату загрузки, прибытия на границу и доставки прямо из списка.' },
      { q: 'Как фильтровать перевозки?', a: 'Используйте поиск по номеру контейнера, фильтры по статусу, перевозчику, клиенту и диапазону дат. Все фильтры комбинируются.' },
      { q: 'Что за типы контейнеров?', a: 'Выкупной — клиент выкупает контейнер. Возвратный — контейнер возвращается. Собственный — контейнер компании. Размеры: 20ft и 40ft.' },
    ],
  },
  {
    id: 'clients',
    icon: Users,
    iconColor: '#059669',
    title: 'Клиенты',
    items: [
      { q: 'Что показывает страница клиентов?', a: 'Таблица всех контактных лиц с поиском. Для каждого клиента указан флаг страны (РФ или КЗ), адрес и телефон.' },
      { q: 'Зачем флаг РФ/КЗ?', a: 'Флаг определяет логику статусов перевозки. Для РФ клиентов Казахстан — транзитная страна, поэтому прибытие на границу КЗ показывается как "Транзит КЗ", а не "На границе".' },
      { q: 'Как посмотреть перевозки клиента?', a: 'Кликните на клиента в таблице — откроется его профиль с историей перевозок и контактной информацией.' },
    ],
  },
  {
    id: 'finance',
    icon: Wallet,
    iconColor: '#f59e0b',
    title: 'Финансы',
    items: [
      { q: 'Как добавить транзакцию?', a: 'Нажмите "Добавить" на странице финансов. Выберите тип (доход/расход), категорию, сумму и привяжите к клиенту или перевозке.' },
      { q: 'Какие категории расходов?', a: 'Доставка, Таможня, Хранение, Страхование, Погрузка/разгрузка, Оплата от клиента, Прочее.' },
      { q: 'Как посмотреть баланс?', a: 'Общий баланс отображается вверху страницы. Фильтруйте по типу (доходы/расходы) для детального анализа.' },
    ],
  },
  {
    id: 'documents',
    icon: FileText,
    iconColor: '#8b5cf6',
    title: 'Документы',
    items: [
      { q: 'Какие документы хранятся?', a: 'Договоры (PDF), фотографии грузов, инвойсы и таможенные декларации. Все привязаны к конкретным перевозкам.' },
      { q: 'Как загрузить документ?', a: 'Откройте перевозку, перейдите на вкладку "Документы" и нажмите кнопку загрузки. Файлы хранятся в облачном хранилище Supabase.' },
      { q: 'Как посмотреть статус документов?', a: 'На странице документов есть таблица статусов — для каждого контейнера показано, есть ли инвойс и фото.' },
    ],
  },
  {
    id: 'messages',
    icon: MessageSquare,
    iconColor: '#06b6d4',
    title: 'Сообщения',
    items: [
      { q: 'Как работает чат?', a: 'Выберите собеседника из списка слева, напишите сообщение справа. Чат обновляется в реальном времени.' },
      { q: 'Как узнать о новых сообщениях?', a: 'В сайдбаре и мобильной навигации отображается бейдж с количеством непрочитанных сообщений.' },
    ],
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    iconColor: '#f59e0b',
    title: 'Задачи',
    items: [
      { q: 'Как создать задачу?', a: 'Нажмите "Новая задача" на странице задач. Укажите название, описание, приоритет, исполнителя и дедлайн.' },
      { q: 'Какие виды отображения?', a: 'Канбан-доска (4 колонки: К выполнению, В работе, На проверке, Готово) и табличный список. Переключайте кнопками в тулбаре.' },
      { q: 'Как менять статус задачи?', a: 'В канбане — нажмите "..." на карточке и выберите новый статус. В детальном виде — кликните на нужный статус-пилл.' },
      { q: 'Как работают уведомления?', a: 'При назначении задачи исполнитель получает уведомление. При новом комментарии — уведомляются создатель и исполнитель.' },
      { q: 'Кто может редактировать задачу?', a: 'Редактировать и удалять может только создатель задачи или администратор. Исполнитель может менять только статус.' },
    ],
  },
  {
    id: 'reports',
    icon: BarChart3,
    iconColor: '#8b5cf6',
    title: 'Отчёты',
    items: [
      { q: 'Какие вкладки есть?', a: 'Годовой отчёт — графики по годам/месяцам, аналитика, топ направления/перевозчики/клиенты. Месячный отчёт — таблица перевозок за выбранный месяц. Сравнение — сравнение двух периодов.' },
      { q: 'Как выбрать год?', a: 'В годовом отчёте используйте выпадающий список "Годовая статистика" для выбора года. Все графики и метрики обновятся.' },
      { q: 'Что показывает аналитика?', a: 'Лучший и слабый месяц, среднее количество загрузок в месяц, среднее время доставки, разбивка РФ/КЗ, количество уникальных клиентов и перевозчиков.' },
      { q: 'Как сравнить периоды?', a: 'На вкладке "Сравнение" выберите два периода (месяц-год). Система покажет разницу в загрузках, доставках, РФ и КЗ направлениях с процентами.' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    iconColor: '#ef4444',
    title: 'Уведомления',
    items: [
      { q: 'Где посмотреть уведомления?', a: 'Нажмите на колокольчик в правом верхнем углу. Непрочитанные отмечены синей точкой и числом.' },
      { q: 'Какие уведомления приходят?', a: 'Назначение задачи (вам назначили задачу) и новый комментарий к задаче (где вы создатель или исполнитель).' },
      { q: 'Как отметить все прочитанными?', a: 'В окне уведомлений нажмите "Прочитать все" в правом верхнем углу.' },
    ],
  },
  {
    id: 'admin',
    icon: Shield,
    iconColor: '#64748b',
    title: 'Администрирование',
    items: [
      { q: 'Кто имеет доступ к админке?', a: 'Только пользователи с ролью "Администратор". Менеджеры, бухгалтеры и клиенты не видят раздел управления.' },
      { q: 'Что можно настроить?', a: 'Справочники (города, станции, типы грузов, отправители), управление пользователями и их ролями.' },
      { q: 'Какие роли существуют?', a: 'Администратор — полный доступ. Менеджер — все данные кроме админки. Бухгалтер — финансы и документы. Клиент — только свои перевозки.' },
    ],
  },
]

export default function HelpPage() {
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = search.trim()
    ? SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.q.toLowerCase().includes(search.toLowerCase()) ||
          i.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : SECTIONS

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Справочник</h1>
        <p className="text-[13px] text-slate-400 mt-1">Полное руководство по приложению Logistics</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по справочнику..."
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200/60 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-all"
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {filtered.map(section => {
          const isOpen = openSections.has(section.id) || search.trim().length > 0
          const Icon = section.icon

          return (
            <div key={section.id} className="bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-100/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: section.iconColor + '15' }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: section.iconColor }} strokeWidth={1.8} />
                </div>
                <span className="text-[14px] font-semibold text-slate-800 flex-1">{section.title}</span>
                <span className="text-[11px] text-slate-400 mr-2">{section.items.length} вопросов</span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={2} />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
                )}
              </button>

              {/* Items */}
              {isOpen && (
                <div className="px-5 pb-4 space-y-3">
                  {section.items.map((item, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 border border-slate-100">
                      <h4 className="text-[13px] font-semibold text-slate-800 mb-1.5">{item.q}</h4>
                      <p className="text-[12px] text-slate-500 leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[13px] text-slate-400">Ничего не найдено</p>
        </div>
      )}
    </div>
  )
}
