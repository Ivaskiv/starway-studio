import { useEffect, useMemo, useRef, useState } from 'react'

import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import PaywallModal from '@/features/paywall/components/PaywallModal'
import { shouldTriggerPaywallByDays, usePaywallStore } from '@/features/paywall/store/usePaywallStore'
import type { PatternResult } from '@/features/pattern/types'
import { Button } from '@/ui'

type PatternScreenProps = {
  patterns: PatternResult[]
  activeSphere: string
  impacts: string[]
  daysUsed?: number
  onFocusSphere?: (id: string) => void
  onScrollToDaily?: () => void
}

function buildShareText(patterns: PatternResult[]) {
  return `Мій сценарій:\n— ${patterns.map((pattern) => pattern.type).join('\n— ')}`
}

export default function PatternScreen({
  patterns,
  activeSphere,
  impacts,
  daysUsed = 0,
  onFocusSphere,
  onScrollToDaily,
}: PatternScreenProps) {
  const [copied, setCopied] = useState(false)
  const [hasStoredPattern, setHasStoredPattern] = useState(false)
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const openPaywall = usePaywallStore((state) => state.open)
  const visiblePatterns = useMemo(() => patterns.slice(0, 2), [patterns])
  const hasScheduledPatternPaywall = useRef(false)
  const hasTriggeredDayPaywall = useRef(false)

  useEffect(() => {
    if (visiblePatterns.length === 0) return
    localStorage.setItem('pattern:last', JSON.stringify(visiblePatterns[0]))
    setHasStoredPattern(true)
  }, [visiblePatterns])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHasStoredPattern(Boolean(localStorage.getItem('pattern:last')))
  }, [])

  useEffect(() => {
    if (visiblePatterns.length === 0 || hasScheduledPatternPaywall.current) return
    hasScheduledPatternPaywall.current = true
    const timer = window.setTimeout(() => {
      openPaywall('pattern_detected')
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [openPaywall, visiblePatterns])

  useEffect(() => {
    if (!shouldTriggerPaywallByDays(daysUsed) || hasTriggeredDayPaywall.current) return
    hasTriggeredDayPaywall.current = true
    openPaywall('day_3')
  }, [daysUsed, openPaywall])

  if (visiblePatterns.length === 0) return null

  const handleShare = async () => {
    const text = buildShareText(visiblePatterns)
    void trackFrontendEvent({
      type: 'share_click',
      source: 'web',
      state: activeSphere,
      payload: { patterns: visiblePatterns.map((pattern) => pattern.type) },
    })

    if (navigator.share) {
      try {
        await navigator.share({ text })
        window.setTimeout(() => openPaywall('pattern_detected'), 1000)
        return
      } catch {
        // fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
    window.setTimeout(() => openPaywall('pattern_detected'), 1000)
  }

  const handleChange = () => {
    onFocusSphere?.(activeSphere)
    onScrollToDaily?.()
  }

  return (
    <>
      <section className="glass-card rounded-[28px] border border-[var(--border-primary)] bg-[linear-gradient(180deg,rgba(42,77,155,0.2),rgba(10,16,31,0.94))] p-5 shadow-[0_24px_64px_rgba(8,15,32,0.38)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
          Твій сценарій
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {visiblePatterns.map((pattern) => (
            <p key={pattern.type} className="text-lg font-semibold leading-7 text-white">
              {pattern.message}
            </p>
          ))}
        </div>

        <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
            Це б&apos;є по:
          </p>
          <p className="mt-2 text-sm leading-6 text-white/74">
            {impacts.length > 0 ? impacts.join(', ') : 'Найближчих сферах системи'}
          </p>
        </div>

        {hasStoredPattern ? (
          <p className="mt-4 text-sm font-medium text-white/56">
            Твій сценарій досі тут
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleShare} className="h-11 flex-1">
            {copied ? 'Скопійовано' : 'Поділитись'}
          </Button>
          <Button onClick={handleChange} className="hero-cta-primary h-11 flex-1">
            Змінити це
          </Button>
        </div>
      </section>

      <PaywallModal />
    </>
  )
}
