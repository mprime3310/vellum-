import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  SERIF, SANS, block, fs, standardBlocks, withAlpha,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

const PAD = { top: 50, right: 56, bottom: 50, left: 56 }
const INK = '#14181F'
const BODY = '#3B424E'
const MUTED = '#6E7681'
// Wide enough for a full "2020-06 – 2023-08" range on ONE line. At 10.5px that
// string is ~100px, so a narrower rail breaks the year in half ("2023-" / "08"),
// which reads as a rendering bug rather than a date.
const RAIL = 112
const RAIL_FONT = 10.5

/**
 * Timeline.
 *
 * A dated left rail so a flat list of jobs reads as a scannable sequence. The
 * rail is a fixed-width column so every date lines up down the page, and the
 * connecting rule is the entry block's own left border — which means it flows
 * across a page break instead of being one long element that must fit whole.
 */
function timelineHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div>
      <div style={{ fontSize: fs(27, theme), fontWeight: 700, color: INK, fontFamily: SERIF, lineHeight: 1.12 }}>
        {data.fullName || 'Your Name'}
      </div>
      {data.title ? (
        <div
          style={{
            fontSize: fs(12, theme),
            color: theme.accent,
            marginTop: 6,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {data.title}
        </div>
      ) : null}
      {contacts.length > 0 ? (
        <div style={{ fontSize: fs(11.5, theme), color: MUTED, marginTop: 12, lineHeight: 1.6 }}>
          {contacts.join('   ·   ')}
        </div>
      ) : null}
      <div style={{ height: 2, background: withAlpha(theme.accent, 0.35), marginTop: 16 }} />
    </div>,
  )
}

const railCell = (theme: CvTheme) => <div style={{ flex: `0 0 ${RAIL}px` }} />

function makeKit(theme: CvTheme): StyleKit {
  return {
    order: [
      'summary', 'experience', 'education', 'projects', 'skills',
      'certifications', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: { summary: 'Profile', experience: 'Career', awards: 'Recognition' },
    heading: (label) => (
      <div
        style={{
          fontSize: fs(11, theme),
          fontWeight: 700,
          color: INK,
          letterSpacing: '0.16em',
          margin: '20px 0 8px',
          paddingBottom: 4,
          borderBottom: `1px solid ${withAlpha(theme.accent, 0.22)}`,
        }}
      >
        {label}
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginTop: 8 }}>
        <div
          style={{
            flex: `0 0 ${RAIL}px`,
            fontSize: fs(RAIL_FONT, theme),
            color: theme.accent,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {date}
        </div>
        <div style={{ flex: 1, borderLeft: `1px solid ${withAlpha(theme.accent, 0.3)}`, paddingLeft: 12 }}>
          <div style={{ fontSize: fs(13.5, theme), fontWeight: 700, color: INK, lineHeight: 1.3 }}>{title}</div>
          {sub ? (
            <div style={{ fontSize: fs(12, theme), color: MUTED, marginTop: 1, lineHeight: 1.35 }}>{sub}</div>
          ) : null}
        </div>
      </div>
    ),
    bullet: (text) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {railCell(theme)}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 8,
            fontSize: fs(12.5, theme),
            lineHeight: 1.55,
            color: BODY,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              flex: 'none',
              width: 5,
              height: 5,
              marginTop: 6,
              borderRadius: '50%',
              background: withAlpha(theme.accent, 0.6),
            }}
          />
          <span style={{ flex: 1 }}>{text}</span>
        </div>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {railCell(theme)}
        <div style={{ flex: 1, fontSize: fs(12.5, theme), lineHeight: 1.6, color: BODY, marginBottom: 3 }}>
          {category ? (
            <div
              style={{
                fontSize: fs(10.5, theme),
                fontWeight: 700,
                color: MUTED,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 1,
              }}
            >
              {category}
            </div>
          ) : null}
          {items.join('  ·  ')}
        </div>
      </div>
    ),
    language: (name, level) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
        {railCell(theme)}
        <div style={{ flex: 1, fontSize: fs(12.5, theme), color: BODY, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, color: INK }}>{name}</span>
          {level ? <span style={{ color: MUTED }}>{`   ${level}`}</span> : null}
        </div>
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginTop: 6 }}>
        <div
          style={{
            flex: `0 0 ${RAIL}px`,
            fontSize: fs(RAIL_FONT, theme),
            color: MUTED,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {date}
        </div>
        <div style={{ flex: 1, fontSize: fs(12.5, theme), color: BODY }}>
          <span style={{ fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ color: MUTED }}>{`  —  ${sub}`}</span> : null}
        </div>
      </div>
    ),
    paragraphStyle: { fontSize: fs(12.5, theme), lineHeight: 1.6, color: BODY },
    spacing: { entryBottom: 9 },
  }
}

/** A dated rail down the left, so a career reads as a sequence. */
export const timelineTemplate: TemplateDef = {
  id: 'timeline',
  name: 'Timeline',
  blurb: 'Dated rail, scannable history',
  padding: PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BODY, fontSize: 12.5, lineHeight: 1.55 },
  build: (data, theme) =>
    standardBlocks(data, theme, makeKit(theme), [timelineHeader(data, theme)]),
  preview: (theme) => ({
    background: '#FFFFFF',
    accentBar: theme.accent,
    lines: ['#BFC5CD', '#D3D8DE', '#D3D8DE', '#E0E4E9'],
  }),
}
