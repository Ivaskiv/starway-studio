import Paywall from '@/features/paywall/components/Paywall'
import WheelChartSection from '@/features/wheel/components/sections/WheelChartSection'
import WheelCycleSection from '@/features/wheel/components/sections/WheelCycleSection'
import WheelHeaderSection from '@/features/wheel/components/sections/WheelHeaderSection'
import WheelHistoryReportsSection from '@/features/wheel/components/sections/WheelHistoryReportsSection'
import WheelPremiumPreviewSection from '@/features/wheel/components/sections/WheelPremiumPreviewSection'
import WheelSpheresSection from '@/features/wheel/components/sections/WheelSpheresSection'
import WheelTrialBannerSection from '@/features/wheel/components/sections/WheelTrialBannerSection'
import { useWheelPageController } from '@/features/wheel/hooks/useWheelPageController'

export default function WheelPage() {
  const {
    actionInputRefs,
    activeSphereId,
    aiCtaLabel,
    avgScore,
    categoryMap,
    closePaywall,
    dialogState,
    gap,
    handleActionChange,
    handleAddAction,
    handleDownloadPdf,
    handleOpenSubscription,
    handlePrimaryAction,
    handleRemoveAction,
    handleRestartClick,
    handleScoreChange,
    handleSecondaryAction,
    isPaywallOpen,
    isPending,
    paywall,
    pdfItems,
    setActiveSphere,
    setDialogState,
    showCycleSection,
    spheres,
    strongest,
    trialActive,
    trialDaysLeft,
    trialProgress,
    userId,
    weakest,
    weakestSphere,
    wheelInsights,
  } = useWheelPageController()

  return (
    <div className="wheel-page min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-6xl gap-6 md:gap-6">
        {isPaywallOpen ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="card-surface relative w-full max-w-md">
              <button
                type="button"
                onClick={closePaywall}
                aria-label="Закрити paywall"
                className="absolute right-4 top-4 text-sm text-[var(--text-muted)] hover:text-white"
              >
                ×
              </button>
              <Paywall
                headline={paywall.headline}
                systemLabel={paywall.systemLabel}
                consequences={paywall.consequences}
                onContinue={() => void paywall.handleContinue()}
                isLoading={paywall.isLoading}
              />
            </div>
          </div>
        ) : null}

        <WheelHeaderSection
          eyebrow="Твоя система зараз"
          title={weakestSphere ? `${weakestSphere.name} стримує твою систему` : 'Побач свій реальний стан'}
          description={
            weakestSphere
              ? `Точка напруги вже видима. Далі важливо не аналізувати ще раз, а стабілізувати ${weakestSphere.name.toLowerCase()} і задати новий ритм.`
              : 'Тут починається не оцінка, а побудова опори для наступного етапу.'
          }
        />

        <section className="trial-banner-wrapper min-h-0">
          <WheelTrialBannerSection
            trialActive={trialActive}
            trialDaysLeft={trialDaysLeft}
            trialProgress={trialProgress}
            onOpenSubscription={handleOpenSubscription}
          />
        </section>

        {weakestSphere || wheelInsights?.main.insight || wheelInsights?.main.cause ? (
          <section
            className="card-surface min-h-0 rounded-2xl p-5"
            {...(isPending ? { 'aria-busy': 'true' } : {})}
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                {(wheelInsights?.main.insight || wheelInsights?.main.cause || weakestSphere) ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Центральний фокус
                  </p>
                ) : null}
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {weakestSphere
                    ? `${weakestSphere.name} — зона, з якої починається зміна`
                    : 'Спершу побач систему'}
                </h2>
                {wheelInsights?.main.insight ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                    {wheelInsights.main.insight}
                  </p>
                ) : null}

                {wheelInsights?.main.cause ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    {wheelInsights.main.cause}
                  </p>
                ) : null}
              </div>

              <div className="w-full xl:max-w-[280px]">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="hero-cta-primary w-full"
                  disabled={!wheelInsights?.weakestSphere}
                >
                  {aiCtaLabel}
                </button>
                <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                  Один наступний крок. Без шуму, без зайвих рішень.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid min-h-0 gap-6 xl:grid-cols-[480px_minmax(0,1fr)] xl:items-stretch">
          <div className="section min-h-0 h-full flex flex-col">
            <WheelChartSection
              spheres={spheres}
              activeSphereId={activeSphereId}
              onFocusChange={setActiveSphere}
              avgScore={avgScore}
              weakestSphere={weakestSphere}
              strongest={strongest}
              onRestart={handleRestartClick}
            />
          </div>

          <div className="section min-h-0 h-full flex flex-col">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Дії, які змінюють систему
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Це не список задач. Це короткі дії, які повертають контроль і збирають ритм.
              </p>
            </div>

            <WheelSpheresSection
              spheres={spheres}
              weakest={weakest}
              strongest={strongest}
              gap={gap}
              categoryMap={categoryMap}
              onScoreChange={handleScoreChange}
              onActionChange={handleActionChange}
              onAddAction={handleAddAction}
              onRemoveAction={handleRemoveAction}
              actionInputRefs={actionInputRefs}
            />
          </div>
        </div>

        <WheelHistoryReportsSection
          userId={userId}
          items={pdfItems}
          categoryMap={categoryMap}
          onDownloadPdf={handleDownloadPdf}
        />

        {showCycleSection ? (
          <WheelCycleSection onOpenCycle={handleSecondaryAction} />
        ) : null}

        <WheelPremiumPreviewSection onOpenSubscription={handleOpenSubscription} />

        {dialogState ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(4,8,20,0.72)] p-4">
            <div className="card-surface w-full max-w-md rounded-2xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                {dialogState.kind === 'confirm' ? 'Підтвердження' : 'Повідомлення'}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                {dialogState.title}
              </h3>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                {dialogState.text}
              </p>
              <div className="mt-5 flex justify-end gap-3">
                {dialogState.kind === 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => setDialogState(null)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                  >
                    {dialogState.cancelText ?? 'Скасувати'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    dialogState.onConfirm?.()
                    if (dialogState.kind === 'modal') setDialogState(null)
                  }}
                  className="hero-cta-primary rounded-xl px-4 py-2 text-sm font-medium"
                >
                  {dialogState.confirmText}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
