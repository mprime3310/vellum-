import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_SETTINGS,
  TEMPLATE_IDS,
  cloneCv,
  emptyCv,
  type CvData,
  type CvSettings,
  type TemplateId,
} from './cv-types'
import { normalizeCvObject } from './cv-schema'

const STORAGE_KEY = 'lovable-cv-data-v2'
const HISTORY_LIMIT = 50
/** A burst of keystrokes collapses into one undo step. */
const MERGE_WINDOW_MS = 900

interface Snapshot {
  data: CvData
  settings: CvSettings
}

interface HistoryState {
  present: Snapshot
  past: Snapshot[]
  future: Snapshot[]
}

export interface UpdateOptions {
  /** true while typing so consecutive keystrokes share one history entry */
  merge?: boolean
}

interface CvStoreValue {
  data: CvData
  settings: CvSettings
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  /** Mutate a draft of the CV (structural edits: add/remove/reorder). */
  updateData: (mutator: (draft: CvData) => void, options?: UpdateOptions) => void
  /** Replace the whole CV (e.g. an AI result). */
  replaceData: (next: CvData, settings?: Partial<CvSettings>) => void
  updateSettings: (patch: Partial<CvSettings>, options?: UpdateOptions) => void
  resetAll: () => void
  clearCv: () => void
  /** False during SSR and the first client paint, true after localStorage restore. */
  hydrated: boolean
}

const CvStoreContext = createContext<CvStoreValue | null>(null)

function sanitizeSettings(input: unknown): CvSettings {
  const raw = (input ?? {}) as Partial<CvSettings>
  const template = TEMPLATE_IDS.includes(raw.template as TemplateId)
    ? (raw.template as TemplateId)
    : DEFAULT_SETTINGS.template
  const accent =
    typeof raw.accent === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.accent.trim())
      ? raw.accent.trim()
      : DEFAULT_SETTINGS.accent
  const fontScale =
    typeof raw.fontScale === 'number' && raw.fontScale >= 0.8 && raw.fontScale <= 1.3
      ? raw.fontScale
      : DEFAULT_SETTINGS.fontScale
  return { template, accent, fontScale }
}

/** Reads localStorage — always called from an effect so SSR output stays stable. */
function loadFromStorage(): Snapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data?: unknown; settings?: unknown }
    const source = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed
    return { data: normalizeCvObject(source), settings: sanitizeSettings(parsed?.settings) }
  } catch {
    return null
  }
}

function saveToStorage(snapshot: Snapshot) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota exceeded or storage disabled — editing still works in memory */
  }
}

export function CvProvider({
  children,
  initialData,
  initialSettings,
}: {
  children: ReactNode
  /** Server-rendered starting point; localStorage wins once mounted. */
  initialData?: CvData
  initialSettings?: CvSettings
}) {
  const [state, setState] = useState<HistoryState>(() => ({
    present: {
      data: initialData ?? emptyCv(),
      settings: initialSettings ?? DEFAULT_SETTINGS,
    },
    past: [],
    future: [],
  }))
  const [hydrated, setHydrated] = useState(false)

  const mergeRef = useRef(false)
  const mergeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore on mount: read in an effect so server and client markup agree.
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored) setState({ present: stored, past: [], future: [] })
    setHydrated(true)
  }, [])

  // Debounced autosave.
  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => saveToStorage(state.present), 400)
    return () => clearTimeout(timer)
  }, [state.present, hydrated])

  useEffect(
    () => () => {
      if (mergeTimer.current) clearTimeout(mergeTimer.current)
    },
    [],
  )

  const beginCommit = useCallback((merge: boolean) => {
    const shouldMerge = merge && mergeRef.current
    mergeRef.current = merge
    if (mergeTimer.current) clearTimeout(mergeTimer.current)
    mergeTimer.current = setTimeout(() => {
      mergeRef.current = false
      mergeTimer.current = null
    }, MERGE_WINDOW_MS)
    return shouldMerge
  }, [])

  const updateData = useCallback(
    (mutator: (draft: CvData) => void, options?: UpdateOptions) => {
      const shouldMerge = beginCommit(Boolean(options?.merge))
      setState((prev) => {
        const draft = cloneCv(prev.present.data)
        mutator(draft)
        return {
          present: { ...prev.present, data: draft },
          past: shouldMerge ? prev.past : [...prev.past, prev.present].slice(-HISTORY_LIMIT),
          future: [],
        }
      })
    },
    [beginCommit],
  )

  const replaceData = useCallback(
    (next: CvData, settings?: Partial<CvSettings>) => {
      beginCommit(false)
      setState((prev) => ({
        present: {
          data: cloneCv(next),
          settings: settings ? { ...prev.present.settings, ...settings } : prev.present.settings,
        },
        past: [...prev.past, prev.present].slice(-HISTORY_LIMIT),
        future: [],
      }))
    },
    [beginCommit],
  )

  const updateSettings = useCallback(
    (patch: Partial<CvSettings>, options?: UpdateOptions) => {
      const shouldMerge = beginCommit(Boolean(options?.merge))
      setState((prev) => ({
        present: { ...prev.present, settings: { ...prev.present.settings, ...patch } },
        past: shouldMerge ? prev.past : [...prev.past, prev.present].slice(-HISTORY_LIMIT),
        future: [],
      }))
    },
    [beginCommit],
  )

  const undo = useCallback(() => {
    mergeRef.current = false
    setState((prev) => {
      if (prev.past.length === 0) return prev
      return {
        present: prev.past[prev.past.length - 1],
        past: prev.past.slice(0, -1),
        future: [prev.present, ...prev.future].slice(0, HISTORY_LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    mergeRef.current = false
    setState((prev) => {
      if (prev.future.length === 0) return prev
      const [present, ...rest] = prev.future
      return { present, past: [...prev.past, prev.present].slice(-HISTORY_LIMIT), future: rest }
    })
  }, [])

  const resetAll = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    mergeRef.current = false
    setState({
      present: { data: emptyCv(), settings: DEFAULT_SETTINGS },
      past: [],
      future: [],
    })
  }, [])

  const clearCv = useCallback(() => {
    beginCommit(false)
    setState((prev) => ({
      present: { ...prev.present, data: emptyCv() },
      past: [...prev.past, prev.present].slice(-HISTORY_LIMIT),
      future: [],
    }))
  }, [beginCommit])

  const value = useMemo<CvStoreValue>(
    () => ({
      data: state.present.data,
      settings: state.present.settings,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undo,
      redo,
      updateData,
      replaceData,
      updateSettings,
      resetAll,
      clearCv,
      hydrated,
    }),
    [
      state.present.data,
      state.present.settings,
      state.past.length,
      state.future.length,
      undo,
      redo,
      updateData,
      replaceData,
      updateSettings,
      resetAll,
      clearCv,
      hydrated,
    ],
  )

  return <CvStoreContext.Provider value={value}>{children}</CvStoreContext.Provider>
}

export function useCvStore(): CvStoreValue {
  const context = useContext(CvStoreContext)
  if (!context) throw new Error('useCvStore must be used inside <CvProvider>')
  return context
}
