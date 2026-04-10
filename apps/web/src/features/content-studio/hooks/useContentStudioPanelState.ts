import { useEffect, useState } from 'react'

import { resetContentStudio, setGeneratedBundle, updateInputs } from '../slice/contentStudio.slice'
import {
  AD_MESSAGE_GOAL_OPTIONS,
  CAMPAIGN_CONTEXT_SAMPLE,
  CTA_DESTINATION_OPTIONS,
  CTA_ROUTING_OPTIONS,
  CTA_TYPE_OPTIONS,
  PLATFORM_OPTIONS,
  type ContentStudioStep,
  type ContentStudioTab,
} from '../config/contentStudio.config'
import { buildContextHookDraft, splitMultiline } from '../utils/contentTransforms'
import type { ContentItemType, ContentStudioAIStrategy, ContentStudioInputs, ContentStudioItem, ContentStudioStrategyDecision, LeadMagnet } from '../types/contentStudio.types'
import type { ContentStudioPanelRequest } from '../components/ContentStudioPanel'

type Dispatch = (action: unknown) => void
const FORMULA_TYPES = ['PAS', 'AIDA', 'BAB', 'FAB', '4P', 'STACK'] as const
type CtaDestinationValue = (typeof CTA_DESTINATION_OPTIONS)[number]['value']

type ContentStudioDraftSnapshot = {
  version: 1
  inputs: ContentStudioInputs
  items: Array<{ id: string; type: string; title: string; formatLabel: string; status: string; content: string[]; updatedAt: string }>
  lastGeneratedAt: string | null
  reflection: string
  aiInsightOverride: string
  topic: string
  platform: (typeof PLATFORM_OPTIONS)[number]['value']
  selectedFormats: string[]
  elevenKeyMode: 'saved' | 'manual'
  voiceIdMode: 'saved' | 'manual'
  openAiKeyMode: 'saved' | 'manual'
  elevenKey: string
  voiceId: string
  gptKey: string
  sendTelegram: boolean
  telegramTokenMode: 'saved' | 'manual'
  telegramChatMode: 'saved' | 'manual'
  savedElevenKeyLabel: string
  savedVoiceIdLabel: string
  savedOpenAiKeyLabel: string
  savedTelegramBotLabel: string
  savedTelegramChatLabel: string
  tgToken: string
  tgChat: string
  publishSchedule: string
  tgStatusText: string
  activeStep: ContentStudioStep | null
  activeGroup: ContentItemType
  formulaType: (typeof FORMULA_TYPES)[number]
  selectedHookType: string
  adMessageGoal: (typeof AD_MESSAGE_GOAL_OPTIONS)[number]['value']
  ctaType: (typeof CTA_TYPE_OPTIONS)[number]['value']
  ctaDestination: CtaDestinationValue[]
  ctaRoutingMode: (typeof CTA_ROUTING_OPTIONS)[number]['value']
  strategyDecision: ContentStudioStrategyDecision
  confirmedStrategyFingerprint: string | null
  contextHookDraftSource: string | null
  contextHookVariants: string[]
  activeContextHookIndex: number
  leadMagnetStepAdded: boolean
  leadMagnetStepDismissedFor: string | null
  leadMagnetSelectedFormat: string
  leadMagnetConfirmations: boolean[]
  leadMagnetDraft: LeadMagnet | null
}

