import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  convertInchesToTwip,
} from 'docx'
import { contactParts, formatRange, type CvData, type CvEntry, type CvSettings } from './cv-types'
import { safeFileName } from './utils'

/**
 * A native, fully editable Word document (not an image of the CV).
 * A4 portrait, 0.75" margins, Arial, accent-coloured headings, and real Word
 * bullet lists (`LevelFormat.BULLET`) rather than unicode "•" characters.
 */

const PAGE_WIDTH_DXA = 11906 // A4 portrait
const PAGE_HEIGHT_DXA = 16838
const MARGIN_DXA = convertInchesToTwip(0.75)
const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - MARGIN_DXA * 2
const BULLET_REFERENCE = 'cv-bullet-list'

const BASE_FONT = 'Arial'
const BASE_SIZE = 21 // half-points => 10.5pt
const INK = '111827'
const SUBTLE = '6B7280'
const RULE = 'D5D9DE'

function hex(color: string): string {
  const clean = (color || '').replace('#', '').trim()
  if (clean.length === 3) {
    return clean
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase()
  }
  return (clean.length === 6 ? clean : '1F4E79').toUpperCase()
}

function heading(text: string, accent: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 110 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 2 } },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        color: accent,
        size: 21,
        characterSpacing: 16,
      }),
    ],
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: BULLET_REFERENCE, level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: BASE_SIZE })],
  })
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 90 },
    children: [new TextRun({ text, size: BASE_SIZE })],
  })
}

function muted(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 90 },
    children: [new TextRun({ text, size: BASE_SIZE - 1, color: SUBTLE })],
  })
}

/** Left text plus a right-aligned date pushed to the margin with a right tab. */
function datedRow(left: string, right: string, options: { small?: boolean } = {}): Paragraph {
  const children: TextRun[] = [
    new TextRun({
      text: left,
      bold: true,
      size: options.small ? BASE_SIZE : BASE_SIZE + 1,
      color: INK,
    }),
  ]
  if (right.trim()) {
    children.push(new TextRun({ text: `\t${right}`, size: BASE_SIZE - 1, color: SUBTLE }))
  }
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH_DXA }],
    spacing: { after: 40 },
    children,
  })
}

function entryParagraphs(item: CvEntry): Paragraph[] {
  const rows: Paragraph[] = [datedRow(item.title || item.subtitle, item.date, { small: true })]
  if (item.subtitle && item.title) rows.push(muted(item.subtitle))
  if (item.description.trim()) rows.push(body(item.description))
  return rows
}

export function buildCvDocument(data: CvData, settings: CvSettings): Document {
  const accent = hex(settings.accent)
  const children: Paragraph[] = []

  /* -------------------------------- header ------------------------------- */
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: data.fullName || 'Your Name', bold: true, size: 44, color: INK }),
      ],
    }),
  )
  if (data.title.trim()) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: data.title, size: 26, bold: true, color: accent })],
      }),
    )
  }
  const contacts = contactParts(data.contact)
  if (contacts.length > 0) children.push(muted(contacts.join('  |  ')))

  /* -------------------------------- summary ------------------------------ */
  if (data.summary.trim()) {
    children.push(heading('Professional Summary', accent), body(data.summary))
  }

  /* ------------------------------ experience ----------------------------- */
  const experience = data.experience.filter(
    (item) => item.role || item.company || item.bullets.some((b) => b.trim()),
  )
  if (experience.length > 0) {
    children.push(heading('Professional Experience', accent))
    for (const item of experience) {
      children.push(datedRow(item.role || item.company, formatRange(item.startDate, item.endDate)))
      const sub = [item.company, item.location].filter((v) => v.trim()).join(', ')
      if (sub) children.push(muted(sub))
      for (const text of item.bullets) {
        if (text.trim()) children.push(bullet(text.trim()))
      }
    }
  }

  /* ------------------------------- education ----------------------------- */
  const education = data.education.filter((item) => item.degree || item.institution)
  if (education.length > 0) {
    children.push(heading('Education', accent))
    for (const item of education) {
      children.push(
        datedRow(item.degree || item.institution, formatRange(item.startDate, item.endDate)),
      )
      const sub = [item.institution, item.location].filter((v) => v.trim()).join(', ')
      if (sub) children.push(muted(sub))
      if (item.details.trim()) children.push(body(item.details))
    }
  }

  /* --------------------------------- skills ------------------------------ */
  const skills = data.skills.filter((group) => group.items.length > 0 || group.category)
  if (skills.length > 0) {
    children.push(heading('Skills', accent))
    for (const group of skills) {
      const items = group.items.filter((value) => value.trim())
      if (items.length === 0 && !group.category) continue
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            ...(group.category
              ? [new TextRun({ text: `${group.category}: `, bold: true, size: BASE_SIZE })]
              : []),
            new TextRun({ text: items.join(', '), size: BASE_SIZE }),
          ],
        }),
      )
    }
  }

  /* --------------------------- generic sections -------------------------- */
  const sections: Array<{ items: CvEntry[]; label: string }> = [
    { items: data.projects, label: 'Projects' },
    { items: data.certifications, label: 'Certifications' },
    { items: data.awards, label: 'Awards & Honours' },
    { items: data.volunteer, label: 'Volunteer Experience' },
    { items: data.references, label: 'References' },
  ]
  for (const section of sections) {
    const list = section.items.filter((item) => item.title || item.subtitle || item.description)
    if (list.length === 0) continue
    children.push(heading(section.label, accent))
    for (const item of list) children.push(...entryParagraphs(item))
  }

  /* ------------------------------- languages ----------------------------- */
  const languages = data.languages.filter((item) => item.name || item.level)
  if (languages.length > 0) {
    children.push(heading('Languages', accent))
    for (const item of languages) {
      const text = item.level ? `${item.name} — ${item.level}` : item.name
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text, size: BASE_SIZE })],
        }),
      )
    }
  }

  /* ------------------------------- document ------------------------------ */
  return new Document({
    creator: 'Vellum CV Generator',
    title: `${data.fullName || 'CV'} — Curriculum Vitae`,
    description: 'Curriculum Vitae generated with Vellum',
    styles: {
      default: {
        document: {
          run: { font: BASE_FONT, size: BASE_SIZE, color: '1F2733' },
          paragraph: { spacing: { line: 276, after: 0 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLET_REFERENCE,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 180 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
            margin: {
              top: MARGIN_DXA,
              right: MARGIN_DXA,
              bottom: MARGIN_DXA,
              left: MARGIN_DXA,
            },
          },
        },
        children,
      },
    ],
  })
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exportCvToDocx(data: CvData, settings: CvSettings): Promise<void> {
  const blob = await Packer.toBlob(buildCvDocument(data, settings))
  triggerDownload(blob, `${safeFileName(data.fullName, 'My')}_CV.docx`)
}


