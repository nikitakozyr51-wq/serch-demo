import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')

test('landing build keeps SEO-critical content in semantic static HTML', () => {
  assert.match(html, /<html lang="ru">/)
  assert.match(
    html,
    /<title>Сёрчь — прямые контакты собственников недвижимости в Петербурге<\/title>/,
  )
  assert.match(html, /name="description"/)
  assert.equal(html.match(/<h1\b/g)?.length, 1)
  assert.match(html, /звонят собственнику/)
  assert.match(html, /<header/)
  assert.match(html, /<main id="main-content"/)
  assert.match(html, /<footer/)
})

// Главная — самая длинная страница сайта, и вся её ценность в полноте: выпавшая
// секция не роняет сборку и не видна типам, поэтому каждая из девяти секций
// кадра `o5tT7a` проверяется по опорной строке.
test('landing build contains all nine sections of the home frame', () => {
  const anchors = [
    'звонят собственнику', // Первый экран
    'ЧТО ВЫ ПОКУПАЕТЕ НА САМОМ ДЕЛЕ', // Врез
    'Четыре шага от фильтра до первого звонка', // Как это устроено
    'ОДИН ОБЪЕКТ, ОДИН НОМЕР', // Возможности
    'Собственники по районам Петербурга', // Витрина
    'ВОРОНКА АГЕНТСТВА ЗА 30 ДНЕЙ', // Доказательства
    'Сколько это стоит', // Тарифы
    'Коротко о главном', // Вопросы
    'Перестаньте платить за чужие номера', // Итоговое действие
  ]

  for (const anchor of anchors) {
    assert.ok(html.includes(anchor), `секция с якорем «${anchor}» пропала со страницы`)
  }
})

test('landing build ships without client islands', () => {
  assert.doesNotMatch(html, /<astro-island/)
})
