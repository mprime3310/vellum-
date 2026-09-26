import type { CvBlock } from '~/lib/cv-layout'
import { contactParts, type CvData } from '~/lib/cv-types'
import {
  BODY,
  FAINT,
  INK,
  MUTED,
  SANS,
  block,
  fs,
  standardBlocks,
  withAlpha,
  type CvTheme,
  type EntryParts,
  type StyleKit,
  type TemplateDef,
} from './shared'

export const MODERN_PAD = { top: 46, right: 54, bottom: 44, left: 54 }

function modernHeader(data: CvData, theme: CvTheme): CvBlock {
  const contacts = contactParts(data.contact)
  return block(
    'header',
    'header',
    <div
      style={{
        marginTop: -MODERN_PAD.top,
        marginLeft: -MODERN_PAD.left,
        marginRight: -MODERN_PAD.right,
        marginBottom: 6,
        background: theme.accent,
        color: '#FFFFFF',
        padding: `42px ${MODERN_PAD.left}px 26px`,
      }}
    >
      <div
        style={{
          fontSize: fs(33, theme),
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: '-0.015em',
          marginTop: 18,
        }}
      >
        {data.fullName || 'Your Name'}
      </div>
      {data.title ? (
        <div
          style={{
            fontSize: fs(14, theme),
            marginTop: 8,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {data.title}
        </div>
      ) : null}
      {contacts.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '3px 16px',
            marginTop: 16,
            fontSize: fs(11.5, theme),
            color: 'rgba(255,255,255,0.86)',
          }}
        >
          {contacts.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
    </div>,
  )
}

function makeKit(theme: CvTheme): StyleKit {
  const accent = theme.accent
  return {
    order: [
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
      'certifications',
      'awards',
      'languages',
      'volunteer',
      'references',
    ],
    labels: { summary: 'Profile', experience: 'Experience', awards: 'Awards' },
    heading: (label) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '17px 0 9px' }}>
        <span
          style={{
            fontSize: fs(12, theme),
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: accent,
          }}
        >
          {label}
        </span>
        <span style={{ flex: 1, height: 2, background: withAlpha(accent, 0.22) }} />
      </div>
    ),
    entry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: fs(14.5, theme), fontWeight: 700, color: INK, lineHeight: 1.25 }}>
            {title}
          </div>
          {sub ? (
            <div style={{ fontSize: fs(12.5, theme), color: MUTED, marginTop: 2, lineHeight: 1.3 }}>
              {sub}
            </div>
          ) : null}
        </div>
        {date ? (
          <div
            style={{
              fontSize: fs(11.5, theme),
              color: MUTED,
              fontWeight: 600,
              letterSpacing: '0.02em',
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
          gap: 9,
          fontSize: fs(13, theme),
          lineHeight: 1.55,
          color: BODY,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            width: 4,
            height: 4,
            marginTop: 8,
            background: accent,
            flex: 'none',
            borderRadius: 1,
          }}
        />
        <span style={{ flex: 1 }}>{text}</span>
      </div>
    ),
    badges: (category, items) => (
      <div>
        {category && category !== 'Core Skills' ? (
          <div style={{ fontSize: fs(11.5, theme), fontWeight: 700, color: MUTED, marginBottom: 5 }}>
            {category}
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item) => (
            <span
              key={item}
              style={{
                fontSize: fs(11.5, theme),
                color: accent,
                background: withAlpha(accent, 0.08),
                border: `1px solid ${withAlpha(accent, 0.2)}`,
                padding: '2px 9px',
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
      <div style={{ fontSize: fs(13, theme), color: BODY, display: 'flex', gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 700, color: INK }}>{name}</span>
        {level ? <span style={{ color: MUTED }}>{level}</span> : null}
      </div>
    ),
    simpleEntry: ({ title, sub, date }: EntryParts) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: fs(13.5, theme), fontWeight: 700, color: INK }}>{title}</span>
          {sub ? <span style={{ fontSize: fs(12.5, theme), color: MUTED }}> — {sub}</span> : null}
        </div>
        {date ? (
          <span style={{ fontSize: fs(11.5, theme), color: FAINT, whiteSpace: 'nowrap' }}>{date}</span>
        ) : null}
      </div>
    ),
    paragraphStyle: { fontSize: fs(13, theme), lineHeight: 1.6, color: BODY },
    spacing: { entryBottom: 9 },
  }
}

export const modernTemplate: TemplateDef = {
  id: 'modern',
  name: 'Modern',
  blurb: 'Accent header band, clean sans, pill skills',
  padding: MODERN_PAD,
  fontFamily: SANS,
  contentStyle: { fontFamily: SANS, color: BODY, fontSize: 13, lineHeight: 1.55 },
  build: (data, theme) => standardBlocks(data, theme, makeKit(theme), [modernHeader(data, theme)]),
  preview: (theme) => ({
    background: '#FFFFFF',
    accentBar: theme.accent,
    lines: ['#D9DDE3', '#D9DDE3', '#E7EAEE', '#E7EAEE'],
  }),
}

