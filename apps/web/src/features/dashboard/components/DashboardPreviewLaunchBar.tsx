import { useMemo, useState } from 'react'

import { CrossChannelPreviewModal, type CrossChannelPreviewMode, TelegramPreview } from '@/features/content-preview'
import { type PreviewButton } from '@/features/content-preview/types'
import { DesktopPreview, MiniAppPreview, TelegramModulePreview } from './ContentMachinePreviewCard'
import { DesktopFunnelPreview, FUNNEL_STEPS, MiniAppFunnelPreview } from './FunnelAutomationPanel'

const CHANNELS: Array<{ id: CrossChannelPreviewMode; label: string }> = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'miniapp', label: 'Mini App' },
  { id: 'telegram', label: 'Telegram' },
]

const GENERIC_TELEGRAM_BUTTONS: PreviewButton[] = [
  { label: 'Відкрити', tone: 'primary' },
  { label: 'Продовжити', tone: 'secondary' },
]

function sectionLabel(section: string) {
  if (section === 'students') return 'Користувачі'
  if (section === 'content') return 'Content Machine'
  if (section === 'leadmagnet') return 'Воронка'
  if (section === 'ai-seo') return 'SEO'
  if (section === 'system') return 'Система'
  if (section === 'analytics') return 'Аналітика'
  return 'Мій кабінет'
}

export default function DashboardPreviewLaunchBar({
  section,
  currentRole,
}: {
  section: string
  currentRole: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<CrossChannelPreviewMode>('miniapp')

  const previewableSection = section === 'content' || section === 'leadmagnet'
  const activeFunnelStep = FUNNEL_STEPS[0]
  const sectionTitle = useMemo(() => sectionLabel(section), [section])

  const openMode = (nextMode: CrossChannelPreviewMode) => {
    setMode(nextMode)
    setIsOpen(true)
  }

  return (
    <>
      <div className="dashboard-liquid-card--soft overflow-hidden px-4 py-4">
        <div className="flex flex-col items-center gap-3 lg:flex-row lg:justify-between">
          <div className="text-center lg:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
              Preview
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Відкривай точний preview поточного розділу в модалці без рендеру всередині основного контенту.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-[22px] border border-[rgba(72,94,160,0.28)] bg-[rgba(12,16,27,0.74)] p-2">
            {CHANNELS.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => openMode(channel.id)}
                className="rounded-[16px] border border-[rgba(111,140,224,0.16)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(111,140,224,0.28)] hover:text-[var(--text-primary)]"
              >
                {channel.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CrossChannelPreviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`${sectionTitle} · Preview`}
        description={
          previewableSection
            ? 'Результат відкривається тільки в модалці, щоб основний контент лишався чистим.'
            : 'Для цього розділу ще немає окремого preview.'
        }
        mode={mode}
        onModeChange={setMode}
        moduleName={sectionTitle}
        desktop={
          section === 'content' ? (
            <DesktopPreview />
          ) : section === 'leadmagnet' ? (
            <DesktopFunnelPreview
              title={activeFunnelStep.title}
              description={activeFunnelStep.description}
              trigger={activeFunnelStep.trigger}
            />
          ) : undefined
        }
        miniApp={
          section === 'content' ? (
            <MiniAppPreview roleLabel={currentRole === 'SUPERADMIN' ? 'SuperAdmin' : currentRole === 'ADMIN' ? 'Admin' : 'Expert'} />
          ) : section === 'leadmagnet' ? (
            <MiniAppFunnelPreview
              step={activeFunnelStep.step}
              title={activeFunnelStep.title}
              description={activeFunnelStep.description}
            />
          ) : undefined
        }
        telegram={
          section === 'content' ? (
            <TelegramModulePreview />
          ) : section === 'leadmagnet' ? (
            <div className="mx-auto w-full max-w-[360px]">
              <TelegramPreview
                text={[activeFunnelStep.title, '', activeFunnelStep.description, '', activeFunnelStep.trigger].join('\n')}
                buttons={GENERIC_TELEGRAM_BUTTONS}
                status="ready"
              />
            </div>
          ) : undefined
        }
      />
    </>
  )
}
