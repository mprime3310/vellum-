import type {
  CvContact,
  CvData,
  CvEducation,
  CvEntry,
  CvExperience,
  CvLanguage,
  CvSkillGroup,
} from '~/lib/cv-types'
import {
  Award,
  Briefcase,
  FolderGit2,
  GraduationCap,
  HeartHandshake,
  Languages as LanguagesIcon,
  User,
  Users,
  Wrench,
  BadgeCheck,
} from 'lucide-react'
import { AddButton, AreaField, EditorSection, ItemCard, ListStack, Row, TextField } from './editor-sections'

export const ENTRY_KEYS = ['projects', 'certifications', 'awards', 'volunteer', 'references'] as const
export type EntryKey = (typeof ENTRY_KEYS)[number]

export interface EditorApi {
  setField: (key: 'fullName' | 'title' | 'summary', value: string) => void
  setContact: (key: keyof CvContact, value: string) => void
  patchExperience: (id: string, patch: Partial<CvExperience>, merge?: boolean) => void
  patchEducation: (id: string, patch: Partial<CvEducation>, merge?: boolean) => void
  patchSkill: (id: string, patch: Partial<CvSkillGroup>, merge?: boolean) => void
  patchEntry: (key: EntryKey, id: string, patch: Partial<CvEntry>, merge?: boolean) => void
  patchLanguage: (id: string, patch: Partial<CvLanguage>, merge?: boolean) => void
  setList: (key: 'experience' | 'education' | 'skills' | 'languages' | EntryKey, next: unknown[]) => void
  add: (key: 'experience' | 'education' | 'skills' | 'languages' | EntryKey) => void
}

export function BasicsSection({ data, api }: { data: CvData; api: EditorApi }) {
  return (
    <EditorSection value="basics" title="Basics" icon={<User className="size-4" />}>
      <div className="space-y-3">
        <TextField
          label="Full name"
          value={data.fullName}
          onChange={(value) => api.setField('fullName', value)}
          placeholder="Ada Lovelace"
        />
        <TextField
          label="Job title"
          value={data.title}
          onChange={(value) => api.setField('title', value)}
          placeholder="Senior Product Designer"
        />
        <AreaField
          label="Summary"
          rows={5}
          value={data.summary}
          onChange={(value) => api.setField('summary', value)}
          hint={`${data.summary.trim().split(/\s+/).filter(Boolean).length} words`}
          placeholder="Four to six sentences: what you do, the results you deliver, what you want next."
        />
      </div>
    </EditorSection>
  )
}

export function ContactSection({ data, api }: { data: CvData; api: EditorApi }) {
  return (
    <EditorSection value="contact" title="Contact details" icon={<Users className="size-4" />}>
      <div className="space-y-3">
        <Row>
          <TextField
            label="Email"
            type="email"
            value={data.contact.email}
            onChange={(value) => api.setContact('email', value)}
            placeholder="you@email.com"
          />
          <TextField
            label="Phone"
            value={data.contact.phone}
            onChange={(value) => api.setContact('phone', value)}
            placeholder="+44 7700 900000"
          />
        </Row>
        <TextField
          label="Address"
          value={data.contact.address}
          onChange={(value) => api.setContact('address', value)}
          placeholder="Berlin, Germany"
        />
        <TextField
          label="LinkedIn"
          value={data.contact.linkedin}
          onChange={(value) => api.setContact('linkedin', value)}
          placeholder="linkedin.com/in/you"
        />
        <Row>
          <TextField
            label="Portfolio"
            value={data.contact.portfolio}
            onChange={(value) => api.setContact('portfolio', value)}
            placeholder="yoursite.com"
          />
          <TextField
            label="Website"
            value={data.contact.website}
            onChange={(value) => api.setContact('website', value)}
            placeholder="blog.yoursite.com"
          />
        </Row>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          The AI never fills these in — it leaves your contact details blank on purpose.
        </p>
      </div>
    </EditorSection>
  )
}

