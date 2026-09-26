import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  BODY, INK, MUTED, RULE, SERIF, block, fs, standardBlocks, withAlpha,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 56, right: 62, bottom: 52, left: 62 }

function executiveHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div>
      <div style={{ fontSize: fs(28, theme), fontWeight: 700, color: INK, letterSpacing: '0.03em', lineHeight: 1.15 }}>
        {(data.fullName || 'Your Name').toUpperCase()}
      </div>
      {data.title ? (
        <div style={{ fontSize: fs(13.5, theme), color: theme.accent, marginTop: 6, fontStyle: 'italic' }}>
          {data.title}
        </div>
      ) : null}
      {contacts.length > 0 ? (
        <div style={{ fontSize: fs(11.5, theme), color: MUTED, marginTop: 12, lineHeight: 1.6 }}>
          {contacts.join('  •  ')}
        </div>
      ) : null}
      <div style={{ height: 2, borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${withAlpha(INK, 0.35)}`, marginTop: 16 }} />
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  return {
    order: [
      'summary', 'experience', 'education', 'skills', 'certifications',
      'projects', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { summary: 'Executive Profile', experience: 'Professional Experience', awards: 'Honours & Awards' },
    heading: (label) => (
      <div
        style={{
          fontSize: fs(11.5, theme),
          fontWeight: 700,
          color: theme.accent,
          letterSpacing: '0.14em',
          margin: '17px 0 8px',
          paddingBottom: 4,
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        {label}
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: fs(14, theme), fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ fontSize: fs(12, theme), color: MUTED, fontStyle: 'italic' }}>{', '}{sub}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11.5, theme), color: MUTED, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    bullet: (text) => (
      <div style={{ display: 'flex', gap: 9, fontSize: fs(12.5, theme), lineHeight: 1.55, color: BODY, marginBottom: 3 }}>
        <span style={{ color: theme.accent, flex: 'none', fontSize: fs(9, theme), marginTop: 5 }}>◆</span>
        <span style={{ flex: 1 }}>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ fontSize: fs(12.5, theme), color: BODY, lineHeight: 1.6 }}>
        {category && category !== 'Core Skills' ? (
          <span style={{ fontWeight: 700, color: INK, fontStyle: 'italic' }}>{category}: </span>
        ) : null}
        {items.join('  ·  ')}
      </div>
    ),
    language: (name, level) => (
      <div style={{ fontSize: fs(12.5, theme), color: BODY, marginBottom: 3 }}>
        <span style={{ fontWeight: 700, color: INK }}>{name}</span>
        {level ? <span style={{ color: MUTED }}>{' — '}{level}</span> : null}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <div style={{ flex: 1, fontSize: fs(12.5, theme), color: BODY }}>
          <span style={{ fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ fontStyle: 'italic' }}>{' — '}{sub}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11.5, theme), color: MUTED, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(12.5, theme), lineHeight: 1.6, color: BODY },
    spacing: { entryBottom: 9 },
  }
}

/** Serif, restrained, double rules — reads like a letterhead. */
export const executiveTemplate: TemplateDef = {
  id: 'executive',
  name: 'Executive',
  blurb: 'Serif elegance with fine rules',
  padding: PAD,
  fontFamily: SERIF,
  contentStyle: { fontFamily: SERIF, color: BODY, fontSize: 12.5, lineHeight: 1.55 },
  build: (data, theme) => standardBlocks(data, theme, makeKit(theme), [executiveHeader(data, theme)]),
  preview: (theme) => ({
    background: '#FFFFFF',
    accentBar: theme.accent,
    lines: ['#A9AFB8', '#A9AFB8', '#CFD3D9', '#CFD3D9'],
  }),
}
