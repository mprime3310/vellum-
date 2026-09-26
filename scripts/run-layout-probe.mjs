/**
 * Runs scripts/layout-probe.html in headless Chrome and prints its JSON report.
 *
 * The probe measures Ana Petrova's CV with the Modern template's exact geometry
 * and feeds the REAL src/lib/cv-layout.ts engine, so the numbers below are
 * browser-truth rather than a guess. The `audit` section re-renders each
 * planned page into a real 794x1123 A4 box and reports `freeAtBottom`; a
 * NEGATIVE value means content is clipped by `overflow: hidden` — text cut off
 * at the bottom of the page with no margin, which is the bug being fixed.
 *
 *   node scripts/run-layout-probe.mjs
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'scripts', '.out')
// --stress pads the splittable paragraphs so they must break across pages.
const STRESS = process.argv.includes('--stress')

/* 1. bundle the real pagination engine for the browser */
const bundle = spawnSync(
  'npx',
  ['rolldown', 'scripts/probe-entry.ts', '-d', 'scripts/.out', '--format', 'esm', '--platform', 'browser'],
  { cwd: root, stdio: 'inherit', shell: true },
)
if (bundle.status !== 0) {
  console.error('rolldown failed to bundle the probe entry')
  process.exit(1)
}

/* 2. serve the repo root (module scripts need http, not file://) */
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}
const server = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0]
  const file =
    path === '/probe-entry.js'
      ? join(outDir, 'probe-entry.js')
      : path === '/layout-probe.html'
        ? join(root, 'scripts', 'layout-probe.html')
        : null
  if (!file) {
    res.writeHead(404).end('not found')
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'text/plain' }).end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const { port } = server.address()
const url = `http://127.0.0.1:${port}/layout-probe.html${STRESS ? '?stress=1' : ''}`

/* 3. run it through headless Chrome and pull the report back out of the DOM */
const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--window-size=1400,1200',
  '--virtual-time-budget=15000',
  '--dump-dom',
  url,
])
let dom = ''
chrome.stdout.on('data', (chunk) => (dom += chunk))
await new Promise((done) => chrome.on('close', done))
server.close()

const match = dom.match(/<pre id="report">([\s\S]*?)<\/pre>/)
if (!match) {
  console.error('probe produced no report. DOM head:\n', dom.slice(0, 2000))
  process.exit(1)
}
const text = match[1]
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&')
const report = JSON.parse(text)
console.log(text)

const clipped = report.audit.filter((p) => p.freeAtBottom < 0)
if (clipped.length > 0) {
  console.error(
    `\nFAIL: ${clipped.length} page(s) overflow the A4 box and are clipped: ` +
      clipped.map((p) => `page ${p.page} by ${-p.freeAtBottom}px`).join(', '),
  )
  process.exit(1)
}
console.log(`\nOK: ${report.pageCount} pages, none clipped.`)
