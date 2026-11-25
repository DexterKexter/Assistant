export const metadata = { title: 'Политика конфиденциальности — STI Cargo' }

// Public page: Meta requires a privacy policy URL before a WhatsApp app can go live.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-[15px] leading-relaxed text-slate-700">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 font-heading">Политика конфиденциальности</h1>
      <p className="mb-4">STI Cargo организует контейнерные перевозки. Эта страница описывает, какие данные клиентов мы обрабатываем и зачем.</p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-slate-900">Какие данные мы храним</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>имя и номер телефона клиента;</li>
        <li>переписку с нами в WhatsApp;</li>
        <li>сведения о перевозках: номер контейнера, маршрут, даты, состав груза, документы и фотографии груза.</li>
      </ul>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-slate-900">Зачем</h2>
      <p className="mb-4">Чтобы оформлять и сопровождать перевозки, отвечать на вопросы и сообщать о статусе груза. Мы не используем данные для рекламы и не продаём их.</p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-slate-900">Кому передаём</h2>
      <p className="mb-4">Данные о грузе получают перевозчики и агенты, которые участвуют в доставке. Сообщения в WhatsApp проходят через платформу WhatsApp Business (Meta). Данные хранятся в защищённой базе, доступ есть только у сотрудников STI Cargo.</p>

      <h2 className="mb-2 mt-6 text-lg font-semibold text-slate-900">Ваши права</h2>
      <p className="mb-4">Вы можете запросить свои данные, попросить исправить или удалить их, а также отказаться от сообщений в WhatsApp — напишите нам в WhatsApp, и мы выполним просьбу.</p>

      <p className="mt-8 text-[13px] text-slate-400">STI Cargo · Industrial Area 6, 56th Street, Sharjah, UAE</p>
    </main>
  )
}
