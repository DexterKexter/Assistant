@AGENTS.md

# Logistics Dashboard — Контекст проекта

## Стек
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend/DB**: Supabase (Postgres) — проект `xkrxmtjxicdiyawldeyp`
- **Деплой**: Vercel — https://assistant-gamma-one.vercel.app
- **GitHub**: https://github.com/DexterKexter/Assistant
- **Шрифты**: Manrope (заголовки) + Inter (body) + JetBrains Mono (моно)

## Расположение файлов
- Рабочая папка: `C:\Users\Omen\Desktop\Assistant`
- Git репо: `/tmp/assistant-init` (для пуша на GitHub нужно копировать src туда)
- `.env.local` — Supabase URL + anon key
- `.claude/launch.json` — dev сервер конфигурация (npm run dev, port 3000)

## Для деплоя
```bash
cp -r "C:/Users/Omen/Desktop/Assistant/src" /tmp/assistant-init/
cd /tmp/assistant-init && git add -A && git commit -m "описание" && git push origin main && vercel --prod --yes
```

## База данных (Supabase)

### Основные таблицы
- **shipments** — 1639 перевозок (основная таблица)
- **clients** — 208 контактных лиц (поле `is_russia` = клиент из РФ)
- **carriers** — 20 перевозчиков
- **senders** — 49 отправителей (агенты в Дубае/Китае)
- **recipients** — 21 получатель (ТОО/ИП компании)
- **profiles** — пользователи системы (Supabase Auth)
- **documents**, **transactions** — доп. таблицы

### Shipments — ключевые поля
- `container_number` — номер контейнера (MSKU1234567)
- `container_size` — 20 или 40 (футов)
- `container_type` — Выкупной / Возвратный / Собственный / Малшы
- `origin` — откуда (Дубай, Чингдао, Корея и т.д.)
- `destination_station` — погранпереход (Актау Порт, Алтынколь, Сары-агаш, Темир-Баба)
- `destination_city` — конечный город (Алматы, Москва, Челябинск и т.д.)
- `departure_date` — дата загрузки/отправки
- `arrival_date` — дата прибытия на границу КЗ
- `delivery_date` — дата конечной доставки клиенту (объединено из release_date для РФ)
- `is_completed` — флаг завершения
- `sender_name` — текстовое имя отправителя (денормализовано)
- `contract_pdf` — ссылка на PDF договора (Google Storage)
- `excel_files` — массив ссылок на Excel файлы
- `photos` — массив ссылок на фото груза
- `delivery_cost`, `price`, `invoice_amount`, `customs_cost`, `additional_cost` — финансы

### Логика статусов
```
if delivery_date OR is_completed → Доставлен (зелёный)
if arrival_date AND клиент из РФ → Транзит КЗ (янтарный)
if arrival_date AND клиент из КЗ → На границе (янтарный)
if departure_date → В пути (индиго)
else → Загрузка (серый)
```

### Маршрут контейнера
**Для КЗ**: Загрузка → В пути → На границе КЗ → Доставлен
**Для РФ**: Загрузка → В пути → Транзит КЗ (Казахстан = транзит) → Доставлен в РФ

`arrival_date` = дата прибытия на границу КЗ (для РФ это транзит)

### RLS
- `get_user_role()` — функция возвращает роль пользователя
- admin/manager — полный доступ
- client — только свои данные

### Storage
- Бакет `shipment-docs` — для загрузки новых документов и фото

## Структура страниц

### `/dashboard` — Обзор
- 4 карточки: Загружено, В пути, На границе, Доставлено
- Активные перевозки (список)
- Топ перевозчики (в пути)
- Популярные маршруты
- Карта с точками отправки

### `/dashboard/shipments` — Перевозки
- Таблица с поиском, фильтрами (статус, перевозчик, клиент, даты)
- Группировка по месяцам
- Inline date-picker для границы и доставки
- При клике → модальное окно с деталями (ShipmentDetailInline)

### `/dashboard/shipments/[id]` — Детали перевозки (отдельная страница)
- Табы: Перевозка / Документы / Финансы
- Перевозка: детали контейнера + участники + route timeline + карта Leaflet
- Документы: фото карусель + файлы + загрузка в Supabase Storage
- Финансы: карточки с суммами

### `/dashboard/clients` — Клиенты
- Таблица с поиском, флаг 🇷🇺/🇰🇿

### `/dashboard/documents` — Документы
- Горизонтальная карусель договоров
- Сетка фото грузов (8 превью + модалка "Полный список")
- Таблица статусов документов (все контейнеры, есть/нет инвойс и фото)

### `/dashboard/finance` — Финансы
- Старая страница, нужно переделать

## Дизайн
- Стиль: монохромный серый (slate), минималистичный 2026
- Акцент: indigo для активных элементов
- Sidebar: белый, секции "Основное" + "Статусы"
- Header: 56px, поиск + профиль
- Табы: underline стиль (как у Acme)
- Даты: формат дд.мм.гггг (функция `fmtDate` в `lib/utils.ts`)
- Карта: Leaflet + CartoDB light tiles, статичная (без перетаскивания)

## Supabase Keys
- URL: https://xkrxmtjxicdiyawldeyp.supabase.co
- Anon key: в .env.local
- Service role key: используется для миграций

## Glide API (для миграции данных)
- API key: 314d5932-3d19-419f-9182-6f1c4f7130ea
- App ID: DqjKCS7HuIiAh9avWxsO
- Данные из Glide уже мигрированы в Supabase
