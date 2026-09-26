import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '~/components/dashboard'
import { DEFAULT_SETTINGS, emptyCv } from '~/lib/cv-types'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  // The store restores the saved CV from localStorage on mount, so the server
  // always renders the empty starting point — no hydration mismatch.
  return <Dashboard data={emptyCv()} settings={DEFAULT_SETTINGS} />
}
