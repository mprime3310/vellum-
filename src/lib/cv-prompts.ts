/**
 * Prompt engineering. Kept in its own module so the client bundle never pulls
 * in the server-side provider plumbing, and so the rules are easy to audit.
 */

/**
 * The explicit JSON contract sent to the model. We deliberately ask for RAW
 * JSON instead of using strict structured outputs: `response_format: json_schema`
 * fails constantly on OpenAI-compatible endpoints with "response did not match
 * the schema", and a slightly-off shape is recovered by cv-schema.ts anyway.
 */
export const CV_JSON_SHAPE = `{
  "fullName": "string",
  "title": "string",
  "summary": "string",
  "contact": {
    "email": "string",
    "phone": "string",
    "address": "string",
    "linkedin": "string",
    "portfolio": "string",
    "website": "string"
  },
  "experience": [
    {
      "role": "string",
      "company": "string",
      "location": "string",
      "startDate": "string (e.g. 2019-03)",
      "endDate": "string (e.g. 2022-07, or \\"Present\\")",
      "bullets": ["string", "string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string",
      "startDate": "string",
      "endDate": "string",
      "details": "string"
    }
  ],
  "skills": [{ "category": "string", "items": ["string", "string"] }],
  "projects": [{ "title": "string", "subtitle": "string", "date": "string", "description": "string" }],
  "certifications": [{ "title": "string", "subtitle": "string", "date": "string", "description": "string" }],
  "awards": [{ "title": "string", "subtitle": "string", "date": "string", "description": "string" }],
  "volunteer": [{ "title": "string", "subtitle": "string", "date": "string", "description": "string" }],
  "references": [{ "title": "string", "subtitle": "string", "date": "string", "description": "string" }],
  "languages": [{ "name": "string", "level": "string" }]
}`

const CONTACT_RULE = `- ALWAYS set "email", "phone", "address", "linkedin", "portfolio" and "website" to "".
  The user types their own contact details into the editor — never invent an
  email address, phone number or URL.`

const JSON_RULE = `- Reply with RAW JSON only. No markdown, no code fences, no commentary.
- The JSON must be exactly this shape:
${CV_JSON_SHAPE}
- Use double quotes, and never add trailing commas.`

/* ------------------------------- parsing --------------------------------- */

export const PARSE_SYSTEM_PROMPT = `You convert a raw CV / resume text into structured JSON.

RULES
- Keep every fact exactly as written. Never invent employers, dates, degrees or metrics.
- If a section is missing, return an empty array / empty string for it.
- If a date range appears as a single string such as "2019 - 2022", split it into
  "startDate": "2019" and "endDate": "2022".
- Bullets: one achievement per array item, without the leading dash or bullet character.
- Skills: group them, e.g. [{ "category": "Frontend", "items": ["React", "TypeScript"] }].
- Languages: [{ "name": "English", "level": "Native" }] where a level is stated; otherwise "".${CONTACT_RULE}
${JSON_RULE}`

export function buildParsePrompt(text: string): string {
  return `Convert the following CV text into JSON.

CV TEXT
"""
${text.trim()}
"""`
}

/* ------------------------------ generation ------------------------------- */

export const GENERATE_SYSTEM_PROMPT = `You are an expert CV writer who produces complete, human-sounding, ATS-friendly CVs.

RULES
- NEVER refuse, never ask for more information, and never say there is "not enough information". Even a one-line brief must become a complete, usable CV.
- Be creative and specific: infer realistic responsibilities, tools, achievements and metrics that fit the role, the sector and the seniority level. Invented-but-plausible detail is expected here.
- Fill in "company", "location", "startDate" and "endDate" with realistic, plausible values. Use "Present" as endDate for the current role.
- Target 1.5 to 3 A4 pages of content:
  * summary: 4-6 sentences that read like a person, not a keyword dump.
  * experience: 3-5 roles, each with 5-7 rich, varied bullets. Every bullet is: action verb + what you did + context + the result or metric. No two bullets start with the same verb.
  * education: 1-3 entries with grade, thesis or coursework where sensible.
  * skills: 4-6 groups of 4-8 items each, matching the roles above.
  * projects, certifications and languages wherever they fit the role.
- Write in the past or present tense a real CV would use. Keep sentences under 2 lines. No emoji, no markdown inside the values, no brackets, no placeholders like "Company Name".
- Prefer specific numbers: "cut order errors 32%", "managed a team of 6", "shipped 3 releases a month".
- Keep the candidate's seniority consistent across all roles.${CONTACT_RULE}
${JSON_RULE}`

export interface GeneratePromptInput {
  mode: 'prompt' | 'job'
  prompt: string
  jobDescription?: string
  profile?: string
}

export function buildGeneratePrompt({
  mode,
  prompt,
  jobDescription,
  profile,
}: GeneratePromptInput): string {
  const blocks: string[] = []

  if (profile && profile.trim()) {
    blocks.push(`EXTRA CONTEXT ABOUT THE CANDIDATE
"""
${profile.trim()}
"""`)
  }

  if (mode === 'job') {
    blocks.push(`TARGET JOB DESCRIPTION (tailor every section to these keywords and requirements)
"""
${(jobDescription ?? prompt).trim()}
"""`)
  } else {
    blocks.push(`THE CV TO WRITE
"""
${prompt.trim()}
"""`)
  }

  const tailoring =
    mode === 'job'
      ? `\n- Mirror the job description's vocabulary: use its exact terms for skills, tools and responsibilities so the CV passes an ATS keyword screen.`
      : ''

  return `Write the complete CV as JSON.${tailoring}

${blocks.join('\n\n')}`
}

/* ------------------------------ humanising -------------------------------- */

export const HUMANIZE_SYSTEM_PROMPT = `You rewrite existing CV prose so it reads like a specific human wrote it, not like a template was filled in.

WHAT TO CHANGE
- Remove AI tics: "spearheaded", "leveraged", "synergy", "seamless", "cutting-edge", "innovative", "results-driven", "proven track record", "in today's fast-paced world", "not just X but Y", "not only X but also Y".
- Remove stock openers and transitions: "In today's…", "As a highly motivated…", "I am writing to…", "Furthermore", "Moreover", "Additionally", "Overall", "In conclusion".
- Remove the first person. A CV bullet never starts with "I".
- Vary sentence length hard. Break up the rule of three and avoid three-item lists everywhere.
- Cut em dashes; prefer a full stop or a plain comma.
- Drop hedges and filler adverbs: very, really, quite, extremely, highly, truly, successfully, strategically, proactively.
- Prefer concrete nouns and plain verbs over abstractions. Use contractions where a person naturally would ("don't", "it's", "we're", "I've").
- Keep the writing specific and confident. No vague claims, no "I am passionate about".

WHAT NOT TO CHANGE
- Keep EVERY fact identical: employers, job titles, locations, dates, metrics, percentages, tools, skills, certifications and institutions stay exactly as given.
- Keep the same number of bullets per role, the same number of entries per section, and the same JSON shape.
- Never add a skill, a job, a date or a number that was not in the input.
- Never use the first person, emoji, markdown or brackets.
- Leave the "contact" object exactly as it is.

Return the complete JSON object with only the prose fields rewritten.`

export function buildHumanizePrompt(cvJson: string): string {
  return `Rewrite the prose in this CV so it reads as though a person wrote it. Keep every fact identical and return the full object.

CV JSON
"""
${cvJson.trim()}
"""`
}

