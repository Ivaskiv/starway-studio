import { useEffect, useMemo, useState } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useGetAnalyticsFunnelQuery, useGetAnalyticsInsightsQuery, useGetAnalyticsOverviewQuery } from '@/features/analytics/services/analytics.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetMyProductsQuery } from '@/features/products/services/products.api'
import { SalesFlowSimulator } from '@/features/content-preview'
import { GenerationCurtain, useGenerationCurtain } from '@/ui'
import { DASHBOARD_EYEBROW_CLASS } from '@/features/dashboard/components/dashboardPrimitives'
import { updateInputs } from '../slice/contentStudio.slice'
import {
  useGenerateContentBundleMutation,
  useGenerateContentImagesMutation,
  usePublishContentItemMutation,
  useRegenerateContentItemMutation,
  usePublishLeadMagnetMutation,
  useSaveLeadMagnetMutation,
  useTestLeadMagnetTelegramMutation,
} from '../services/contentStudio.api'
import { useContentStudioLogic } from '../hooks/useContentStudioLogic'
import { useMarketResearch } from '../hooks/useMarketResearch'
import { useQueueItems } from '../hooks/useQueueItems'
import {
  type ContentStudioStep,
} from '../config/contentStudio.config'
import { buildContentStudioStepDefinitions } from '../config/contentStudio.steps'
import { ContentStudioHeader } from './ContentStudioHeader'
import { ContentStudioOverview } from './ContentStudioOverview'
import { ContentStudioStepBody } from './ContentStudioStepBody'
import { useContentStudioPanelState } from '../hooks/useContentStudioPanelState'
import { useContentStudioDerived } from '../hooks/useContentStudioDerived'

