// apps/web/src/features/content-studio/components/ContentStudioStepBody.tsx

import type {
  ContentStudioAIStrategy,
  ContentStudioFunnelInsight,
  ContentStudioItem,
  ContentStudioLeadMagnetPayload,
  LeadMagnet,
} from '../types/contentStudio.types'

import type {
  ContentItemType,
} from '../types/contentStudio.types'
import type { ContentStudioStep } from '../config/contentStudio.config'

import ContentStudioContextStep from './ContentStudioContextStep'
import ContentStudioLeadMagnetStep from './ContentStudioLeadMagnetStep'
import ContentStudioCtaStep from './ContentStudioCtaStep'
import ContentStudioFormulaStep from './ContentStudioFormulaStep'
import ContentStudioHookStep from './ContentStudioHookStep'
import ContentStudioApiStep from './ContentStudioApiStep'
import ContentStudioResearchStep from './ContentStudioResearchStep'
import ContentStudioTextsStep from './ContentStudioTextsStep'
import ContentStudioBannersStep from './ContentStudioBannersStep'

type Props = Partial<{
  activeStep: ContentStudioStep

  sectionTitleClass: string
  segmentClass?: string
  fieldClass: string
  stackColumnsClass?: string
  stackColumnClass?: string
  sectionCardClass?: string
  textareaClass: string

  campaignProductValue: string
  campaignProductOptions: readonly string[]
  dispatchUpdateProduct: (value: string) => void

  platform: string

  platformOptions: ReadonlyArray<{
    value: string
    label: string
  }>

  handlePlatformChange: (
    value: string
  ) => void

  contextAudienceText: string
  updateAudience: (value: string) => void

  adMessageGoal: string

  adMessageGoalOptions: ReadonlyArray<{
    value: string
    label: string
  }>

  setAdMessageGoal: (
    value: string
  ) => void

  contextPainText: string
  updatePain: (value: string) => void

  aiInsightPreview: string
  onAiInsightChange: (value: string) => void

  leadMagnetStepAdded: boolean
  leadMagnetStepDismissedFor: string | null

  onAddLeadMagnetStep: () => void

  onSkipLeadMagnetStep: (
    signature: string
  ) => void

  productLabel: string

  aiStrategy: ContentStudioAIStrategy | null

  funnelInsight: ContentStudioFunnelInsight | null

  leadMagnetDraft: LeadMagnet | null

  setLeadMagnetDraft: (
    value: LeadMagnet | null
  ) => void

  leadMagnetSelectedFormat: string

  leadMagnetConfirmations: boolean[]

  setLeadMagnetConfirmations: (
    value: boolean[]
  ) => void

  onSaveLeadMagnet: (
    payload: ContentStudioLeadMagnetPayload
  ) => Promise<unknown>

  onPublishLeadMagnet: (
    payload: ContentStudioLeadMagnetPayload
  ) => Promise<unknown>

  campaignContextSample: string

  reflection: string

  setReflection: (value: string) => void

  ctaType: string

  ctaTypeOptions: ReadonlyArray<{
    value: string
    label: string
    hint: string
  }>

  setCtaType: (
    value: string
  ) => void

  ctaDestination: string[]

  ctaDestinationOptions: ReadonlyArray<{
    value: string
    label: string
    hint: string
  }>

  setCtaDestination: (
    value: string
  ) => void

  ctaRoutingMode: string

  ctaRoutingOptions: ReadonlyArray<{
    value: string
    label: string
    hint: string
  }>

  setCtaRoutingMode: (
    value: string
  ) => void

  ctaSuggestions: readonly string[]

  selectedCtas: string[]

  handleAddCtaSuggestion: (
    value: string
  ) => void

  updateCtaField: (
    value: string
  ) => void

  formulaType: string

  setFormulaType: (
    value: string
  ) => void

  formulaCards: ReadonlyArray<{
    key: string
    badge: string
    badgeClass: string
    title: string
    description: string
    bullets: readonly {
      key: string
      text: string
    }[]
    footer: string
    note?: string
    accentClass: string
  }>

  contextHookVariants: string[]

  activeContextHookIndex: number

  canResetHookLimit: boolean

  handleResetContextHookLimit: () => void

  canRestorePreviousContext: boolean

  handleRestorePreviousContext: () => void

  handleSelectContextHookVariant: (
    index: number
  ) => void

  handlePrevContextHookVariant: () => void

  handleGenerateContextHook: () => void

  handleNextContextHookVariant: () => void

  selectedHookType: string

  selectedHookLabel: string

  setSelectedHookType: (
    value: string
  ) => void

  researchUpdatedLabel: string

  researchSourceLabel: string

  hookScoreContext: {
    blended: number
    categoryScore: number
    problemScore: number
    formatScore: number
    destinationScore: number
    goalScore: number
    typeScore: number
    sourceLabel: string
  }

  hasResearchMeta: boolean

  isFallback: boolean

  isResearchStale: boolean

  researchHookOptions: ReadonlyArray<{
    key: string
    eyebrow: string
    title: string
    body: string
    footer: string
  }>

  elevenKeyMode: 'saved' | 'manual'

  setElevenKeyMode: (
    value: 'saved' | 'manual'
  ) => void

  savedElevenKeyLabel: string

  setSavedElevenKeyLabel: (
    value: string
  ) => void

  elevenKey: string

  setElevenKey: (
    value: string
  ) => void

  voiceIdMode: 'saved' | 'manual'

  setVoiceIdMode: (
    value: 'saved' | 'manual'
  ) => void

  savedVoiceIdLabel: string

  setSavedVoiceIdLabel: (
    value: string
  ) => void

  voiceId: string

  setVoiceId: (
    value: string
  ) => void

  openAiKeyMode: 'saved' | 'manual'

  setOpenAiKeyMode: (
    value: 'saved' | 'manual'
  ) => void

  savedOpenAiKeyLabel: string

  setSavedOpenAiKeyLabel: (
    value: string
  ) => void

  gptKey: string

  setGptKey: (
    value: string
  ) => void

  telegramTokenMode: 'saved' | 'manual'

  setTelegramTokenMode: (
    value: 'saved' | 'manual'
  ) => void

  savedTelegramBotLabel: string

  setSavedTelegramBotLabel: (
    value: string
  ) => void

  tgToken: string

  setTgToken: (
    value: string
  ) => void

  telegramChatMode: 'saved' | 'manual'

  setTelegramChatMode: (
    value: 'saved' | 'manual'
  ) => void

  savedTelegramChatLabel: string

  setSavedTelegramChatLabel: (
    value: string
  ) => void

  tgChat: string

  setTgChat: (
    value: string
  ) => void

  isRefreshing: boolean

  onRefresh: () => void

  campaignCards: ReadonlyArray<{
    key: string
    eyebrow: string
    title: string
    body: string
    metrics: readonly string[]
  }>

  groups: ReadonlyArray<{
    key: ContentItemType
    label: string
  }>

  activeGroup: ContentItemType

  setActiveGroup: (
    value: string
  ) => void

  isGenerating: boolean

  isStrategyReady: boolean

  runGenerateAll: () => Promise<
    ContentStudioItem[] | undefined
  >

  textItems: ContentStudioItem[]

  busyItemId: string | null

  onRegenerateItem: (
    item: ContentStudioItem
  ) =>
    | Promise<ContentStudioItem | null>
    | ContentStudioItem
    | null

  onApproveItem: (
    id: string
  ) => void

  onCopy: (
    value: string
  ) => Promise<void> | void

  onUpdateItemContent: (
    id: string,
    value: string
  ) => void

  textVariantPresets: ReadonlyArray<{
    title: string
    badge: string
    tone: string
  }>

  adItems: ContentStudioItem[]

  bannerVariantPresets: ReadonlyArray<{
    key: string
    title: string
    badge: string
    emoji: string
    imagePrompt: string
  }>

  imageBusyItemId: string | null

  onUpdatePrompt: (
    id: string,
    value: string
  ) => void

  onGenerateImagesExisting: (
    item: ContentStudioItem
  ) => Promise<
    ContentStudioItem | null | undefined
  >

  onGenerateImagesTemplate: (
    index: number
  ) => Promise<
    ContentStudioItem | null | undefined
  >

  onRegenerateExisting: (
    item: ContentStudioItem
  ) => Promise<
    ContentStudioItem | null | undefined
  >

  onRegenerateTemplate: () => Promise<
    ContentStudioItem[] | null | undefined
  >

  onPublishItem: (
    item: ContentStudioItem
  ) => Promise<void> | void
}> & { activeStep: ContentStudioStep } & Record<string, unknown>

