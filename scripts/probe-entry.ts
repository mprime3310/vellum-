/**
 * Entry point for the browser layout probe (scripts/layout-probe.html).
 *
 * The probe loads the REAL pagination engine so the harness can never drift
 * from src/lib/cv-layout.ts. Bundled by scripts/run-layout-probe.mjs with:
 *
 *   npx rolldown scripts/probe-entry.ts -d scripts/.out --format esm --platform browser
 */
export { paginate } from '../src/lib/cv-layout'
