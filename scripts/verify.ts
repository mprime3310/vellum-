/**
 * Headless verification of the pure logic: messy AI JSON -> CvData, the A4
 * pagination rules, and the DOCX build. Run with:
 *
 *   npx rolldown scripts/verify.ts -d scripts/.out --format esm --platform node
 *   node scripts/.out/verify.js
 */
import { parseCvJson, normalizeCvObject, extractJson, coerceSkillGroups, splitPeriod } from '../src/lib/cv-schema'
import { paginate, type CvBlock } from '../src/lib/cv-layout'
import { buildCvDocument } from '../src/lib/cv-docx'
import { countTells, cvProse, humanizeCvData, humanizeString } from '../src/lib/cv-humanize'
import { emptyCv } from '../src/lib/cv-types'
import { Packer } from 'docx'

let failures = 0
function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? ` \u2014 ${detail}` : ''}`)
  }
}

/* ---------------------------- 1. messy JSON ----------------------------- */
console.log('\n1. extractJson + normalizeCvObject')

const messy = [
  'Here is your CV:\n\n```json',
  '{',
  '  "name": "Dana Whitfield",',
  '  "jobTitle": "Staff Product Designer",',
  '  "email": "dana@example.com",',
  '  "phone": 447700900123,',
  '  "contact": { "location": "Lisbon, PT" },',
  '  "profile": "Designer with 9 years of experience.",',
  '  "employmentHistory": [',
  '    { "position": "Staff Designer", "employer": "Northwind", "period": "2021 \u2013 Present",',
  '      "achievements": "Rebuilt the design system\\nRan weekly critiques" },',
  '    { "title": "Product Designer", "company": "Helio", "dates": "2018-2019", "bullets": ["Owned onboarding"] }',
  '  ],',
  '  "skills": { "Design": ["Figma", "Design systems"], "Research": "Interviews, Synthesis" },',
  '  "education": [{ "degree": "BA Graphic Design", "school": "ESAD", "year": "2014-2018" }],',
  '  "languages": ["English (Native)", { "language": "Portuguese", "proficiency": "Fluent" }],',
  '  "certifications": "Google UX Certificate",',
  '  "bogus": { "weird": true },',
  '}',
  '```',
  'Hope that helps!',
].join('\n')

const cv = parseCvJson(messy)
check('name alias \u2192 fullName', cv.fullName === 'Dana Whitfield', cv.fullName)
check('title alias \u2192 title', cv.title === 'Staff Product Designer', cv.title)
check('number \u2192 string phone', cv.contact.phone === '447700900123', cv.contact.phone)
check('nested contact', cv.contact.address === 'Lisbon, PT', cv.contact.address)
check('summary alias', cv.summary.startsWith('Designer with 9'), cv.summary)
check('2 experience items', cv.experience.length === 2, String(cv.experience.length))
check(
  'period split into start/end',
  cv.experience[0].startDate === '2021' && cv.experience[0].endDate === 'Present',
  `${cv.experience[0].startDate} | ${cv.experience[0].endDate}`,
)
check('newlines \u2192 bullet array', cv.experience[0].bullets.length === 2, JSON.stringify(cv.experience[0].bullets))
check('employmentHistory alias', cv.experience[1].company === 'Helio', cv.experience[1].company)
check('2 skill groups from object map', cv.skills.length === 2, String(cv.skills.length))
check('string skill value coerced to array', cv.skills[1].items.length === 2, JSON.stringify(cv.skills[1].items))
check('school \u2192 institution', cv.education[0].institution === 'ESAD', cv.education[0].institution)
check('2 languages', cv.languages.length === 2, String(cv.languages.length))
check('level from parentheses', cv.languages[0].level === 'Native', cv.languages[0].level)
check('proficiency \u2192 level', cv.languages[1].level === 'Fluent', cv.languages[1].level)
check('certification from plain string', cv.certifications[0]?.title === 'Google UX Certificate', cv.certifications[0]?.title)
check('every item has an id', cv.experience.every((entry) => entry.id.length > 0))
check('fenced json slice', extractJson('prose ```json\n{"a":1}\n``` tail').includes('{"a":1}'))
check('trailing comma repair', JSON.parse(extractJson('{"a":1,}')).a === 1)
check('splitPeriod dash', splitPeriod('2019 \u2013 2022').end === '2022')
check('skills string[] \u2192 one group', coerceSkillGroups(['React', 'Node']).length === 1)
check('skills string \u2192 one group', coerceSkillGroups('React, Node').length === 1)
const garbage = normalizeCvObject('nonsense')
check('garbage input degrades safely', garbage.fullName === '' && garbage.experience.length === 0)

