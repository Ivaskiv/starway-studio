import Anthropic from '@anthropic-ai/sdk'
import { calculateAiCostUsd } from '@starway/ai/providers/pricing'
import { assertWithinDailyAiBudget,reconcileAiSpend } from '@starway/ai/providers/spendGuard'

import type { DailyCoachBriefingData } from './daily/index.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
const JOB_KEY = 'coach-daily-briefing'
const DAILY_CAP_USD = Number(process.env.AI_DAILY_BRIEFING_CAP_USD ?? '2')

export type AiBriefingInsights = {
  weakestBlock: string
  bestConversion: string
  attentionNeeded: string
  slippingProduct: string
  coachPrompt: string
}

function buildPrompt(snapshot: DailyCoachBriefingData): string {
  return `Ти аналітик SaaS-воронки. Ось реальні цифри за сьогодні у форматі JSON. Дай короткий, конкретний аналіз українською, без води, без вигаданих чисел — тільки з тих, що надані.

${JSON.stringify(snapshot, null, 2)}

Відповідь рівно у форматі (без markdown, без пояснень зверху):
WEAKEST_BLOCK: <одне речення, який етап воронки втрачає найбільше і чому>
BEST_CONVERSION: <одне речення, що працює найкраще>
ATTENTION: <одне речення, на що звернути увагу сьогодні>
SLIPPING_PRODUCT: <одне речення, який продукт просідає, або "недостатньо даних">
COACH_PROMPT: <одне коротке практичне питання чи дія коучу на сьогодні>`
}

function parseInsights(text: string): AiBriefingInsights | null {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const get = (prefix: string) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim()

  const weakestBlock = get('WEAKEST_BLOCK:')
  const bestConversion = get('BEST_CONVERSION:')
  const attentionNeeded = get('ATTENTION:')
  const slippingProduct = get('SLIPPING_PRODUCT:')
  const coachPrompt = get('COACH_PROMPT:')

  if (!weakestBlock || !bestConversion || !attentionNeeded || !slippingProduct || !coachPrompt) {
    return null
  }

  return { weakestBlock, bestConversion, attentionNeeded, slippingProduct, coachPrompt }
}

export async function generateAiBriefingInsights(
  snapshot: DailyCoachBriefingData,
): Promise<AiBriefingInsights | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey || apiKey === 'SET') return null

  try {
    const prompt = buildPrompt(snapshot)
    const roughEstimateUsd = calculateAiCostUsd(MODEL, Math.ceil(prompt.length / 4), 400)
    await assertWithinDailyAiBudget(JOB_KEY, roughEstimateUsd, DAILY_CAP_USD)

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const actualCostUsd = calculateAiCostUsd(MODEL, response.usage.input_tokens, response.usage.output_tokens)
    await reconcileAiSpend(JOB_KEY, roughEstimateUsd, actualCostUsd).catch(() => undefined)

    const textParts = response.content.filter((part) => part.type === 'text').map((part) => part.text)
    return parseInsights(textParts.join('\n'))
  } catch {
    return null
  }
}
