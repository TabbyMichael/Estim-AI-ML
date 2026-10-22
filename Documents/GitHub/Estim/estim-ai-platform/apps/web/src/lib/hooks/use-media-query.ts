'use client'

import { useEffect, useState } from 'react'

/** Subscribe to a CSS media query with SSR-safe defaults. */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [query])

  return matches
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 1023px)', false)
}
