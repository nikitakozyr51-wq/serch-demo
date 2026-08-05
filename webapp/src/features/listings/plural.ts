/**
 * Русское склонение существительного при числе.
 *
 * Это грамматика, а не данные: правило одно на язык и от `DEMO-DATA.md`
 * не зависит. Числа по-прежнему приходят только оттуда.
 *
 * Три формы: 1 объект · 2 объекта · 5 объектов. Одиннадцать–четырнадцать
 * идут по третьей форме, поэтому проверяются раньше единиц.
 */
export function plural(count: number, one: string, few: string, many: string) {
  const abs = Math.abs(count) % 100
  if (abs >= 11 && abs <= 14) return many
  switch (abs % 10) {
    case 1:
      return one
    case 2:
    case 3:
    case 4:
      return few
    default:
      return many
  }
}

/** Разряды пробелом: 35 422 ₽, а не 35422 ₽. Неразрывный пробел, чтобы число не рвалось. */
export function groupDigits(value: number) {
  return value.toLocaleString('ru-RU').replaceAll(' ', ' ')
}
