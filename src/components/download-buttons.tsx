import { useState } from 'react'
import { toast } from 'sonner'
import { FileText, LoaderCircle } from 'lucide-react'
import { Button } from './ui/button'
import { useCvStore } from '~/lib/cv-store'
import { exportCvToPdf } from '~/lib/cv-pdf'
import { exportCvToDocx } from '~/lib/cv-docx'
import { isEmptyCv } from '~/lib/cv-types'

export function DownloadButtons({
  pageNodesRef,
  compact = false,
}: {
  pageNodesRef: React.RefObject<HTMLElement[]>
  compact?: boolean
}) {
  const { data, settings } = useCvStore()
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null)
  const empty = isEmptyCv(data)

  async function downloadPdf() {
    if (empty) {
      toast.error('There is nothing to download yet — build your CV first.')
      return
    }
    const pages = pageNodesRef.current.filter(Boolean)
    if (pages.length === 0) {
      toast.error('The preview is still rendering. Try again in a moment.')
      return
    }
    setBusy('pdf')
    try {
      const count = await exportCvToPdf(pages, data.fullName)
      toast.success(`PDF downloaded · ${count} page${count === 1 ? '' : 's'}`)
    } catch (error) {
      toast.error('PDF export failed', {
        description: error instanceof Error ? error.message : 'Unknown error — please try again.',
      })
    } finally {
      setBusy(null)
    }
  }

  async function downloadDocx() {
    if (empty) {
      toast.error('There is nothing to download yet — build your CV first.')
      return
    }
    setBusy('docx')
    try {
      await exportCvToDocx(data, settings)
      toast.success('Word document downloaded')
    } catch (error) {
      toast.error('Word export failed', {
        description: error instanceof Error ? error.message : 'Unknown error — please try again.',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={downloadPdf} disabled={busy !== null} size={compact ? 'default' : 'lg'}>
        {busy === 'pdf' ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <FileText className="size-4" />
        )}
        <span className={compact ? 'sr-only sm:not-sr-only' : ''}>PDF</span>
      </Button>
      <Button
        variant="outline"
        onClick={downloadDocx}
        disabled={busy !== null}
        size={compact ? 'default' : 'lg'}
      >
        {busy === 'docx' ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <FileText className="size-4" />
        )}
        <span className={compact ? 'sr-only sm:not-sr-only' : ''}>Word</span>
      </Button>
    </div>
  )
}
