import { anthropic } from '@starway/ai/providers'
import { MODEL_STRATEGY, type ModelStrategyTier } from '@starway/ai/providers/models'
import {
  buildAiUsageEstimate,
  calculateAiCostUsd,
  getCostTier,
  resolveAiMaxOutputTokens,
  type AiCostTelemetry,
} from '@starway/ai/providers/pricing'
import type { ModelGenerationResult } from '@starway/ai/types/salesAssistant.types'
import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import { normalizeProviderError } from '@/modules/ai-assistant/utils/normalizeProviderError.js'
import { sendAdminAlert } from '@/modules/sales-assistant/sales-assistant.alert.js'
import { SalesAssistantGenerateBody } from '@/modules/sales-assistant/sales-assistant.types.js'
import { normalizeProviderAlias } from '@/modules/sales-assistant/sales-assistant.helpers.js'
import { PROMPT_PREVIEW_CHARS } from '@/modules/sales-assistant/sales-assistant.constants.js'

// ─── model name resolvers ─────────────────────────────────────────────────────
export function getProviderModelName(provider: ModelProvider, tier: ModelStrategyTier): string {
  const strategy = MODEL_STRATEGY[tier]
  if (provider === 'claude') return strategy.anthropic
  if (provider === 'gemini') return strategy.gemini
  return strategy.openai
}

