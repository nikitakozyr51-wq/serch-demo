import { chromium } from "playwright"

const BASE = "http://127.0.0.1:5359"
const routes = ["/balance", "/balance/refunds", "/balance/top-ups", "/balance/documents"]

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
const p = await ctx.newPage()
await p.addInitScript(
  (a) => {
    localStorage.setItem("serch.accounts", JSON.stringify({ [a.email]: a }))
    localStorage.setItem("serch.demo.session", JSON.stringify(a))
  },
  {
    kind: "own",
    name: "Пётр Волков",
    initials: "ПВ",
    email: "p@a.test",
    agency: "Агентство",
    role: "owner",
    balance: 8610,
    trial: 0,
    disclosed: [],
    idleMinutes: 120,
  },
)

for (const density of ["comfortable", "compact"]) {
  for (const r of routes) {
    await p.goto(BASE + r, { waitUntil: "networkidle" })
    await p.evaluate((d) => {
      if (d === "compact") document.documentElement.dataset.density = "compact"
      else delete document.documentElement.dataset.density
    }, density)
    await p.waitForTimeout(400)
    const out = await p.evaluate(() => {
      const els = [...document.querySelectorAll('[data-slot="notice-bar"]')]
      return els.map((e) => {
        const cs = getComputedStyle(e)
        const rc = e.getBoundingClientRect()
        return {
          h: Math.round(rc.height * 10) / 10,
          w: Math.round(rc.width * 10) / 10,
          radius: cs.borderRadius,
          bg: cs.backgroundColor,
          tone: e.dataset.tone,
          text: e.textContent.slice(0, 60),
        }
      })
    })
    console.log(density, r, JSON.stringify(out))
  }
}
await b.close()
