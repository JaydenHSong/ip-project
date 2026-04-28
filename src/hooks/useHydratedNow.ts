import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

export const useHydratedNow = (): number | null => (
  useSyncExternalStore(subscribe, () => Date.now(), () => null)
)
