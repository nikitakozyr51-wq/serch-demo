import { useEffect, useRef, useState } from "react"

/**
 * Плавный переход числа от прежнего значения к новому.
 *
 * **Единственное место кабинета, где движение обязательно, — счётчик баланса
 * при списании, 600 мс.** Так записано в спеке движения, и причина не в красоте:
 * деньги ушли, и человек обязан это увидеть. Мгновенная подмена «8 610 → 8 411»
 * проходит мимо глаза, особенно когда смотришь не в шапку, а на строку выдачи.
 *
 * Всё остальное в кабинете движется 120–200 мс или не движется вовсе: агент
 * делает тридцать-пятьдесят звонков в день, и каждая лишняя десятая доля
 * секунды умножается на это число.
 *
 * Кривая — ease-out экспоненциального типа, без отскока: счётчик денег,
 * который перелетает и возвращается, показывает сумму, которой не было.
 *
 * При `prefers-reduced-motion` значение меняется мгновенно. Это не поблажка:
 * для части людей движение вызывает тошноту, а сумма читается и без него.
 */
function useAnimatedNumber(target: number, durationMs = 600) {
  const [value, setValue] = useState(target)
  const frameRef = useRef(0)
  const fromRef = useRef(target)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const from = fromRef.current

    if (media.matches || from === target) {
      fromRef.current = target
      setValue(target)
      return
    }

    /**
     * Настройку могли включить прямо во время отсчёта.
     *
     * Раньше она читалась один раз на старте, и человек, которому от движения
     * делается плохо, досматривал начатую анимацию до конца — то есть запрет
     * действовал со следующего раза, а не с этого. Счёт обрывается на месте
     * и показывает итог: сумма важнее способа её показать.
     */
    const stopOnReduce = () => {
      if (!media.matches) return
      cancelAnimationFrame(frameRef.current)
      fromRef.current = target
      setValue(target)
    }

    media.addEventListener("change", stopOnReduce)

    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      // 1 − (1 − t)³: быстрый старт, мягкая остановка, ничего за пределами цели.
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(from + (target - from) * eased))

      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      media.removeEventListener("change", stopOnReduce)
      cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs])

  return value
}

export { useAnimatedNumber }
