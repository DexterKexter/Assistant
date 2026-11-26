import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, MessageCircle } from 'lucide-react'
import { LandingForm, type FormCopy } from './landing-form'

type Lang = 'ru' | 'en'
const WA = '77010851761'

// Figures come from our own shipments table (Nov 2026): 1991 containers since Aug 2022, 244 clients,
// median Dubai → Kazakhstan border 36 days. Update by hand when they drift.
const copy = {
  ru: {
    title: 'STI Cargo — контейнерные перевозки из Дубая и Азии в Казахстан и Россию',
    description: 'Доставляем 20- и 40-футовые контейнеры из ОАЭ, Китая, Японии и Кореи в Казахстан и Россию. Статус груза — в WhatsApp.',
    nav: [['#routes', 'Маршруты'], ['#process', 'Как работаем'], ['#request', 'Заявка']],
    wa: 'Написать в WhatsApp', waText: 'Здравствуйте! Хочу узнать о перевозке контейнера.',
    eyebrow: 'Контейнерные перевозки · с 2022 года',
    h1: 'Контейнеры из Дубая и Азии — в Казахстан и Россию',
    lead: 'Забираем груз у отправителя, везём морем и по железной дороге, проходим границу и доставляем в ваш город. На каждом этапе вы знаете, где контейнер.',
    cta: 'Оставить заявку',
    sample: 'Пример', track: ['Загрузка', 'В пути', 'Граница Казахстана', 'Доставлен'], trackPlace: ['Дубай', 'Море · Каспий', 'Актау Порт', 'Алматы'], trackDays: '36 дней в пути', trackNow: 'сейчас',
    stats: [['1 900+', 'контейнеров отправлено с 2022 года'], ['240+', 'клиентов в Казахстане и России'], ['≈ 36 дней', 'Дубай → граница Казахстана, медиана по нашим рейсам'], ['20 и 40 ft', 'контейнеры: выкупные, возвратные, собственные']],
    routesTitle: 'Откуда и куда возим', routesLead: 'Основное направление — Дубай. Остальное считаем под заявку.',
    routes: [
      ['Откуда', ['Дубай, ОАЭ', 'Гуанчжоу, Шанхай, Гонконг', 'Япония', 'Южная Корея', 'Тайвань']],
      ['Через границу', ['Актау Порт', 'Алтынколь', 'Сарыагаш', 'Темир-Баба']],
      ['Казахстан', ['Алматы', 'Астана', 'Актау', 'Шымкент', 'Кызылорда']],
      ['Россия, транзитом', ['Москва', 'Челябинск', 'Новосибирск', 'Тула', 'Екатеринбург', 'Краснодар']],
    ],
    processTitle: 'Как проходит перевозка',
    process: [
      ['Заявка', 'Вы называете груз, откуда и куда. Мы считаем стоимость и срок.'],
      ['Загрузка', 'Наш агент на месте принимает груз, грузит контейнер и присылает фото.'],
      ['В пути', 'Контейнер идёт морем и по железной дороге. Сообщаем, когда он отправлен и где находится.'],
      ['Граница', 'Проходим границу Казахстана. Для России Казахстан — транзит, оформляем его сами.'],
      ['Доставка', 'Привозим контейнер в ваш город и передаём документы.'],
    ],
    includedTitle: 'Что вы получаете',
    included: ['Одного менеджера на всю перевозку', 'Статус контейнера в WhatsApp — без звонков и «уточним»', 'Фото груза при загрузке', 'Договор, инвойс и упаковочный лист в одном месте'],
    requestTitle: 'Рассчитать перевозку', requestLead: 'Оставьте заявку — менеджер ответит в рабочее время. Быстрее всего — написать в WhatsApp.',
    form: {
      name: 'Имя или компания', phone: 'Телефон (WhatsApp)', origin: 'Откуда', destination: 'Куда', destinationHint: 'Город доставки',
      size: 'Контейнер', notes: 'Что везёте', notesHint: 'Груз, вес, сроки — что считаете важным', submit: 'Отправить заявку', sending: 'Отправляем…',
      done: 'Заявка принята', doneText: 'Менеджер свяжется с вами по указанному номеру.', error: 'Не получилось отправить. Напишите нам в WhatsApp.',
      origins: ['Дубай', 'Китай', 'Япония', 'Южная Корея', 'Тайвань', 'Другое'],
    } satisfies FormCopy,
    privacy: 'Политика конфиденциальности', staff: 'Вход для сотрудников', other: ['/en', 'EN'],
  },
  en: {
    title: 'STI Cargo — container shipping from Dubai and Asia to Kazakhstan and Russia',
    description: 'We deliver 20 and 40 ft containers from the UAE, China, Japan and Korea to Kazakhstan and Russia. Cargo status in WhatsApp.',
    nav: [['#routes', 'Routes'], ['#process', 'How it works'], ['#request', 'Request']],
    wa: 'Message us on WhatsApp', waText: 'Hello! I would like to ask about shipping a container.',
    eyebrow: 'Container shipping · since 2022',
    h1: 'Containers from Dubai and Asia to Kazakhstan and Russia',
    lead: 'We collect the cargo from the sender, move it by sea and rail, clear the border and deliver to your city. You know where the container is at every stage.',
    cta: 'Send a request',
    sample: 'Example', track: ['Loading', 'In transit', 'Kazakhstan border', 'Delivered'], trackPlace: ['Dubai', 'Sea · Caspian', 'Aktau Port', 'Almaty'], trackDays: '36 days in transit', trackNow: 'now',
    stats: [['1,900+', 'containers shipped since 2022'], ['240+', 'clients in Kazakhstan and Russia'], ['≈ 36 days', 'Dubai → Kazakhstan border, median of our shipments'], ['20 & 40 ft', 'containers: one-way, returnable, shipper-owned']],
    routesTitle: 'Where we ship', routesLead: 'Dubai is our main lane. Everything else is quoted per request.',
    routes: [
      ['From', ['Dubai, UAE', 'Guangzhou, Shanghai, Hong Kong', 'Japan', 'South Korea', 'Taiwan']],
      ['Border crossing', ['Aktau Port', 'Altynkol', 'Saryagash', 'Temir-Baba']],
      ['Kazakhstan', ['Almaty', 'Astana', 'Aktau', 'Shymkent', 'Kyzylorda']],
      ['Russia, in transit', ['Moscow', 'Chelyabinsk', 'Novosibirsk', 'Tula', 'Yekaterinburg', 'Krasnodar']],
    ],
    processTitle: 'How a shipment goes',
    process: [
      ['Request', 'Tell us the cargo, origin and destination. We quote the price and transit time.'],
      ['Loading', 'Our agent on site receives the cargo, loads the container and sends photos.'],
      ['In transit', 'The container travels by sea and rail. We tell you when it departs and where it is.'],
      ['Border', 'We clear the Kazakhstan border. For Russia, Kazakhstan is transit — we handle it.'],
      ['Delivery', 'We bring the container to your city and hand over the documents.'],
    ],
    includedTitle: 'What you get',
    included: ['One manager for the whole shipment', 'Container status in WhatsApp — no chasing calls', 'Photos of the cargo at loading', 'Contract, invoice and packing list in one place'],
    requestTitle: 'Get a quote', requestLead: 'Leave a request and a manager will reply during business hours. WhatsApp is the fastest way.',
    form: {
      name: 'Name or company', phone: 'Phone (WhatsApp)', origin: 'From', destination: 'To', destinationHint: 'Delivery city',
      size: 'Container', notes: 'What are you shipping', notesHint: 'Cargo, weight, timing — anything that matters', submit: 'Send request', sending: 'Sending…',
      done: 'Request received', doneText: 'A manager will contact you at the number you provided.', error: 'Could not send. Please message us on WhatsApp.',
      origins: ['Dubai', 'China', 'Japan', 'South Korea', 'Taiwan', 'Other'],
    } satisfies FormCopy,
    privacy: 'Privacy policy', staff: 'Staff sign-in', other: ['/', 'RU'],
  },
}

