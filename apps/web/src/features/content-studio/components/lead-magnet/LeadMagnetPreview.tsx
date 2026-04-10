import { useMemo, useState } from 'react'

import { Bot, Globe2 } from 'lucide-react'

import { TelegramPreview } from '@/features/content-preview'
import { PreviewStatusBadge } from '@/features/content-preview/PreviewStatusBadge'
import { normalizePreviewStatus, type PreviewButton } from '@/features/content-preview/types'
import type { LeadMagnet } from '../../types/contentStudio.types'

export function LeadMagnetPreview({ leadMagnet }: { leadMagnet: LeadMagnet }) {
  const [mode, setMode] = useState<'telegram' | 'landing'>('telegram')
  const telegramButtons: PreviewButton[] = useMemo(() => [
    { label: 'Почати діагностику', tone: 'primary' },
    { label: 'Перейти до продукту', tone: 'secondary' },
  ], [])
  const steps = leadMagnet.structure.steps.filter(Boolean)
  const landingHeader = `${leadMagnet.title}\n\n${leadMagnet.promise}\n\n${leadMagnet.structure.hook}`

  return (
    <div className="space-y-3 rounded-[22px] border border-[rgba(250,204,21,0.16)] bg-[rgba(255,255,255,0.025)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(250,204,21)]">Preview</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Живий перегляд для Telegram або landing.</p>
        </div>
        <PreviewStatusBadge status={normalizePreviewStatus(leadMagnet.status)} />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setMode('telegram')} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${mode === 'telegram' ? 'border-[rgba(250,204,21,0.28)] bg-[rgba(250,204,21,0.12)] text-[rgb(250,204,21)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'}`}>
          <Bot className="h-3.5 w-3.5" />
          Telegram
        </button>
        <button type="button" onClick={() => setMode('landing')} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${mode === 'landing' ? 'border-[rgba(250,204,21,0.28)] bg-[rgba(250,204,21,0.12)] text-[rgb(250,204,21)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'}`}>
          <Globe2 className="h-3.5 w-3.5" />
          Landing
        </button>
      </div>

      {mode === 'telegram' ? (
        <TelegramPreview
          text={[
            leadMagnet.title,
            leadMagnet.structure.hook,
            leadMagnet.structure.explanation,
            ...steps.map((step, index) => `${index + 1}. ${step}`),
            leadMagnet.structure.result,
            leadMagnet.structure.transitionToProduct,
          ].join('\n\n')}
          buttons={telegramButtons}
          status={normalizePreviewStatus(leadMagnet.status)}
        />
      ) : (
        <div className="rounded-[24px] border border-[rgba(250,204,21,0.16)] bg-[linear-gradient(180deg,rgba(250,204,21,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgb(250,204,21)]">Landing preview</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{leadMagnet.title}</h3>
          <p className="mt-2 text-base leading-7 text-[var(--text-secondary)]">{leadMagnet.promise}</p>
          <div className="mt-4 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{leadMagnet.structure.hook}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{leadMagnet.structure.explanation}</p>
          </div>
          <ol className="mt-4 space-y-2">
            {steps.map((step, index) => (
              <li key={`${index}-${step}`} className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-primary)]">
                <span className="mr-2 text-[rgb(250,204,21)]">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-[18px] border border-[rgba(250,204,21,0.18)] bg-[rgba(250,204,21,0.08)] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{leadMagnet.structure.result}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{leadMagnet.structure.transitionToProduct}</p>
          </div>
          <div className="mt-4 inline-flex rounded-full border border-[rgba(250,204,21,0.22)] bg-[rgba(250,204,21,0.12)] px-3 py-1.5 text-xs font-semibold text-[rgb(250,204,21)]">
            CTA → продукт
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">{landingHeader}</p>
        </div>
      )}
    </div>
  )
}
