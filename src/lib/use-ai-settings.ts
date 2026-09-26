import { useSyncExternalStore } from 'react'
import {
  getAiSettings,
  getAiSettingsServerSnapshot,
  subscribeAiSettings,
  type AiSettings,
} from './ai-settings'

/**
 * Subscribes a component to the shared AI provider settings.
 * Safe during SSR: the server snapshot is the default settings, and React
 * re-renders with the persisted value right after hydration.
 */
export function useAiSettings(): AiSettings {
  return useSyncExternalStore(
    subscribeAiSettings,
    getAiSettings,
    getAiSettingsServerSnapshot,
  )
}
