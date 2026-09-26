import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { serve } from 'srvx/node'
import { serveStatic } from 'srvx/static'

/**
 * Server entry.
 *
 * It always exports a standard `fetch` handler (that is what the TanStack Start
 * build and the dev server both expect). In production we additionally put an
 * HTTP listener in front of it, serving the built client assets from
 * dist/client — `npm run start` is what Render/Railway/Fly run.
 *
 * The port comes from `PORT` (every Node host sets it) and falls back to 3000.
 */
const handler = createStartHandler(defaultStreamHandler)
const fetchHandler: (request: Request) => Response | Promise<Response> = (request) =>
  handler(request)

export default { fetch: fetchHandler }

if (import.meta.env?.PROD) {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const clientDir = path.resolve(here, '../client')
  const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000

  const server = serve({
    fetch: fetchHandler,
    port,
    hostname: '0.0.0.0',
    middleware: [serveStatic({ dir: clientDir })],
  })

  console.log(`[vellum] listening on http://0.0.0.0:${port} (assets: ${clientDir})`)

  const shutdown = () => {
    try {
      server.close(false)
    } finally {
      process.exit(0)
    }
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
