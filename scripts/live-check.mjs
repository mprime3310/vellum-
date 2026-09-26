/**
 * Live end-to-end check against the running dev server.
 *
 * Boots headless Chrome, seeds Ana Petrova's CV into the real app's
 * localStorage, lets the real CvDocument paginate and paint, then measures and
 * screenshots every A4 sheet exactly as the user sees it.
 *
 *   node scripts/live-check.mjs [url]
 *
 * Unlike layout-probe.html (which reimplements the Modern template), this
 * exercises the actual templates, the actual store and the actual overflow
 * guard, so it catches anything the probe's copy cannot.
 */
import { spawn } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SEED } from './fixtures/ana.mjs'

const URL_UNDER_TEST = process.argv[2] ?? 'http://localhost:3000/'
const PORT = 9222
const OUT_DIR = join(process.cwd(), 'scripts', '.out', 'live')

/* ------------------------------ CDP plumbing ------------------------------ */
const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const profile = mkdtempSync(join(tmpdir(), 'cv-live-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  'about:blank',
])
chrome.stderr.on('data', () => {})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targetUrl() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('Chrome DevTools endpoint never came up')
}

const ws = new WebSocket(await targetUrl())
await new Promise((done, fail) => {
  ws.onopen = done
  ws.onerror = fail
})

let nextId = 0
const pending = new Map()
let loaded = false
const consoleLines = []
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(JSON.stringify(message.error)))
    else resolve(message.result)
  } else if (message.method === 'Page.loadEventFired') {
    loaded = true
  } else if (message.method === 'Runtime.consoleAPICalled') {
    const text = (message.params.args ?? [])
      .map((a) => a.value ?? a.description ?? a.type)
      .join(' ')
    consoleLines.push(`[${message.params.type}] ${text}`)
  } else if (message.method === 'Runtime.exceptionThrown') {
    const d = message.params.exceptionDetails
    consoleLines.push(`[exception] ${d.exception?.description ?? d.text}`)
  } else if (message.method === 'Log.entryAdded') {
    const e = message.params.entry
    if (e.level === 'error' || e.level === 'warning') consoleLines.push(`[log:${e.level}] ${e.text}`)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (nextId += 1)
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}