export default function ContentStudioStepBody(
  props: Props
) {
  const {
    activeStep,
    segmentClass = 'rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4',
    stackColumnsClass = 'grid gap-4 lg:grid-cols-2',
    stackColumnClass = 'space-y-4',
    sectionCardClass = 'rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5',
  } = props

  const resolvedProps = {
    ...props,
    segmentClass,
    stackColumnsClass,
    stackColumnClass,
    sectionCardClass,
  }

  switch (activeStep) {
    case 1:
      return <ContentStudioContextStep {...(resolvedProps as Parameters<typeof ContentStudioContextStep>[0])} />

    case 10:
      return <ContentStudioLeadMagnetStep {...(resolvedProps as Parameters<typeof ContentStudioLeadMagnetStep>[0])} />

    case 2:
      return <ContentStudioCtaStep {...(resolvedProps as Parameters<typeof ContentStudioCtaStep>[0])} />

    case 5:
      return <ContentStudioFormulaStep {...(resolvedProps as Parameters<typeof ContentStudioFormulaStep>[0])} />

    case 3:
      return <ContentStudioHookStep {...(resolvedProps as Parameters<typeof ContentStudioHookStep>[0])} />

    case 6:
      return <ContentStudioApiStep {...(resolvedProps as Parameters<typeof ContentStudioApiStep>[0])} />

    case 4:
      return <ContentStudioResearchStep {...(resolvedProps as Parameters<typeof ContentStudioResearchStep>[0])} />

    case 7:
    case 9:
      return <ContentStudioTextsStep {...(resolvedProps as Parameters<typeof ContentStudioTextsStep>[0])} />

    case 8:
      return <ContentStudioBannersStep {...(resolvedProps as Parameters<typeof ContentStudioBannersStep>[0])} />

    default:
      return null
  }
}
