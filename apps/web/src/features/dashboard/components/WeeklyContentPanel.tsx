import ContentStudioPanel, { type ContentStudioPanelRequest } from '@/features/content-studio/components/ContentStudioPanel'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DASHBOARD_EYEBROW_CLASS } from './dashboardPrimitives'
import type { ContentStudioStep } from '@/features/content-studio/config/contentStudio.config'

export default function WeeklyContentPanel() {
  const location = useLocation()
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isMachineVisible, setIsMachineVisible] = useState(false)
  const [machineRequest, setMachineRequest] = useState<ContentStudioPanelRequest | null>(null)
  const machineRef = useRef<HTMLDivElement | null>(null)

  const guideSteps = [
    {
      title: '1. Зафіксуй вхід',
      text: 'Опиши стан, тему й офер. Це дає системі контекст для точніших сценаріїв і реклами.',
    },
    {
      title: '2. Переглянь і підтвердь',
      text: 'У вкладці сценаріїв ти одразу бачиш Reels, Ads, Stories і DM. Залишай тільки сильні варіанти.',
    },
    {
      title: '3. Запусти Reels pipeline',
      text: 'Окремий guided pipeline веде від голосу до review і черги без перевантаження основного екрана.',
    },
    {
      title: '4. Публікуй через один центр',
      text: 'Telegram, planner і наступні дії для прогріву живуть в одному місці, тому контент і реклама не розлітаються.',
    },
  ] as const

  const openMachine = (view: 'input' | 'scripts' | 'publish' | 'reels') => {
    setIsMachineVisible(true)
    setMachineRequest({
      token: Date.now(),
      tab: view === 'reels' ? 'scripts' : view,
      openReelsPipeline: view === 'reels',
    })
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const section = searchParams.get('section')
    const rawStep = searchParams.get('step')
    const step = rawStep ? Number(rawStep) : null
    if (section !== 'content' || !step || Number.isNaN(step)) return

    const contentStep = step as ContentStudioStep
    setIsMachineVisible(true)
    setMachineRequest((current) => ({
      ...(current ?? {}),
      token: Date.now(),
      tab: contentStep >= 9 ? 'publish' : contentStep >= 7 ? 'scripts' : 'input',
      openReelsPipeline: contentStep === 9,
      step: contentStep,
    }))
  }, [location.search])

  useEffect(() => {
    if (!isMachineVisible) return
    machineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isMachineVisible, machineRequest])

  return (
    <div className="space-y-6">
      {!isMachineVisible ? (
        <div className="dashboard-liquid-card overflow-hidden">
          <div className="dashboard-liquid-edge--top px-6 py-8">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
                Content Machine
              </p>
              <h2 className="mt-4 text-[2.05rem] font-semibold tracking-tight text-[var(--text-primary)] md:text-[2.5rem]">
                Content Machine
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
                Стан → ціль → вибір → дія → інсайт → Reels → продаж. Один центр потрібен для того,
                щоб контент, реклама, прогрів і публікація жили в одній логіці, а не в різних хаотичних блоках.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {[
                  'Рефлексія',
                  'Інсайт',
                  'Копірайт',
                  '3 варіанти',
                  'Голос',
                  'Reels',
                  'Telegram',
                  'Публікація',
                ].map((step, index, array) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-1.5 text-xs font-medium text-[rgb(var(--accent-soft-rgb))]">
                      {step}
                    </span>
                    {index < array.length - 1 ? <span className="text-xs text-[var(--text-muted)]">→</span> : null}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => openMachine('input')}
                  className="btn-liquid-dashboard btn-liquid-dashboard--primary rounded-[20px] px-6 py-3"
                >
                  Відкрити Content Machine
                </button>
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="btn-liquid-dashboard btn-liquid-dashboard--ice rounded-[20px] px-6 py-3"
                >
                  Як це працює
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-liquid-card--soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={DASHBOARD_EYEBROW_CLASS}>Content Machine</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                Один engine для генерації, preview, Reels pipeline і публікації без дублювання допоміжних блоків.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openMachine('input')}
                className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]"
              >
                Вхід
              </button>
              <button
                type="button"
                onClick={() => openMachine('scripts')}
                className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]"
              >
                Сценарії
              </button>
              <button
                type="button"
                onClick={() => openMachine('reels')}
                className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]"
              >
                Reels pipeline
              </button>
              <button
                type="button"
                onClick={() => openMachine('publish')}
                className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.18)] hover:text-[var(--text-primary)]"
              >
                Публікація
              </button>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="btn-liquid-dashboard btn-liquid-dashboard--ice rounded-[14px] px-4 py-2"
              >
                Як це працює
              </button>
            </div>
          </div>
        </div>
      )}

      {isMachineVisible ? (
        <div ref={machineRef} className="scroll-mt-24">
          <ContentStudioPanel request={machineRequest} />
        </div>
      ) : null}

      {isGuideOpen ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/80 px-4 py-6">
          <div className="dashboard-liquid-card relative flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)]">
            <div className="dashboard-liquid-edge--top flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div>
                <p className={DASHBOARD_EYEBROW_CLASS}>Покрокове використання</p>
                <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--text-primary)]">Як працювати з Starway · Content Machine</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Цей модуль доцільний тим, що збирає весь production flow в один маршрут: від стану й оферу до реклами, Reels і продажу.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Закрити
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="space-y-4">
                {guideSteps.map((step, index) => (
                  <div key={step.title} className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] text-sm font-semibold text-[rgb(var(--accent-soft-rgb))]">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[var(--text-primary)]">{step.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