export function ExperienceSection({ data, api }: { data: CvData; api: EditorApi }) {
  return (
    <EditorSection
      value="experience"
      title="Experience"
      icon={<Briefcase className="size-4" />}
      badge={data.experience.length}
    >
      <ListStack
        items={data.experience}
        onChange={(next) => api.setList('experience', next)}
        empty="No roles yet — add your first one."
        renderItem={(item, index, move, remove) => (
          <ItemCard
            title={item.role || item.company || 'New role'}
            meta={[item.company, item.location].filter(Boolean).join(' · ')}
            index={index}
            total={data.experience.length}
            onMove={move}
            onRemove={remove}
          >
            {() => (
              <>
                <TextField
                  label="Role"
                  value={item.role}
                  onChange={(value) => api.patchExperience(item.id, { role: value }, true)}
                />
                <Row>
                  <TextField
                    label="Company"
                    value={item.company}
                    onChange={(value) => api.patchExperience(item.id, { company: value }, true)}
                  />
                  <TextField
                    label="Location"
                    value={item.location}
                    onChange={(value) => api.patchExperience(item.id, { location: value }, true)}
                  />
                </Row>
                <Row>
                  <TextField
                    label="Start"
                    value={item.startDate}
                    onChange={(value) => api.patchExperience(item.id, { startDate: value }, true)}
                    placeholder="2019-03"
                  />
                  <TextField
                    label="End"
                    value={item.endDate}
                    onChange={(value) => api.patchExperience(item.id, { endDate: value }, true)}
                    placeholder="Present"
                  />
                </Row>
                <AreaField
                  label="Bullets"
                  hint="one per line"
                  rows={6}
                  value={item.bullets.join('\n')}
                  onChange={(value) =>
                    api.patchExperience(item.id, { bullets: value.split('\n') }, true)
                  }
                  placeholder={'Led a team of 6…\nCut checkout drop-off by 32%…'}
                />
              </>
            )}
          </ItemCard>
        )}
      />
      <div className="mt-3">
        <AddButton onClick={() => api.add('experience')} label="Add role" />
      </div>
    </EditorSection>
  )
}

export function EducationSection({ data, api }: { data: CvData; api: EditorApi }) {
  return (
    <EditorSection
      value="education"
      title="Education"
      icon={<GraduationCap className="size-4" />}
      badge={data.education.length}
    >
      <ListStack
        items={data.education}
        onChange={(next) => api.setList('education', next)}
        empty="No education yet."
        renderItem={(item, index, move, remove) => (
          <ItemCard
            title={item.degree || item.institution || 'New entry'}
            meta={[item.institution, item.location].filter(Boolean).join(' · ')}
            index={index}
            total={data.education.length}
            onMove={move}
            onRemove={remove}
          >
            {() => (
              <>
                <TextField
                  label="Degree"
                  value={item.degree}
                  onChange={(value) => api.patchEducation(item.id, { degree: value }, true)}
                  placeholder="MSc Computer Science"
                />
                <Row>
                  <TextField
                    label="Institution"
                    value={item.institution}
                    onChange={(value) => api.patchEducation(item.id, { institution: value }, true)}
                  />
                  <TextField
                    label="Location"
                    value={item.location}
                    onChange={(value) => api.patchEducation(item.id, { location: value }, true)}
                  />
                </Row>
                <Row>
                  <TextField
                    label="Start"
                    value={item.startDate}
                    onChange={(value) => api.patchEducation(item.id, { startDate: value }, true)}
                    placeholder="2015"
                  />
                  <TextField
                    label="End"
                    value={item.endDate}
                    onChange={(value) => api.patchEducation(item.id, { endDate: value }, true)}
                    placeholder="2019"
                  />
                </Row>
                <AreaField
                  label="Details"
                  rows={3}
                  value={item.details}
                  onChange={(value) => api.patchEducation(item.id, { details: value }, true)}
                  placeholder="First class honours. Dissertation on…"
                />
              </>
            )}
          </ItemCard>
        )}
      />
      <div className="mt-3">
        <AddButton onClick={() => api.add('education')} label="Add education" />
      </div>
    </EditorSection>
  )
}

export function SkillsSection({ data, api }: { data: CvData; api: EditorApi }) {
  return (
    <EditorSection value="skills" title="Skills" icon={<Wrench className="size-4" />} badge={data.skills.length}>
      <ListStack
        items={data.skills}
        onChange={(next) => api.setList('skills', next)}
        empty="No skill groups yet."
        renderItem={(item, index, move, remove) => (
          <ItemCard
            title={item.category || 'Skills'}
            meta={item.items.slice(0, 4).join(' · ')}
            index={index}
            total={data.skills.length}
            onMove={move}
            onRemove={remove}
          >
            {() => (
              <>
                <TextField
                  label="Category"
                  value={item.category}
                  onChange={(value) => api.patchSkill(item.id, { category: value }, true)}
                  placeholder="Frontend"
                />
                <AreaField
                  label="Skills"
                  hint="one per line, or comma separated"
                  rows={4}
                  value={item.items.join('\n')}
                  onChange={(value) =>
                    api.patchSkill(
                      item.id,
                      { items: value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean) },
                      true,
                    )
                  }
                  placeholder={'React\nTypeScript\nDesign systems'}
                />
              </>
            )}
          </ItemCard>
        )}
      />
      <div className="mt-3">
        <AddButton onClick={() => api.add('skills')} label="Add skill group" />
      </div>
    </EditorSection>
  )
}

