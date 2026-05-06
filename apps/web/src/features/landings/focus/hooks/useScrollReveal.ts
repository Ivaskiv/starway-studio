import { useEffect, useRef } from 'react'

const STAGGER_SELECTORS = [
  '.focus-problem-grid',
  '.focus-topics-grid',
  '.focus-included-grid',
  '.focus-how-steps',
] as const

export function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    STAGGER_SELECTORS.forEach((selector) => {
      root.querySelectorAll<HTMLElement>(`${selector} > *`).forEach((child, index) => {
        child.style.setProperty('--focus-reveal-delay', `${index * 60}ms`)
      })
    })

    root.querySelectorAll<HTMLElement>('[data-reveal-delay]').forEach((element) => {
      const step = Number(element.dataset.revealDelay)
      if (!Number.isNaN(step) && step > 0) {
        element.style.setProperty('--focus-reveal-delay', `${step * 80}ms`)
      }
    })

    const revealElements = root.querySelectorAll<HTMLElement>('.focus-reveal, [data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    revealElements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
    }
  }, [])

  return rootRef
}
