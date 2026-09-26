import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { safeFileName } from './utils'

/**
 * PDF export — identical to what the preview shows.
 *
 * html-to-image (NOT html2canvas: it drops oklch/oklab Tailwind colours and
 * throws "wrong PNG signature") rasterises each rendered A4 sheet. The imports
 * are static on purpose: lazy chunks for these two libraries failed to load at
 * click time in production.
 */

/** Neutralises any preview zoom/transform so the capture is 1:1. */
function neutraliseForCapture(node: HTMLElement) {
  const inline = {
    transform: node.style.transform,
    transformOrigin: node.style.transformOrigin,
    zoom: node.style.zoom,
    transition: node.style.transition,
    width: node.style.width,
    height: node.style.height,
    margin: node.style.margin,
  }
  node.style.transform = 'none'
  node.style.transformOrigin = 'top left'
  node.style.zoom = '1'
  node.style.transition = 'none'
  node.style.width = '794px'
  node.style.height = '1123px'
  node.style.margin = '0'

  return () => {
    node.style.transform = inline.transform
    node.style.transformOrigin = inline.transformOrigin
    node.style.zoom = inline.zoom
    node.style.transition = inline.transition
    node.style.width = inline.width
    node.style.height = inline.height
    node.style.margin = inline.margin
  }
}

export interface PdfExportOptions {
  onProgress?: (completed: number, total: number) => void
}

export async function exportCvToPdf(
  nodes: HTMLElement[],
  fullName: string,
  options: PdfExportOptions = {},
): Promise<number> {
  const pages = nodes.filter(Boolean)
  if (pages.length === 0) throw new Error('Nothing to export yet — build your CV first.')

  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  })

  for (let index = 0; index < pages.length; index += 1) {
    const restore = neutraliseForCapture(pages[index])
    try {
      const dataUrl = await toJpeg(pages[index], {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width: 794,
        height: 1123,
      })
      if (index > 0) pdf.addPage()
      // edge to edge: the sheet already contains the page margins
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297)
      options.onProgress?.(index + 1, pages.length)
    } finally {
      restore()
    }
  }

  pdf.save(`${safeFileName(fullName, 'My')}_CV.pdf`)
  return pages.length
}
