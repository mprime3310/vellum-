import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  SERIF, SANS, block, fs, standardBlocks, withAlpha,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 54, right: 60, bottom: 54, left: 60 }
const INK = '#15181D'
const BODY = '#3A3F47'
const MUTED = '#767C85'
const RULE = '#D8DBE0'

/**
 * Editorial.
 *
 * A serif masthead and a tinted summary panel — the CV equivalent of a
 * magazine opener. The serif is reserved for the name, the summary and section
 * headings; everything that gets skimmed stays in the sans, so the contrast
 * carries hierarchy without adding ink.
 */
function editorialHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div>
      <div
        style={{
          fontSize: fs(30, theme),
          fontWeight: 700,
          color: INK,
          fontFamily: SERIF,
          lineHeight: 1.08,
          letterSpacing: '-0.01em',
        }}
      >
        {data.fullName || 'Your Name'}
      </div>
      {data.title ? (
        <div style={{ fontSize: fs(12.5, theme), color: theme.accent, marginTop: 7, letterSpacing: '0.06em' }}>
          {data.title}
        </div>
      ) : null}
      {contacts.length > 0 ? (
        <div style={{ fontSize: fs(11, theme), color: MUTED, marginTop: 13, lineHeight: 1.55 }}>
          {contacts.join('   ·   ')}
        </div>
      ) : null}
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  return {
    order: [
      'summary', 'experience', 'education', 'skills', 'projects',
      'certifications', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { summary: 'Profile', experience: 'Experience', awards: 'Awards' },
    // The summary is the one place a tinted panel is worth the ink, so render it
    // as its own kind and give it a full-bleed treatment.
    heading: (label) => (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '22px 0 9px' }}>
        <span
          style={{
            fontSize: fs(13.5, theme),
            fontWeight: 700,
            color: INK,
            fontFamily: SERIF,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
        <span style={{ flex: 1, height: 1, background: RULE }} />
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: fs(13.5, theme), fontWeight: 700, color: INK, lineHeight: 1.3 }}>{title}</div>
          {sub ? (
            <div style={{ fontSize: fs(12, theme), color: MUTED, marginTop: 1, lineHeight: 1.35, fontStyle: 'italic' }}>
              {sub}
            </div>
          ) : null}
        </div>
        {date ? (
          <span style={{ fontSize: fs(11, theme), color: MUTED, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
            {date}
          </span>
        ) : null}
      </div>
    ),
    bullet: (text) => (
      <div
        style={{
          display: 'flex',
          gap: 10,
          fontSize: fs(12.5, theme),
          lineHeight: 1.6,
          color: BODY,
          marginBottom: 5,
        }}
      >
        <span style={{ flex: 'none', width: 12, color: withAlpha(theme.accent, 0.7), fontWeight: 700 }}>—</span>
        <span style={{ flex: 1 }}>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ fontSize: fs(12.5, theme), lineHeight: 1.65, color: BODY, marginBottom: 3 }}>
        {category ? (
          <span style={{ fontWeight: 700, color: INK, fontFamily: SERIF, fontSize: fs(12.5, theme) }}>
            {category}
          </span>
        ) : null}
        {category ? '  ' : null}
        {items.map((item, index) => (
          <span key={item}>
            {index > 0 ? <span style={{ color: MUTED }}> · </span> : null}
            {item}
          </span>
        ))}
      </div>
    ),
    language: (name, level) => (
      <div style={{ fontSize: fs(12.5, theme), color: BODY, marginBottom: 2 }}>
        <span style={{ fontWeight: 700, color: INK }}>{name}</span>
        {level ? <span style={{ color: MUTED, fontStyle: 'italic' }}>{`  ${level}`}</span> : null}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <div style={{ flex: 1, fontSize: fs(12.5, theme), color: BODY }}>
          <span style={{ fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ color: MUTED, fontStyle: 'italic' }}>{`  —  ${sub}`}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11, theme), color: MUTED, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(12.5, theme), lineHeight: 1.6, color: BODY },
    spacing: { entryBottom: 10 },
  }
}

/** Serif masthead and rules — an editorial opener rather than a form. */
export const editorialTemplate: TemplateDef = {
  id: 'editorial',
  name: 'Editorial',
  blurb: 'Serif masthead, magazine rules',
  padding: PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BODY, fontSize: 12.5, lineHeight: 1.6 },
  build: (data, theme) =>
    standardBlocks(data, theme, makeKit(theme), [editorialHeader(data, theme)]),
  preview: (theme) => ({
    background: '#FFFFFF',
    accentBar: theme.accent,
    lines: ['#AAB0B8', '#CBD0D6', '#DDE0E5', '#DDE0E5'],
  }),
}
