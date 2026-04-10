import { useMemo } from 'react'

import type { AnalyticsFunnel, AnalyticsInsights, AnalyticsOverview } from '../../analytics/types/types'
import { CAMPAIGN_PRODUCT_OPTIONS, CTA_DESTINATION_OPTIONS, FORMAT_OPTIONS, FORMULA_CARDS, RESEARCH_CAMPAIGN_CARDS, RESEARCH_HOOK_OPTIONS } from '../config/contentStudio.config'
import { buildContentStudioFunnelInsight } from '../utils/contentStudio.funnel'
import { dedupeContentItems, estimateLaunchPotential, normalizeFormulaKey } from '../utils/contentTransforms'
import { buildContentStudioAIStrategy, makeContentStudioStrategyFingerprint } from '../utils/contentStudio.strategy'
import type { ContentItemType, ContentStudioInputs, ContentStudioItem, MarketResearchPayload } from '../types/contentStudio.types'

const INSIGHT_CATEGORY_LABELS: Record<string, string> = {
  finance: 'Фінанси',
  finances: 'Фінанси',
  money: 'Фінанси',
  budget: 'Фінанси',
  cashflow: 'Фінанси',
  income: 'Фінанси',
  business: 'Бізнес',
  content: 'Контент',
  sales: 'Продажі',
  marketing: 'Маркетинг',
  traffic: 'Трафік',
  procrastination: 'Прокрастинація',
  structure: 'Структура',
  system: 'Система',
  health: 'Здоров’я',
  energy: 'Енергія',
}

function normalizeInsightLabel(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (!normalized) return 'Невідомо'

  const compact = normalized.replace(/\s+/g, '')
  const mapped = INSIGHT_CATEGORY_LABELS[compact] ?? INSIGHT_CATEGORY_LABELS[normalized]
  if (mapped) return mapped

  return normalized
    .split(/\s+/)
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join(' ')
}

function normalizeResearchHookText(value: string, type?: string) {
  const text = value.trim()
  const lower = text.toLowerCase()
  if (!text) return 'Тобі знайоме це відчуття?'
  if (lower.includes('вона написала')) return 'Тобі знайоме це відчуття о 23:58?'
  if (lower.includes('ти не лінива') && lower.includes('перевантаж')) return 'Ти не лінива. Ти просто тримаєш усе на собі.'
  if (lower.includes('74%') || lower.includes('31%')) return 'Коли руху нема, цифри показують де саме ламається шлях.'
  if (lower.includes('більшість кидають') || lower.includes('більшість здаються')) return 'Більшість здаються. Ось що допомагає не зірватися.'
  if (type === 'reframe') return 'Ти не лінива. Ти просто тримаєш усе на собі.'
  if (type === 'story') return 'Тобі знайоме це відчуття о 23:58?'
  if (type === 'data') return 'Коли руху нема, цифри показують де саме ламається шлях.'
  if (type === 'curiosity') return 'Більшість здаються. Ось що допомагає не зірватися.'
  return text
}

