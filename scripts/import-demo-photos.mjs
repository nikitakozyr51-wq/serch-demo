/**
 * Тестовые кадры квартир: из дизайн-файла в продукт.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЭТО НЕ ФОТОГРАФИИ НАСТОЯЩИХ ОБЪЕКТОВ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Двенадцать интерьеров, сгенерированных в Pencil на доске «ФОТО · Тестовые
 * кадры квартир». Поставлены вместо пустых мест, чтобы продукт можно было
 * показывать: строка выдачи, состоящая из одного текста, читается как
 * таблица, а не как объект недвижимости.
 *
 * **Настоящие фотографии продукт не хранит и хранить не будет.** Кадр живёт
 * ссылкой на площадку и исчезает вместе с объявлением — так устроен
 * `ListingPhoto`. Эти двенадцать заменятся первой же настоящей выгрузкой,
 * и заменятся молча: подпись «тестовый кадр» стоит на них в коде, а не
 * на экране.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ СЖИМАЕМ, А НЕ КЛАДЁМ КАК ЕСТЬ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Из генератора кадры выходят по два мегабайта — двадцать пять на всю
 * дюжину. В строке выдачи такой кадр показывается размером 72 пикселя.
 * Возить два мегабайта ради 72 пикселей значит сделать выдачу медленной
 * на телефоне, то есть ровно там, где агент ею и пользуется.
 *
 * Приводим к 900 × 600 (три к двум — соотношение всех трёх заглушек
 * из файла: 81×52, 135×90, 564×376) и сохраняем в webp.
 *
 * Запуск: `node scripts/import-demo-photos.mjs`
 */

import { execFileSync } from 'node:child_process'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'images')
const target = resolve(root, 'webapp/public/demo-photos')

/**
 * Что чем стало.
 *
 * Ключ — имя файла из генератора, значение — понятное имя. Имя попадает
 * в адрес кадра, и по нему видно, что показано, без открытия файла.
 */
const SHOTS = {
  'generated-1786222067118.png': 'kitchen-light',
  'generated-1786222070662.png': 'living-sofa',
  'generated-1786222072195.png': 'bedroom',
  'generated-1786222067100.png': 'empty-room',
  'generated-1786222071296.png': 'hallway',
  'generated-1786222079114.png': 'bathroom',
  'generated-1786222067498.png': 'window-view',
  'generated-1786222076545.png': 'studio',
  'generated-1786222068664.png': 'panel-building',
  'generated-1786222074222.png': 'kitchen-living',
  'generated-1786222078150.png': 'balcony',
  'generated-1786222077064.png': 'kids-room',
}

const PY = `
import sys, os
from PIL import Image

src, dst, name = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert("RGB")
w, h = im.size

# Обрезаем по центру до трёх к двум, потом уменьшаем. Обратный порядок
# дал бы мыло: уменьшение до обрезки теряет пиксели, которые потом
# выбрасываются всё равно.
target_ratio = 3 / 2
if w / h > target_ratio:
    new_w = int(h * target_ratio)
    im = im.crop(((w - new_w) // 2, 0, (w - new_w) // 2 + new_w, h))
else:
    new_h = int(w / target_ratio)
    im = im.crop((0, (h - new_h) // 2, w, (h - new_h) // 2 + new_h))

im = im.resize((900, 600), Image.LANCZOS)
im.save(os.path.join(dst, name + ".webp"), "WEBP", quality=74, method=6)
print(os.path.getsize(os.path.join(dst, name + ".webp")))
`

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })

const present = await readdir(source)
let total = 0
const done = []

for (const [file, name] of Object.entries(SHOTS)) {
  if (!present.includes(file)) {
    console.error(`нет файла ${file} — генерация в Pencil не закончилась или кадр другой`)
    process.exit(1)
  }
  const before = (await stat(resolve(source, file))).size
  const after = Number(
    execFileSync('python', ['-c', PY, resolve(source, file), target, name], {
      encoding: 'utf8',
    }).trim(),
  )
  total += after
  done.push({ name, before, after })
}

for (const shot of done) {
  const from = Math.round(shot.before / 1024)
  const to = Math.round(shot.after / 1024)
  console.log(`  ${shot.name.padEnd(16)} ${String(from).padStart(5)} КБ → ${String(to).padStart(4)} КБ`)
}
console.log(`\nкадров: ${done.length}, вес: ${Math.round(total / 1024)} КБ`)
console.log(`лежат в webapp/public/demo-photos, адрес: /demo-photos/<имя>.webp`)
