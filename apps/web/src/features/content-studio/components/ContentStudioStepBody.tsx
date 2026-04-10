import type { ReactNode } from 'react'

import { withMinimumDelay } from '@/ui'

import { replaceItem } from '../slice/contentStudio.slice'
import {
  AD_MESSAGE_GOAL_OPTIONS,
  BANNER_VARIANT_PRESETS,
  CAMPAIGN_CONTEXT_SAMPLE,
  CM_FIELD_CLASS,
  CM_SECTION_CARD_CLASS,
  CM_SECTION_TITLE_CLASS,
  CM_SEGMENT_CLASS,
  CM_STACK_COLUMN_CLASS,
  CM_STACKED_COLUMNS_CLASS,
  CM_TEXTAREA_CLASS,
  CTA_DESTINATION_OPTIONS,
  CTA_ROUTING_OPTIONS,
  CTA_SUGGESTIONS,
  CTA_TYPE_OPTIONS,
  FORMAT_GENERATION_OPTIONS,
  GROUPS,
  PLATFORM_OPTIONS,
  buildTextVariantPresets,
  type ContentStudioStep,
  type FormulaCardUi,
  type ResearchCampaignCardUi,
  type ResearchHookOptionUi,
} from '../config/contentStudio.config'
import { buildContentStudioStepDefinitions } from '../config/contentStudio.steps'
import type { ContentItemType, ContentStudioInputs, ContentStudioItem, ContentStudioLeadMagnetPayload } from '../types/contentStudio.types'
import type { ContentStudioFunnelInsight } from '../types/contentStudio.types'
import {
  ContentStudioApiStep,
  ContentStudioBannersStep,
  ContentStudioContextStep,
  ContentStudioCtaStep,
  ContentStudioFormulaStep,
  ContentStudioHookStep,
  ContentStudioLeadMagnetStep,
  ContentStudioResearchStep,
  ContentStudioTextsStep,
} from './ContentStudioSteps'
import { ContentStudioPublishTab } from './ContentStudioTabs'
import { ContentStudioReelsTab } from './ContentStudioReelsTab'
import { ContentStudioModalFooter } from './ContentStudioModalFooter'
import type { QueueItemWithSource, PreviewQueueItem } from '../types/contentStudio.types'
import type { ContentStudioAIStrategy, LeadMagnet } from '../types/contentStudio.types'
import { getProgressWidthClass, splitMultiline } from '../utils/contentTransforms'

