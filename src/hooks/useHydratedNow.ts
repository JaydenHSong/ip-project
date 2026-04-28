import { useEffect, useState } from 'react'

export const useHydratedNow = (): number | null => {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNow(Date.now())
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  return now
}
