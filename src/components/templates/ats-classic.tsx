import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  SANS, block, fs, standardBlocks,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 46, right: 54, bottom: 46, left: 54 }
const BLACK = '#000000'
const GREY = '#565B63'
const RULE = '#C9CDD3'

/**
 * Dense one-page.
 *
 * Tuned for people with a lot of history: a smaller type scale and tighter
 * leading fit noticeably more on a sheet, so a long CV stops sprawling over
 * four pages. Bullets use a true hanging indent (padded first line pulled back
 * by the same amount) so wrapped lines align under the text rather than under
 * the marker, which is what most hand-rolled resume bullets get wrong.
 */
function compactHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: fs(20, theme), fontWeight: 700, color: BLACK, letterSpacing: '0.01em' }}>
            {data.fullName || 'Your Name'}
          </div>
          {data.title ? (
            <div style={{ fontSize: fs(12, theme), color: BLACK, marginTop: 1 }}>{data.title}</div>
          ) : null}
        </div>
        {contacts.length > 0 ? (
          <div
            style={{
              fontSize: fs(10.5, theme),
              color: GREY,
              lineHeight: 1.45,
              textAlign: 'right',
              maxWidth: 240,
            }}
          >
            {contacts.map((part, index) => (
              <div key={part}>
                {index > 0 ? '· ' : ''}
                {part}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ height: 1, background: BLACK, marginTop: 9 }} />
    </div>,
  )
}

const HANG = 13

function makeKit(theme: CvTheme): StyleKit {
  return {
    order: [
      'summary', 'experience', 'education', 'skills', 'certifications',
      'projects', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { experience: 'Experience', summary: 'Profile', awards: 'Awards' },
    heading: (label) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: fs(10.5, theme),
          fontWeight: 700,
          color: BLACK,
          letterSpacing: '0.12em',
          margin: '13px 0 5px',
        }}
      >
        <span>{label}</span>
        <span style={{ flex: 1, height: 1, background: RULE }} />
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: fs(12.5, theme), fontWeight: 700, color: BLACK }}>{title}</span>
          {sub ? <span style={{ fontSize: fs(11.5, theme), color: GREY }}>{'   '}{sub}</span> : null}
        </div>
        {date ? (
          <span style={{ fontSize: fs(11, theme), color: GREY, whiteSpace: 'nowrap' }}>{date}</span>
        ) : null}
      </div>
    ),
    bullet: (text) => (
      <div
        style={{
          fontSize: fs(12, theme),
          lineHeight: 1.42,
          color: BLACK,
          marginBottom: 3,
          paddingLeft: HANG,
          textIndent: -HANG,
        }}
      >
        <span style={{ color: GREY }}>•</span>
        <span>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ fontSize: fs(12, theme), lineHeight: 1.5, color: BLACK, marginBottom: 2 }}>
        {category ? <span style={{ fontWeight: 700 }}>{category}: </span> : null}
        {items.join(', ')}
      </div>
    ),
    language: (name, level) => (
      <div style={{ fontSize: fs(12, theme), color: BLACK, marginBottom: 1 }}>
        <span style={{ fontWeight: 700 }}>{name}</span>
        {level ? <span style={{ color: GREY }}>{`  (${level})`}</span> : null}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <div style={{ flex: 1, fontSize: fs(12, theme), color: BLACK }}>
          <span style={{ fontWeight: 700 }}>{title}</span>
          {sub ? <span style={{ color: GREY }}>{`  —  ${sub}`}</span> : null}
        </div>
        {date ? <span style={{ fontSize: fs(11, theme), color: GREY, whiteSpace: 'nowrap' }}>{date}</span> : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(12, theme), lineHeight: 1.45, color: BLACK },
    spacing: { entryBottom: 7 },
  }
}

/** Fits the most on one sheet: tight leading, hanging-indent bullets. */
export const atsClassicTemplate: TemplateDef = {
  id: 'ats-classic',
  name: 'ATS Compact',
  blurb: 'Dense one-pager, tight leading',
  padding: PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BLACK, fontSize: 12, lineHeight: 1.42 },
  build: (data, theme) =>
    standardBlocks(data, theme, makeKit(theme), [compactHeader(data, theme)]),
  preview: () => ({
    background: '#FFFFFF',
    accentBar: '#2B2F36',
    lines: ['#C7CCD3', '#C7CCD3', '#D8DCE1', '#D8DCE1'],
  }),
}
