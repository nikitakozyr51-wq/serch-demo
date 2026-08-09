import { useNavigate } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useLayoutEffect, useState } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { cn } from "@/lib/utils"
import { SPRING } from "@/platform/motion"
import { CHAPTERS, FINISH, STEPS } from "./steps"
import {
  closeTour,
  finishTour,
  goStep,
  setTourPerson,
  startChapter,
  useTour,
} from "./store"

/**
 * Обучение первого входа поверх кабинета.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Собрано с компонентов `JJjqJ C Окно обучения` (360 × 191, поля 20)
 * и `kVuIi C Лист обучения, телефон` (390 × 199, нижние скругления сняты:
 * лист прижат к краю экрана). Содержание и список кадров — в `steps.ts`. Подсветка сделана так, как решил дизайн: затемнение
 * сплошное, а подсвеченный элемент остаётся в полном свете поверх него —
 * своей формой, а не обведённый прямоугольником. Кнопка остаётся капсулой,
 * фотография — своим радиусом, строка списка — своей.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ОБУЧЕНИЕ МОЛЧИТ ПОВЕРХ ПРОБЛЕМЫ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Если на экране висит окно — палитра, диалог, лист, — обучение не всплывает.
 * Окно поверх сообщения о проблеме это издевательство: человек читает
 * «денег нет» и получает сверху «а сейчас мы расскажем про поиск».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧЕГО ЗДЕСЬ НАМЕРЕННО НЕТ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Акцента.** Он означает «списываются деньги», и покрась им «Дальше» —
 * человек прочтёт всё обучение как трату. Главная кнопка графитовая,
 * как везде в кабинете.
 */

/** Сколько шагов в главе. Считается, а не вписывается. */
function stepsIn(chapter: number): number {
  return STEPS.filter((step) => step.chapter === chapter).length
}

/** Порядковый номер шага внутри его главы, от единицы. */
function indexIn(step: number): number {
  const chapter = STEPS[step]?.chapter ?? 1
  return STEPS.slice(0, step + 1).filter((item) => item.chapter === chapter).length
}

type Box = { top: number; left: number; width: number; height: number; radius: string }

/** Окно 360 в ширину, зазор до подсвеченного 12 — с кадра. */
const CARD = 360
const GAP = 12

/**
 * Куда поставить окно, чтобы оно НЕ закрыло то, о чём говорит.
 *
 * Сторона берётся из кадра, но проверяется по месту: если справа не осталось
 * 360 пикселей, окно уходит вниз, а не вылезает за край. Подсказка,
 * накрывшая свой элемент, — это не обучение.
 */
function place(box: Box, side: string): { top: number; left: number } {
  const height = 210
  const width = window.innerWidth
  const bottom = window.innerHeight

  let left = box.left
  let top = box.top + box.height + GAP

  if (side === "right" && box.left + box.width + GAP + CARD < width) {
    left = box.left + box.width + GAP
    top = box.top
  } else if (side === "left" && box.left - GAP - CARD > 0) {
    left = box.left - GAP - CARD
    top = box.top
  } else if (side === "top" && box.top - GAP - height > 0) {
    top = box.top - GAP - height
  }

  return {
    top: Math.max(12, Math.min(top, bottom - height - 12)),
    left: Math.max(12, Math.min(left, width - CARD - 12)),
  }
}

