import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  SANS, block, fs, standardBlocks,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 52, right: 58, bottom: 52, left: 58 }
const BLACK = '#000000'
const GREY = '#4A4F57'

/**
 * Numbered achievements.
 *
 * ATS parsers cope with "1." at the start of a line, and recruiters scanning a
 * screen can count impact points instead of parsing prose. The number sits in
 * its own fixed-width right-aligned column so every line of every bullet starts
 * at exactly the same x, which keeps a long role visually tidy.
 */
function numberedHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div>
      <div style={{ fontSize: fs(22, theme), fontWeight: 700, color: BLACK, letterSpacing: '0.01em' }}>
        {data.fullName || 'Your Name'}
      </div>
      {data.title ? (
        <div style={{ fontSize: fs(12.5, theme), color: GREY, marginTop: 3, letterSpacing: '0.02em' }}>
          {data.title}
        </div>
      ) : null}
      {contacts.length > 0 ? (
        <div style={{ fontSize: fs(11, theme), color: BLACK, marginTop: 7, lineHeight: 1.5 }}>
          {contacts.join('   |   ')}
        </div>
      ) : null}
      <div style={{ height: 2, background: BLACK, marginTop: 12 }} />
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  // Per-role counter: an entry head resets it, each bullet takes the next
  // number. Built fresh for every render so numbering always starts at 1.
  let n = 0
  return {
    order: [
      'summary', 'experience', 'education', 'skills', 'certifications',
      'projects', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { experience: 'Experience', summary: 'Summary', awards: 'Awards' },
    heading: (label) => (
      <div
        style={{
          fontSize: fs(11.5, theme),
          fontWeight: 700,
          color: BLACK,
          letterSpacing: '0.1em',
          margin: '16px 0 7px',
        }}
      >
        {label}
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => {
      n = 0
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: fs(13.5, theme), fontWeight: 700, color: BLACK }}>{title}</span>
            {sub ? <span style={{ fontSize: fs(12, theme), color: GREY }}>{'   '}{sub}</span> : null}
          </div>
          {date ? (
            <span style={{ fontSize: fs(11.5, theme), color: GREY, whiteSpace: 'nowrap' }}>{date}</span>
          ) : null}
        </div>
      )
    },
    bullet: (text) => {
      n += 1
      return (
        <div
          style={{
            display: 'flex',
            gap: 9,
            fontSize: fs(12.5, theme),
            lineHeight: 1.5,
            color: BLACK,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              flex: 'none',
              width: 15,
              textAlign: 'right',
              fontWeight: 700,
              color: GREY,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {n}.
          </span>
          <span style={{ flex: 1 }}>{text}</span>
        </div>
      )
    },
    badges: (category, items) => (
      <div style={{ fontSize: fs(12.5, theme), lineHeight: 1.55, color: BLACK, marginBottom: 2 }}>
        {category ? <span style={{ fontWeight: 700 }}>{category}: </span> : null}
        {items.join(', ')}
      </div>
    ),
    language: (name, level) => (
      <div style={{ fontSize: fs(12.5, theme), color: BLACK, marginBottom: 2 }}>
        <span style={{ fontWeight: 700 }}>{name}</span>
        {level ? <span style={{ color: GREY }}>{`  (${level})`}</span> : null}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div style={{ flex: 1, fontSize: fs(12.5, theme), color: BLACK }}>
          <span style={{ fontWeight: 700 }}>{title}</span>
          {sub ? <span style={{ color: GREY }}>{`  —  ${sub}`}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11.5, theme), color: GREY, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(12.5, theme), lineHeight: 1.55, color: BLACK },
    spacing: { entryBottom: 9 },
  }
}

/** ATS-safe single column with numbered impact points and no graphics. */
export const atsNumberedTemplate: TemplateDef = {
  id: 'ats-numbered',
  name: 'ATS Numbered',
  blurb: 'Numbered achievements, parser safe',
  padding: PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BLACK, fontSize: 12.5, lineHeight: 1.5 },
  build: (data, theme) =>
    standardBlocks(data, theme, makeKit(theme), [numberedHeader(data, theme)]),
  preview: () => ({
    background: '#FFFFFF',
    accentBar: '#111111',
    lines: ['#B9BEC5', '#C7CCD3', '#D3D7DC', '#D3D7DC'],
  }),
}