const waitForLoad = async () => {
  for (let i = 0; i < 80; i += 1) {
    if (loaded) {
      loaded = false
      return
    }
    await sleep(250)
  }
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
// 1705px makes the preview scroller exactly PAGE_W (794) wide, so the
// fit-to-width scale resolves to exactly 1 and the sheets carry no transform —
// which makes the screenshots pixel-exact instead of needing clip compensation.
await send('Emulation.setDeviceMetricsOverride', {
  width: 1705,
  height: 3000,
  deviceScaleFactor: 1,
  mobile: false,
})

/* ------------------------- seed and render the CV ------------------------- */
await send('Page.navigate', { url: URL_UNDER_TEST })
await waitForLoad()
await sleep(1500)

await evaluate(`localStorage.setItem('lovable-cv-data-v2', ${JSON.stringify(SEED)})`)
await send('Page.reload', {})
await waitForLoad()

// let the debounce + fonts + pagination + the overflow guard all settle
let sheets = 0
for (let i = 0; i < 40; i += 1) {
  await sleep(500)
  sheets = await evaluate(`document.querySelectorAll('.cv-page').length`)
  if (sheets > 0) break
}
await sleep(3000) // allow the guard's extra passes to settle

// Watch it settle: a pagination feedback loop shows up as a changing sheet
// count, or a "measuring…" badge that never clears.
const timeline = []
for (let i = 0; i < 8; i += 1) {
  timeline.push(
    await evaluate(`(() => {
      const badge = Array.from(document.querySelectorAll('*')).find((e) => e.children.length === 0 && (e.textContent||'').trim() === 'measuring…')
      return document.querySelectorAll('.cv-page').length + (badge ? ' measuring' : ' settled')
    })()`),
  )
  await sleep(1000)
}
console.log('settle timeline:', timeline.join(' | '))
if (consoleLines.length) {
  console.log('console:')
  for (const line of consoleLines.slice(0, 20)) console.log('   ', line.slice(0, 300))
}

// The preview wraps the sheets in `transform: scale(fit)`, so every
// getBoundingClientRect() comes back scaled. Neutralise it for a 1:1
// measurement, and so screenshots come out at true A4 size like the export.
await evaluate(`(() => {
  const touched = []
  for (const sheet of document.querySelectorAll('.cv-page')) {
    let el = sheet
    while (el && el !== document.documentElement) {
      const t = getComputedStyle(el).transform
      if (t && t !== 'none') { touched.push([el, el.style.transform]); el.style.transform = 'none' }
      el = el.parentElement
    }
  }
  window.__cvRestore = () => touched.forEach(([el, v]) => { el.style.transform = v })
  return touched.length
})()`)
await sleep(300)

/* ------------------------ measure the real painted sheets ------------------ */
// Only VISIBLE sheets: the dashboard mounts a second, hidden CvDocument for
// mobile (lg:hidden), so some .cv-page nodes on screen are display:none.
const measured = await evaluate(`(() => {
  const round = (n) => Math.round(n * 100) / 100
  const visible = (el) => el.offsetParent !== null || el.getClientRects().length > 0
  const all = Array.from(document.querySelectorAll('.cv-page'))
  const out = []
  for (const sheet of all) {
    if (!visible(sheet)) continue
    const cs = getComputedStyle(sheet)
    const box = sheet.getBoundingClientRect()
    const contentHeight = box.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    // The sheet's DIRECT children are the blocks; firstElementChild is only
    // the first block, so using it measures a fraction of the page.
    const kids = Array.from(sheet.children)
    let painted = 0
    for (const k of kids) painted += k.getBoundingClientRect().height
    const last = kids[kids.length - 1]
    out.push({
      page: out.length + 1,
      contentHeight: round(contentHeight),
      painted: round(painted),
      free: round(contentHeight - painted),
      fillPct: round((painted / contentHeight) * 1000) / 10,
      CLIPPED: painted > contentHeight + 0.5,
      firstText: kids[0] ? (kids[0].textContent || '').trim().slice(0, 44) : null,
      lastText: last ? (last.textContent || '').trim().slice(0, 44) : null,
      blocks: kids.length,
      rect: { x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height },
    })
  }
  return { sheets: out, totalNodes: all.length }
})()`)
const report = measured.sheets

/* ------------------------------ screenshot -------------------------------- */
// Restore the preview zoom first, then clip the sheet's real (scaled) rect and
// magnify by 1/scale, which yields a true 1:1 A4 image. Screenshotting with the
// transform neutralised instead would capture the wrong region, because
// neutralising it reflows the fit-to-width wrapper.
await evaluate('window.__cvRestore && window.__cvRestore()')
await sleep(300)
// drop the transient "Laying out your pages…" badge so it never overlaps a sheet
// Drop the transient "Laying out your pages…" badge so it never overlays a
// sheet. Match on leaf elements only — an ancestor's textContent also starts
// with that string (the badge is its first child), and removing those would
// delete the whole document.
await evaluate(`(() => {
  for (const el of Array.from(document.querySelectorAll('span'))) {
    if (el.children.length === 0 && (el.textContent || '').trim().startsWith('Laying out your pages')) {
      el.remove()
    }
  }
  return true
})()`)

const shots = await evaluate(
  `Array.from(document.querySelectorAll('.cv-page')).filter((s) => s.offsetParent !== null || s.getClientRects().length > 0).length`,
)

mkdirSync(OUT_DIR, { recursive: true })
let shotIndex = 0
// The sheets live in a scroller shorter than a page, and the Design panel is
// docked below it, so anything below the fold would be captured as the panel.
// Scroll each sheet fully into view before shooting it.
for (let i = 0; i < shots; i += 1) {
  shotIndex += 1
  const clip = await evaluate(`(() => {
    const sheets = Array.from(document.querySelectorAll('.cv-page')).filter(
      (s) => s.offsetParent !== null || s.getClientRects().length > 0,
    )
    const sheet = sheets[${i}]
    if (!sheet) return null
    sheet.scrollIntoView({ block: 'start', behavior: 'instant' })
    const box = sheet.getBoundingClientRect()
    const scale = sheet.offsetHeight ? box.height / sheet.offsetHeight : 1
    return { x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height, scale: scale > 0.05 ? 1 / scale : 1 }
  })()`)
  if (!clip || !clip.w || !clip.h) {
    console.log(`  (skipping screenshot ${shotIndex}: no rect)`)
    continue
  }
  await sleep(350)
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: clip.scale },
  })
  writeFileSync(join(OUT_DIR, `page-${shotIndex}.png`), Buffer.from(shot.data, 'base64'))
}