type Props = {
  activeStep: ContentStudioStep
  isStrategyReady: boolean
  dispatch: (action: unknown) => void
  generateContentImages: (payload: { item: ContentStudioItem; count: number }) => { unwrap: () => Promise<{ item: ContentStudioItem }> }
  runGenerate: (formats?: Array<'reels' | 'stories' | 'ad' | 'post' | 'podcast' | 'dm'>, allowWithoutStrategy?: boolean) => Promise<ContentStudioItem[] | undefined>
  refreshResearch: () => Promise<unknown>
  openStep: (step: ContentStudioStep) => void
  activeGroup: ContentItemType
  setActiveGroup: (value: ContentItemType) => void
  items: ContentStudioItem[]
  inputs: ContentStudioInputs
  activeItems: ContentStudioItem[]
  activeSummary: { total: number; approved: number; published: number }
  adItems: ContentStudioItem[]
  approvedItems: ContentStudioItem[]
  draftItems: ContentStudioItem[]
  queueItems: QueueItemWithSource[]
  fallbackItems: PreviewQueueItem[]
  completedNodeCount: number
  campaignProductValue: string
  campaignProductOptions: string[]
  platform: (typeof PLATFORM_OPTIONS)[number]['value']
  contextAudienceText: string
  adMessageGoal: (typeof AD_MESSAGE_GOAL_OPTIONS)[number]['value']
  contextPainText: string
  aiInsightPreview: string
  aiStrategy: ContentStudioAIStrategy | null
  aiInsightOverride: string
  setAiInsightOverride: (value: string) => void
  reflection: string
  contextHookVariants: string[]
  activeContextHookIndex: number
  canResetHookLimit: boolean
  ctaType: (typeof CTA_TYPE_OPTIONS)[number]['value']
  ctaDestination: (typeof CTA_DESTINATION_OPTIONS)[number]['value'][]
  ctaRoutingMode: (typeof CTA_ROUTING_OPTIONS)[number]['value']
  formulaType: string
  selectedHookType: string
  leadMagnetStepAdded: boolean
  setLeadMagnetStepAdded: (value: boolean) => void
  leadMagnetStepDismissedFor: string | null
  setLeadMagnetStepDismissedFor: (value: string | null) => void
  leadMagnetSelectedFormat: string
  setLeadMagnetSelectedFormat: (value: string) => void
  leadMagnetConfirmations: boolean[]
  setLeadMagnetConfirmations: (value: boolean[]) => void
  leadMagnetDraft: LeadMagnet | null
  setLeadMagnetDraft: (value: LeadMagnet | null) => void
  sendTelegram: boolean
  tgStatusText: string
  setTgStatusText: (value: string) => void
  onSaveLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>
  onTestLeadMagnetTelegram: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>
  onPublishLeadMagnet: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>
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
  isResearchStale: boolean
  isResearchRefreshing: boolean
  isResearchLoading: boolean
  hooksResearchMeta: { isFallback?: boolean } | null
  formulaCards: FormulaCardUi[]
  funnelInsight: ContentStudioFunnelInsight | null
  researchCampaignCards: ResearchCampaignCardUi[]
  researchHookOptions: ResearchHookOptionUi[]
  elevenKeyMode: 'saved' | 'manual'
  setElevenKeyMode: (value: 'saved' | 'manual') => void
  savedElevenKeyLabel: string
  setSavedElevenKeyLabel: (value: string) => void
  elevenKey: string
  setElevenKey: (value: string) => void
  voiceIdMode: 'saved' | 'manual'
  setVoiceIdMode: (value: 'saved' | 'manual') => void
  savedVoiceIdLabel: string
  setSavedVoiceIdLabel: (value: string) => void
  voiceId: string
  setVoiceId: (value: string) => void
  openAiKeyMode: 'saved' | 'manual'
  setOpenAiKeyMode: (value: 'saved' | 'manual') => void
  savedOpenAiKeyLabel: string
  setSavedOpenAiKeyLabel: (value: string) => void
  gptKey: string
  setGptKey: (value: string) => void
  telegramTokenMode: 'saved' | 'manual'
  setTelegramTokenMode: (value: 'saved' | 'manual') => void
  savedTelegramBotLabel: string
  setSavedTelegramBotLabel: (value: string) => void
  tgToken: string
  setTgToken: (value: string) => void
  telegramChatMode: 'saved' | 'manual'
  setTelegramChatMode: (value: 'saved' | 'manual') => void
  savedTelegramChatLabel: string
  setSavedTelegramChatLabel: (value: string) => void
  tgChat: string
  setTgChat: (value: string) => void
  publishSchedule: string
  setPublishSchedule: (value: string) => void
  payloadReadyCount: number
  dmReadyCount: number
  trialCtaCount: number
  dominantGoalLabel: string
  bundleBusyKey: string | null
  busyItemId: string | null
  imageBusyItemId: string | null
  isGenerating: boolean
  setReflection: (value: string) => void
  dispatchUpdateProduct: (value: string) => void
  handlePlatformChange: (value: (typeof PLATFORM_OPTIONS)[number]['value']) => void
  updateInputField: (key: keyof ContentStudioInputs, value: string) => void
  setAdMessageGoal: (value: (typeof AD_MESSAGE_GOAL_OPTIONS)[number]['value']) => void
  handleResetContextHookLimit: () => void
  canRestorePreviousContext: boolean
  handleRestorePreviousContext: () => void
  handleSelectContextHookVariant: (index: number) => void
  handlePrevContextHookVariant: () => void
  handleGenerateContextHook: () => void
  handleNextContextHookVariant: () => void
  setCtaType: (value: (typeof CTA_TYPE_OPTIONS)[number]['value']) => void
  setCtaDestination: (value: (typeof CTA_DESTINATION_OPTIONS)[number]['value']) => void
  setCtaRoutingMode: (value: (typeof CTA_ROUTING_OPTIONS)[number]['value']) => void
  handleAddCtaSuggestion: (suggestion: string) => void
  setFormulaType: (value: string) => void
  setSelectedHookType: (value: string) => void
  approveOne: (id: string) => void
  publishOne: (item: ContentStudioItem) => Promise<void>
  regenerateOne: (item: ContentStudioItem) => Promise<ContentStudioItem | null>
  generateImagesForItem: (item: ContentStudioItem) => Promise<ContentStudioItem | null>
  replaceContent: (id: string, content: string[]) => void
  publishApprovedItems: () => Promise<void>
}

