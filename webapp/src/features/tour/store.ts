import { useSyncExternalStore } from "react"

/**
 * Где человек в обучении.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПАМЯТЬ ПРИВЯЗАНА К ЧЕЛОВЕКУ, А НЕ К БРАУЗЕРУ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ключ несёт почту вошедшего. Агент заходит с рабочего компьютера и из дома,
 * и второй раз обучение показывать нельзя — он его уже прошёл. Один общий
 * ключ на браузер давал бы обратное: два человека за одной машиной, и второй
 * никогда не увидел бы обучения вовсе.
 *
 * Настоящее место этой отметки — рядом с человеком в базе, как уже живёт
 * его вид интерфейса. Пока таблицы нет, отметка лежит в браузере под
 * персональным ключом: это ближайшее к правильному, что можно сделать
 * без сервера, и заменяется одной строкой, когда сервер появится.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО ЗАПОМИНАЕТСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Номер шага, а не «видел / не видел». Человек закрывает обучение на седьмом
 * шаге и возвращается назавтра — он должен попасть на седьмой, а не на
 * первый. Обучение, которое каждый раз начинается сначала, проходят один
 * раз и больше не открывают.
 */

type TourState = {
  /** Открыто ли обучение прямо сейчас. */
  open: boolean
  /** Номер шага от нуля. `-1` — показана обложка главы. */
  step: number
  /** Показывается обложка главы, а не шаг. */
  cover: boolean
  /** Обучение пройдено или пропущено: само больше не всплывёт. */
  done: boolean
}

const CLOSED: TourState = { open: false, step: 0, cover: true, done: false }

let state: TourState = CLOSED
let person = ""
const listeners = new Set<() => void>()

function key(): string {
  return `serch.tour.${person || "гость"}`
}

function emit() {
  for (const listener of listeners) listener()
}

function persist() {
  if (person === "") return
  try {
    localStorage.setItem(key(), JSON.stringify({ step: state.step, done: state.done }))
  } catch {
    // Хранилище может быть закрыто настройками браузера. Обучение от этого
    // не ломается — оно просто не переживёт перезагрузку, и это лучше,
    // чем упасть на первом же шаге.
  }
}

function set(next: Partial<TourState>) {
  state = { ...state, ...next }
  persist()
  emit()
}

/**
 * Сказать обучению, кто вошёл.
 *
 * Вызывается каркасом кабинета. Смена человека перечитывает его отметку:
 * иначе второй вошедший унаследовал бы прогресс первого.
 */
function setTourPerson(email: string) {
  if (email === person) return
  person = email
  let saved: { step?: number; done?: boolean } = {}
  try {
    saved = JSON.parse(localStorage.getItem(key()) ?? "{}") as typeof saved
  } catch {
    saved = {}
  }
  /*
    Первый вход открывает обучение САМ.

    Это и есть его смысл: владелец сказал «захожу, ничего не выскакивает
    и ничего не понятно». Обучение, которое надо найти в меню, чтобы оно
    началось, не решает эту задачу — его найдёт тот, кому оно и так
    не нужно.

    Всплывает не только в первый раз, но и пока не пройдено до конца —
    с того шага, где остановились. Это нарисованное состояние «Продолжить
    с седьмого шага»: человек закрыл обучение, вернулся назавтра и должен
    попасть на седьмой шаг, а не искать обучение в меню.

    Пройденное или пропущенное больше не всплывает никогда: «Пропустить»
    это ответ, а не отсрочка, и переспрашивать его каждый вход значит
    не принять ответ.
  */
  const first = saved.done !== true

  state = {
    open: first,
    step: typeof saved.step === "number" ? saved.step : 0,
    cover: true,
    done: saved.done === true,
  }
  // Отметка пишется сразу: без неё «где я остановился» не переживёт
  // перезагрузку, и человек каждый раз начинал бы с первой главы.
  persist()
  emit()
}

/** Показать обучение с того места, где остановились. */
function openTour() {
  set({ open: true })
}

/** Начать заново — из меню с инициалами. */
function restartTour() {
  set({ open: true, step: 0, cover: true, done: false })
}

/** Показать шаги главы, спрятав её обложку. */
function startChapter() {
  set({ cover: false })
}

function goStep(step: number, cover: boolean) {
  set({ step, cover })
}

/** Закрыть и больше не всплывать само. Пропуск — законный выход. */
function finishTour() {
  set({ open: false, done: true })
}

/** Закрыть, не отмечая пройденным: вернёмся на этом же шаге. */
function closeTour() {
  set({ open: false })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot(): TourState {
  return state
}

function useTour(): TourState {
  return useSyncExternalStore(subscribe, snapshot, () => CLOSED)
}

export {
  closeTour,
  finishTour,
  goStep,
  openTour,
  restartTour,
  setTourPerson,
  startChapter,
  useTour,
}
export type { TourState }