export function useContentStudioDerived(params: {
  myProducts: Array<{ title?: string | null; name?: string | null; includesTrial?: boolean; trialDays?: number | null }>
  items: ContentStudioItem[]
  inputs: ContentStudioInputs
  activeGroup: ContentItemType
  selectedFormats: string[]
  ctaDestination: string[]
  ctaType: string
  aiInsightOverride?: string
  marketResearch: MarketResearchPayload | null
  analyticsInsights: AnalyticsInsights | null
  analyticsOverview: AnalyticsOverview | null
  analyticsFunnel: AnalyticsFunnel | null
  lastResearchUpdatedAt: Date | null
}) {
  const { myProducts, items, inputs, activeGroup, selectedFormats, ctaDestination, ctaType, aiInsightOverride, marketResearch, analyticsInsights, analyticsOverview, analyticsFunnel, lastResearchUpdatedAt } = params
  const activeItems = useMemo(() => dedupeContentItems(items.filter((item) => item.type === activeGroup)), [activeGroup, items])
  const approvedItems = useMemo(() => items.filter((item) => item.status === 'approved'), [items])
  const publishedItems = useMemo(() => items.filter((item) => item.status === 'published'), [items])
  const adItems = useMemo(() => dedupeContentItems(items.filter((item) => item.type === 'ad')), [items])
  const draftItems = useMemo(() => items.filter((item) => item.status === 'draft'), [items])
  const summary = useMemo(() => ({ total: items.length, approved: approvedItems.length, published: publishedItems.length, draft: draftItems.length }), [approvedItems.length, draftItems.length, items.length, publishedItems.length])
  const activeSummary = useMemo(() => ({ total: activeItems.length, approved: activeItems.filter((item) => item.status === 'approved').length, published: activeItems.filter((item) => item.status === 'published').length }), [activeItems])
  const payloadReadyCount = useMemo(() => items.filter((item) => Boolean(item.telegramPayload)).length, [items])
  const dmReadyCount = useMemo(() => items.filter((item) => Boolean(item.dmEntry)).length, [items])
  const trialCtaCount = useMemo(() => items.filter((item) => { const cta = item.cta?.toLowerCase() ?? ''; return cta.includes('start') || cta.includes('trial') || cta.includes('7') }).length, [items])
  const audioReadyCount = useMemo(() => items.filter((item) => item.audioReady).length, [items])
  const reelsReadyCount = useMemo(() => items.filter((item) => item.status === 'approved' || item.status === 'published').length, [items])
  const launchPotential = useMemo(() => estimateLaunchPotential(items), [items])
  const dominantGoalLabel = useMemo(() => (inputs.goal[0] ?? 'sale') === 'traffic' ? 'Трафік' : (inputs.goal[0] ?? 'sale') === 'warmup' ? 'Прогрів' : 'Продаж', [inputs.goal])
  const campaignProductOptions = useMemo(() => { const dynamic = myProducts.map((product) => { const baseName = product.title?.trim() || product.name?.trim(); if (!baseName) return null; return product.includesTrial && (product.trialDays ?? 0) > 0 ? `${baseName} · ${product.trialDays}-денний Trial` : baseName }).filter((value): value is string => Boolean(value)); return dynamic.length > 0 ? dynamic : [...CAMPAIGN_PRODUCT_OPTIONS] }, [myProducts])
  const campaignProductValue = useMemo(() => inputs.product[0] ?? campaignProductOptions[0] ?? 'ABsystem · 7-денний Trial та підписка', [campaignProductOptions, inputs.product])
  const contextAudienceText = useMemo(() => inputs.audience.join('\n'), [inputs.audience])
  const contextPainText = useMemo(() => inputs.pain.join('\n'), [inputs.pain])
  const leadAudience = useMemo(() => inputs.audience[0]?.trim() || 'потрібна структура', [inputs.audience])
  const leadPain = useMemo(() => inputs.pain[0]?.trim() || 'немає продажів, нових користувачів і підписок', [inputs.pain])
  const leadProduct = useMemo(() => inputs.product[0]?.trim() || campaignProductValue, [campaignProductValue, inputs.product])
  const leadGoal = useMemo(() => inputs.goal[0] ?? 'sale', [inputs.goal])
  const leadFormats = useMemo(() => selectedFormats.length > 0 ? selectedFormats : ['reels'], [selectedFormats])
  const leadDestinations = useMemo(() => ctaDestination.length > 0 ? ctaDestination : ['telegram_bot'], [ctaDestination])
  const aiStrategy = useMemo(() => buildContentStudioAIStrategy({
    inputs,
    analyticsInsights,
    analyticsOverview,
    analyticsFunnel,
    trackingIntegrity: analyticsInsights?.trackingIntegrity ?? null,
  }), [analyticsFunnel, analyticsInsights, analyticsOverview, inputs])
  const topCategory = analyticsInsights?.topCategories?.[0] ?? null
  const topCategoryTotal = analyticsInsights?.topCategories?.reduce((sum, item) => sum + item.count, 0) ?? 0
  const topCategoryShare = topCategory && topCategoryTotal > 0 ? Math.round((topCategory.count / topCategoryTotal) * 100) : null
  const topProblem = analyticsInsights?.topProblems?.[0] ?? null
  const topProblemTotal = analyticsInsights?.topProblems?.reduce((sum, item) => sum + item.count, 0) ?? 0
  const topProblemShare = topProblem && topProblemTotal > 0 ? Math.round((topProblem.count / topProblemTotal) * 100) : null
  const topCategoryLabel = topCategory ? normalizeInsightLabel(topCategory.label) : null
  const topProblemLabel = topProblem?.label?.trim() || null
  const destinationLabel = leadDestinations.map((value) => {
    const option = CTA_DESTINATION_OPTIONS.find((item) => item.value === value)
    return option?.label
  }).filter(Boolean).join(' / ')
  const funnelInsight = useMemo(() => buildContentStudioFunnelInsight(analyticsFunnel), [analyticsFunnel])
  const hookScoreContext = useMemo(() => {
    const categoryScore = topCategoryShare ?? 50
    const problemScore = topProblemShare ?? 50
    const formatScore = leadFormats.some((value) => value === 'stories' || value === 'dm') ? 60 : 45
    const destinationScore = leadDestinations.some((value) => value === 'telegram_bot' || value === 'landing') ? 62 : 48
    const goalScore = leadGoal === 'traffic' ? 58 : leadGoal === 'warmup' ? 54 : 64
    const typeScore = ctaType === 'DM' ? 60 : ctaType === 'TRY_NOW' ? 67 : ctaType === 'GET_ACCESS' ? 63 : 57
    const blended = Math.round((categoryScore * 0.28) + (problemScore * 0.24) + (formatScore * 0.16) + (destinationScore * 0.16) + (goalScore * 0.08) + (typeScore * 0.08))
    return {
      categoryScore,
      problemScore,
      formatScore,
      destinationScore,
      goalScore,
      typeScore,
      blended,
      sourceLabel: topCategoryLabel ? `${topCategoryLabel}${topCategoryShare !== null ? ` ${topCategoryShare}%` : ''}` : 'контекст + fallback',
    }
  }, [ctaType, leadDestinations, leadFormats, leadGoal, topCategoryLabel, topCategoryShare, topProblemShare])
  const aiInsightPreview = useMemo(() => aiInsightOverride?.trim() || aiStrategy.humanInsight, [aiInsightOverride, aiStrategy.humanInsight])
  const platformLabel = useMemo(() => { if (selectedFormats.includes('reels') && selectedFormats.includes('stories')) return 'Instagram Reels / Stories'; if (selectedFormats.length === 0) return 'Instagram Reels'; return selectedFormats.map((value) => FORMAT_OPTIONS.find((option) => option.value === value)?.label).filter(Boolean).join(' / ') }, [selectedFormats])
  const formulaCards = useMemo(() => {
    const liveFormulas = marketResearch?.formulas?.data?.formulas
    if (!liveFormulas?.length) return [...FORMULA_CARDS]

    const templateMap = new Map(FORMULA_CARDS.map((card) => [card.key, card]))
    return [...liveFormulas]
      .sort((a, b) => a.rank - b.rank)
      .map((formula) => {
        const template = templateMap.get(normalizeFormulaKey(formula.name.toUpperCase())) ?? templateMap.get('PAS')!
        return {
          ...template,
          note: [
            formula.conversionBoost > 0 ? `Конверсія +${formula.conversionBoost}%` : null,
            formula.bestFor ? formula.bestFor : null,
          ].filter(Boolean).join(' · ') || template.note,
        }
      })
      .filter(Boolean)
  }, [marketResearch?.formulas?.data?.formulas])
  const researchCampaignCards = useMemo(() => { const liveCampaigns = marketResearch?.ads?.data?.campaigns; return liveCampaigns?.length ? liveCampaigns.map((campaign) => ({ key: campaign.id, eyebrow: `${campaign.hookType} · ${campaign.platform} · ${campaign.format} · ${campaign.month}/${campaign.year}`, title: `"${campaign.hook}"`, body: campaign.description, metrics: [campaign.metric, `${campaign.formula} · ${campaign.audienceTemp}`] })) : [...RESEARCH_CAMPAIGN_CARDS] }, [marketResearch?.ads?.data?.campaigns])
  const researchHookOptions = useMemo(() => {
    const liveHooks = marketResearch?.hooks?.data?.hooks
    const scoreForHook = (key: string) => {
      const normalizedKey = key.toLowerCase()
      const base = hookScoreContext.blended
      if (normalizedKey.includes('reframe')) return Math.min(100, base + (leadPain.toLowerCase().includes('ліни') || leadPain.toLowerCase().includes('прокраст') ? 10 : 4))
      if (normalizedKey.includes('story')) return Math.min(100, base + (leadAudience.length > 22 ? 10 : 6))
      if (normalizedKey.includes('data')) return Math.min(100, base + (topCategoryShare ?? 0) + (topProblemShare ?? 0) / 4)
      if (normalizedKey.includes('curiosity')) return Math.min(100, base + (leadGoal === 'warmup' ? 9 : 5))
      if (normalizedKey.includes('question')) return Math.min(100, base + (leadDestinations.includes('dm_script') ? 10 : 6))
      if (normalizedKey.includes('contradiction')) return Math.min(100, base + (leadFormats.includes('reels') || leadFormats.includes('stories') ? 8 : 4))
      return Math.min(100, base)
    }
    const sourceHooks = liveHooks?.length
      ? liveHooks.map((hook) => ({
        key: hook.id,
        eyebrow: `${hook.type} hook`,
        title: `"${normalizeResearchHookText(hook.example, hook.type)}"`,
        body: `${hook.why} ${hook.why.toLowerCase().includes('знімає') ? 'Перший крок має бути простим і людським.' : 'Починаємо з впізнавання стану і ведемо до простого наступного кроку.'}`,
        footer: hook.ctrBoost > 0 ? `CTR boost +${hook.ctrBoost}% · fit ${scoreForHook(hook.type)}%` : `Watch time +${hook.watchTimeBoost}% · fit ${scoreForHook(hook.type)}%`,
      }))
      : RESEARCH_HOOK_OPTIONS.map((hook) => {
        const contextualTitle = hook.key === 'reframe'
          ? '"Ти не лінива. Ти просто тримаєш усе на собі."'
          : hook.key === 'story'
            ? '"Тобі знайоме це відчуття о 23:58?"'
            : hook.key === 'data'
              ? '"Коли руху нема, цифри показують де саме ламається шлях."'
              : hook.key === 'curiosity'
                ? '"Більшість здаються. Ось що допомагає не зірватися."'
                : hook.title
        const contextualBody = hook.key === 'reframe'
          ? `Починаємо з ${leadPain} так, щоб людина впізнала себе і побачила перший простий крок.`
          : hook.key === 'story'
            ? `Зшиваємо знайомий момент ${leadAudience} з відчуттям, що далі має бути простіше, а не складніше.`
            : hook.key === 'data'
              ? `Опора на аналітику: ${topCategoryLabel ?? 'категорію'}${topCategoryShare !== null ? ` (${topCategoryShare}%)` : ''}, головний біль ${topProblemLabel ?? leadPain} і зрозумілий наступний крок.`
              : hook.key === 'curiosity'
                ? `Відкриваємо петлю через ${leadPain} і ведемо до відчуття, що рішення уже поруч.`
                : hook.body
        return {
          ...hook,
          title: contextualTitle,
          body: contextualBody,
          footer: `${hook.footer} · fit ${scoreForHook(hook.key)}%`,
        }
      })

    return [...sourceHooks].sort((a, b) => {
      const aScore = a.footer.includes('fit') ? Number((a.footer.match(/fit (\d+)%/)?.[1] ?? 0)) : 0
      const bScore = b.footer.includes('fit') ? Number((b.footer.match(/fit (\d+)%/)?.[1] ?? 0)) : 0
      return bScore - aScore
    })
  }, [ctaType, destinationLabel, hookScoreContext.blended, leadAudience, leadDestinations, leadGoal, leadPain, leadProduct, marketResearch?.hooks?.data?.hooks, topCategoryLabel, topCategoryShare, topProblemLabel, topProblemShare])
  const researchUpdatedLabel = useMemo(() => (lastResearchUpdatedAt ?? new Date()).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }), [lastResearchUpdatedAt])
  const hooksResearchMeta = marketResearch?.hooks ?? null
  const researchSourceLabel = !hooksResearchMeta ? 'Шаблон' : hooksResearchMeta.source === 'fallback' ? 'Fallback' : hooksResearchMeta.source === 'cache' ? 'Кеш' : 'OpenAI'
  const aiStrategyFingerprint = useMemo(() => makeContentStudioStrategyFingerprint(aiStrategy), [aiStrategy])
  return { activeItems, approvedItems, publishedItems, adItems, draftItems, summary, activeSummary, payloadReadyCount, dmReadyCount, trialCtaCount, audioReadyCount, reelsReadyCount, launchPotential, dominantGoalLabel, campaignProductOptions, campaignProductValue, contextAudienceText, contextPainText, aiInsightPreview, aiStrategy, aiStrategyFingerprint, platformLabel, formulaCards, researchCampaignCards, researchHookOptions, researchUpdatedLabel, hooksResearchMeta, researchSourceLabel, hookScoreContext, funnelInsight }
}
