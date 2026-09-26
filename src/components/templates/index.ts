import type { TemplateId } from '~/lib/cv-types'
import { atsTemplate } from './ats'
import { creativeTemplate } from './creative'
import { executiveTemplate } from './executive'
import { harvardTemplate } from './harvard'
import { minimalTemplate } from './minimal'
import { modernTemplate } from './modern'
import type { TemplateDef } from './shared'

/** Registry of available templates. Adding one is a single array entry. */
export const TEMPLATE_LIST: TemplateDef[] = [
  modernTemplate,
  atsTemplate,
  executiveTemplate,
  minimalTemplate,
  harvardTemplate,
  creativeTemplate,
]

export const TEMPLATES: Record<TemplateId, TemplateDef> = TEMPLATE_LIST.reduce(
  (accumulator, def) => {
    accumulator[def.id] = def
    return accumulator
  },
  {} as Record<TemplateId, TemplateDef>,
)

export function getTemplate(id: TemplateId): TemplateDef {
  return TEMPLATES[id] ?? modernTemplate
}

export * from './shared'
