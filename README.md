# Vellum — AI CV Generator

Write, style and export a professional CV. Paste an existing CV, describe the role you
want, or target a job description — then download a **pixel-accurate A4 PDF** or a
**native, editable Word document**.

The thing that makes this different from a typical CV builder: the preview is not a long
scrolling div. It is a **real A4 pagination engine** — headings never strand at the bottom
of a page, bullets never split mid-item, and long paragraphs break at line boundaries with
widow/orphan control. The PDF you export is the same sheets you saw on screen.

---

## Quick start

```bash
npm install
cp .env.example .env      # optional — only needed for the default AI provider
npm run dev               # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build → `dist/client` + `dist/server` |
| `npm start` | Runs the built Node server (honours `PORT`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Headless tests for the parser, pagination engine and DOCX builder |

---

## AI providers (bring your own key)

All AI calls run **on the server** in `src/lib/cv-ai.functions.ts`. The browser never talks
to a model directly. Open **AI settings** in the app header to switch provider.

| Provider | Model default | Needs a key |
| --- | --- | --- |
| **Vellum AI** (default) | `google/gemini-2.5-flash` | No — uses the server-side `LOVABLE_API_KEY` |
| Groq | `openai/gpt-oss-120b` | Yes — `gsk_…` |
| Google Gemini | `gemini-2.5-flash` | Yes — `AIza…` |
| OpenAI | `gpt-4o-mini` | Yes — `sk-…` |
| DeepSeek | `deepseek-chat` | Yes — `sk-…` |

- Keys are stored **only in the browser** (`localStorage`, key `lovable-cv-ai-v2`) and are
  sent straight from the browser to the provider when you press Generate. They are never
  stored server-side.
- If a BYOK provider is selected without a key you get a clear error — the app **never**
  silently falls back to the default provider.
- Provider state lives in one module-level store with a listener set, so saving in the
  dialog updates the input panel immediately.
- Errors are mapped to something actionable: `401 → “Your OpenAI key was rejected”`,
  `404 → “Your account can't use model X, pick another in AI settings”`, `429 → rate limited`.
- If a response is truncated (`finish_reason: "length"`) you get: *“The AI response was cut
  off. Try a shorter input or a larger model.”*

**Parsing vs generating**

- **Paste CV** → every fact is kept exactly as written, nothing is invented.
- **From prompt** → one line is enough; the model expands it into a complete 1.5–3 page CV
  with plausible companies, dates, responsibilities and metrics.
- **From job** → the same, tailored to the job description's keywords (good for ATS).

---

## Templates

Six templates ship today: **Modern**, **ATS**, **Executive**, **Minimal**, **Harvard**,
**Creative**. Each supplies a *style kit* (headings, entries, bullets, skill chips) and the
shared pipeline in `templates/shared.tsx` handles section order, empty-section hiding and
block kinds. Adding a seventh is one file plus one array entry in `templates/index.ts`.
Sections with no data are hidden automatically.

---

## How the pagination works

1. A template emits an **ordered array of blocks** — `header`, `heading` (keep-with-next),
   `entry` (keep-together), `bullet` (atomic), `badges` (atomic, wraps by whole row),
   `paragraph` (splittable), `spacer`.
2. `cv-document.tsx` renders every block **off-screen at the exact content width**, waits for
   `document.fonts.ready`, and reads each block's height and line-height.
3. `cv-layout.ts` fills pages top-to-bottom: keep-together blocks move down rather than
   split, a heading must fit with the start of what follows, long paragraphs split at word
   boundaries found by binary search with ≥2 lines on each side, and an entry taller than a
   page splits **between bullets**.
4. Only then are the A4 sheets painted, so the preview never reflows under you.

Recalculation is debounced ~120 ms and re-runs on every edit, template, accent and
font-scale change. A4 is modelled as **794 × 1123 px at 96 dpi** (210 × 297 mm).

## Export

**PDF** — `html-to-image` `toJpeg` at `pixelRatio: 3`, then `jsPDF` with each sheet filling
the page edge to edge. The preview's zoom/transform is neutralised for the capture and
restored afterwards, so the export is 1:1 with what you see. (html-to-image, **not**
html2canvas — html2canvas drops oklch colours and fails with “wrong PNG signature”.)

**DOCX** — the `docx` package builds a real Word document: A4 (11906 × 16838 DXA), 0.75″
margins, accent-coloured uppercase headings with a bottom border, right-aligned dates via a
right tab stop, and genuine Word bullet lists (`LevelFormat.BULLET`) rather than typed “•”
characters. Both exports run entirely in the browser.

