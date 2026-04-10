import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

import { useGetFunnelByIdQuery, useUpdateFunnelMutation, type FunnelEntity } from '@/features/funnels/services/funnels.api'
import {
  FUNNEL_TARGET_SEGMENT_META,
  type FunnelScreen,
  type FunnelTargetSegment,
} from '@/features/funnels/types/funnel.types'
import { Badge, Button, GlassCard, InfoHint, Input, Select } from '@/ui'
import { FunnelScreenCard, MetricCell, ScreenConnector } from '@/features/admin/components/master-panel/funnel/FunnelScreenCard'
import {
  formatEntryChannels,
  formatTargetSegment,
  funnelTypeLabel,
  inferTrafficVisual,
  landingLabel,
  normalizeStatus,
  STATUS_OPTIONS,
  statusTone,
  sumMetrics,
  trafficBadgeClass,
  trafficLabel,
  type FunnelStatus,
} from '@/features/admin/components/master-panel/funnel/funnelTab.utils'

export default function MasterPanelFunnelTab({
  selectedFunnelId,
  funnels,
  screens,
  selectedScreenId,
  canEdit,
  canManageAll,
  canReorderScreens,
  isLoading,
  onSelectScreen,
  onMoveScreen,
  onDuplicateScreen,
  onDeleteScreen,
  onAddScreen,
}: {
  selectedFunnelId: string | null
  funnels: FunnelEntity[]
  screens: FunnelScreen[]
  selectedScreenId: string | null
  canEdit: boolean
  canManageAll: boolean
  canReorderScreens: boolean
  isLoading: boolean
  onSelectScreen: (id: string) => void
  onMoveScreen: (id: string, direction: 'up' | 'down') => void
  onDuplicateScreen: (id: string) => void
  onDeleteScreen: (id: string) => void
  onAddScreen: () => void
}) {
  const { data: selectedData, isFetching } = useGetFunnelByIdQuery(selectedFunnelId ?? '', {
    skip: !selectedFunnelId,
  })
  const funnel = selectedData?.funnel ?? funnels.find((item) => item.id === selectedFunnelId) ?? null
  const [updateFunnel, { isLoading: saving }] = useUpdateFunnelMutation()
  const [draftName, setDraftName] = useState('')
  const [draftStatus, setDraftStatus] = useState<FunnelStatus>('draft')
  const [draftVersion, setDraftVersion] = useState('v1')
  const [draftTargetSegment, setDraftTargetSegment] = useState<FunnelTargetSegment>('free_practice')

  useEffect(() => {
    if (!funnel) return
    setDraftName(funnel.name)
    setDraftStatus(normalizeStatus(funnel.status))
    setDraftVersion(funnel.version ?? 'v1')
    setDraftTargetSegment(formatTargetSegment(funnel.targetSegment))
  }, [funnel?.id, funnel?.name, funnel?.status, funnel?.targetSegment, funnel?.version])

  const traffic = inferTrafficVisual(funnel)
  const opened = sumMetrics(screens, 'opened')
  const passedCta = sumMetrics(screens, 'passedCta')
  const trialStart = sumMetrics(screens, 'trialStart')
  const converted = sumMetrics(screens, 'converted')
  const topChannels = formatEntryChannels(screens)
  const previewSteps = screens.slice(0, 4)

  const handleSave = async () => {
    if (!canEdit || !funnel) return
    const name = draftName.trim()
    if (!name) return

    try {
      await updateFunnel({ id: funnel.id, name, status: draftStatus }).unwrap()
      toast.success('Воронку збережено')
    } catch {
      toast.error('Не вдалося зберегти воронку')
    }
  }

  return (
    <GlassCard variant="bordered" className="overflow-hidden">
      <div className="dashboard-liquid-edge--top p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
                Воронки
              </p>
              <InfoHint
                label="Воронки"
                description="Редактор flow-послідовностей. Тут керуємо екранами воронки, не відкриваючи окрему сторінку."
                instruction="Sidebar вибирає funnel. Центр показує list-based editor, а праворуч працює shared analysis panel."
              />
            </div>
            <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-[var(--text-primary)]">
              {funnels.length ? 'Матриця воронок і лендінгів' : funnel?.name ?? 'Обери воронку в sidebar'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
              Обирай воронку зліва, дивись preview по центру і редагуй деталі справа. Один shell без дублювання editor-екранів.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="success" size="sm">Воронок {funnels.length}</Badge>
              <Badge variant="info" size="sm">Лендінгів {funnel ? (traffic === 'cold' || traffic === 'hot' ? 1 : 0) : 0}</Badge>
              <Badge variant="info" size="sm">Без лендінгу {Math.max(funnels.length - 1, 0)}</Badge>
            </div>
          </div>

          <InfoHint
            label="Матриця"
            description="Структура як у product-map: ліворуч вибір воронки, по центру preview, праворуч редактор і аналіз."
            instruction="Це допомагає швидко бачити, що вже зібрано, а що ще залежить від нагадувань і промптів."
          />
        </div>
      </div>

      <div className="space-y-5 p-5">
        {!selectedFunnelId ? (
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--text-muted)]">
            Обери funnel у sidebar, щоб відкрити list-based editor.
          </div>
        ) : !funnel ? (
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--text-muted)]">
            Обраної воронки поки немає у списку або вона ще не завантажилась.
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-[26px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-base font-semibold text-[var(--text-primary)]">
                      {funnelTypeLabel(funnel)}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={['inline-flex rounded-full border px-3 py-1 text-xs font-semibold', trafficBadgeClass(traffic)].join(' ')}>
                          {trafficLabel(traffic)}
                        </span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{topChannels}</span>
                        <span className="text-sm text-[var(--text-muted)]">— {landingLabel(traffic)}</span>
                      </div>
                      <h3 className="mt-3 text-[1.4rem] font-semibold leading-tight text-[var(--text-primary)]">
                        {funnel.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        {FUNNEL_TARGET_SEGMENT_META[draftTargetSegment]} · v{draftVersion} · {screens.length} екранів
                      </p>
                    </div>
                  </div>

                  <Badge variant={statusTone(normalizeStatus(funnel.status))} size="sm">
                    {funnel.status}
                  </Badge>
                </div>

                <div className="mt-5 rounded-[24px] border border-[rgba(var(--accent-rgb),0.4)] bg-[var(--card)] p-5 shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {funnelTypeLabel(funnel)} · {trafficLabel(traffic)}
                  </p>
                  <p className="mt-2 max-w-[18rem] text-[1.35rem] font-semibold leading-tight text-[var(--text-primary)]">
                    {funnel.name}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {previewSteps.map((screen) => (
                      <span
                        key={screen.id}
                        className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)]"
                      >
                        {screen.title}
                        <span className="ml-2 text-[var(--text-muted)]">→</span>
                      </span>
                    ))}
                    {screens[screens.length - 1]?.ctaLabel ? (
                      <span className="inline-flex items-center rounded-full bg-[var(--text-primary)] px-3 py-1.5 text-[12px] font-semibold text-[var(--bg-primary)]">
                        {screens[screens.length - 1]?.ctaLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.1)] px-3 py-1 text-[12px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                      {traffic === 'cold' || traffic === 'hot' ? 'Лендінг потрібен' : 'Лендінг не потрібен'}
                    </span>
                    <span className="inline-flex rounded-full border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.1)] px-3 py-1 text-[12px] font-medium text-[rgb(134,239,172)]">
                      AI-персоналізація
                    </span>
                    <span className="inline-flex rounded-full border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.1)] px-3 py-1 text-[12px] font-medium text-[rgb(253,224,71)]">
                      Нагадування авто
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-3 border-t border-[var(--border)] pt-4">
                    <MetricCell label="Відкрили" value={opened} />
                    <MetricCell label="CTA" value={passedCta} />
                    <MetricCell label="Trial" value={trialStart} />
                    <MetricCell label="Конверсія" value={converted} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-[26px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--accent-soft-rgb))]">
                    Стан
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Короткий контекст по вибраній воронці перед редагуванням справа.
                  </p>
                </div>
                <Input
                  label="Назва"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  disabled={!canEdit || isFetching}
                  placeholder="Назва"
                />
                <Select
                  label="Статус"
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value as FunnelStatus)}
                  disabled={!canEdit || isFetching}
                  options={STATUS_OPTIONS}
                />
                <Button
                  type="button"
                  variant="solid"
                  color="accent"
                  loading={saving}
                  loadingText="Зберігаємо…"
                  disabled={!canEdit || !draftName.trim()}
                  onClick={() => void handleSave()}
                >
                  Зберегти зміни
                </Button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
                    Екрани воронки
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Нижче видно реальну послідовність екранів. Клік по картці відкриває її редагування справа.
                  </p>
                </div>
                <Badge variant="info" size="sm">
                  Екранів {screens.length}
                </Badge>
              </div>

              <div className="mt-5 space-y-0">
              {screens.length ? (
                screens.map((screen, index) => (
                  <div key={screen.id}>
                    {index > 0 ? <ScreenConnector /> : null}
                    <FunnelScreenCard
                      screen={screen}
                      selected={screen.id === selectedScreenId}
                      canEdit={canEdit}
                  onSelect={() => onSelectScreen(screen.id)}
                      onDuplicate={() => onDuplicateScreen(screen.id)}
                      onMoveUp={() => onMoveScreen(screen.id, 'up')}
                      onMoveDown={() => onMoveScreen(screen.id, 'down')}
                      onDelete={() => onDeleteScreen(screen.id)}
                      canReorder={canReorderScreens}
                      canDuplicateDelete={canManageAll}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-6 text-sm text-[var(--text-muted)]">
                  У цієї воронки ще немає screen-карток. Додай перший екран і зібрай flow зверху вниз.
                </div>
              )}
              </div>
            </div>

            <button
              type="button"
              onClick={onAddScreen}
              disabled={!canManageAll}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.22)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Додати екран
            </button>
          </>
        )}
      </div>
    </GlassCard>
  )
}
