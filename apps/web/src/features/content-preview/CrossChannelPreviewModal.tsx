import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { BaseModal } from '@/features/modals/BaseModal'

import { CrossChannelPreviewTabs } from './CrossChannelPreviewTabs'
import type { CrossChannelPreviewMode } from './CrossChannelPreviewTabs'

function modeLabel(mode: CrossChannelPreviewMode) {
  if (mode === 'desktop') return 'Desktop'
  if (mode === 'miniapp') return 'Mini App'
  return 'Telegram'
}

function PreviewMissingState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-6 text-center">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
    </div>
  )
}

export function CrossChannelPreviewModal({
  isOpen,
  onClose,
  title,
  description,
  mode,
  onModeChange,
  desktop,
  miniApp,
  telegram,
  moduleName,
  actions,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  mode: CrossChannelPreviewMode
  onModeChange: (mode: CrossChannelPreviewMode) => void
  desktop?: ReactNode
  miniApp?: ReactNode
  telegram?: ReactNode
  moduleName: string
  actions?: ReactNode
}) {
  const previewNode =
    mode === 'desktop'
      ? desktop
      : mode === 'miniapp'
        ? miniApp
        : telegram

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85"
      containerClassName="items-start pt-4 sm:pt-8"
      panelClassName="max-w-[min(96vw,1120px)] rounded-[32px] border border-[rgba(72,94,160,0.38)] bg-[rgba(8,11,19,0.98)] p-0 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
    >
      <div className="overflow-hidden rounded-[32px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити превʼю"
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(10,14,24,0.78)] text-[var(--text-secondary)] shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition-colors hover:border-[rgba(111,140,224,0.24)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="border-b border-[rgba(92,119,189,0.18)] bg-[linear-gradient(180deg,rgba(22,30,49,0.94),rgba(11,15,25,0.98))] px-6 py-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[rgb(104,146,226)]">
                Cross-Channel Preview
              </p>
              <h3 className="mt-3 text-[1.7rem] font-semibold tracking-tight text-[var(--text-primary)]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {description}
              </p>
            </div>

            {actions ? <div className="w-full">{actions}</div> : null}

            <CrossChannelPreviewTabs mode={mode} onChange={onModeChange} className="mx-auto" />
          </div>
        </div>

        <div className="px-6 py-6">
          {previewNode ? (
            previewNode
          ) : (
            <PreviewMissingState
              title={`${moduleName} не має preview для ${modeLabel(mode)}`}
              description="Цей модуль ще не підключений до shared preview renderers. Коли для нього буде створено окремий state, тут з’явиться точне прев’ю."
            />
          )}
        </div>
      </div>
    </BaseModal>
  )
}
