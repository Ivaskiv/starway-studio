// frontend/src/features/producer/services/producer.api.ts

import type { AdTexts, HeroVariant } from '@/features/ai-generator/types/ai-generator.types'
import type { AssistantProgressDTO } from '@/features/assistant/types/assistant.types'
import type { BannerCopy, ContentPlanDay, EmailItem, ReelsScript } from '@/features/producer/types'
import { api } from '@/services/api'

// ── Типи відповідей ───────────────────────────────────────────────────────────

export interface SEOResult {
  title:       string
  description: string
  h1:          string
  h2:          string[]
  keywords:    string[]
  faq:         Array<{ q: string; a: string }>
}

export interface TargetingAudience {
  name:                 string
  age:                  string
  interests:            string[]
  pain:                 string
  desire:               string
  adText:               string
  budgetRecommendation: string
}

export interface TargetingResult {
  audiences:       TargetingAudience[]
  bestPostingTime: string
  topAngle:        string
}

export interface FunnelHealthResult {
  health:            'good' | 'needs_attention' | 'critical'
  bottleneck:        string
  currentConversion: number
  benchmark:         number
  dropoffRate:       number
  recommendations:   string[]
  urgentAction:      string
  readyTexts: {
    day3Email?: string
    day7Push?:  string
    retarget?:  string
  }
}

export interface WeeklyReportResult {
  userId:    string
  productId?: string
  weekStart: string
  weekEnd:   string
  metrics: {
    newEntries:    number
    avgWheelScore: number | null
    streakDays:    number
    totalSessions: number
  }
  heroVariants: HeroVariant[]
  analysis:     string
  adTexts:      AdTexts
}

// ── API ───────────────────────────────────────────────────────────────────────

export const producerApi = api.injectEndpoints({
  endpoints: builder => ({

    generateSEO: builder.mutation<{ success: true; seo: SEOResult }, {
      productId: string
      pageType:  'landing' | 'product' | 'blog' | 'funnel'
      keyword?:  string
    }>({
      query: body => ({ url: '/producer/seo', method: 'POST', body }),
    }),

    generateTargeting: builder.mutation<{ success: true; targeting: TargetingResult }, {
      productId: string
    }>({
      query: body => ({ url: '/producer/targeting', method: 'POST', body }),
    }),

    analyzeFunnel: builder.mutation<{ success: true; funnel: FunnelHealthResult }, {
      productId: string
    }>({
      query: body => ({ url: '/producer/funnel', method: 'POST', body }),
    }),

    getWeeklyReport: builder.query<WeeklyReportResult, { productId?: string }>({
      query: ({ productId }) => ({
        url:    '/mentor/weekly-report',
        params: productId ? { productId } : {},
      }),
      providesTags: ['WeeklyReport'],
    }),

    generateHero: builder.mutation<{ success: true; variants: HeroVariant[] }, {
      niche:          string
      targetAudience: string
      utp:            string
      tone?:          'serious' | 'inspiring' | 'provocative' | 'soft'
      language?:      'uk' | 'en'
    }>({
      query: body => ({ url: '/ai-generator/hero', method: 'POST', body }),
    }),

    generateAds: builder.mutation<{ success: true; ads: AdTexts }, {
      niche:          string
      targetAudience: string
      heroHeadline:   string
      language?:      'uk' | 'en'
    }>({
      query: body => ({ url: '/ai-generator/ads', method: 'POST', body }),
    }),

    getAssistantProgress: builder.query<AssistantProgressDTO, void>({
      query: () => '/producer/assistant-progress',
      providesTags: ['AssistantProgress'],
    }),

    generateProducerPlan: builder.mutation<
  { result: string },
  { name: string; audience: string; transformation: string; format: string; uniqueness: string }
>({
  query: (body) => ({
    url: '/mentor/producer-chat',
    method: 'POST',
    body: {
      message: buildProducerPlanPrompt(body),
    },
  }),
}),
    generateContentFactory: builder.mutation<
      | { success: true; type: 'banner_copy'; result: BannerCopy[] }
      | { success: true; type: 'content_plan'; result: ContentPlanDay[] }
      | { success: true; type: 'reels_script'; result: ReelsScript }
      | { success: true; type: 'email_series'; result: EmailItem[] }
      ,
      {
        type:           'content_plan' | 'reels_script' | 'email_series' | 'banner_copy'
        productName:    string
        expertName:     string
        targetAudience: string
        transformation: string
        funnelUrl:      string
        tone?:          'direct' | 'emotional' | 'provocative'
        days?:          number
        emailCount?:    number
      }
    >({
      query: body => ({ url: '/producer/content-factory', method: 'POST', body }),
    }),
    sendProducerMessage: builder.mutation<
  { result: string },
  { messages: { role: 'user' | 'assistant'; content: string }[]; stepContext?: string }
>({
  query: ({ messages, stepContext }) => {
    const lastIndex = Math.max(0, messages.length - 1);
    const lastMessage = messages[lastIndex];
    const messageText = lastMessage ? lastMessage.content : '';
    return {
      url: '/mentor/producer-chat',
      method: 'POST',
      body: {
        message:  messageText,
        history:  messages.slice(0, -1),
        context:  stepContext,
      },
    }
  },
}),

  }),
})

export const {
  useGenerateProducerPlanMutation,
  useSendProducerMessageMutation,
  useGenerateSEOMutation,
  useGenerateTargetingMutation,
  useAnalyzeFunnelMutation,
  useGetWeeklyReportQuery,
  useGenerateHeroMutation,
  useGenerateAdsMutation,
  useGenerateContentFactoryMutation,
  useGetAssistantProgressQuery,
} = producerApi

function buildProducerPlanPrompt(d: {
  name: string; audience: string; transformation: string; format: string; uniqueness: string
}): string {
  return `Створи повний покроковий план AI-ментора:

Назва: ${d.name}
Аудиторія: ${d.audience}
Трансформація: ${d.transformation}
Формат та ціна: ${d.format}
Унікальність: ${d.uniqueness}

Структура відповіді:
1. 🎯 КОНЦЕПЦІЯ (2-3 речення суті)
2. ☯️ ДІАГНОСТИКА (5 вхідних питань)
3. 🔄 7-ДЕННА ВОРОНКА (день за днем)
4. 📱 TELEGRAM БОТ (команди + розклад)
5. 📊 PDF-ЗВІТ (9 розділів)
6. 💎 МОНЕТИЗАЦІЯ (тарифи + оффер)
7. 📣 ПЕРШИЙ ПОСТ ДЛЯ TELEGRAM (готовий текст)

Давай готові тексти, не описи.`
}