/* ---------------------------- 2. pagination ----------------------------- */
console.log('\n2. A4 pagination rules')

const CONTENT_HEIGHT = 1000
const LINE = 20
const measureStub = () => LINE * 5

const blocks: CvBlock[] = [
  { id: 'heading-exp', kind: 'heading', node: null },
  { id: 'entry-1', kind: 'entry', node: null },
  { id: 'b-1', kind: 'bullet', node: null },
  { id: 'b-2', kind: 'bullet', node: null },
  { id: 'spacer', kind: 'spacer', node: null },
  { id: 'entry-2', kind: 'entry', node: null },
  { id: 'b-3', kind: 'bullet', node: null },
]
const heights: Record<string, number> = {
  'heading-exp': 40,
  'entry-1': 30,
  'b-1': 300,
  'b-2': 300,
  'spacer': 320,
  'entry-2': 30,
  'b-3': 300,
}
const lineHeights = Object.fromEntries(blocks.map((block) => [block.id, LINE]))

const plan = paginate(blocks, { contentHeight: CONTENT_HEIGHT, heights, lineHeights, measureText: measureStub })
const used = plan.map((page) => page.used)
check('no page overflows', used.every((value) => value <= CONTENT_HEIGHT), JSON.stringify(used))
check('content spans 2 pages', plan.length === 2, `${plan.length} pages`)
check(
  'atomic blocks are never split',
  plan.every((page) => page.blocks.every((placed) => placed.height <= heights[placed.block.id])),
)
const lastOfFirstPage = plan[0].blocks[plan[0].blocks.length - 1]
check('page 1 never ends on a heading', lastOfFirstPage.block.kind !== 'heading', lastOfFirstPage.block.kind)

// A heading that would strand at the bottom of a page must move down.
const headingPlan = paginate(
  [
    { id: 'fill', kind: 'bullet', node: null },
    { id: 'h', kind: 'heading', node: null },
    { id: 'next', kind: 'bullet', node: null },
  ],
  {
    contentHeight: 200,
    heights: { fill: 60, h: 40, next: 50 },
    lineHeights: { fill: LINE, h: LINE, next: LINE },
    measureText: measureStub,
  },
)
const headingPage = headingPlan.findIndex((page) => page.blocks.some((b) => b.block.id === 'h'))
const nextPage = headingPlan.findIndex((page) => page.blocks.some((b) => b.block.id === 'next'))
check('heading moves down with the block that follows it', headingPage === nextPage, `heading p${headingPage}, next p${nextPage}`)

const paraText = Array.from({ length: 600 }, (_, index) => `word${index}`).join(' ')
const lineCountFor = (text: string) => Math.max(1, Math.ceil(text.length / 60))
const paraPlan = paginate(
  [
    {
      id: 'p',
      kind: 'paragraph',
      text: paraText,
      splittable: true,
      renderText: (text) => text,
      node: paraText,
    },
  ],
  {
    contentHeight: CONTENT_HEIGHT,
    heights: { p: lineCountFor(paraText) * LINE },
    lineHeights: { p: LINE },
    measureText: (_id, text) => lineCountFor(text) * LINE,
  },
)
const parts = paraPlan.flatMap((page) => page.blocks)
check('long paragraph split across pages', parts.length > 1, `${parts.length} parts`)
check('no orphan (at least 2 lines before the break)', lineCountFor(parts[0]?.text ?? '') >= 2)
check('no widow (at least 2 lines after the break)', lineCountFor(parts[parts.length - 1]?.text ?? '') >= 2)
check('split text is lossless', parts.map((part) => part.text).join(' ') === paraText)

