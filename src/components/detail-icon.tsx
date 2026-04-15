/**
 * DetailIcon — иконка поля с подписью и значением.
 *
 * Стиль: маленький квадрат bg-slate-50 с иконкой слева, текст справа.
 * Используется в карточках "Контейнер", "Участники" и т.д.
 *
 * Пример:
 *   <DetailIcon icon={<Ship className="w-3.5 h-3.5" />} label="Номер" value="MSKU1234567" bold />
 *   <DetailIcon icon={<Truck className="w-3.5 h-3.5" />} label="Перевозчик" value="Malshy" />
 */
export function DetailIcon({
  icon,
  label,
  value,
  bold,
}: {
  icon: React.ReactNode
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
        <p className={`text-[12.5px] text-slate-900 mt-0.5 leading-tight line-clamp-2 ${bold ? 'font-bold font-mono' : 'font-semibold'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