export function landingMeta(lang: Lang): Metadata {
  const t = copy[lang]
  return {
    title: t.title, description: t.description, manifest: null,
    alternates: { canonical: lang === 'ru' ? 'https://sti-cargo.com/' : 'https://sti-cargo.com/en', languages: { ru: 'https://sti-cargo.com/', en: 'https://sti-cargo.com/en' } },
    openGraph: { title: t.title, description: t.description, siteName: 'STI Cargo', type: 'website' },
  }
}

const wrap = 'mx-auto w-full max-w-6xl px-5 sm:px-8'
const h2 = 'font-heading text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl'

export function Landing({ lang }: { lang: Lang }) {
  const t = copy[lang]
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(t.waText)}`

  return (
    <div lang={lang} className="bg-white text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className={`${wrap} flex h-16 items-center gap-6`}>
          <Link href={lang === 'ru' ? '/' : '/en'} className="font-heading text-[19px] font-extrabold tracking-tight">STI Cargo</Link>
          <nav className="ml-4 hidden gap-6 text-[14px] text-slate-600 md:flex">
            {t.nav.map(([href, name]) => <a key={href} href={href} className="hover:text-slate-900">{name}</a>)}
          </nav>
          <Link href={t.other[0]} className="ml-auto rounded-md px-2 py-1 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">{t.other[1]}</Link>
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[14px] font-semibold text-white hover:bg-slate-800">
            <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t.wa}</span><span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      <main>
        <section className={`${wrap} grid items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24`}>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-indigo-600">{t.eyebrow}</p>
            <h1 className="mt-4 font-heading text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{t.h1}</h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-600">{t.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-6 text-[15px] font-semibold text-white hover:bg-slate-800"><MessageCircle className="h-4 w-4" />{t.wa}</a>
              <a href="#request" className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 px-6 text-[15px] font-semibold text-slate-900 hover:border-slate-400">{t.cta}<ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>

          {/* A static sample of what a client sees: the same four statuses the CRM tracks. */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[15px] font-semibold tracking-wide">MSKU 734512 4</p>
              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">{t.sample}</span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">40 ft · {t.trackPlace[0]} → {t.trackPlace[3]}</p>
            <ol className="mt-6">
              {t.track.map((step, i) => {
                const done = i < 2, now = i === 2
                return (
                  <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < 3 && <span className={`absolute left-[7px] top-4 h-full w-px ${i < 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />}
                    <span className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${done ? 'border-slate-900 bg-slate-900' : now ? 'border-indigo-600 bg-white ring-4 ring-indigo-100' : 'border-slate-300 bg-white'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[15px] font-semibold ${done || now ? 'text-slate-900' : 'text-slate-400'}`}>{step}{now && <span className="ml-2 text-[12px] font-medium text-indigo-600">{t.trackNow}</span>}</p>
                      <p className="text-[13px] text-slate-500">{t.trackPlace[i]}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="mt-6 border-t border-slate-200 pt-4 text-[13px] text-slate-500">{t.trackDays}</p>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50">
          <dl className={`${wrap} grid grid-cols-2 gap-x-8 gap-y-8 py-12 lg:grid-cols-4`}>
            {t.stats.map(([value, text]) => (
              <div key={value}>
                <dt className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">{value}</dt>
                <dd className="mt-2 text-[14px] leading-snug text-slate-500">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="routes" className={`${wrap} scroll-mt-16 py-16 lg:py-24`}>
          <h2 className={h2}>{t.routesTitle}</h2>
          <p className="mt-3 max-w-xl text-[16px] text-slate-600">{t.routesLead}</p>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {t.routes.map(([name, items]) => (
              <div key={name as string} className="border-t-2 border-slate-900 pt-4">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">{name}</h3>
                <ul className="mt-3 space-y-1.5 text-[16px]">
                  {(items as string[]).map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="process" className="scroll-mt-16 bg-slate-900 text-white">
          <div className={`${wrap} py-16 lg:py-24`}>
            <h2 className={`${h2} !text-white`}>{t.processTitle}</h2>
            <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
              {t.process.map(([name, text], i) => (
                <li key={name}>
                  <p className="font-mono text-[13px] text-slate-400">0{i + 1}</p>
                  <h3 className="mt-2 font-heading text-[18px] font-bold">{name}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-300">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${wrap} grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24`}>
          <h2 className={h2}>{t.includedTitle}</h2>
          <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {t.included.map(item => (
              <li key={item} className="flex gap-3 text-[16px] leading-snug text-slate-700">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />{item}
              </li>
            ))}
          </ul>
        </section>

        <section id="request" className="scroll-mt-16 border-t border-slate-100 bg-slate-50">
          <div className={`${wrap} grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24`}>
            <div>
              <h2 className={h2}>{t.requestTitle}</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-slate-600">{t.requestLead}</p>
              <a href={wa} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-[16px] font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">
                <MessageCircle className="h-4 w-4" />+7 701 085 17 61
              </a>
            </div>
            <LandingForm t={t.form} />
          </div>
        </section>
      </main>

      <footer className={`${wrap} flex flex-col gap-3 py-10 text-[13px] text-slate-500 sm:flex-row sm:items-center`}>
        <p><span className="font-heading font-extrabold text-slate-900">STI Cargo</span> · Industrial Area 6, 56th Street, Sharjah, UAE</p>
        <div className="flex gap-5 sm:ml-auto">
          <Link href="/privacy" className="hover:text-slate-900">{t.privacy}</Link>
          <a href="https://crm.sti-cargo.com/login" className="hover:text-slate-900">{t.staff}</a>
        </div>
      </footer>
    </div>
  )
}
