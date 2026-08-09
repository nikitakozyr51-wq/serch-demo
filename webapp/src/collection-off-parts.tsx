import { Typography } from "@/components/typography"

/**
 * Блок объяснения: причина и что она значит.
 *
 * Зазор 4, подпись 13 весом 600, текст 13 весом 500 приглушённый — одинаково
 * в обоих кадрах. Подпись идёт `tabActive`: другой ступени 13/600 в лестнице
 * нет, а запрет переноса внутри неё здесь не мешает — все три подписи в файле
 * стоят в одну строку (90, 68 и 107 px в колонке шириной 344).
 */
export function CollectionOffReason({ title, text }: { title: string; text: string }) {
  return (
    <div data-slot="collection-off-reason" className="flex w-full flex-col gap-1">
      <Typography variant="tabActive" tone="default">
        {title}
      </Typography>
      <Typography variant="denseText" tone="secondary">
        {text}
      </Typography>
    </div>
  )
}
