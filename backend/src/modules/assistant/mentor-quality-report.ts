import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { MentorCategory } from './mentor-quality-dataset.js'

export type MentorQualityScenarioRecord = Readonly<{
  id: string
  category: MentorCategory
  transportCount: number
  transportParity: boolean
  addressedUserQuestion: boolean
  supportiveTone: boolean
  methodologyStageCovered: boolean
  techniqueCovered: boolean
  nextActionMatched: boolean
  hallucinationFree: boolean
  businessRulesCorrect: boolean
  memoryConsistent: boolean
  latencyMs: number
}>

export type MentorQualityMetricKey =
  | 'coachingAccuracy'
  | 'methodologyAccuracy'
  | 'memoryConsistency'
  | 'decisionAccuracy'
  | 'hallucinationRate'
  | 'fallbackRate'
  | 'responseLatency'

export type MentorQualityReport = Readonly<{
  generatedAt: string
  summary: {
    totalConversations: number
    totalCategories: number
    transportsPerConversation: number
  }
  thresholds: Record<MentorQualityMetricKey, number>
  metrics: Record<MentorQualityMetricKey, number>
  categoryBreakdown: Record<MentorCategory, { total: number; passed: number }>
}>

const DEFAULT_THRESHOLDS: Record<MentorQualityMetricKey, number> = {
  coachingAccuracy: 0.95,
  methodologyAccuracy: 0.95,
  memoryConsistency: 0.95,
  decisionAccuracy: 0.95,
  hallucinationRate: 0.05,
  fallbackRate: 0.1,
  responseLatency: 1000,
}

function ratio(passed: number, total: number): number {
  if (total <= 0) return 0
  return Number((passed / total).toFixed(4))
}

function average(values: readonly number[]): number {
  if (!values.length) return 0
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
}

export function createMentorQualityReport(input: {
  records: readonly MentorQualityScenarioRecord[]
  fallbackCount: number
}): MentorQualityReport {
  const { records, fallbackCount } = input
  const totalConversations = records.length
  const categoryBreakdown = records.reduce<Record<MentorCategory, { total: number; passed: number }>>((acc, record) => {
    const current = acc[record.category] ?? { total: 0, passed: 0 }
    const passed =
      record.transportParity
      && record.addressedUserQuestion
      && record.supportiveTone
      && record.methodologyStageCovered
      && record.techniqueCovered
      && record.nextActionMatched
      && record.hallucinationFree
      && record.businessRulesCorrect
      && record.memoryConsistent

    acc[record.category] = {
      total: current.total + 1,
      passed: current.passed + (passed ? 1 : 0),
    }
    return acc
  }, {} as Record<MentorCategory, { total: number; passed: number }>)

  const metrics: Record<MentorQualityMetricKey, number> = {
    coachingAccuracy: ratio(
      records.filter((record) => record.addressedUserQuestion && record.supportiveTone && record.nextActionMatched).length,
      totalConversations,
    ),
    methodologyAccuracy: ratio(
      records.filter((record) => record.methodologyStageCovered && record.techniqueCovered).length,
      totalConversations,
    ),
    memoryConsistency: ratio(
      records.filter((record) => record.memoryConsistent).length,
      totalConversations,
    ),
    decisionAccuracy: ratio(
      records.filter((record) => record.transportParity && record.nextActionMatched && record.businessRulesCorrect).length,
      totalConversations,
    ),
    hallucinationRate: ratio(
      records.filter((record) => !record.hallucinationFree).length,
      totalConversations,
    ),
    fallbackRate: ratio(fallbackCount, totalConversations),
    responseLatency: average(records.map((record) => record.latencyMs)),
  }

  const categories = Object.keys(categoryBreakdown) as MentorCategory[]

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalConversations,
      totalCategories: categories.length,
      transportsPerConversation: records[0]?.transportCount ?? 0,
    },
    thresholds: DEFAULT_THRESHOLDS,
    metrics,
    categoryBreakdown,
  }
}

export function writeMentorQualityReport(report: MentorQualityReport, outputFilePath: string): void {
  mkdirSync(path.dirname(outputFilePath), { recursive: true })
  writeFileSync(outputFilePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}