function TourOverlay({ blocked = false }: {
  /**
   * Поверх экрана уже открыто окно.
   *
   * Приходит СНАРУЖИ, а не спрашивается у кабинета. Обучение — свой раздел,
   * и знать про устройство кабинета ему нельзя: кабинет уже знает про
   * обучение, и встречная связь замкнула бы их в кольцо. Проверка
   * архитектуры ловит это и ловит правильно.
   *
   * Кто монтирует — тот и говорит, занят ли экран.
   */
  blocked?: boolean
}) {
  const tour = useTour()
  const session = useSession()
  const navigate = useNavigate()
  const [box, setBox] = useState<Box | null>(null)

  const owner = session?.role !== "agent"
  // Шестая глава — только руководителю. У агента её шагов нет вовсе,
  // и нумерация «глава N из 5» считается от того же списка.
  const steps = STEPS.filter((step) => owner || step.chapter !== 6)
  const chapters = CHAPTERS.filter((chapter) => owner || !chapter.ownerOnly)

  const step = steps[tour.step]
  const chapter = chapters.find((item) => item.number === step?.chapter)

  useEffect(() => {
    if (session?.email) setTourPerson(session.email)
  }, [session?.email])

  // Уводим на нужный экран ДО того, как искать подсвеченное: иначе селектор
  // ищется на прошлой странице и не находится.
  useEffect(() => {
    if (!tour.open || tour.cover || step?.at === undefined) return
    void navigate({ to: step.at })
  }, [tour.open, tour.cover, step?.at, navigate])

  useLayoutEffect(() => {
    /*
      Замер идёт следующим кадром, а не в теле эффекта.

      Прямой вызов `setBox` внутри эффекта запрещён правилом `react-hooks`
      и запрещён по делу: он вызывает вторую отрисовку сразу за первой,
      и на списке из полусотни строк это видно. Кадр ожидания ничего
      не стоит — элемент к этому моменту всё равно уже размечен.

      Элемент может появиться не сразу: экран мог только что смениться.
      Поэтому ищем до двух секунд, а потом сдаёмся и ставим окно по центру —
      это лучше, чем затемнение без подсказки.
    */
    let alive = true
    let attempt = 0
    let timer = 0

    const find = () => {
      if (!alive) return
      const selector = step?.target
      if (!tour.open || tour.cover || selector === undefined) {
        setBox(null)
        return
      }
      const node = document.querySelector(selector)
      if (node === null) {
        attempt += 1
        if (attempt < 20) timer = window.setTimeout(find, 100)
        else setBox(null)
        return
      }
      node.setAttribute("data-tour-lit", "")
      const rect = node.getBoundingClientRect()
      // Радиус берётся у самого элемента: подсвеченная кнопка обязана
      // остаться капсулой, фотография — своим скруглением, строка — своим.
      // Прямоугольная дырка поверх капсулы читается как чужая фигура.
      setBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        radius: getComputedStyle(node).borderRadius,
      })
    }

    const frame = requestAnimationFrame(find)

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      for (const node of document.querySelectorAll("[data-tour-lit]")) {
        node.removeAttribute("data-tour-lit")
      }
    }
  }, [tour.open, tour.cover, tour.step, step?.target])

  useEffect(() => {
    if (!tour.open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTour()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tour.open])

  if (!tour.open) return null

  /**
   * Обучение молчит поверх окна.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Диалог, палитра или лист уже держат внимание и часто сообщают о проблеме.
   * Второй слой поверх них — не подсказка, а помеха.
   *
   * Спрашивается ОБЩИЙ счётчик открытых окон, а не разметка. Через разметку
   * это не работает дважды. Во-первых, своё затемнение тоже кончается
   * на `-scrim`, и правило гасило обучение само собой: окно рисовалось,
   * следующая отрисовка находила его же затемнение и пряталась, затемнение
   * исчезало — и всё повторялось миганием через шаг. Во-вторых, и это хуже,
   * чтение разметки не будит перерисовку: палитра открывалась, а обучение
   * об этом не узнавало и продолжало висеть поверх неё.
   *
   * Счётчик для того и заведён — им уже пользуются горячие клавиши, чтобы
   * не сработать под открытым окном.
   */
  if (blocked) return null

  const last = tour.step >= steps.length - 1
  const total = chapters.length
  const position = box === null ? null : place(box, step?.side ?? "bottom")

  const goNext = () => {
    if (tour.cover) {
      startChapter()
      return
    }
    if (last) {
      finishTour()
      void navigate({ to: FINISH.at })
      return
    }
    const next = tour.step + 1
    // Обложка показывается на границе глав, а не перед каждым шагом.
    goStep(next, steps[next]?.chapter !== step?.chapter)
  }

  const goBack = () => {
    if (tour.cover) {
      const previous = Math.max(0, tour.step - 1)
      goStep(previous, false)
      return
    }
    if (tour.step === 0) return
    goStep(tour.step - 1, false)
  }

  return (
    <>
      {/*
        ЗАТЕМНЕНИЕ С ВЫРЕЗОМ, А НЕ СПЛОШНОЕ ПОЛОТНО.

        ═══════════════════════════════════════════════════════════════════

        Первая сборка поднимала подсвеченный элемент над затемнением через
        `z-index`. В браузере это не сработало ни разу, и причина
        поучительная: экран обёрнут слоем с анимацией прозрачности, а такой
        слой создаёт свой контекст наложения — из него ребёнку не выбраться
        никаким `z-index`. Владелец увидел ровно это: «затемняется всё,
        а не нужные элементы».

        Работает наоборот: затемнение рисуется ТЕНЬЮ вокруг выреза.
        Прямоугольник размером с элемент, у него огромная сплошная тень —
        и всё, кроме него, оказывается затемнено. Никаких контекстов
        наложения, никакой зависимости от того, где элемент лежит в дереве.
        Радиус берётся у самого элемента: кнопка остаётся капсулой.

        Вырез не ловит нажатия (`pointer-events: none`) — их ловит слой
        под ним. Иначе нажатие по подсвеченному элементу проваливалось бы
        в продукт прямо во время рассказа о нём.
      */}
      <div
        data-slot="tour-scrim"
        aria-hidden
        className={cn("fixed inset-0 z-40", box === null && "bg-[#1e1e1e59]")}
        onPointerDown={closeTour}
      />

      {box === null ? null : (
        <motion.div
          data-slot="tour-light"
          aria-hidden
          className="pointer-events-none fixed z-40"
          initial={false}
          animate={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            borderRadius: box.radius,
          }}
          /*
            Вырез ПЕРЕЕЗЖАЕТ между шагами, а не перерисовывается.

            Это и есть то, чего не хватало: без переезда каждый шаг —
            новая дырка в новом месте, и глаз не связывает предыдущий
            элемент со следующим. Пружина «общего элемента» выбрана
            не наугад: это единственное движение продукта, за которым
            глаз обязан проследить, и она в проекте самая медленная.
          */
          transition={SPRING.shared}
          style={{ boxShadow: "0 0 0 9999px #1e1e1e59" }}
        />
      )}

      {/*
        Окно меняется с затуханием, а не подменяется кадром.

        Ключ — номер шага: `AnimatePresence` видит, что окно другое,
        и проводит смену. Без ключа React переиспользовал бы тот же узел,
        текст менялся бы мгновенно, и переход читался бы как подёргивание.
      */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tour.step}-${tour.cover}`}
          data-slot="tour-card"
          role="dialog"
          aria-label="Обучение"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          /*
            Уход быстрый и своим временем, а не пружиной.

            `mode="wait"` держит новое окно, пока старое не ушло. С общей
            пружиной уход занимал те же 260 мс, и каждый шаг стоил
            полсекунды ожидания — на двадцати шагах это десять секунд,
            в течение которых человек смотрит на пустое затемнение.
            Сто миллисекунд читаются как смена, а не как задержка.
          */
          exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
          transition={SPRING.overlay}
          className={cn(
            "fixed z-50 flex w-90 flex-col gap-3 rounded-2xl bg-surface p-5",
            position === null && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          )}
          style={position === null ? undefined : { top: position.top, left: position.left }}
        >
          <Typography variant="columnHeader" tone="dense">
            <>
              {tour.cover
                ? `ГЛАВА ${chapter?.number ?? 1} ИЗ ${total}`
                : last
                  ? FINISH.label
                  : `ГЛАВА ${chapter?.number ?? 1} ИЗ ${total} · ШАГ ${indexIn(tour.step)} ИЗ ${stepsIn(step?.chapter ?? 1)}`}
            </>
          </Typography>

          <Typography variant="strongText" tone="default" as="h2">
            <>{tour.cover ? (chapter?.title ?? "") : last ? FINISH.title : (step?.title ?? "")}</>
          </Typography>

          <Typography variant="uiText" tone="secondary">
            <>{tour.cover ? (chapter?.text ?? "") : last ? FINISH.text : (step?.text ?? "")}</>
          </Typography>

          <div className="flex w-full items-center gap-2">
            {/* Выход виден с первого окна и не спрятан: обучение, из которого
                нельзя выйти, пролистывают целиком вместе с содержанием. */}
            <button
              type="button"
              data-slot="tour-skip"
              onClick={finishTour}
              className="-mx-2 cursor-pointer rounded-sm bg-transparent px-2 py-1 transition-colors duration-120 outline-none hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="denseText" tone="dense">
                <>{tour.cover ? "Пропустить главу" : "Пропустить обучение"}</>
              </Typography>
            </button>

            <div className="h-px flex-1" />

            {tour.step === 0 && tour.cover ? null : (
              <Button variant="quiet" size="sm" onClick={goBack}>
                Назад
              </Button>
            )}
            <Button size="sm" onClick={goNext}>
              <>{tour.cover ? "Начать главу" : last ? FINISH.action : "Дальше"}</>
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export { TourOverlay }
