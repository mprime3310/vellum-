import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  SANS, block, fs, standardBlocks,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 54, right: 58, bottom: 54, left: 58 }
const BLACK = '#000000'

function atsHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div>
      <div style={{ fontSize: fs(23, theme), fontWeight: 700, color: BLACK, letterSpacing: '0.02em' }}>
        {data.fullName || 'Your Name'}
      </div>
      {data.title ? (
        <div style={{ fontSize: fs(13, theme), color: BLACK, marginTop: 4 }}>{data.title}</div>
      ) : null}
      {contacts.length > 0 ? (
        <div style={{ fontSize: fs(11.5, theme), color: BLACK, marginTop: 8, lineHeight: 1.5 }}>
          {contacts.join('  |  ')}
        </div>
      ) : null}
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  return {
    order: [
      'summary', 'experience', 'education', 'skills', 'certifications',
      'projects', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { experience: 'Work Experience', summary: 'Professional Summary', awards: 'Awards' },
    heading: (label) => (
      <div
        style={{
          fontSize: fs(12.5, theme),
          fontWeight: 700,
          color: BLACK,
          letterSpacing: '0.07em',
          margin: '15px 0 6px',
          paddingBottom: 3,
          borderBottom: `1px solid ${BLACK}`,
        }}
      >
        {label}
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: fs(13.5, theme), fontWeight: 700, color: BLACK, lineHeight: 1.3 }}>
            {title}
          </div>
          {sub ? (
            <div style={{ fontSize: fs(12.5, theme), color: BLACK, marginTop: 1, lineHeight: 1.35 }}>
              {sub}
            </div>
          ) : null}
        </div>
        {date ? (
          <div style={{ fontSize: fs(12, theme), color: BLACK, whiteSpace: 'nowrap' }}>{date}</div>
        ) : null}
      </div>
    ),
    bullet: (text) => (
      <div
        style={{
          display: 'flex',
          gap: 8,
          fontSize: fs(13, theme),
          lineHeight: 1.5,
          color: BLACK,
          marginBottom: 3,
        }}
      >
        <span style={{ flex: 'none' }}>•</span>
        <span style={{ flex: 1 }}>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ fontSize: fs(13, theme), lineHeight: 1.55, color: BLACK }}>
        {category ? <span style={{ fontWeight: 700 }}>{category}: </span> : null}
        {items.join(', ')}
      </div>
    ),
    language: (name, level) => (
      <div style={{ fontSize: fs(13, theme), color: BLACK, marginBottom: 2 }}>
        {name}
        {level ? ` (${level})` : ''}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, fontSize: fs(13, theme), color: BLACK }}>
          <span style={{ fontWeight: 700 }}>{title}</span>
          {sub ? <span> — {sub}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(12, theme), color: BLACK, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(13, theme), lineHeight: 1.55, color: BLACK },
    spacing: { entryBottom: 8 },
  }
}

/** Deliberately plain: one column, black text, no graphics — the safest layout
 *  for resume parsers and for pasting into online application forms. */
export const atsTemplate: TemplateDef = {
  id: 'ats',
  name: 'ATS',
  blurb: 'Single column, plain text, parser friendly',
  padding: PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BLACK, fontSize: 13, lineHeight: 1.5 },
  build: (data, theme) => standardBlocks(data, theme, makeKit(theme), [atsHeader(data, theme)]),
  preview: () => ({
    background: '#FFFFFF',
    accentBar: '#111111',
    lines: ['#B9BEC5', '#B9BEC5', '#D3D7DC', '#D3D7DC'],
  }),
}
