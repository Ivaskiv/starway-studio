import { useEffect, useMemo, useState } from 'react'

export type DnaGenerationMode = 'FAST' | 'BALANCED' | 'PREMIUM'

export interface DnaHistoryEntry {
  id: string
  createdAt: string
  mode: DnaGenerationMode
  protocol: string
  format: string
  pain: string
  goal: string
  content: string
  truthScore: number
  validationState: 'clean' | 'warning'
  model: string
  provider: string
}

const HISTORY_LIMIT = 40
const STORAGE_KEY = 'dna-starway-history'

function tokenizePain(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3)
}

export function useDnaGenerationHistory() {
  const [history, setHistory] = useState<DnaHistoryEntry[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as DnaHistoryEntry[]
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, HISTORY_LIMIT))
    } catch (error) {
      console.warn('[DNA][history] failed to read storage', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.warn('[DNA][history] failed to write storage', error)
    }
  }, [history])

  const addEntry = (entry: DnaHistoryEntry) => {
    setHistory((current) => [entry, ...current].slice(0, HISTORY_LIMIT))
  }

  const winningFormulas = useMemo(
    () => history.filter((entry) => entry.truthScore >= 85).slice(0, 6),
    [history],
  )

  const painPatterns = useMemo(() => {
    const freq = new Map<string, number>()
    for (const entry of history) {
      for (const token of tokenizePain(entry.pain)) {
        freq.set(token, (freq.get(token) ?? 0) + 1)
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([token, hits]) => ({ token, hits }))
  }, [history])

  return {
    history,
    addEntry,
    winningFormulas,
    painPatterns,
  }
}
