import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { RotateCcw, Trash } from 'lucide-react'
import { Button } from './ui/button'
import { Accordion } from './editor-sections'
import { EditorSections, type EditorApi, type EntryKey } from './editor-fields'
import { HumanizeBar } from './humanize-bar'
import { useCvStore } from '~/lib/cv-store'
import {
  newEducation,
  newEntry,
  newExperience,
  newLanguage,
  newSkillGroup,
  type CvContact,
  type CvData,
  type CvEntry,
  type CvEducation,
  type CvExperience,
  type CvLanguage,
  type CvSkillGroup,
} from '~/lib/cv-types'

type ListKey = 'experience' | 'education' | 'skills' | 'languages' | EntryKey

export function EditorPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data, updateData, clearCv, resetAll } = useCvStore()

  const api = useMemo<EditorApi>(() => {
    const setField = (key: 'fullName' | 'title' | 'summary', value: string) =>
      updateData((draft) => {
        draft[key] = value
      }, { merge: true })

    const setContact = (key: keyof CvContact, value: string) =>
      updateData((draft) => {
        draft.contact[key] = value
      }, { merge: true })

    const patchList = <T,>(key: ListKey, id: string, patch: Partial<T>, merge: boolean) =>
      updateData((draft) => {
        const list = (draft as unknown as Record<string, T[]>)[key]
        const item = list.find((entry) => (entry as { id: string }).id === id)
        if (item) Object.assign(item as object, patch)
      }, { merge })

    const setList = (key: ListKey, next: unknown[]) =>
      updateData((draft) => {
        ;(draft as unknown as Record<string, unknown>)[key] = next
      })

    const add = (key: ListKey) =>
      updateData((draft) => {
        const target = draft as unknown as Record<string, unknown[]>
        const factory =
          key === 'experience'
            ? newExperience()
            : key === 'education'
              ? newEducation()
              : key === 'skills'
                ? newSkillGroup()
                : key === 'languages'
                  ? newLanguage()
                  : newEntry()
        target[key] = [...(target[key] ?? []), factory]
      })

    return {
      setField,
      setContact,
      patchExperience: (id, patch, merge) => patchList<CvExperience>('experience', id, patch, Boolean(merge)),
      patchEducation: (id, patch, merge) => patchList<CvEducation>('education', id, patch, Boolean(merge)),
      patchSkill: (id, patch, merge) => patchList<CvSkillGroup>('skills', id, patch, Boolean(merge)),
      patchEntry: (key, id, patch, merge) => patchList<CvEntry>(key, id, patch, Boolean(merge)),
      patchLanguage: (id, patch, merge) => patchList<CvLanguage>('languages', id, patch, Boolean(merge)),
      setList,
      add,
    }
  }, [updateData])

  const confirmClear = useCallback(() => {
    const yes = window.confirm('Clear the whole CV? You can undo this straight afterwards.')
    if (!yes) return
    clearCv()
    toast.success('CV cleared', { description: 'Undo with the history button if that was a mistake.' })
  }, [clearCv])

  const confirmReset = useCallback(() => {
    const yes = window.confirm('Reset everything, including the saved copy in this browser?')
    if (!yes) return
    resetAll()
    toast.success('Everything reset')
  }, [resetAll])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-1 pb-2">
        <p className="text-[12.5px] font-semibold text-foreground">Structured editor</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={confirmClear} title="Clear the CV content">
            <Trash className="size-3.5" />
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={confirmReset} title="Reset CV and design">
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="border-b border-border py-2">
        <HumanizeBar onOpenSettings={onOpenSettings} />
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto py-1">
        <Accordion type="multiple" defaultValue={['basics']} className="px-1">
          <EditorSections data={data as CvData} api={api} />
        </Accordion>
      </div>
    </div>
  )
}
