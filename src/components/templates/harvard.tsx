import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  BODY, INK, MUTED, TIMES, block, fs, standardBlocks,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 62, right: 72, bottom: 60, left: 72 }

function harvardHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: fs(24, theme), fontWeight: 700, color: INK, letterSpacing: '0.1em' }}>
        {(data.fullName || 'Your Name').toUpperCase()}
      </div>
      {data.title ? (
        <div style={{ fontSize: fs(12.5, theme), color: MUTED, marginTop: 6, letterSpacing: '0.04em' }}>
          {data.title}
        </div>
      ) : null}
      {contacts.length > 0 ? (
        <div style={{ fontSize: fs(11, theme), color: BODY, marginTop: 8, lineHeight: 1.6 }}>
          {contacts.join('  •  ')}
        </div>
      ) : null}
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  return {
    order: [
      'education', 'summary', 'experience', 'projects', 'skills',
      'certifications', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { summary: 'Research Statement', experience: 'Professional Experience', education: 'Education' },
    heading: (label) => (
      <div style={{ textAlign: 'center', margin: '18px 0 8px' }}>
        <div style={{ borderTop: `1px solid ${INK}`, marginBottom: 5 }} />
        <span style={{ fontSize: fs(11.5, theme), fontWeight: 700, color: INK, letterSpacing: '0.16em' }}>
          {label}
        </span>
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: fs(13.5, theme), fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ fontSize: fs(12.5, theme), color: BODY, fontStyle: 'italic' }}>{', '}{sub}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11.5, theme), color: BODY, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    bullet: (text) => (
      <div style={{ display: 'flex', gap: 9, fontSize: fs(12.5, theme), lineHeight: 1.55, color: BODY, marginBottom: 3 }}>
        <span style={{ flex: 'none' }}>•</span>
        <span style={{ flex: 1 }}>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ fontSize: fs(12.5, theme), color: BODY, lineHeight: 1.6 }}>
        {category && category !== 'Core Skills' ? (
          <span style={{ fontStyle: 'italic', color: INK }}>{category}: </span>
        ) : null}
        {items.join(', ')}
      </div>
    ),
    language: (name, level) => (
      <div style={{ fontSize: fs(12.5, theme), color: BODY, marginBottom: 3 }}>
        {name}
        {level ? ` (${level})` : ''}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <div style={{ flex: 1, fontSize: fs(12.5, theme), color: BODY }}>
          <span style={{ fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ fontStyle: 'italic' }}>{', '}{sub}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11.5, theme), color: BODY, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(12.5, theme), lineHeight: 1.6, color: BODY },
    spacing: { entryBottom: 9 },
  }
}

/** Classic centred academic CV: Times, centred tracked headings, thin rules. */
export const harvardTemplate: TemplateDef = {
  id: 'harvard',
  name: 'Harvard',
  blurb: 'Centred academic classic on Times',
  padding: PAD,
  fontFamily: TIMES,
  contentStyle: { fontFamily: TIMES, color: BODY, fontSize: 12.5, lineHeight: 1.5 },
  build: (data, theme) => standardBlocks(data, theme, makeKit(theme), [harvardHeader(data, theme)]),
  preview: () => ({
    background: '#FFFFFF',
    accentBar: '#2A2A2A',
    lines: ['#B4B9C0', '#B4B9C0', '#D6DAE0', '#D6DAE0'],
  }),
}