export function ContentStudioStepBody(props: Props) {
  const {
    activeStep,
    isStrategyReady,
    dispatch,
    generateContentImages,
    runGenerate,
    refreshResearch,
    openStep,
    activeGroup,
    setActiveGroup,
    items,
    inputs,
    activeItems,
    activeSummary,
    adItems,
    approvedItems,
    draftItems,
    queueItems,
    fallbackItems,
    completedNodeCount,
    campaignProductValue,
    campaignProductOptions,
    platform,
    contextAudienceText,
    adMessageGoal,
    contextPainText,
    aiInsightPreview,
    aiStrategy,
    setAiInsightOverride,
    reflection,
    contextHookVariants,
    activeContextHookIndex,
    canResetHookLimit,
    ctaType,
    ctaDestination,
    ctaRoutingMode,
    formulaType,
    selectedHookType,
    leadMagnetStepAdded,
    setLeadMagnetStepAdded,
    leadMagnetStepDismissedFor,
    setLeadMagnetStepDismissedFor,
    leadMagnetSelectedFormat,
    setLeadMagnetSelectedFormat,
    leadMagnetConfirmations,
    setLeadMagnetConfirmations,
    leadMagnetDraft,
    setLeadMagnetDraft,
    sendTelegram,
    tgStatusText,
    setTgStatusText,
    onSaveLeadMagnet,
    onTestLeadMagnetTelegram,
    onPublishLeadMagnet,
    researchUpdatedLabel,
    researchSourceLabel,
    hookScoreContext,
    hasResearchMeta,
    isResearchStale,
    isResearchRefreshing,
    isResearchLoading,
    hooksResearchMeta,
    formulaCards,
    funnelInsight,
    researchCampaignCards,
    researchHookOptions,
    elevenKeyMode,
    setElevenKeyMode,
    savedElevenKeyLabel,
    setSavedElevenKeyLabel,
    elevenKey,
    setElevenKey,
    voiceIdMode,
    setVoiceIdMode,
    savedVoiceIdLabel,
    setSavedVoiceIdLabel,
    voiceId,
    setVoiceId,
    openAiKeyMode,
    setOpenAiKeyMode,
    savedOpenAiKeyLabel,
    setSavedOpenAiKeyLabel,
    gptKey,
    setGptKey,
    telegramTokenMode,
    setTelegramTokenMode,
    savedTelegramBotLabel,
    setSavedTelegramBotLabel,
    tgToken,
    setTgToken,
    telegramChatMode,
    setTelegramChatMode,
    savedTelegramChatLabel,
    setSavedTelegramChatLabel,
    tgChat,
    setTgChat,
    publishSchedule,
    setPublishSchedule,
    payloadReadyCount,
    dmReadyCount,
    trialCtaCount,
    dominantGoalLabel,
    bundleBusyKey,
    busyItemId,
    imageBusyItemId,
    isGenerating,
    setReflection,
    dispatchUpdateProduct,
    handlePlatformChange,
    updateInputField,
    setAdMessageGoal,
    handleResetContextHookLimit,
    canRestorePreviousContext,
    handleRestorePreviousContext,
    handleSelectContextHookVariant,
    handlePrevContextHookVariant,
    handleGenerateContextHook,
    handleNextContextHookVariant,
    setCtaType,
    setCtaDestination,
    setCtaRoutingMode,
    handleAddCtaSuggestion,
    setFormulaType,
    setSelectedHookType,
    approveOne,
    publishOne,
    regenerateOne,
    generateImagesForItem,
    replaceContent,
    publishApprovedItems,
  } = props
  const stepDefinitions = buildContentStudioStepDefinitions(leadMagnetStepAdded)
  const currentStepIndex = stepDefinitions.findIndex((step) => step.step === activeStep)
  const currentStepDefinition = currentStepIndex >= 0 ? stepDefinitions[currentStepIndex] : null
  const hasPrevStep = currentStepIndex > 0
  const hasNextStep = currentStepIndex >= 0 && currentStepIndex < stepDefinitions.length - 1
  const footerProgress = currentStepIndex >= 0 && stepDefinitions.length > 0
    ? getProgressWidthClass(((currentStepIndex + 1) / stepDefinitions.length) * 100)
    : getProgressWidthClass(0)
  const renderWithFooter = (content: ReactNode) => (
    <div className="space-y-5">
      {content}
      <ContentStudioModalFooter
        activeStep={activeStep}
        totalSteps={stepDefinitions.length}
        subtitle={currentStepDefinition?.subtitle}
        instruction={currentStepDefinition?.instruction}
        progressClassName={footerProgress}
        progressTone={currentStepDefinition?.accent === 'gold' ? 'gold' : 'default'}
        onPrev={() => {
          if (!hasPrevStep) return
          openStep(stepDefinitions[currentStepIndex - 1]?.step ?? activeStep)
        }}
        onNext={() => {
          if (hasNextStep) {
            openStep(stepDefinitions[currentStepIndex + 1]?.step ?? activeStep)
            return
          }
          openStep(0)
        }}
        nextDisabled={false}
        nextLabel={hasNextStep ? 'Далі →' : 'Готово'}
      />
    </div>
  )

  if (activeStep === 1) return renderWithFooter(
    <ContentStudioContextStep
      sectionTitleClass={CM_SECTION_TITLE_CLASS}
      fieldClass={CM_FIELD_CLASS}
      textareaClass={CM_TEXTAREA_CLASS}
      campaignProductValue={campaignProductValue}
      campaignProductOptions={campaignProductOptions}
      dispatchUpdateProduct={dispatchUpdateProduct}
      platform={platform}
      platformOptions={PLATFORM_OPTIONS}
      handlePlatformChange={(value) => handlePlatformChange(value as (typeof PLATFORM_OPTIONS)[number]['value'])}
      contextAudienceText={contextAudienceText}
      updateAudience={(value) => updateInputField('audience', value)}
      adMessageGoal={adMessageGoal}
      adMessageGoalOptions={AD_MESSAGE_GOAL_OPTIONS}
      setAdMessageGoal={(value) => setAdMessageGoal(value as (typeof AD_MESSAGE_GOAL_OPTIONS)[number]['value'])}
      contextPainText={contextPainText}
      updatePain={(value) => updateInputField('pain', value)}
      aiInsightPreview={aiInsightPreview}
      onAiInsightChange={setAiInsightOverride}
      leadMagnetStepAdded={leadMagnetStepAdded}
      leadMagnetStepDismissedFor={leadMagnetStepDismissedFor}
      onAddLeadMagnetStep={() => {
        setLeadMagnetStepAdded(true)
        openStep(10)
      }}
      onSkipLeadMagnetStep={setLeadMagnetStepDismissedFor}
    />
  )

  if (activeStep === 10) return renderWithFooter(
    <ContentStudioLeadMagnetStep
      sectionTitleClass={CM_SECTION_TITLE_CLASS}
      productLabel={campaignProductValue}
      aiStrategy={aiStrategy}
      funnelInsight={funnelInsight}
      aiInsightPreview={aiInsightPreview}
      leadMagnetDraft={leadMagnetDraft}
      setLeadMagnetDraft={setLeadMagnetDraft}
      leadMagnetSelectedFormat={leadMagnetSelectedFormat}
      setLeadMagnetSelectedFormat={setLeadMagnetSelectedFormat}
      leadMagnetConfirmations={leadMagnetConfirmations}
      setLeadMagnetConfirmations={setLeadMagnetConfirmations}
      tgToken={tgToken}
      tgChat={tgChat}
      sendTelegram={sendTelegram}
      tgStatusText={tgStatusText}
      setTgStatusText={setTgStatusText}
      onSaveLeadMagnet={onSaveLeadMagnet}
      onTestLeadMagnetTelegram={onTestLeadMagnetTelegram}
      onPublishLeadMagnet={onPublishLeadMagnet}
    />
  )

  if (activeStep === 2) return renderWithFooter(
    <ContentStudioCtaStep
      sectionTitleClass={CM_SECTION_TITLE_CLASS}
      textareaClass={CM_TEXTAREA_CLASS}
      campaignContextSample={CAMPAIGN_CONTEXT_SAMPLE}
      reflection={reflection}
      setReflection={setReflection}
      ctaType={ctaType}
      ctaTypeOptions={CTA_TYPE_OPTIONS}
      setCtaType={(value) => setCtaType(value as (typeof CTA_TYPE_OPTIONS)[number]['value'])}
      ctaDestination={ctaDestination}
      ctaDestinationOptions={CTA_DESTINATION_OPTIONS}
      setCtaDestination={(value) => setCtaDestination(value as (typeof CTA_DESTINATION_OPTIONS)[number]['value'])}
      ctaRoutingMode={ctaRoutingMode}
      ctaRoutingOptions={CTA_ROUTING_OPTIONS}
      setCtaRoutingMode={(value) => setCtaRoutingMode(value as (typeof CTA_ROUTING_OPTIONS)[number]['value'])}
      ctaSuggestions={CTA_SUGGESTIONS}
      selectedCtas={inputs.cta}
      handleAddCtaSuggestion={handleAddCtaSuggestion}
      updateCtaField={(value) => updateInputField('cta', value)}
    />
  )

  if (activeStep === 3) return renderWithFooter(
    <ContentStudioHookStep
      sectionTitleClass={CM_SECTION_TITLE_CLASS}
      textareaClass={CM_TEXTAREA_CLASS}
      campaignContextSample={CAMPAIGN_CONTEXT_SAMPLE}
      reflection={reflection}
      setReflection={setReflection}
      contextHookVariants={contextHookVariants}
      activeContextHookIndex={activeContextHookIndex}
      canResetHookLimit={canResetHookLimit}
      handleResetContextHookLimit={handleResetContextHookLimit}
      canRestorePreviousContext={canRestorePreviousContext}
      handleRestorePreviousContext={handleRestorePreviousContext}
      handleSelectContextHookVariant={handleSelectContextHookVariant}
      handlePrevContextHookVariant={handlePrevContextHookVariant}
      handleGenerateContextHook={handleGenerateContextHook}
      handleNextContextHookVariant={handleNextContextHookVariant}
      selectedHookType={selectedHookType}
      setSelectedHookType={setSelectedHookType}
      selectedHookLabel={researchHookOptions.find((option) => option.key === selectedHookType)?.eyebrow || selectedHookType}
      researchUpdatedLabel={researchUpdatedLabel}
      researchSourceLabel={researchSourceLabel}
      hookScoreContext={hookScoreContext}
      hasResearchMeta={hasResearchMeta}
      isFallback={Boolean(hooksResearchMeta?.isFallback)}
      isResearchStale={isResearchStale}
      researchHookOptions={researchHookOptions}
    />
  )

  if (activeStep === 4) return renderWithFooter(
    <ContentStudioResearchStep
      sectionTitleClass={CM_SECTION_TITLE_CLASS}
      researchUpdatedLabel={researchUpdatedLabel}
      researchSourceLabel={researchSourceLabel}
      hasResearchMeta={hasResearchMeta}
      isFallback={Boolean(hooksResearchMeta?.isFallback)}
      isResearchStale={isResearchStale}
      isRefreshing={isResearchRefreshing}
      onRefresh={() => { void refreshResearch() }}
      campaignCards={isResearchLoading && researchCampaignCards.length === 0 ? [] : researchCampaignCards}
    />
  )

  if (activeStep === 5) return renderWithFooter(
    <ContentStudioFormulaStep
      sectionTitleClass={CM_SECTION_TITLE_CLASS}
      formulaType={formulaType}
      setFormulaType={setFormulaType}
      formulaCards={formulaCards}
      funnelInsight={funnelInsight}
    />
  )

  if (activeStep === 6) return renderWithFooter(
    <ContentStudioApiStep
      sectionTitleClass={CM_SECTION_TITLE_CLASS}
      segmentClass={CM_SEGMENT_CLASS}
      fieldClass={CM_FIELD_CLASS}
      stackColumnsClass={CM_STACKED_COLUMNS_CLASS}
      stackColumnClass={CM_STACK_COLUMN_CLASS}
      sectionCardClass={CM_SECTION_CARD_CLASS}
      elevenKeyMode={elevenKeyMode}
      setElevenKeyMode={setElevenKeyMode}
      savedElevenKeyLabel={savedElevenKeyLabel}
      setSavedElevenKeyLabel={setSavedElevenKeyLabel}
      elevenKey={elevenKey}
      setElevenKey={setElevenKey}
      voiceIdMode={voiceIdMode}
      setVoiceIdMode={setVoiceIdMode}
      savedVoiceIdLabel={savedVoiceIdLabel}
      setSavedVoiceIdLabel={setSavedVoiceIdLabel}
      voiceId={voiceId}
      setVoiceId={setVoiceId}
      openAiKeyMode={openAiKeyMode}
      setOpenAiKeyMode={setOpenAiKeyMode}
      savedOpenAiKeyLabel={savedOpenAiKeyLabel}
      setSavedOpenAiKeyLabel={setSavedOpenAiKeyLabel}
      gptKey={gptKey}
      setGptKey={setGptKey}
      telegramTokenMode={telegramTokenMode}
      setTelegramTokenMode={setTelegramTokenMode}
      savedTelegramBotLabel={savedTelegramBotLabel}
      setSavedTelegramBotLabel={setSavedTelegramBotLabel}
      tgToken={tgToken}
      setTgToken={setTgToken}
      telegramChatMode={telegramChatMode}
      setTelegramChatMode={setTelegramChatMode}
      savedTelegramChatLabel={savedTelegramChatLabel}
      setSavedTelegramChatLabel={setSavedTelegramChatLabel}
      tgChat={tgChat}
      setTgChat={setTgChat}
    />
  )

  if (activeStep === 7) return renderWithFooter(
      <ContentStudioTextsStep
        sectionTitleClass={CM_SECTION_TITLE_CLASS}
        groups={GROUPS.filter((group) => group.key !== 'ad')}
        activeGroup={activeGroup}
        setActiveGroup={(value) => setActiveGroup(value as ContentItemType)}
        formulaType={formulaType}
        selectedHookLabel={researchHookOptions.find((option) => option.key === selectedHookType)?.eyebrow || selectedHookType}
        isGenerating={isGenerating}
        isStrategyReady={isStrategyReady}
        runGenerateAll={async () => (await runGenerate(undefined, true)) ?? undefined}
        textItems={activeItems.slice(0, 3)}
        busyItemId={busyItemId}
        onRegenerateItem={regenerateOne}
        onApproveItem={approveOne}
        onCopy={async (value) => navigator?.clipboard?.writeText?.(value)}
        onUpdateItemContent={(id, value) => replaceContent(id, splitMultiline(value))}
      textVariantPresets={buildTextVariantPresets(formulaType as FormulaCardUi['key'])}
    />
  )

  if (activeStep === 8) return renderWithFooter(
      <ContentStudioBannersStep
        sectionTitleClass={CM_SECTION_TITLE_CLASS}
        adItems={adItems}
        bannerVariantPresets={BANNER_VARIANT_PRESETS}
        imageBusyItemId={imageBusyItemId}
        busyItemId={busyItemId}
        isGenerating={isGenerating}
        isStrategyReady={isStrategyReady}
        onUpdatePrompt={(id, value) => {
          const item = adItems.find((entry) => entry.id === id)
          if (!item) return
          dispatch(replaceItem({ ...item, imagePrompt: value }))
        }}
      onGenerateImagesExisting={generateImagesForItem}
      onGenerateImagesTemplate={(index) => {
        return (async () => {
          const generated = await runGenerate(['ad'])
          const generatedAd = generated?.filter((nextItem) => nextItem.type === 'ad')[index]
          if (!generatedAd) return null
          try {
            const result = await withMinimumDelay(generateContentImages({ item: generatedAd, count: 5 }).unwrap(), 1200)
            dispatch(replaceItem(result.item))
            return result.item
          } catch (error) {
            console.error('[content-studio] generate images failed', error)
            return null
          }
        })()
      }}
      onRegenerateExisting={regenerateOne}
      onRegenerateTemplate={() => runGenerate(['ad'])}
      onApproveItem={approveOne}
      onPublishItem={publishOne}
    />
  )

  return (
    <div className="space-y-5">
      <ContentStudioReelsTab
        sectionTitleClass={CM_SECTION_TITLE_CLASS}
        queueItems={queueItems}
        fallbackItems={fallbackItems}
        completedNodeCount={completedNodeCount}
        onPrimaryAction={(item) => {
          if (item.status === 'approved') {
            void publishOne(item.sourceItem)
            return
          }
          approveOne(item.id)
        }}
      />
      <ContentStudioPublishTab
        sectionTitleClass={CM_SECTION_TITLE_CLASS}
        sectionCardClass={CM_SECTION_CARD_CLASS}
        fieldClass={CM_FIELD_CLASS}
        dominantGoalLabel={dominantGoalLabel}
        payloadReadyCount={payloadReadyCount}
        dmReadyCount={dmReadyCount}
        trialCtaCount={trialCtaCount}
        items={items}
        draftItemsCount={draftItems.length}
        approvedItemsCount={approvedItems.length}
        publishedItemsCount={items.filter((item) => item.status === 'published').length}
        approvedItemsEmpty={approvedItems.length === 0}
        publishSchedule={publishSchedule}
        setPublishSchedule={setPublishSchedule}
        sendTelegram={sendTelegram}
        tgStatusText={tgStatusText}
        setTgStatusText={setTgStatusText}
        isStrategyReady={isStrategyReady}
        onGenerateAll={() => { void runGenerate(undefined, true) }}
        onGenerateFormat={(formats) => { void runGenerate([...formats] as Array<'reels' | 'stories' | 'ad' | 'post' | 'podcast' | 'dm'>, true) }}
        isGenerating={isGenerating}
        bundleBusyKey={bundleBusyKey}
        formatGenerationOptions={FORMAT_GENERATION_OPTIONS}
        onPublishApprovedItems={() => { void publishApprovedItems() }}
        onOpenQueueStep={() => openStep(9)}
      />
      <ContentStudioModalFooter
        activeStep={activeStep}
        totalSteps={stepDefinitions.length}
        subtitle={currentStepDefinition?.subtitle}
        instruction={currentStepDefinition?.instruction}
        progressClassName={footerProgress}
        progressTone={currentStepDefinition?.accent === 'gold' ? 'gold' : 'default'}
        onPrev={() => {
          if (!hasPrevStep) return
          openStep(stepDefinitions[currentStepIndex - 1]?.step ?? activeStep)
        }}
        onNext={() => {
          if (hasNextStep) {
            openStep(stepDefinitions[currentStepIndex + 1]?.step ?? activeStep)
            return
          }
          openStep(0)
        }}
        nextDisabled={false}
        nextLabel={hasNextStep ? 'Далі →' : 'Готово'}
      />
    </div>
  )
}