/* --------------- 2b. regressions: rhythm & page-fill accounting -------------- */
console.log('\n2b. Page-fill accounting (regressions)')

const placedSum = (placed: { height: number }[]) => placed.reduce((sum, item) => sum + item.height, 0)

// (i) A spacer is vertical rhythm BETWEEN two blocks. It used to be added to the
// running total without ever being rendered, so every page was planned 27-72px
// taller than it painted — a dead band of blank paper above the bottom margin.
const rhythmBlocks: CvBlock[] = [
  { id: 'r-a', kind: 'bullet', node: null },
  { id: 'r-gap-1', kind: 'spacer', node: null },
  { id: 'r-b', kind: 'bullet', node: null },
  { id: 'r-gap-2', kind: 'spacer', node: null },
  { id: 'r-c', kind: 'bullet', node: null },
]
const rhythmPlan = paginate(rhythmBlocks, {
  contentHeight: 100,
  heights: { 'r-a': 30, 'r-gap-1': 10, 'r-b': 30, 'r-gap-2': 10, 'r-c': 30 },
  lineHeights: Object.fromEntries(rhythmBlocks.map((block) => [block.id, LINE])),
  measureText: measureStub,
})
check(
  'planned height equals what actually gets painted',
  rhythmPlan.every((page) => Math.abs(page.used - placedSum(page.blocks)) < 0.001),
  JSON.stringify(rhythmPlan.map((page) => [page.used, placedSum(page.blocks)])),
)
check(
  'a spacer is only spent when the block after it shares the page',
  rhythmPlan[0].blocks.map((p) => p.block.id).join(',') === 'r-a,r-gap-1,r-b',
  rhythmPlan[0].blocks.map((p) => p.block.id).join(','),
)
check(
  'no page starts or ends on a bare spacer',
  rhythmPlan.every(
    (page) =>
      page.blocks[0]?.block.kind !== 'spacer' && page.blocks[page.blocks.length - 1]?.block.kind !== 'spacer',
  ),
)

// (ii) Keep-with-next must reserve only the START of a splittable paragraph.
// Reserving its full height exiled every heading in front of a long paragraph
// onto a page of its own, stranding the header alone on page 1.
const tallText = Array.from({ length: 4000 }, (_, index) => `w${index}`).join(' ')
const tallHeight = (text: string) => lineCountFor(text) * LINE
const tallPlan = paginate(
  [
    { id: 't-hdr', kind: 'header', node: null },
    { id: 't-h', kind: 'heading', node: null },
    { id: 't-p', kind: 'paragraph', text: tallText, splittable: true, renderText: (text) => text, node: tallText },
  ],
  {
    contentHeight: 1000,
    heights: { 't-hdr': 100, 't-h': 40, 't-p': tallHeight(tallText) },
    lineHeights: { 't-hdr': LINE, 't-h': LINE, 't-p': LINE },
    measureText: (_id, text) => tallHeight(text),
  },
)
const tallFirst = tallPlan[0].blocks.map((p) => p.block.id)
check(
  'a heading is not exiled by a tall following paragraph',
  tallFirst.includes('t-hdr') && tallFirst.includes('t-h') && tallFirst.includes('t-p'),
  tallFirst.join(','),
)
check(
  'tall-paragraph pages never overflow',
  tallPlan.every((page) => page.used <= 1000),
  JSON.stringify(tallPlan.map((page) => page.used)),
)
check(
  'a multi-page paragraph is reassembled losslessly',
  tallPlan
    .flatMap((page) => page.blocks)
    .filter((part) => part.block.id === 't-p' && part.text !== undefined)
    .map((part) => part.text as string)
    .join(' ') === tallText,
)

/* ------------------------------- 3. docx -------------------------------- */
console.log('\n3. DOCX build')

const buffer = await Packer.toBuffer(
  buildCvDocument(cv, { template: 'modern', accent: '#1F4E79', fontScale: 1 }),
)
check('docx is a zip (PK signature)', buffer[0] === 0x50 && buffer[1] === 0x4b)
check('docx has content', buffer.length > 4000, `${buffer.length} bytes`)

