import type { ReactNode } from 'react'

export type MarketingCardKey = 'seo' | 'hook' | 'aida' | 'headline'

export type MarketingCardConfig = {
  key: MarketingCardKey
  icon: string
  title: string
  sphere: string
  xp: number
  why: string
  steps: string[]
  buttonLabel: string
  generated: string[]
}

export type MetricInfo = {
  label: string
  description: string
  instruction: string
}

export type ProducerMetric = {
  key: string
  icon: ReactNode
  title: string
  label: string
  accent: string
  tone: 'cyan' | 'orange' | 'green' | 'violet'
  info: MetricInfo
}

export type ProducerProduct = {
  id?: string
  title?: string | null
  name?: string | null
  description?: string | null
}