function loadContentStudioDraft(storageKey: string | null): ContentStudioDraftSnapshot | null {
  if (!storageKey || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ContentStudioDraftSnapshot>
    if (parsed.version !== 1 || !parsed.inputs) return null
    return {
      version: 1,
      inputs: parsed.inputs,
      items: Array.isArray(parsed.items) ? parsed.items as ContentStudioDraftSnapshot['items'] : [],
      lastGeneratedAt: typeof parsed.lastGeneratedAt === 'string' || parsed.lastGeneratedAt === null ? parsed.lastGeneratedAt : null,
      reflection: typeof parsed.reflection === 'string' ? parsed.reflection : CAMPAIGN_CONTEXT_SAMPLE,
      aiInsightOverride: typeof parsed.aiInsightOverride === 'string' ? parsed.aiInsightOverride : '',
      topic: typeof parsed.topic === 'string' ? parsed.topic : '',
      platform: (parsed.platform ?? 'reels_stories') as ContentStudioDraftSnapshot['platform'],
      selectedFormats: Array.isArray(parsed.selectedFormats) ? parsed.selectedFormats.filter((value): value is string => typeof value === 'string') : ['reels', 'stories'],
      elevenKeyMode: parsed.elevenKeyMode === 'manual' ? 'manual' : 'saved',
      voiceIdMode: parsed.voiceIdMode === 'manual' ? 'manual' : 'saved',
      openAiKeyMode: parsed.openAiKeyMode === 'manual' ? 'manual' : 'saved',
      elevenKey: typeof parsed.elevenKey === 'string' ? parsed.elevenKey : '',
      voiceId: typeof parsed.voiceId === 'string' ? parsed.voiceId : '',
      gptKey: typeof parsed.gptKey === 'string' ? parsed.gptKey : '',
      sendTelegram: typeof parsed.sendTelegram === 'boolean' ? parsed.sendTelegram : true,
      telegramTokenMode: parsed.telegramTokenMode === 'manual' ? 'manual' : 'saved',
      telegramChatMode: parsed.telegramChatMode === 'manual' ? 'manual' : 'saved',
      savedElevenKeyLabel: typeof parsed.savedElevenKeyLabel === 'string' ? parsed.savedElevenKeyLabel : 'elevenlabs-main',
      savedVoiceIdLabel: typeof parsed.savedVoiceIdLabel === 'string' ? parsed.savedVoiceIdLabel : 'mentor-voice-main',
      savedOpenAiKeyLabel: typeof parsed.savedOpenAiKeyLabel === 'string' ? parsed.savedOpenAiKeyLabel : 'openai-main',
      savedTelegramBotLabel: typeof parsed.savedTelegramBotLabel === 'string' ? parsed.savedTelegramBotLabel : 'main-bot',
      savedTelegramChatLabel: typeof parsed.savedTelegramChatLabel === 'string' ? parsed.savedTelegramChatLabel : 'review-chat',
      tgToken: typeof parsed.tgToken === 'string' ? parsed.tgToken : '',
      tgChat: typeof parsed.tgChat === 'string' ? parsed.tgChat : '',
      publishSchedule: typeof parsed.publishSchedule === 'string' ? parsed.publishSchedule : 'Зараз',
      tgStatusText: typeof parsed.tgStatusText === 'string' ? parsed.tgStatusText : '',
      activeStep: typeof parsed.activeStep === 'number' || parsed.activeStep === null ? parsed.activeStep : 0,
      activeGroup: parsed.activeGroup === 'ad' || parsed.activeGroup === 'reel' ? parsed.activeGroup : 'reel',
      formulaType: FORMULA_TYPES.includes(parsed.formulaType as (typeof FORMULA_TYPES)[number]) ? (parsed.formulaType as (typeof FORMULA_TYPES)[number]) : 'PAS',
      selectedHookType: typeof parsed.selectedHookType === 'string' ? parsed.selectedHookType : 'reframe',
      adMessageGoal: parsed.adMessageGoal === 'mofu' || parsed.adMessageGoal === 'tofu' ? parsed.adMessageGoal : 'bofu',
      ctaType: parsed.ctaType === 'DM' || parsed.ctaType === 'GET_ACCESS' || parsed.ctaType === 'TRY_NOW' ? parsed.ctaType : 'START',
      ctaDestination: Array.isArray(parsed.ctaDestination) && parsed.ctaDestination.length > 0 ? parsed.ctaDestination.filter((value): value is CtaDestinationValue => CTA_DESTINATION_OPTIONS.some((option) => option.value === value)) : ['telegram_bot'],
      ctaRoutingMode: parsed.ctaRoutingMode === 'ai' ? 'ai' : 'single',
      strategyDecision: parsed.strategyDecision === 'confirmed' || parsed.strategyDecision === 'manual' || parsed.strategyDecision === 'rejected' ? parsed.strategyDecision : 'pending',
      confirmedStrategyFingerprint: typeof parsed.confirmedStrategyFingerprint === 'string' ? parsed.confirmedStrategyFingerprint : null,
      contextHookDraftSource: typeof parsed.contextHookDraftSource === 'string' || parsed.contextHookDraftSource === null ? parsed.contextHookDraftSource : null,
      contextHookVariants: Array.isArray(parsed.contextHookVariants) ? parsed.contextHookVariants.filter((value): value is string => typeof value === 'string') : [],
      activeContextHookIndex: typeof parsed.activeContextHookIndex === 'number' ? parsed.activeContextHookIndex : 0,
      leadMagnetStepAdded: typeof parsed.leadMagnetStepAdded === 'boolean' ? parsed.leadMagnetStepAdded : false,
      leadMagnetStepDismissedFor: typeof parsed.leadMagnetStepDismissedFor === 'string' || parsed.leadMagnetStepDismissedFor === null ? parsed.leadMagnetStepDismissedFor : null,
      leadMagnetSelectedFormat: typeof parsed.leadMagnetSelectedFormat === 'string' ? parsed.leadMagnetSelectedFormat : 'quiz',
      leadMagnetConfirmations: Array.isArray(parsed.leadMagnetConfirmations) && parsed.leadMagnetConfirmations.length === 5
        ? parsed.leadMagnetConfirmations.map((value) => Boolean(value))
        : [false, false, false, false, false],
      leadMagnetDraft: parsed.leadMagnetDraft && typeof parsed.leadMagnetDraft === 'object'
        ? {
            ...(parsed.leadMagnetDraft as LeadMagnet),
            createdAt: parsed.leadMagnetDraft.createdAt ? new Date(String(parsed.leadMagnetDraft.createdAt)) : new Date(),
          }
        : null,
    }
  } catch {
    return null
  }
}

