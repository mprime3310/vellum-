import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  BODY, FAINT, INK, MUTED, RULE, SANS, block, fs, standardBlocks, withAlpha,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 66, right: 70, bottom: 62, left: 70 }

function minimalHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div>
      <div style={{ fontSize: fs(29, theme), fontWeight: 600, color: INK, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
        {data.fullName || 'Your Name'}
      </div>
      {data.title ? (
        <div style={{ fontSize: fs(12.5, theme), color: theme.accent, marginTop: 8, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {data.title}
        </div>
      ) : null}
      {contacts.length > 0 ? (
        <div style={{ fontSize: fs(11.5, theme), color: MUTED, marginTop: 16, lineHeight: 1.6 }}>
          {contacts.join('   ·   ')}
        </div>
      ) : null}
      <div style={{ height: 1, background: RULE, marginTop: 22 }} />
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  return {
    order: [
      'summary', 'experience', 'education', 'skills', 'projects',
      'certifications', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { summary: 'About', experience: 'Experience', awards: 'Awards' },
    heading: (label) => (
      <div style={{ fontSize: fs(10.5, theme), fontWeight: 600, color: theme.accent, letterSpacing: '0.2em', margin: '26px 0 10px' }}>
        {label}
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: fs(13.5, theme), fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ fontSize: fs(12, theme), color: MUTED }}>{'  '}{sub}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11, theme), color: FAINT, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{date}</span> : null}
      </div>
    ),
    bullet: (text) => (
      <div style={{ display: 'flex', gap: 10, fontSize: fs(12.5, theme), lineHeight: 1.62, color: BODY, marginBottom: 5, marginLeft: 2 }}>
        <span style={{ color: withAlpha(theme.accent, 0.55), flex: 'none' }}>–</span>
        <span style={{ flex: 1 }}>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ fontSize: fs(12.5, theme), color: BODY, lineHeight: 1.7 }}>
        {category && category !== 'Core Skills' ? (
          <div style={{ fontSize: fs(11, theme), color: FAINT, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            {category}
          </div>
        ) : null}
        {items.join('  ·  ')}
      </div>
    ),
    language: (name, level) => (
      <div style={{ fontSize: fs(12.5, theme), color: BODY, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: INK }}>{name}</span>
        {level ? <span style={{ color: FAINT }}>{'   '}{level}</span> : null}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline' }}>
        <div style={{ flex: 1, fontSize: fs(12.5, theme), color: BODY }}>
          <span style={{ fontWeight: 600, color: INK }}>{title}</span>
          {sub ? <span style={{ color: MUTED }}>{'  ·  '}{sub}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11, theme), color: FAINT, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(12.5, theme), lineHeight: 1.7, color: BODY },
    spacing: { entryBottom: 12 },
  }
}

/** Airy and typographic: tiny tracked headings, generous whitespace. */
export const minimalTemplate: TemplateDef = {
  id: 'minimal',
  name: 'Minimal',
  blurb: 'Editorial whitespace, quiet type',
  padding: PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BODY, fontSize: 12.5, lineHeight: 1.62 },
  build: (data, theme) => standardBlocks(data, theme, makeKit(theme), [minimalHeader(data, theme)]),
  preview: (theme) => ({
    background: '#FFFFFF',
    accentBar: theme.accent,
    lines: ['#C7CCD3', '#C7CCD3', '#DEE2E7', '#DEE2E7'],
  }),
}
