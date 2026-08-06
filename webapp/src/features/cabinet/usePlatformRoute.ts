import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"

import { platformTwin } from "./platform"

/**
 * Поворот телефона и изменение окна на компьютере.
 *
 * **Первое решение принимает не этот хук, а `beforeLoad` маршрута** — до
 * отрисовки, см. `platform.ts`. Здесь остаётся только то, чего маршрут знать
 * не может: человек повернул телефон или растянул окно уже после того, как
 * экран открылся.
 *
 * Раньше этот хук принимал решение и на первом кадре тоже — и дрался с
 * охраной кабинета, которая рисует переход на вход во время отрисовки. Двое
 * перебрасывали управление друг другу, пока React не останавливал это словами
 * «Maximum update depth exceeded». Поэтому здесь нет ничего, кроме подписки
 * на изменение ширины.
 */
export function usePlatformRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)")

    const apply = () => {
      const twin = platformTwin(pathname)
      if (twin !== null && twin !== pathname) void navigate({ to: twin, replace: true })
    }

    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [pathname, navigate])
}
