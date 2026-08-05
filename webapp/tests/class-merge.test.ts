import { readFileSync } from "node:fs"
import { describe, expect, test } from "bun:test"

import { cn } from "@/lib/utils"

/**
 * Ступень кегля, которая исчезает по дороге.
 *
 * `tailwind-merge` разбирает `text-*` последним правилом: имя, которое он
 * не узнал, считается цветом. Ступени, названные числом — `text-11`,
 * `text-13` — под это правило попадают целиком. Рядом с цветовым
 * `text-text-dense` они выбрасывались как «второй цвет», и подпись рисовалась
 * унаследованным кеглем.
 *
 * Поймать это тяжело именно потому, что всё остальное в порядке: CSS верный,
 * класс в сборке есть, линт и типы молчат, а проверка лестниц видит кегль 16 —
 * законную ступень. Ошибка живёт в одной строке между `cva` и разметкой.
 *
 * Проверка читает объявленные ступени прямо из `index.css`, поэтому новая
 * ступень попадает под неё сама, без правки этого файла.
 */

const CSS = readFileSync(new URL("../src/index.css", import.meta.url), "utf8")

/**
 * Ступени, названные не по словарю Tailwind: 11, 13, 20-tight.
 *
 * Отбор идёт по началу значения: у ступени кегля там число, у цветов
 * `--text-2` и `--text-dense` — решётка, а `--text-5xl: initial` погашен.
 * Приписки `--line-height` и `--letter-spacing` — свойства ступени,
 * а не отдельные ступени.
 */
const NAMED_BY_TAILWIND = /^(xs|sm|base|lg|xl|\d+xl)$/

const CUSTOM_STEPS = [...CSS.matchAll(/^\s*--text-([\w-]+):\s*\d/gm)]
  .map((match) => match[1]!)
  .filter((name) => !name.includes("--"))
  .filter((name) => !NAMED_BY_TAILWIND.test(name))

describe("склейка классов", () => {
  test("самодельные ступени кегля вообще есть", () => {
    expect(CUSTOM_STEPS.length).toBeGreaterThan(0)
  })

  test.each(CUSTOM_STEPS)("ступень text-%s переживает цвет текста", (step) => {
    const merged = cn(`text-${step} font-medium`, "text-text-dense")

    expect(merged).toContain(`text-${step}`)
    expect(merged).toContain("text-text-dense")
  })

  test("настоящий конфликт кеглей всё ещё разрешается", () => {
    expect(cn("text-11", "text-sm")).toBe("text-sm")
    expect(cn("text-sm", "text-13")).toBe("text-13")
  })

  test("настоящий конфликт цветов всё ещё разрешается", () => {
    expect(cn("text-fg", "text-text-dense")).toBe("text-text-dense")
  })

  /**
   * Ступени, названные словом, `tailwind-merge` не относил никуда: пара
   * доезжала до разметки целиком, и исход решал порядок в собранном CSS,
   * а не порядок написания. Замер показал, что оба конфликта разрешились бы
   * против нас: `.h-full` стоит ниже ступеней контрола, `.rounded-bar` —
   * выше всех остальных радиусов.
   */
  test.each([
    ["h-full", "h-ctl-md"],
    ["h-10", "h-ctl-md"],
    ["h-ctl-sm", "h-ctl-md"],
    ["h-20", "h-row-obj"],
    ["w-60", "w-sidebar"],
    ["w-full", "w-filters"],
    ["rounded-md", "rounded-bar"],
    ["rounded-bar", "rounded-full"],
  ])("конфликт %s ↔ %s разрешается, а не доезжает парой", (first, second) => {
    expect(cn(first, second)).toBe(second)
  })
})