function clearContentStudioDraft(storageKey: string | null) {
  if (!storageKey || typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // Ignore storage issues in private mode / quota limits.
  }
}

export function useContentStudioPanelState(params: {
  dispatch: Dispatch
  inputs: ContentStudioInputs
  items: Array<{ id: string; type: string; title: string; formatLabel: string; status: string; content: string[]; updatedAt: string }>
  lastGeneratedAt: string | null
  request?: ContentStudioPanelRequest | null
  campaignProductOptions: string[]
  currentRole: string
  storageKey: string | null
  setBusyItemId: (value: string | null) => void
  setImageBusyItemId: (value: string | null) => void
  setBundleBusyKey: (value: string | null) => void
  setStatusTone: (value: 'idle' | 'run' | 'done' | 'err') => void
  setStatusText: (value: string) => void
  setProgress: (value: number) => void
}) {
  const { dispatch, inputs, items, lastGeneratedAt, request, campaignProductOptions, currentRole, storageKey, setBusyItemId, setImageBusyItemId, setBundleBusyKey, setStatusTone, setStatusText, setProgress } = params
  const canResetHookLimit = currentRole === 'SUPERADMIN' || currentRole === 'EXPERT'
  const [, setActiveTab] = useState<ContentStudioTab>('input')
  const draftSnapshot = useState(() => loadContentStudioDraft(storageKey))[0]
  const [activeGroup, setActiveGroup] = useState<'reel' | 'ad'>(draftSnapshot?.activeGroup === 'ad' ? 'ad' : 'reel')
  const [reflection, setReflection] = useState(draftSnapshot?.reflection ?? CAMPAIGN_CONTEXT_SAMPLE)
  const [aiInsightOverride, setAiInsightOverride] = useState(draftSnapshot?.aiInsightOverride ?? '')
  const [topic, setTopic] = useState(draftSnapshot?.topic ?? '')
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]['value']>(draftSnapshot?.platform ?? 'reels_stories')
  const [selectedFormats, setSelectedFormats] = useState<string[]>(draftSnapshot?.selectedFormats ?? ['reels', 'stories'])
  const [elevenKeyMode, setElevenKeyMode] = useState<'saved' | 'manual'>(draftSnapshot?.elevenKeyMode ?? 'saved')
  const [voiceIdMode, setVoiceIdMode] = useState<'saved' | 'manual'>(draftSnapshot?.voiceIdMode ?? 'saved')
  const [openAiKeyMode, setOpenAiKeyMode] = useState<'saved' | 'manual'>(draftSnapshot?.openAiKeyMode ?? 'saved')
  const [elevenKey, setElevenKey] = useState(draftSnapshot?.elevenKey ?? '')
  const [voiceId, setVoiceId] = useState(draftSnapshot?.voiceId ?? '')
  const [gptKey, setGptKey] = useState(draftSnapshot?.gptKey ?? '')
  const [sendTelegram, setSendTelegram] = useState(draftSnapshot?.sendTelegram ?? true)
  const [telegramTokenMode, setTelegramTokenMode] = useState<'saved' | 'manual'>(draftSnapshot?.telegramTokenMode ?? 'saved')
  const [telegramChatMode, setTelegramChatMode] = useState<'saved' | 'manual'>(draftSnapshot?.telegramChatMode ?? 'saved')
  const [savedElevenKeyLabel, setSavedElevenKeyLabel] = useState(draftSnapshot?.savedElevenKeyLabel ?? 'elevenlabs-main')
  const [savedVoiceIdLabel, setSavedVoiceIdLabel] = useState(draftSnapshot?.savedVoiceIdLabel ?? 'mentor-voice-main')
  const [savedOpenAiKeyLabel, setSavedOpenAiKeyLabel] = useState(draftSnapshot?.savedOpenAiKeyLabel ?? 'openai-main')
  const [savedTelegramBotLabel, setSavedTelegramBotLabel] = useState(draftSnapshot?.savedTelegramBotLabel ?? 'main-bot')
  const [savedTelegramChatLabel, setSavedTelegramChatLabel] = useState(draftSnapshot?.savedTelegramChatLabel ?? 'review-chat')
  const [tgToken, setTgToken] = useState(draftSnapshot?.tgToken ?? '')
  const [tgChat, setTgChat] = useState(draftSnapshot?.tgChat ?? '')
  const [publishSchedule, setPublishSchedule] = useState(draftSnapshot?.publishSchedule ?? 'Зараз')
  const [tgStatusText, setTgStatusText] = useState(draftSnapshot?.tgStatusText ?? '')
  const [activeStep, setActiveStep] = useState<ContentStudioStep | null>(draftSnapshot?.activeStep ?? null)
  const [formulaType, setFormulaType] = useState<'PAS' | 'AIDA' | 'BAB' | 'FAB' | '4P' | 'STACK'>(draftSnapshot?.formulaType ?? 'PAS')
  const [selectedHookType, setSelectedHookType] = useState(draftSnapshot?.selectedHookType ?? 'reframe')
  const [adMessageGoal, setAdMessageGoal] = useState<(typeof AD_MESSAGE_GOAL_OPTIONS)[number]['value']>(draftSnapshot?.adMessageGoal ?? 'bofu')
  const [ctaType, setCtaType] = useState<(typeof CTA_TYPE_OPTIONS)[number]['value']>(draftSnapshot?.ctaType ?? 'START')
  const [ctaDestination, setCtaDestination] = useState<CtaDestinationValue[]>(draftSnapshot?.ctaDestination ?? ['telegram_bot'])
  const [ctaRoutingMode, setCtaRoutingMode] = useState<(typeof CTA_ROUTING_OPTIONS)[number]['value']>(draftSnapshot?.ctaRoutingMode ?? 'single')
  const [strategyDecision, setStrategyDecision] = useState<ContentStudioStrategyDecision>(draftSnapshot?.strategyDecision ?? 'pending')
  const [confirmedStrategyFingerprint, setConfirmedStrategyFingerprint] = useState<string | null>(draftSnapshot?.confirmedStrategyFingerprint ?? null)
  const [contextHookDraftSource, setContextHookDraftSource] = useState<string | null>(draftSnapshot?.contextHookDraftSource ?? null)
  const [contextHookVariants, setContextHookVariants] = useState<string[]>(draftSnapshot?.contextHookVariants ?? [])
  const [activeContextHookIndex, setActiveContextHookIndex] = useState(draftSnapshot?.activeContextHookIndex ?? 0)
  const [leadMagnetStepAdded, setLeadMagnetStepAdded] = useState(draftSnapshot?.leadMagnetStepAdded ?? false)
  const [leadMagnetStepDismissedFor, setLeadMagnetStepDismissedFor] = useState<string | null>(draftSnapshot?.leadMagnetStepDismissedFor ?? null)
  const [leadMagnetSelectedFormat, setLeadMagnetSelectedFormat] = useState(draftSnapshot?.leadMagnetSelectedFormat ?? 'quiz')
  const [leadMagnetConfirmations, setLeadMagnetConfirmations] = useState<boolean[]>(draftSnapshot?.leadMagnetConfirmations ?? [false, false, false, false, false])
  const [leadMagnetDraft, setLeadMagnetDraft] = useState<LeadMagnet | null>(draftSnapshot?.leadMagnetDraft ?? null)

  const openStep = (step: ContentStudioStep) => {
    setActiveStep(step)
    if (step === 7 || step === 8) { setActiveTab('scripts'); setActiveGroup(step === 8 ? 'ad' : 'reel'); return }
    setActiveTab(step === 9 ? 'publish' : 'input')
  }

  useEffect(() => {
    if (!campaignProductOptions.length) return
    if (!inputs.product[0] || !campaignProductOptions.includes(inputs.product[0])) dispatch(updateInputs({ product: [campaignProductOptions[0]] }))
  }, [campaignProductOptions, dispatch, inputs.product])

  useEffect(() => {
    if (!draftSnapshot || !storageKey) return
    dispatch(updateInputs(draftSnapshot.inputs))
    if (draftSnapshot.items.length > 0) {
      dispatch(setGeneratedBundle({
        items: draftSnapshot.items as ContentStudioItem[],
        generatedAt: draftSnapshot.lastGeneratedAt ?? new Date().toISOString(),
      }))
    }
  }, [dispatch, draftSnapshot, storageKey])

  useEffect(() => {
    if (!request) return
    setActiveTab(request.tab)
    if (typeof request.step === 'number') return setActiveStep(request.step)
    if (request.openReelsPipeline) return setActiveStep(9)
    if (request.tab === 'input') return setActiveStep(0)
    if (request.tab === 'scripts') { setActiveGroup('reel'); return setActiveStep(7) }
    setActiveStep(9)
  }, [request])

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    const snapshot: ContentStudioDraftSnapshot = {
      version: 1,
      inputs,
      items,
      lastGeneratedAt,
      reflection,
      aiInsightOverride,
      topic,
      platform,
      selectedFormats,
      elevenKeyMode,
      voiceIdMode,
      openAiKeyMode,
      elevenKey,
      voiceId,
      gptKey,
      sendTelegram,
      telegramTokenMode,
      telegramChatMode,
      savedElevenKeyLabel,
      savedVoiceIdLabel,
      savedOpenAiKeyLabel,
      savedTelegramBotLabel,
      savedTelegramChatLabel,
      tgToken,
      tgChat,
      publishSchedule,
      tgStatusText,
      activeStep,
      activeGroup,
      formulaType,
      selectedHookType,
      adMessageGoal,
      ctaType,
      ctaDestination,
      ctaRoutingMode,
      strategyDecision,
      confirmedStrategyFingerprint,
      contextHookDraftSource,
      contextHookVariants,
      activeContextHookIndex,
      leadMagnetStepAdded,
      leadMagnetStepDismissedFor,
      leadMagnetSelectedFormat,
      leadMagnetConfirmations,
      leadMagnetDraft,
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
    } catch {
      // Ignore storage quota / private mode failures.
    }
  }, [
    activeContextHookIndex,
    activeGroup,
    activeStep,
    aiInsightOverride,
    adMessageGoal,
    ctaDestination,
    ctaRoutingMode,
    ctaType,
    confirmedStrategyFingerprint,
    contextHookDraftSource,
    contextHookVariants,
    draftSnapshot,
    elevenKey,
    elevenKeyMode,
    formulaType,
    gptKey,
    inputs,
    items,
    lastGeneratedAt,
    leadMagnetConfirmations,
    leadMagnetSelectedFormat,
    leadMagnetStepAdded,
    leadMagnetStepDismissedFor,
    leadMagnetDraft,
    openAiKeyMode,
    platform,
    publishSchedule,
    reflection,
    savedElevenKeyLabel,
    savedOpenAiKeyLabel,
    savedTelegramBotLabel,
    savedTelegramChatLabel,
    savedVoiceIdLabel,
    selectedFormats,
    selectedHookType,
    sendTelegram,
    storageKey,
    strategyDecision,
    telegramChatMode,
    telegramTokenMode,
    tgChat,
    tgStatusText,
    tgToken,
    topic,
    voiceId,
    voiceIdMode,
  ])

  const updateStudioInput = (key: keyof ContentStudioInputs, value: string) => dispatch(updateInputs({ [key]: splitMultiline(value) }))
  const handlePlatformChange = (value: (typeof PLATFORM_OPTIONS)[number]['value']) => { setPlatform(value); const option = PLATFORM_OPTIONS.find((item) => item.value === value); if (option) setSelectedFormats([...option.formats]) }
  const handleToggleFormat = (value: string) => setSelectedFormats((current) => { const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]; const nextPrimary = next[0] ?? 'reels'; setPlatform(next.includes('reels') && next.includes('stories') ? 'reels_stories' : next.includes('reels') && next.includes('ad') ? 'reels_ads' : nextPrimary === 'stories' ? 'stories' : 'reels'); return next })
  const handleGenerateContextHook = (strategy?: ContentStudioAIStrategy | null) => { if (contextHookVariants.length >= 5) return; const sourceReflection = contextHookDraftSource ?? reflection; if (contextHookDraftSource === null) setContextHookDraftSource(reflection); const nextHookDraft = buildContextHookDraft({ reflection: sourceReflection, topic, platform: selectedFormats[0] ?? platform ?? 'reels', pain: inputs.pain, result: inputs.result, audience: inputs.audience, product: inputs.product, variantIndex: contextHookVariants.length, strategy }); setReflection(''); window.setTimeout(() => setReflection(nextHookDraft), 0); setContextHookVariants((current) => { const next = [...current, nextHookDraft]; setActiveContextHookIndex(next.length - 1); return next }) }
  const handleRestorePreviousContext = () => { setReflection(contextHookDraftSource ?? ''); setContextHookDraftSource(null); setContextHookVariants([]); setActiveContextHookIndex(0) }
  const handleResetContextHookLimit = () => { setContextHookDraftSource(null); setContextHookVariants([]); setActiveContextHookIndex(0) }
  const handleSelectContextHookVariant = (index: number) => { const variant = contextHookVariants[index]; if (!variant) return; setActiveContextHookIndex(index); setReflection(variant) }
  const handlePrevContextHookVariant = () => { if (contextHookVariants.length > 0) handleSelectContextHookVariant(Math.max(activeContextHookIndex - 1, 0)) }
  const handleNextContextHookVariant = () => { if (contextHookVariants.length > 0) handleSelectContextHookVariant(Math.min(activeContextHookIndex + 1, contextHookVariants.length - 1)) }
  const handleAddCtaSuggestion = (suggestion: string) => { const existing = splitMultiline(inputs.cta.join('\n')); if (!existing.includes(suggestion)) updateStudioInput('cta', [...existing, suggestion].join('\n')) }
  const handleToggleCtaDestination = (value: CtaDestinationValue) => setCtaDestination((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))
  const handleStartNewPackage = () => { clearContentStudioDraft(storageKey); dispatch(resetContentStudio()); setReflection(CAMPAIGN_CONTEXT_SAMPLE); setTopic(''); setPlatform('reels_stories'); setSelectedFormats(['reels', 'stories']); setElevenKeyMode('saved'); setVoiceIdMode('saved'); setOpenAiKeyMode('saved'); setElevenKey(''); setVoiceId(''); setGptKey(''); setSendTelegram(true); setTelegramTokenMode('saved'); setTelegramChatMode('saved'); setSavedElevenKeyLabel('elevenlabs-main'); setSavedVoiceIdLabel('mentor-voice-main'); setSavedOpenAiKeyLabel('openai-main'); setSavedTelegramBotLabel('main-bot'); setSavedTelegramChatLabel('review-chat'); setTgToken(''); setTgChat(''); setPublishSchedule('Зараз'); setStatusTone('idle'); setStatusText(''); setProgress(0); setTgStatusText(''); setBusyItemId(null); setImageBusyItemId(null); setBundleBusyKey(null); setFormulaType('PAS'); setSelectedHookType('reframe'); setAdMessageGoal('bofu'); setCtaType('START'); setCtaDestination(['telegram_bot']); setCtaRoutingMode('single'); setStrategyDecision('pending'); setConfirmedStrategyFingerprint(null); setContextHookDraftSource(null); setContextHookVariants([]); setActiveContextHookIndex(0); setActiveTab('input'); openStep(1) }
  const handleSetActiveGroup = (value: ContentItemType) => setActiveGroup(value === 'ad' ? 'ad' : 'reel')
  const handleSetFormulaType = (value: string) => setFormulaType(FORMULA_TYPES.includes(value as (typeof FORMULA_TYPES)[number]) ? (value as (typeof FORMULA_TYPES)[number]) : 'PAS')

  return { canResetHookLimit, activeGroup, setActiveGroup: handleSetActiveGroup, reflection, setReflection, aiInsightOverride, setAiInsightOverride, topic, setTopic, platform, selectedFormats, setSelectedFormats, elevenKeyMode, setElevenKeyMode, voiceIdMode, setVoiceIdMode, openAiKeyMode, setOpenAiKeyMode, elevenKey, setElevenKey, voiceId, setVoiceId, gptKey, setGptKey, sendTelegram, setSendTelegram, telegramTokenMode, setTelegramTokenMode, telegramChatMode, setTelegramChatMode, savedElevenKeyLabel, setSavedElevenKeyLabel, savedVoiceIdLabel, setSavedVoiceIdLabel, savedOpenAiKeyLabel, setSavedOpenAiKeyLabel, savedTelegramBotLabel, setSavedTelegramBotLabel, savedTelegramChatLabel, setSavedTelegramChatLabel, tgToken, setTgToken, tgChat, setTgChat, publishSchedule, setPublishSchedule, tgStatusText, setTgStatusText, activeStep, setActiveStep, formulaType, setFormulaType: handleSetFormulaType, selectedHookType, setSelectedHookType, adMessageGoal, setAdMessageGoal, ctaType, setCtaType, ctaDestination, setCtaDestination: handleToggleCtaDestination, ctaRoutingMode, setCtaRoutingMode, strategyDecision, setStrategyDecision, confirmedStrategyFingerprint, setConfirmedStrategyFingerprint, contextHookDraftSource, contextHookVariants, activeContextHookIndex, leadMagnetStepAdded, setLeadMagnetStepAdded, leadMagnetStepDismissedFor, setLeadMagnetStepDismissedFor, leadMagnetSelectedFormat, setLeadMagnetSelectedFormat, leadMagnetConfirmations, setLeadMagnetConfirmations, leadMagnetDraft, setLeadMagnetDraft, openStep, updateStudioInput, handlePlatformChange, handleToggleFormat, handleGenerateContextHook, handleRestorePreviousContext, handleResetContextHookLimit, handleSelectContextHookVariant, handlePrevContextHookVariant, handleNextContextHookVariant, handleAddCtaSuggestion, handleStartNewPackage }
}
