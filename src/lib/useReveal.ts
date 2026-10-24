import { useEffect } from 'react'
import { prefersReducedMotion } from './motion'

// Fades `[data-reveal]` elements in as they scroll into view. Re-scans when
// `key` changes so newly rendered pages are picked up.
export function useReveal(key: string) {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)')
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-revealed'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [key])
}