---

## Dark theme

The whole app chrome is driven by semantic tokens, so dark mode is a single `.dark`
block in `src/styles/app.css` that re-points every token to a warm charcoal — no
component changes, no `dark:` utility sprinkled through the code. Primary buttons
invert (light-on-dark) because a dark button on charcoal disappears.

- **Moon / sun** button in the header toggles it; the choice persists in
  `localStorage` (`vellum-theme`).
- First visit follows your OS `prefers-color-scheme` and keeps following it while
  the choice is "system".
- **No flash:** a tiny inline script is rendered as the first child of `<body>`
  and sets the class on `<html>` before React hydrates.
- `color-scheme` is set too, so native scrollbars, form controls and the browser
  canvas follow along.
- Toasts are told which theme is active, so they don't flash white.

**The A4 paper stays white.** A printed CV is white — the dark surround is what
makes the sheet pop, exactly like a design tool's canvas.

> Implementation note: `@custom-variant dark (&:is(.dark *))` makes Tailwind v4
> **silently drop** a top-level `.dark { … }` rule from the build. Moving the
> block into `@layer base` puts it back — but a layered `:root` then outranks it,
> since unlayered styles win the cascade. The fix that satisfies both: no custom
> variant, and the `.dark` block stays unlayered directly after `:root`.

---

## Humaniser

AI-written CVs have recognisable tics. The editor has a **Humanise** bar with two passes:

1. **Humanise** (instant, free, offline) — ~90 deterministic rules in
   `src/lib/cv-humanize.ts`: cliché dictionary, stock openers, first person,
   "not just X but Y", hedge adverbs, em-dash reduction, contraction swaps, and
   punctuation tidying. Runs in your browser, costs nothing, and is a single
   undo step.
2. **AI rewrite** — sends the CV to your chosen provider with a strict
   "change the wording, never the facts" prompt at temperature 0.9. The result
   is merged defensively: employers, roles, locations, dates, metrics, skills
   and contact details are taken from *your* CV, and a response with a different
   number of bullets is repaired rather than trusted.

A live chip shows how many **AI tells** remain (clichés, stock transitions,
first-person openers, em dashes). It is a writing heuristic, not an
AI-detector score — no tool can honestly promise that, since detectors are
unreliable in both directions. The goal here is that the CV reads like a person
wrote it.

**Verified:** the local pass takes a deliberately awful sample CV from 17 tells
to 0 across 31 edits while keeping every metric (`32%`, `14`, `6`), employer,
date and bullet intact — and a second pass finds nothing new. Both passes are
covered by `npm run verify`.

---

## Deploying to Render

| Field | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/` |
| Node version | 22.x (`engines` requires ≥20) |

Add `LOVABLE_API_KEY` as an environment variable if you want the default AI provider;
otherwise users bring their own key. The server binds `0.0.0.0:$PORT` and serves the built
client assets itself — no separate static site, no cache config needed. Railway, Fly.io and
Heroku work the same way.

---

## Project layout

```
src/
├── routes/            # TanStack Start file routes (__root SEO, index)
├── server.ts          # server entry: fetch handler + production HTTP listener
├── lib/
│   ├── cv-types.ts    # data model, ids, cloning
│   ├── cv-schema.ts   # robust AI-JSON parsing (the important one)
│   ├── cv-layout.ts   # A4 pagination engine
│   ├── cv-store.tsx   # context: undo/redo, autosave
│   ├── cv-ai.functions.ts / cv-ai.server.ts
│   ├── cv-prompts.ts, ai-settings.ts
│   └── cv-pdf.ts, cv-docx.ts
├── components/
│   ├── templates/     # 6 templates + shared style-kit pipeline
│   ├── ui/            # Radix-based primitives
│   └── dashboard, panels, header, mobile tabs
└── styles/app.css     # Tailwind v4 semantic tokens
```

---

## Notes and limitations

- The client route chunk is ~1.1 MB minified (~348 KB gzip) because `docx`, `jspdf` and
  `html-to-image` are statically imported so export never fails on a lazy chunk that didn't
  load. Code-splitting them behind a click would be the next optimisation.
- The default provider needs `LOVABLE_API_KEY` on the server; without it the app still
  works fully with a BYOK provider.
- DOCX/PDF **file upload** (Mammoth/PDF.js), an ATS score checker, a cover-letter generator
  and nine more templates are the planned next phase.

