import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  BODY, INK, SANS, block, fs, standardBlocks, withAlpha,
  type CvTheme, type EntryParts, type StyleKit, type TemplateDef,
} from './shared'

export const CREATIVE_PAD = { top: 46, right: 52, bottom: 48, left: 52 }

function creativeHeader(data: CvData, theme: CvTheme): CvBlock {
  const accent = theme.accent
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div
      style={{
        marginTop: -CREATIVE_PAD.top,
        marginLeft: -CREATIVE_PAD.left,
        marginRight: -CREATIVE_PAD.right,
        marginBottom: 8,
        background: accent,
        padding: `0 ${CREATIVE_PAD.left}px`,
      }}
    >
      <div style={{ height: 10, background: 'rgba(255,255,255,0.16)' }} />
      <div style={{ padding: '34px 0 26px' }}>
        <div
          style={{
            fontSize: fs(34, theme),
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {data.fullName || 'Your Name'}
        </div>
        {data.title ? (
          <div
            style={{
              display: 'inline-block',
              marginTop: 12,
              fontSize: fs(12, theme),
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              background: 'rgba(255,255,255,0.18)',
              padding: '4px 12px',
              borderRadius: 999,
            }}
          >
            {data.title}
          </div>
        ) : null}
        {contacts.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', marginTop: 18 }}>
            {contacts.map((item) => (
              <span
                key={item}
                style={{
                  fontSize: fs(11, theme),
                  color: '#FFFFFF',
                  background: 'rgba(255,255,255,0.14)',
                  padding: '3px 10px',
                  borderRadius: 999,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  const accent = theme.accent
  const rail = `2px solid ${withAlpha(accent, 0.35)}`
  return {
    order: [
      'summary', 'experience', 'skills', 'projects', 'education',
      'certifications', 'awards', 'languages', 'volunteer', 'references',
    ],
    labels: {
      summary: 'The Short Version',
      experience: 'What I Have Done',
      skills: 'Toolbox',
      awards: 'Awards',
    },
    heading: (label) => (
      <div style={{ margin: '18px 0 10px' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: fs(11.5, theme),
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: '#FFFFFF',
            background: accent,
            padding: '3px 12px',
            borderRadius: 999,
          }}
        >
          {label}
        </span>
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
          alignItems: 'baseline',
          borderLeft: rail,
          paddingLeft: 13,
          paddingBottom: 3,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: fs(14.5, theme), fontWeight: 800, color: INK, lineHeight: 1.25 }}>
            {title}
          </div>
          {sub ? (
            <div style={{ fontSize: fs(12, theme), color: accent, fontWeight: 600, marginTop: 2 }}>
              {sub}
            </div>
          ) : null}
        </div>
        {date ? (
          <div
            style={{
              fontSize: fs(11, theme),
              color: withAlpha(accent, 0.85),
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {date}
          </div>
        ) : null}
      </div>
    ),
    bullet: (text) => (
      <div
        style={{
          display: 'flex',
          gap: 10,
          fontSize: fs(13, theme),
          lineHeight: 1.55,
          color: BODY,
          borderLeft: rail,
          paddingLeft: 13,
          paddingBottom: 4,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: accent,
            marginTop: 7,
            flex: 'none',
          }}
        />
        <span style={{ flex: 1 }}>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div style={{ borderLeft: rail, paddingLeft: 13 }}>
        {category && category !== 'Core Skills' ? (
          <div
            style={{
              fontSize: fs(11, theme),
              fontWeight: 700,
              color: accent,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 5,
            }}
          >
            {category}
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item) => (
            <span
              key={item}
              style={{
                fontSize: fs(11.5, theme),
                fontWeight: 600,
                color: '#FFFFFF',
                background: accent,
                padding: '2px 10px',
                borderRadius: 999,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    ),
    language: (name, level) => (
      <div
        style={{
          fontSize: fs(13, theme),
          color: BODY,
          display: 'flex',
          gap: 8,
          borderLeft: rail,
          paddingLeft: 13,
          paddingBottom: 3,
        }}
      >
        <span style={{ fontWeight: 700, color: INK }}>{name}</span>
        {level ? <span style={{ color: accent, fontWeight: 600 }}>{level}</span> : null}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
          alignItems: 'baseline',
          borderLeft: rail,
          paddingLeft: 13,
        }}
      >
        <div style={{ flex: 1, fontSize: fs(13.5, theme), color: BODY }}>
          <span style={{ fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ color: accent, fontWeight: 600 }}>{'  ·  '}{sub}</span> : null}
        </div>
        {date ? (
          <span style={{ fontSize: fs(11, theme), color: withAlpha(accent, 0.85), fontWeight: 700, whiteSpace: 'nowrap' }}>
            {date}
          </span>
        ) : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(13, theme), lineHeight: 1.6, color: BODY, marginLeft: 15 },
    spacing: { entryBottom: 10 },
  }
}

/** Bold accent blocks, pill headings and an accent rail down every entry. */
export const creativeTemplate: TemplateDef = {
  id: 'creative',
  name: 'Creative',
  blurb: 'Bold accent blocks and pill headings',
  padding: CREATIVE_PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BODY, fontSize: 13, lineHeight: 1.55 },
  build: (data, theme) => standardBlocks(data, theme, makeKit(theme), [creativeHeader(data, theme)]),
  preview: (theme) => ({
    background: '#FFFFFF',
    accentBar: theme.accent,
    lines: ['#C9CFD6', '#C9CFD6', '#E3E7EB', '#E3E7EB'],
  }),
}
