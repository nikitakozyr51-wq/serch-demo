import { useNavigate } from "@tanstack/react-router"
import { useEffect, useLayoutEffect, useState } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { cn } from "@/lib/utils"
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
 * и обложек глав. Подсветка сделана так, как решил дизайн: затемнение
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

type Box = { top: number; left: number; width: number; height: number }

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
      setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
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
      {/* Затемнение. Тот же тон, что у всех окон файла. */}
      <div
        data-slot="tour-scrim"
        aria-hidden
        className="fixed inset-0 z-40 bg-[#1e1e1e59]"
        onPointerDown={closeTour}
      />

      <div
        data-slot="tour-card"
        role="dialog"
        aria-label="Обучение"
        className={cn(
          "motion-in fixed z-50 flex w-90 flex-col gap-3 rounded-2xl bg-surface p-5",
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
      </div>
    </>
  )
}

export { TourOverlay }
