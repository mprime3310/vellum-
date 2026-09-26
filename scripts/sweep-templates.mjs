/**
 * Measures page fill for EVERY template in the running app.
 *
 * The pagination engine is shared, but each template has its own padding,
 * type scale and block shapes, so a template whose blocks are tall and
 * unsplittable can strand half a page. This walks TEMPLATE_IDS, re-seeds the
 * store with each template, and reports the per-page fill so the wasteful ones
 * are obvious (and the report is the evidence for any fix).
 *
 *   node scripts/sweep-templates.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SEED, STRESS_SEED } from './fixtures/ana.mjs'

const STRESS = process.argv.includes('--stress')
const URL_UNDER_TEST =
  process.argv.slice(2).find((a) => a.startsWith('http')) ?? 'http://localhost:3000/'
const PORT = 9224
const TEMPLATES = [
  'modern', 'ats', 'ats-numbered', 'ats-classic', 'executive',
  'minimal', 'harvard', 'creative', 'timeline', 'editorial',
]
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const profile = mkdtempSync(join(tmpdir(), 'cv-sweep-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
])
chrome.stderr.on('data', () => {})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targetUrl() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const page = (await res.json()).find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('Chrome DevTools endpoint never came up')
}

const ws = new WebSocket(await targetUrl())
await new Promise((done, fail) => { ws.onopen = done; ws.onerror = fail })
let nextId = 0
const pending = new Map()
let loaded = false
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  } else if (m.method === 'Page.loadEventFired') loaded = true
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = (nextId += 1)
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}
const waitForLoad = async () => { for (let i = 0; i < 80; i += 1) { if (loaded) { loaded = false; return } await sleep(250) } }

/** Per-page fill, measured in true CSS pixels (the preview scales the sheets). */
const MEASURE = `(() => {
  const round = (n) => Math.round(n * 100) / 100
  const sheets = Array.from(document.querySelectorAll('.cv-page')).filter(
    (s) => s.offsetParent !== null || s.getClientRects().length > 0,
  )
  return sheets.map((sheet) => {
    const cs = getComputedStyle(sheet)
    const box = sheet.getBoundingClientRect()
    const scale = sheet.offsetHeight ? box.height / sheet.offsetHeight : 1
    const contentHeight = box.height / scale - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const kids = Array.from(sheet.children)
    let painted = 0
    for (const k of kids) painted += k.getBoundingClientRect().height / scale
    const last = kids[kids.length - 1]
    return {
      painted: round(painted),
      contentHeight: round(contentHeight),
      fill: round((painted / contentHeight) * 1000) / 10,
      clipped: painted > contentHeight + 0.5,
      last: last ? (last.textContent || '').trim().slice(0, 40) : null,
    }
  })
})()`

await send('Page.enable')
await send('Runtime.enable')
// 1705px makes the preview scroller exactly PAGE_W wide, so the fit-to-width
// scale is 1 and no transform correction is needed.
await send('Emulation.setDeviceMetricsOverride', { width: 1705, height: 3000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: URL_UNDER_TEST })
await waitForLoad()
await sleep(1500)

const seed = JSON.parse(STRESS ? STRESS_SEED : SEED)
const results = {}
for (const template of TEMPLATES) {
  const payload = JSON.stringify({ ...seed, settings: { ...seed.settings, template } })
  await evaluate(`localStorage.setItem('lovable-cv-data-v2', ${JSON.stringify(payload)})`)
  await send('Page.reload', {})
  await waitForLoad()
  // wait for the debounce + fonts + pagination + the overflow guard
  let sheets = 0
  for (let i = 0; i < 40; i += 1) {
    await sleep(400)
    sheets = await evaluate(`document.querySelectorAll('.cv-page').length`)
    if (sheets > 0) break
  }
  await sleep(3000)
  results[template] = await evaluate(MEASURE)
}

mkdirSync(join(process.cwd(), 'scripts', '.out'), { recursive: true })
writeFileSync(join(process.cwd(), 'scripts', '.out', 'sweep.json'), JSON.stringify(results, null, 2))

console.log('\ntemplate page-fill sweep  (contentHeight per template from its own padding)\n')
for (const [template, pages] of Object.entries(results)) {
  const avg = pages.reduce((s, p) => s + p.fill, 0) / pages.length
  const worst = Math.min(...pages.map((p) => p.fill))
  const flagged = pages.filter((p) => p.clipped)
  console.log(
    `  ${template.padEnd(10)} ${String(pages.length).padStart(2)} pages   ` +
      `avg ${avg.toFixed(1).padStart(5)}%   worst page ${worst.toFixed(1).padStart(5)}%` +
      (flagged.length ? `   ${flagged.length} CLIPPED` : ''),
  )
  for (const [i, p] of pages.entries()) {
    const mark = p.fill < 70 ? '  <-- sparse' : ''
    console.log(`      p${i + 1}  ${String(p.fill).padStart(5)}%  free ${String(p.contentHeight - p.painted).padStart(7)}  ends: ${p.last ?? '-'}${mark}`)
  }
}
console.log('\nwritten to scripts/.out/sweep.json')
ws.close()
chrome.kill()
process.exit(0)