export type ContentStudioPanelRequest = {
  token: number
  tab: 'input' | 'scripts' | 'publish'
  openReelsPipeline?: boolean
  step?: ContentStudioStep | null
}
export default function ContentStudioPanel({
  request,
}: {
  request?: ContentStudioPanelRequest | null
}) {
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const { data: myProducts = [] } = useGetMyProductsQuery(undefined, { skip: !user?.id })
  const { data: analyticsInsights = null } = useGetAnalyticsInsightsQuery(
    { period: '30d', limit: 8 },
    { skip: !user?.id },
  )
  const { data: analyticsOverview = null } = useGetAnalyticsOverviewQuery(
    { period: '30d' },
    { skip: !user?.id },
  )
  const { data: analyticsFunnel = null } = useGetAnalyticsFunnelQuery(
    { period: '30d' },
    { skip: !user?.id },
  )
  const {
    data: marketResearch,
    loading: isResearchLoading,
    refreshing: isResearchRefreshing,
    lastUpdated: lastResearchUpdatedAt,
    isStale: isResearchStale,
    refresh: refreshResearch,
  } = useMarketResearch()
  const { inputs, items } = useAppSelector((state) => state.contentStudio)
  const lastGeneratedAt = useAppSelector((state) => state.contentStudio.lastGeneratedAt)
  const currentRole = (user?.role ?? 'USER').toUpperCase()
  const storageKey = user?.id ? `starway.contentStudio.draft.v1.${user.id}` : null
  const autoReels = true
  const [generateBundle, { isLoading: isGenerating }] = useGenerateContentBundleMutation()
  const [generateContentImages] = useGenerateContentImagesMutation()
  const [regenerateContentItem] = useRegenerateContentItemMutation()
  const [publishContentItem] = usePublishContentItemMutation()
  const [saveLeadMagnet] = useSaveLeadMagnetMutation()
  const [testLeadMagnetTelegram] = useTestLeadMagnetTelegramMutation()
  const [publishLeadMagnet] = usePublishLeadMagnetMutation()
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [, setActiveTab] = useState<'input' | 'scripts' | 'publish'>('input')
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [imageBusyItemId, setImageBusyItemId] = useState<string | null>(null)
  const [bundleBusyKey, setBundleBusyKey] = useState<string | null>(null)
  const [, setStatusTone] = useState<'idle' | 'run' | 'done' | 'err'>('idle')
  const [, setStatusText] = useState('')
  const [, setProgress] = useState(0)
  const {
    canResetHookLimit,
    activeGroup,
    setActiveGroup,
    reflection,
    setReflection,
    aiInsightOverride,
    setAiInsightOverride,
    platform,
    selectedFormats,
    setSelectedFormats,
    elevenKeyMode,
    setElevenKeyMode,
    voiceIdMode,
    setVoiceIdMode,
    openAiKeyMode,
    setOpenAiKeyMode,
    elevenKey,
    setElevenKey,
    voiceId,
    setVoiceId,
    gptKey,
    setGptKey,
    sendTelegram,
    telegramTokenMode,
    setTelegramTokenMode,
    telegramChatMode,
    setTelegramChatMode,
    savedElevenKeyLabel,
    setSavedElevenKeyLabel,
    savedVoiceIdLabel,
    setSavedVoiceIdLabel,
    savedOpenAiKeyLabel,
    setSavedOpenAiKeyLabel,
    savedTelegramBotLabel,
    setSavedTelegramBotLabel,
    savedTelegramChatLabel,
    setSavedTelegramChatLabel,
    tgToken,
    setTgToken,
    tgChat,
    setTgChat,
    publishSchedule,
    setPublishSchedule,
    tgStatusText,
    setTgStatusText,
    activeStep,
    setActiveStep,
    formulaType,
    setFormulaType,
    selectedHookType,
    setSelectedHookType,
    adMessageGoal,
    setAdMessageGoal,
    ctaType,
    setCtaType,
    ctaDestination,
    setCtaDestination,
    ctaRoutingMode,
    setCtaRoutingMode,
    strategyDecision,
    setStrategyDecision,
    confirmedStrategyFingerprint,
    setConfirmedStrategyFingerprint,
    contextHookDraftSource,
    contextHookVariants,
    activeContextHookIndex,
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
    openStep,
    updateStudioInput,
    handlePlatformChange,
    handleToggleFormat: handleToggleFormatBase,
    handleRestorePreviousContext,
    handleResetContextHookLimit,
    handleSelectContextHookVariant,
    handlePrevContextHookVariant,
    handleNextContextHookVariant,
    handleAddCtaSuggestion,
    handleStartNewPackage,
    handleGenerateContextHook: handleGenerateContextHookBase,
  } = useContentStudioPanelState({
    dispatch,
    inputs,
    items,
    lastGeneratedAt,
    request,
    campaignProductOptions: myProducts.map((product) => {
      const baseName = product.title?.trim() || product.name?.trim()
      if (!baseName) return ''
      return product.includesTrial && product.trialDays > 0 ? `${baseName} · ${product.trialDays}-денний Trial` : baseName
    }).filter(Boolean),
    currentRole,
    storageKey,
    setBusyItemId,
    setImageBusyItemId,
    setBundleBusyKey,
    setStatusTone,
    setStatusText,
    setProgress,
  })
  const {
    activeItems,
    approvedItems,
    publishedItems,
    adItems,
    draftItems,
    summary,
    activeSummary,
    payloadReadyCount,
    dmReadyCount,
    trialCtaCount,
    audioReadyCount,
    reelsReadyCount,
    launchPotential,
    dominantGoalLabel,
    campaignProductOptions,
    campaignProductValue,
    contextAudienceText,
    contextPainText,
    aiInsightPreview,
    aiStrategy,
    aiStrategyFingerprint,
    funnelInsight,
    formulaCards,
    researchCampaignCards,
    researchHookOptions,
    researchUpdatedLabel,
    hooksResearchMeta,
    researchSourceLabel,
    hookScoreContext,
  } = useContentStudioDerived({
    myProducts,
    items,
    inputs,
    activeGroup,
    selectedFormats,
    ctaDestination,
    ctaType,
    aiInsightOverride,
    marketResearch,
    analyticsInsights,
    analyticsOverview,
    analyticsFunnel,
    lastResearchUpdatedAt,
  })
  const {
    runGenerate,
    publishApprovedItems,
    handleLaunchSales,
    publishOne,
    regenerateOne,
    generateImagesForItem,
    approveOne,
    replaceContent,
  } = useContentStudioLogic({
    dispatch,
    inputs,
    items,
    approvedItems,
    autoReels,
    setActiveTab,
    generateBundle,
    generateContentImages,
    regenerateContentItem,
    publishContentItem,
    setBusyItemId,
    setImageBusyItemId,
    setBundleBusyKey,
    setStatusTone,
    setStatusText,
    setProgress,
    generationStrategy: aiStrategy,
  })
  const strategyReady = strategyDecision !== 'pending'
  const strategyApplied = strategyDecision === 'confirmed' && confirmedStrategyFingerprint === aiStrategyFingerprint
  useEffect(() => {
    if (strategyDecision !== 'confirmed') return
    if (!aiStrategyFingerprint) return
    if (confirmedStrategyFingerprint === aiStrategyFingerprint) return
    setStrategyDecision('pending')
    setConfirmedStrategyFingerprint(null)
  }, [aiStrategyFingerprint, confirmedStrategyFingerprint, setConfirmedStrategyFingerprint, setStrategyDecision, strategyDecision])
  const handleToggleFormat = (value: string) => {
    if (strategyDecision !== 'manual') setStrategyDecision('manual')
    handleToggleFormatBase(value)
  }
  const handleGenerateContextHook = () => {
    handleGenerateContextHookBase(aiStrategy)
  }
  const handleConfirmStrategy = () => {
    if (!aiStrategy) return
    setSelectedFormats([...aiStrategy.suggestedFormats])
    setStrategyDecision('confirmed')
    setConfirmedStrategyFingerprint(aiStrategyFingerprint)
  }
  const handleEditStrategy = () => {
    setStrategyDecision('manual')
  }
  const handleRejectStrategy = () => {
    setSelectedFormats(['reels'])
    setStrategyDecision('rejected')
    setConfirmedStrategyFingerprint(null)
  }
  const handleSaveLeadMagnet = async (payload: Parameters<typeof saveLeadMagnet>[0]['payload']) => {
    const result = await saveLeadMagnet({ payload }).unwrap()
    setTgStatusText(`Лідмагніт збережено в системі як ContentItem ${result.contentItemId}.`)
    return result
  }
  const handleTestLeadMagnetTelegram = async (payload: Parameters<typeof testLeadMagnetTelegram>[0]['payload']) => {
    if (!sendTelegram) {
      setTgStatusText('Telegram-відправка вимкнена.')
      return null
    }
    if (!tgToken.trim() || !tgChat.trim()) {
      setTgStatusText('Щоб протестувати в Telegram, заповни Telegram token і chat id у вкладці Publish.')
      return null
    }
    const result = await testLeadMagnetTelegram({ payload, telegramToken: tgToken, telegramChatId: tgChat }).unwrap()
    setTgStatusText(result.telegramSent
      ? `Тестовий лідмагніт відправлено в Telegram канал. ContentItem ${result.contentItemId}.`
      : 'Лідмагніт збережено, але тестова відправка не спрацювала.')
    return result
  }
  const handlePublishLeadMagnet = async (payload: Parameters<typeof publishLeadMagnet>[0]['payload']) => {
    const needsTelegram = payload.destinations.includes('telegram_bot')
    if (needsTelegram && !sendTelegram) {
      setTgStatusText('Telegram-відправка вимкнена.')
      return null
    }
    if (needsTelegram && (!tgToken.trim() || !tgChat.trim())) {
      setTgStatusText('Щоб опублікувати в Telegram, заповни Telegram token і chat id у вкладці Publish.')
      return null
    }
    const result = await publishLeadMagnet({
      payload,
      telegramToken: needsTelegram ? tgToken : undefined,
      telegramChatId: needsTelegram ? tgChat : undefined,
    }).unwrap()
    setTgStatusText(result.telegramSent
      ? `Лідмагніт опубліковано в Telegram канал. ContentItem ${result.contentItemId}.`
      : 'Лідмагніт опубліковано в систему.')
    return result
  }
  const handleRunGenerate = async (formats?: Array<'reels' | 'stories' | 'ad' | 'post' | 'podcast' | 'dm'>, allowWithoutStrategy = false) => {
    if (!strategyReady && !allowWithoutStrategy) {
      setStatusTone('run')
      setStatusText('Спершу підтвердь AI стратегію або переведи формати в ручний режим.')
      setProgress(14)
      return null
    }

    const defaultFormats: Array<'reels' | 'stories' | 'ad' | 'post' | 'podcast' | 'dm'> = strategyDecision === 'rejected'
      ? ['reels']
      : selectedFormats.length > 0
        ? (selectedFormats as Array<'reels' | 'stories' | 'ad' | 'post' | 'podcast' | 'dm'>)
        : aiStrategy?.suggestedFormats ?? ['reels']

    return runGenerate(formats ?? defaultFormats)
  }
  const { queueItems, fallbackItems, completedNodeCount } = useQueueItems(items, approvedItems, publishedItems)
  const contentGenerationVisible = useGenerationCurtain(isGenerating || busyItemId !== null, {
    enterDelay: 160,
    minVisibleMs: 1200,
  })
  const stepDefinitions = useMemo(() => buildContentStudioStepDefinitions(leadMagnetStepAdded), [leadMagnetStepAdded])
  const activeStepResolved = activeStep ?? 0
  const activeStepDefinition = stepDefinitions.find((step) => step.step === activeStepResolved) ?? stepDefinitions[0]

  const leadMagnetConfirmationsCount = leadMagnetConfirmations.filter(Boolean).length
  const leadMagnetStepComplete = leadMagnetConfirmationsCount === 5

  return (
    <div className="dashboard-liquid-card relative overflow-hidden p-0">
      <SalesFlowSimulator
        open={isSimulatorOpen}
        items={items}
        onClose={() => setIsSimulatorOpen(false)}
      />
      <GenerationCurtain
        open={contentGenerationVisible}
        title="Збираємо пакет контенту"
        subtitle="Формуємо сценарії, CTA, DM-логіку і шлях до продажу в одному потоці."
      />
      <ContentStudioHeader
        isGenerating={isGenerating}
        onStartNewPackage={handleStartNewPackage}
        onGenerateAll={() => { void handleRunGenerate() }}
      />

      <section className="px-6 pb-6">
        <div className="overflow-hidden rounded-[28px] border border-[rgba(var(--accent-rgb),0.14)] bg-transparent">
          <div className="border-b border-[rgba(255,255,255,0.06)] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--text-muted)]">
              {activeStepDefinition?.title ?? 'Content Machine'}
            </p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--text-primary)]">
              {activeStepDefinition ? `${activeStepDefinition.heading ?? activeStepDefinition.title}` : 'Content Machine'}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {activeStepDefinition?.instruction ?? 'Обери крок у sidebar, щоб перейти до відповідного блоку.'}
            </p>
          </div>
          {activeStepResolved === 0 ? (
            <div className="space-y-4 px-6 py-6">
              <div className="dashboard-liquid-card--soft px-6 py-4">
                <p className={DASHBOARD_EYEBROW_CLASS}>Content Machine · Контекст</p>
                <h2 className="mt-2 text-[1.6rem] font-semibold text-[var(--text-primary)]">Стартова сторінка машини</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                  Це перший крок Content Machine. Тут збирається контекст, а далі сторінка веде через СТА, Hook, Дослідження, Формулу, API, Тексти, Банери, Reels і Lead magnet.
                </p>
              </div>

              <ContentStudioOverview
                itemsCount={items.length}
                aiStrategy={aiStrategy}
                strategyDecision={strategyDecision}
                strategyApplied={strategyApplied}
                launchPotential={launchPotential}
                contextHookVariants={contextHookVariants}
                canResetHookLimit={canResetHookLimit}
                reflection={reflection}
                selectedFormats={selectedFormats}
                inputs={inputs}
                ctaType={ctaType}
                ctaDestination={ctaDestination}
                ctaRoutingMode={ctaRoutingMode}
                summary={summary}
                audioReadyCount={audioReadyCount}
                reelsReadyCount={reelsReadyCount}
                activeContextHookIndex={activeContextHookIndex}
                onLaunchSales={() => { void handleLaunchSales(items) }}
                onOpenScripts={() => {
                  setActiveTab('scripts')
                  openStep(7)
                }}
                onOpenStrategy={() => openStep(1)}
                onConfirmStrategy={handleConfirmStrategy}
                onEditStrategy={handleEditStrategy}
                onRejectStrategy={handleRejectStrategy}
                onResetHookLimit={handleResetContextHookLimit}
                onReflectionChange={setReflection}
                onSelectHookVariant={handleSelectContextHookVariant}
                onPrevHookVariant={handlePrevContextHookVariant}
                onGenerateHook={handleGenerateContextHook}
                onNextHookVariant={handleNextContextHookVariant}
                onToggleFormat={handleToggleFormat}
              />
            </div>
          ) : (
            <ContentStudioStepBody
              activeStep={activeStepResolved}
              isStrategyReady={strategyReady}
              dispatch={dispatch}
              generateContentImages={generateContentImages}
              runGenerate={async (formats, allowWithoutStrategy) => (await handleRunGenerate(formats, allowWithoutStrategy)) ?? undefined}
              refreshResearch={refreshResearch}
              openStep={openStep}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
              items={items}
              inputs={inputs}
              activeItems={activeItems}
              activeSummary={activeSummary}
              adItems={adItems}
              approvedItems={approvedItems}
              draftItems={draftItems}
              queueItems={queueItems}
              fallbackItems={fallbackItems}
              completedNodeCount={completedNodeCount}
              campaignProductValue={campaignProductValue}
              campaignProductOptions={campaignProductOptions}
              platform={platform}
              contextAudienceText={contextAudienceText}
              adMessageGoal={adMessageGoal}
              contextPainText={contextPainText}
              aiInsightPreview={aiInsightPreview}
              aiInsightOverride={aiInsightOverride}
              setAiInsightOverride={setAiInsightOverride}
              reflection={reflection}
              contextHookVariants={contextHookVariants}
              activeContextHookIndex={activeContextHookIndex}
              canResetHookLimit={canResetHookLimit}
              ctaType={ctaType}
              ctaDestination={ctaDestination}
              ctaRoutingMode={ctaRoutingMode}
              formulaType={formulaType}
              selectedHookType={selectedHookType}
              leadMagnetStepAdded={leadMagnetStepAdded}
              setLeadMagnetStepAdded={setLeadMagnetStepAdded}
              leadMagnetStepDismissedFor={leadMagnetStepDismissedFor}
              setLeadMagnetStepDismissedFor={setLeadMagnetStepDismissedFor}
              leadMagnetSelectedFormat={leadMagnetSelectedFormat}
              setLeadMagnetSelectedFormat={setLeadMagnetSelectedFormat}
              leadMagnetConfirmations={leadMagnetConfirmations}
              setLeadMagnetConfirmations={setLeadMagnetConfirmations}
              aiStrategy={aiStrategy}
              leadMagnetDraft={leadMagnetDraft}
              setLeadMagnetDraft={setLeadMagnetDraft}
              onSaveLeadMagnet={handleSaveLeadMagnet}
              onTestLeadMagnetTelegram={handleTestLeadMagnetTelegram}
              onPublishLeadMagnet={handlePublishLeadMagnet}
              researchUpdatedLabel={researchUpdatedLabel}
              researchSourceLabel={researchSourceLabel}
              hookScoreContext={hookScoreContext}
              hasResearchMeta={Boolean(hooksResearchMeta)}
              isResearchStale={isResearchStale}
              isResearchRefreshing={isResearchRefreshing}
              isResearchLoading={isResearchLoading}
              hooksResearchMeta={hooksResearchMeta}
              formulaCards={formulaCards}
              funnelInsight={funnelInsight}
              researchCampaignCards={researchCampaignCards}
              researchHookOptions={researchHookOptions}
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
              publishSchedule={publishSchedule}
              setPublishSchedule={setPublishSchedule}
              sendTelegram={sendTelegram}
              tgStatusText={tgStatusText}
              setTgStatusText={setTgStatusText}
              payloadReadyCount={payloadReadyCount}
              dmReadyCount={dmReadyCount}
              trialCtaCount={trialCtaCount}
              dominantGoalLabel={dominantGoalLabel}
              bundleBusyKey={bundleBusyKey}
              busyItemId={busyItemId}
              imageBusyItemId={imageBusyItemId}
              isGenerating={isGenerating}
              setReflection={setReflection}
              dispatchUpdateProduct={(value) => dispatch(updateInputs({ product: [value] }))}
              handlePlatformChange={handlePlatformChange}
              updateInputField={updateStudioInput}
              setAdMessageGoal={setAdMessageGoal}
              handleResetContextHookLimit={handleResetContextHookLimit}
              canRestorePreviousContext={Boolean(contextHookDraftSource)}
              handleRestorePreviousContext={handleRestorePreviousContext}
              handleSelectContextHookVariant={handleSelectContextHookVariant}
              handlePrevContextHookVariant={handlePrevContextHookVariant}
              handleGenerateContextHook={handleGenerateContextHook}
              handleNextContextHookVariant={handleNextContextHookVariant}
              setCtaType={setCtaType}
              setCtaDestination={setCtaDestination}
              setCtaRoutingMode={setCtaRoutingMode}
              handleAddCtaSuggestion={handleAddCtaSuggestion}
              setFormulaType={setFormulaType}
              setSelectedHookType={setSelectedHookType}
              approveOne={approveOne}
              publishOne={publishOne}
              regenerateOne={regenerateOne}
              generateImagesForItem={generateImagesForItem}
              replaceContent={replaceContent}
              publishApprovedItems={publishApprovedItems}
            />
          )}
        </div>
      </section>

    </div>
  )
}