// Also save the whole preview exactly as the app draws it, as a sanity check
// that the sheet captures above match what a user actually sees.
const full = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
writeFileSync(join(OUT_DIR, 'app-viewport.png'), Buffer.from(full.data, 'base64'))

/* --------------------- actually download the PDF and inspect it ------------ */
// The preview looking right is not enough: the export captures `pageNodesRef`,
// which used to be shared by a visible and a hidden CvDocument.
const DL = join(process.cwd(), 'scripts', '.out', 'download')
rmSync(DL, { recursive: true, force: true })
mkdirSync(DL, { recursive: true })
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL })
await evaluate(`(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'PDF')
  if (!btn) throw new Error('no PDF button')
  btn.click()
  return true
})()`)

let pdf = null
for (let i = 0; i < 40; i += 1) {
  await sleep(500)
  const files = readdirSync(DL).filter((f) => f.endsWith('.pdf'))
  if (files.length > 0) {
    const path = join(DL, files[0])
    const size = statSync(path).size
    await sleep(700) // let the write finish
    if (statSync(path).size === size && size > 0) {
      pdf = { name: files[0], size }
      break
    }
  }
}
if (pdf) {
  const bytes = readFileSync(join(DL, pdf.name))
  const text = bytes.toString('latin1')
  const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) || []).length
  // A blank rasterised page compresses to almost nothing; a real one is far larger.
  const images = (text.match(/\/Subtype\s*\/Image/g) || []).length
  console.log(`\nPDF export: ${pdf.name}  ${(pdf.size / 1024).toFixed(0)} KB  pages=${pageCount}  images=${images}`)
} else {
  console.log('\nPDF export: NO FILE PRODUCED')
}
writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2))

/* -------------------------------- report ---------------------------------- */
console.log(`\nlive check: ${URL_UNDER_TEST}`)
console.log(`  title: ${await evaluate('document.title')}`)
console.log(`  visible sheets: ${report.length}   .cv-page nodes in DOM: ${measured.totalNodes}`)
console.log(`  CvDocument instances (measure stages): ${await evaluate("document.querySelectorAll('.cv-measure').length")}`)
console.log('')
for (const page of report) {
  console.log(
    `  page ${page.page}  fill ${String(page.fillPct).padStart(5)}%  ` +
      `painted ${String(page.painted).padStart(7)} / ${page.contentHeight}  ` +
      `free ${String(page.free).padStart(7)}  ${page.CLIPPED ? 'CLIPPED!' : 'ok'}`,
  )
  console.log(`      starts: ${page.firstText}`)
  console.log(`      ends  : ${page.lastText}`)
}
const clipped = report.filter((p) => p.CLIPPED)
console.log(`\nscreenshots + report.json written to ${OUT_DIR}`)

ws.close()
chrome.kill()
process.exit(clipped.length > 0 ? 1 : 0)