const emptyDoc = await Packer.toBuffer(
  buildCvDocument(emptyCv(), { template: 'ats', accent: '#111111', fontScale: 1 }),
)
check('empty CV still produces a valid docx', emptyDoc[0] === 0x50 && emptyDoc[1] === 0x4b)

/* ---------------------------- 4. humaniser ------------------------------- */
console.log('\n4. Humaniser')

const sample = {
  fullName: 'Dana Whitfield',
  title: 'Staff Product Designer',
  summary:
    "In today's fast-paced world, I am a highly motivated professional with a proven track record of delivering innovative, cutting-edge design solutions. I am not just a designer but a strategic partner.",
  contact: { email: '', phone: '', address: '', linkedin: '', portfolio: '', website: '' },
  experience: [
    {
      id: 'e1',
      role: 'Staff Designer',
      company: 'Northwind',
      location: 'Lisbon',
      startDate: '2021',
      endDate: 'Present',
      bullets: [
        'Spearheaded the redesign of the core checkout flow, which increased conversion by 32% — and reduced support tickets.',
        'I led a team of 6 designers and engineers, utilizing agile methodologies to deliver on time.',
        'Leveraged user research to not only improve usability but also increase NPS by 14 points.',
        'I am very passionate about mentoring junior designers.',
      ],
    },
  ],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  awards: [],
  volunteer: [],
  references: [],
  languages: [],
}

const { data: clean, stats } = humanizeCvData(sample as never)
const prose = cvProse(clean)

check('cliche count > 0', stats.cliche > 0, String(stats.cliche))
check('"spearheaded" gone', !/\bspearheaded\b/i.test(prose))
check('"leveraged" gone', !/\bleverag/i.test(prose))
check('"innovative/cutting-edge" gone', !/\b(innovative|cutting[- ]edge)\b/i.test(prose))
check('"in today\'s world" opener gone', !/in today/i.test(prose))
check('"not just X but Y" gone', !/not just[^,.;]{2,60}\bbut\b/i.test(prose))
check('first person removed from bullets', !/(^|[.!?]\s+)i\s+(led|am|very)/i.test(prose))
check('hedge "very" removed', !/\bvery passionate\b/i.test(prose))
check('em dash before a clause removed', !prose.includes('32% — and'))
check('contraction used', /\bI've\b|\bit's\b|don't|\bI'm\b/.test(prose), prose.slice(0, 90))
check('em dash count reduced', (prose.match(/—/g) ?? []).length < (cvProse(sample as never).match(/—/g) ?? []).length)
check('stats.edits > 10', stats.edits > 10, String(stats.edits))

// facts must survive untouched
check('name preserved', clean.fullName === 'Dana Whitfield')
check('employer preserved', clean.experience[0].company === 'Northwind')
check('role preserved', clean.experience[0].role === 'Staff Designer')
check('dates preserved', clean.experience[0].startDate === '2021' && clean.experience[0].endDate === 'Present')
check('metric 32% preserved', prose.includes('32%'), prose)
check('metric NPS 14 preserved', prose.includes('14'))
check('team size 6 preserved', prose.includes('6'))
check('bullet count unchanged', clean.experience[0].bullets.length === sample.experience[0].bullets.length)
check(
  'no empty bullets introduced',
  clean.experience[0].bullets.every((bullet) => bullet.trim().length > 0),
)
check('summary is non-empty and capitalised', /^[A-Z]/.test(clean.summary))
check('tells reported down', stats.remaining < countTells(sample as never), `${stats.remaining} vs ${countTells(sample as never)}`)

const idempotent = humanizeCvData(clean as never)
check('second pass finds nothing new', idempotent.stats.edits === 0, String(idempotent.stats.edits))

const off = humanizeString('It is not just a role, it is a responsibility.', { contractions: false })
check('contractions can be switched off', !/\bit's\b/i.test(off.text), off.text)
const keepPerson = humanizeString('I led the team of six.', { dePersonalise: false })
check('de-personalise can be switched off', /^I led/.test(keepPerson.text), keepPerson.text)

const emptyRun = humanizeString('   ')
check('empty input is safe', emptyRun.text === '   ' && emptyRun.stats.edits === 0)

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)

