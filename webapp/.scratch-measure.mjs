import { chromium } from 'playwright'
const PORT = process.env.PORT || '5381'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.addInitScript(a => {
  localStorage.setItem('serch.accounts', JSON.stringify({[a.email]: a}))
  localStorage.setItem('serch.demo.session', JSON.stringify(a))
}, {kind:'own',name:'Пётр Волков',initials:'ПВ',email:'p@a.test',agency:'Агентство',
    role:'owner',balance:8610,trial:0,disclosed:[],idleMinutes:120})
await p.goto(`http://127.0.0.1:${PORT}/agency/plan`, { waitUntil: 'networkidle' })
for (const density of ['comfortable','compact']) {
  await p.evaluate(d => { if (d === 'compact') document.documentElement.dataset.density='compact'; else delete document.documentElement.dataset.density }, density)
  await p.waitForTimeout(400)
  const res = await p.evaluate(() => {
    const spans = [...document.querySelectorAll('span[aria-hidden].absolute')]
    const row = spans.length ? spans[0].parentElement : null
    const rb = row ? row.getBoundingClientRect() : null
    const cols = row ? [...row.children].filter(el => el.tagName === 'DIV').map(el => {
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x - rb.x), w: Math.round(r.width), h: Math.round(r.height) }
    }) : []
    const lines = spans.map(el => {
      const r = el.getBoundingClientRect()
      return { cls: el.className, x: Math.round((r.x - rb.x)*100)/100, w: r.width, h: Math.round(r.height) }
    })
    return { rowW: rb ? Math.round(rb.width) : null, rowH: rb ? Math.round(rb.height) : null, gap: row ? getComputedStyle(row).gap : null, cols, lines }
  })
  console.log(density, JSON.stringify(res, null, 1))
}
await b.close()