export function LanguagesSection({ data, api }: { data: CvData; api: EditorApi }) {
  return (
    <EditorSection
      value="languages"
      title="Languages"
      icon={<LanguagesIcon className="size-4" />}
      badge={data.languages.length}
    >
      <ListStack
        items={data.languages}
        onChange={(next) => api.setList('languages', next)}
        empty="No languages yet."
        renderItem={(item, index, move, remove) => (
          <ItemCard
            title={item.name || 'Language'}
            meta={item.level}
            index={index}
            total={data.languages.length}
            onMove={move}
            onRemove={remove}
          >
            {() => (
              <Row>
                <TextField
                  label="Language"
                  value={item.name}
                  onChange={(value) => api.patchLanguage(item.id, { name: value }, true)}
                  placeholder="English"
                />
                <TextField
                  label="Level"
                  value={item.level}
                  onChange={(value) => api.patchLanguage(item.id, { level: value }, true)}
                  placeholder="Native"
                />
              </Row>
            )}
          </ItemCard>
        )}
      />
      <div className="mt-3">
        <AddButton onClick={() => api.add('languages')} label="Add language" />
      </div>
    </EditorSection>
  )
}

const ENTRY_META: Array<{
  key: EntryKey
  title: string
  icon: typeof Award
  add: string
  empty: string
  labels: [string, string, string]
}> = [
  { key: 'projects', title: 'Projects', icon: FolderGit2, add: 'Add project', empty: 'No projects yet.', labels: ['Project name', 'Tech / link', 'What it does'] },
  { key: 'certifications', title: 'Certifications', icon: BadgeCheck, add: 'Add certification', empty: 'No certifications yet.', labels: ['Certification', 'Issuer', 'What it covers'] },
  { key: 'awards', title: 'Awards', icon: Award, add: 'Add award', empty: 'No awards yet.', labels: ['Award', 'Issuer', 'What it was for'] },
  { key: 'volunteer', title: 'Volunteer', icon: HeartHandshake, add: 'Add role', empty: 'No volunteering yet.', labels: ['Role', 'Organisation', 'What you did'] },
  { key: 'references', title: 'References', icon: Users, add: 'Add reference', empty: 'No references yet.', labels: ['Name', 'Company / title', 'Contact'] },
]

function EntrySection({
  data,
  api,
  meta,
}: {
  data: CvData
  api: EditorApi
  meta: (typeof ENTRY_META)[number]
}) {
  const items = data[meta.key]
  const Icon = meta.icon
  return (
    <EditorSection value={meta.key} title={meta.title} icon={<Icon className="size-4" />} badge={items.length}>
      <ListStack
        items={items}
        onChange={(next) => api.setList(meta.key, next)}
        empty={meta.empty}
        renderItem={(item, index, move, remove) => (
          <ItemCard
            title={item.title || 'New entry'}
            meta={[item.subtitle, item.date].filter(Boolean).join(' · ')}
            index={index}
            total={items.length}
            onMove={move}
            onRemove={remove}
          >
            {() => (
              <>
                <TextField
                  label={meta.labels[0]}
                  value={item.title}
                  onChange={(value) => api.patchEntry(meta.key, item.id, { title: value }, true)}
                />
                <Row>
                  <TextField
                    label={meta.labels[1]}
                    value={item.subtitle}
                    onChange={(value) => api.patchEntry(meta.key, item.id, { subtitle: value }, true)}
                  />
                  <TextField
                    label="Date"
                    value={item.date}
                    onChange={(value) => api.patchEntry(meta.key, item.id, { date: value }, true)}
                    placeholder="2024"
                  />
                </Row>
                <AreaField
                  label={meta.labels[2]}
                  rows={3}
                  value={item.description}
                  onChange={(value) => api.patchEntry(meta.key, item.id, { description: value }, true)}
                />
              </>
            )}
          </ItemCard>
        )}
      />
      <div className="mt-3">
        <AddButton onClick={() => api.add(meta.key)} label={meta.add} />
      </div>
    </EditorSection>
  )
}

export function EditorSections({ data, api }: { data: CvData; api: EditorApi }) {
  return (
    <>
      <BasicsSection data={data} api={api} />
      <ContactSection data={data} api={api} />
      <ExperienceSection data={data} api={api} />
      <EducationSection data={data} api={api} />
      <SkillsSection data={data} api={api} />
      {ENTRY_META.map((meta) => (
        <EntrySection key={meta.key} data={data} api={api} meta={meta} />
      ))}
      <LanguagesSection data={data} api={api} />
    </>
  )
}