export function resolveGeminiModelName(tier: ModelStrategyTier): string {
  const configured = process.env.GEMINI_MODEL?.trim()
  if (!configured) return getProviderModelName('gemini', tier)
  const normalized = configured.replace(/^models\//, '')
  if (normalized.startsWith('gemini-1.5')) {
    const fallback = getProviderModelName('gemini', tier)
    console.warn('[DNA][gemini][MODEL_LEGACY_FALLBACK]', { configured, fallback })
    return fallback
  }
  return normalized
}

// ─── human error messages ─────────────────────────────────────────────────────
export function resolveHumanErrorMessage(
  norm: ReturnType<typeof normalizeProviderError>
): string {
  const lower = norm.message.toLowerCase()
  if (lower.includes('credit balance') || lower.includes('credit_balance_too_low'))
    return 'Баланс токенів вичерпано. Поповни рахунок у кабінеті провайдера.'
  if (norm.code === 'QUOTA_EXCEEDED')
    return 'Денний ліміт вичерпано. Claude — єдиний активний провайдер.'
  if (norm.code === 'RATE_LIMITED')
    return 'Забагато запитів. Зачекай 60 сек та спробуй знову.'
  if (norm.status === 401)
    return 'API ключ недійсний або відсутній. Перевір .env'
  if (norm.status === 503 || norm.status === 529)
    return 'Провайдер перевантажений. Спробуй через 2–3 хвилини.'
  return 'AI тимчасово недоступний. Claude — єдиний активний провайдер.'
}

// ─── enabled providers resolver ──────────────────────────────────────────────
export function resolveEnabledProviders(
  requested: ModelProvider[],
  body: SalesAssistantGenerateBody
): ModelProvider[] {
  if (body.provider) {
    const normalized = normalizeProviderAlias(body.provider)
    return normalized === 'claude' ? [normalized] : ['claude']
  }
  return requested.length > 0 ? requested.filter((provider) => provider === 'claude') : ['claude']
}

// ─── raw provider call ────────────────────────────────────────────────────────
export async function callProvider(
  provider: ModelProvider,
  systemPrompt: string,
  userRequest: string,
  options: { contentType: string; strategyTier: ModelStrategyTier },
): Promise<{ result: string; tokensUsed: number; usage: AiCostTelemetry }> {
  const maxTokens = resolveAiMaxOutputTokens(options.contentType)
  const modelName = getProviderModelName(provider, options.strategyTier)
  const isDev = process.env.NODE_ENV !== 'production'
  const estimate = buildAiUsageEstimate({
    model: modelName, promptText: systemPrompt,
    userText: userRequest, maxOutputTokens: maxTokens,
  })

  if (provider === 'claude') {
    if (isDev) console.info('[DNA][claude][CALL]', { model: modelName })
    const response = await anthropic.messages.create({
      model: modelName, max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userRequest }],
    })
    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const actualCostUsd = calculateAiCostUsd(modelName, inputTokens, outputTokens)
    console.info('[DNA][claude][SUCCESS]', { tokens: inputTokens + outputTokens, actualCostUsd, ...(isDev && { preview: text.slice(0, PROMPT_PREVIEW_CHARS) }) })
    return { result: text, tokensUsed: inputTokens + outputTokens, usage: { provider, model: modelName, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCostUsd: estimate.estimatedCostUsd, actualCostUsd, costTier: getCostTier(actualCostUsd || estimate.estimatedCostUsd) } }
  }

  // OpenAI тимчасово вимкнено
  // if (provider === 'gpt') {
  //   if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing.')
  //   if (isDev) console.info('[DNA][openai][CALL]', { model: modelName })
  //   const response = await openai.chat.completions.create({
  //     model: modelName, max_tokens: maxTokens,
  //     messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userRequest }],
  //   })
  //   const text = response.choices[0]?.message?.content ?? ''
  //   const inputTokens = response.usage?.prompt_tokens ?? estimate.inputTokens
  //   const outputTokens = response.usage?.completion_tokens ?? estimateTokensFromGeneratedText(text)
  //   const totalTokens = response.usage?.total_tokens ?? inputTokens + outputTokens
  //   const actualCostUsd = calculateAiCostUsd(modelName, inputTokens, outputTokens)
  //   console.info('[DNA][openai][SUCCESS]', { tokens: totalTokens, actualCostUsd, ...(isDev && { preview: text.slice(0, PROMPT_PREVIEW_CHARS) }) })
  //   return { result: text, tokensUsed: totalTokens, usage: { provider, model: modelName, inputTokens, outputTokens, totalTokens, estimatedCostUsd: estimate.estimatedCostUsd, actualCostUsd, costTier: getCostTier(actualCostUsd || estimate.estimatedCostUsd) } }
  // }

  // Gemini тимчасово вимкнено
  // if (provider === 'gemini') {
  //   const model = resolveGeminiModelName(options.strategyTier)
  //   if (isDev) console.info('[DNA][gemini][CALL]', { model })
  //   const response = await gemini
  //     .getGenerativeModel({ model, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } })
  //     .generateContent({ contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userRequest}` }] }] })
  //   const text = typeof response.response.text === 'function' ? response.response.text() : ''
  //   if (!text.trim()) throw new Error('Gemini returned empty response')
  //   const outputTokens = estimateTokensFromGeneratedText(text)
  //   const actualCostUsd = calculateAiCostUsd(model, estimate.inputTokens, outputTokens)
  //   console.info('[DNA][gemini][SUCCESS]', { resultLength: text.length, ...(isDev && { preview: text.slice(0, PROMPT_PREVIEW_CHARS) }) })
  //   return { result: text, tokensUsed: estimate.inputTokens + outputTokens, usage: { provider, model, inputTokens: estimate.inputTokens, outputTokens, totalTokens: estimate.inputTokens + outputTokens, estimatedCostUsd: estimate.estimatedCostUsd, actualCostUsd, costTier: getCostTier(actualCostUsd || estimate.estimatedCostUsd) } }
  // }

  throw new Error(`PROVIDER_DISABLED:${provider}`)
}

// ─── safe parallel wrapper ────────────────────────────────────────────────────
export async function callProviderSafe(
  provider: ModelProvider,
  systemPrompt: string,
  userRequest: string,
  options: { contentType: string; strategyTier: ModelStrategyTier },
): Promise<ModelGenerationResult> {
  const callStart = Date.now()
  try {
    const res = await callProvider(provider, systemPrompt, userRequest, options)
    return { modelKey: provider, content: res.result, usage: res.usage, error: null, durationMs: Date.now() - callStart }
  } catch (rawError) {
    const norm = normalizeProviderError(rawError, provider)
    void sendAdminAlert(norm) // фоново, не блокує
    console.error('[DNA][parallel] provider failed', { provider, code: norm.code, status: norm.status, durationMs: Date.now() - callStart })
    return {
      modelKey: provider,
      content: null,
      usage: null,
      error: { status: norm.status, code: norm.code, message: resolveHumanErrorMessage(norm), isFatal: norm.status === 401 || norm.status === 403 },
      durationMs: Date.now() - callStart,
    }
  }
}
