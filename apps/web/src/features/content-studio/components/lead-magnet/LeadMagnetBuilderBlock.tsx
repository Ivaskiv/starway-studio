import { CheckCircle2, PenLine, RefreshCcw, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button, InfoHint } from '@/ui'
import type { ContentStudioAIStrategy, ContentStudioFunnelInsight, ContentStudioLeadMagnetPayload, LeadMagnet, LeadMagnetDestination } from '../../types/contentStudio.types'
import { buildLeadMagnetDestinationsLabel, generateLeadMagnet, leadMagnetToPayload } from '../../utils/leadMagnetBuilder'
import { LeadMagnetEditor } from './LeadMagnetEditor'
import { LeadMagnetPreview } from './LeadMagnetPreview'

const REVIEW_CHECKLIST = [
  'зрозуміло з перших секунд',
  'є швидкий результат',
  'є 1 чіткий крок',
  'є перехід у продукт',
  'немає AI-стилю',
] as const

const FORMAT_LABELS: Record<string, string> = {
  checklist: 'Чекліст',
  guide: 'Гайд',
  quiz: 'Квіз',
  exercise: 'Міні-практика',
  'bot-flow': 'Bot flow',
  mini_practice: 'Міні-практика',
  micro_wheel: 'Мікро-колесо',
  pdf: 'PDF',
  video: 'Відео',
}

export function LeadMagnetBuilderBlock(props: {
  insight: ContentStudioAIStrategy | null
  funnelInsight: ContentStudioFunnelInsight | null
  productLabel: string
  formatKey: string
  formatLabel: string
  aiInsight: string
  confirmations: boolean[]
  setConfirmations: (value: boolean[]) => void
  destinations: LeadMagnetDestination[]
  setDestinations: (value: LeadMagnetDestination[]) => void
  leadMagnet: LeadMagnet | null
  setLeadMagnet: (value: LeadMagnet | null) => void
  onSave: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>
  onPublish: (payload: ContentStudioLeadMagnetPayload) => Promise<unknown>
  onReset: () => void
}) {
  const {
    insight,
    funnelInsight,
    productLabel,
    formatKey,
    formatLabel: providedFormatLabel,
    aiInsight,
    confirmations,
    setConfirmations,
    destinations,
    setDestinations,
    leadMagnet,
    setLeadMagnet,
    onSave,
    onPublish,
    onReset,
  } = props

  const readyCount = confirmations.filter(Boolean).length
  const canPublish = Boolean(leadMagnet && leadMagnet.status === 'approved' && readyCount === REVIEW_CHECKLIST.length)
  const selectedInsight = insight ?? null
  const fallbackInsight: Pick<ContentStudioAIStrategy, 'coreProblem' | 'weakestStep' | 'reasons' | 'actions'> = selectedInsight ?? {
    coreProblem: aiInsight,
    weakestStep: funnelInsight?.weakestStableStep ?? null,
    reasons: [],
    actions: [],
  }
  const formatDisplayLabel = leadMagnet?.format ? FORMAT_LABELS[leadMagnet.format] ?? leadMagnet.format : FORMAT_LABELS[formatKey] ?? providedFormatLabel ?? formatKey

  const handleGenerate = () => {
    if (!selectedInsight) {
      toast.error('AI strategy ще не готова')
      return
    }
    setLeadMagnet(generateLeadMagnet({ insight: selectedInsight, funnelInsight, formatKey, productLabel }))
  }

  const updateLeadMagnet = (next: LeadMagnet) => setLeadMagnet(next)

  const handleSave = async () => {
    if (!leadMagnet) return
    const payload = leadMagnetToPayload({
      leadMagnet,
      insight: fallbackInsight,
      formatLabel: formatDisplayLabel,
      formatKey,
      funnelStepLabel: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel') ? 'lead magnet → wheel' : 'lead magnet → app entry',
      realConversion: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel')?.realConversion ?? '0%',
      idealConversion: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel')?.idealConversion ?? '70%',
      sampleSize: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel')?.sampleSize ?? 0,
      aiInsight,
      confirmations: REVIEW_CHECKLIST.filter((_, index) => confirmations[index]),
      productLabel,
    })
    payload.destinations = destinations
    payload.status = leadMagnet.status
    await onSave(payload)
  }

  const handlePublish = async () => {
    if (!leadMagnet || leadMagnet.status !== 'approved' || !canPublish) {
      toast.error('Спочатку підтвердь лідмагніт')
      return
    }
    const payload = leadMagnetToPayload({
      leadMagnet: { ...leadMagnet, destinations },
      insight: fallbackInsight,
      formatLabel: formatDisplayLabel,
      formatKey,
      funnelStepLabel: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel') ? 'lead magnet → wheel' : 'lead magnet → app entry',
      realConversion: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel')?.realConversion ?? '0%',
      idealConversion: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel')?.idealConversion ?? '70%',
      sampleSize: funnelInsight?.steps.find((step) => step.step === 'lead_magnet_to_wheel')?.sampleSize ?? 0,
      aiInsight,
      confirmations: REVIEW_CHECKLIST.filter((_, index) => confirmations[index]),
      productLabel,
    })
    payload.destinations = destinations
    payload.status = 'approved'
    await onPublish(payload)
    setLeadMagnet({ ...leadMagnet, status: 'published', destinations })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-[rgba(250,204,21,0.18)] bg-[linear-gradient(180deg,rgba(250,204,21,0.14)_0%,rgba(255,255,255,0.03)_100%)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(250,204,21)]">Step 10 · Lead magnet</p>
              <span className="rounded-full border border-[rgba(250,204,21,0.24)] bg-[rgba(250,204,21,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(250,204,21)]">NEW</span>
            </div>
            <h3 className="mt-2 text-[1.8rem] font-semibold text-[var(--text-primary)]">AI Insight → Lead Magnet → Preview → Edit → Review → Publish</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Це не просто генерація тексту. Тут ми збираємо лідмагніт як контрольований продукт: створюємо, редагуємо, переглядаємо, перевіряємо і тільки потім публікуємо.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleGenerate} className="btn-liquid-dashboard--ice inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              Згенерувати
            </Button>
            <Button type="button" onClick={handleSave} className="dashboard-liquid-card--soft inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              <RefreshCcw className="h-4 w-4" />
              Зберегти
            </Button>
          </div>
        </div>
      </div>

      {leadMagnet ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <LeadMagnetEditor leadMagnet={leadMagnet} onChange={updateLeadMagnet} />
            <div className="rounded-[22px] border border-[rgba(250,204,21,0.16)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(250,204,21)]">Review</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">AI reasoning, checklist and approval gate.</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${leadMagnet.status === 'approved' ? 'border-[rgba(94,234,212,0.22)] bg-[rgba(94,234,212,0.08)] text-[rgb(94,234,212)]' : 'border-[rgba(250,204,21,0.22)] bg-[rgba(250,204,21,0.08)] text-[rgb(250,204,21)]'}`}>
                  {leadMagnet.status}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[18px] border border-[rgba(250,204,21,0.16)] bg-[rgba(250,204,21,0.08)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[rgb(250,204,21)]">Core problem</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{selectedInsight?.coreProblem ?? aiInsight}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(250,204,21,0.16)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[rgb(250,204,21)]">Weakest step</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{selectedInsight?.weakestStep ?? funnelInsight?.weakestStableStep ?? 'lead_magnet_to_wheel'}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(250,204,21,0.16)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[rgb(250,204,21)]">Destinations</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{buildLeadMagnetDestinationsLabel(destinations)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {REVIEW_CHECKLIST.map((item, index) => {
                  const checked = confirmations[index] ?? false
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        const next = [...confirmations]
                        next[index] = !checked
                        setConfirmations(next)
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${checked ? 'border-[rgba(94,234,212,0.22)] bg-[rgba(94,234,212,0.08)] text-[rgb(94,234,212)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'}`}
                    >
                      {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">{index + 1}</span>}
                      {item}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => setLeadMagnet({ ...leadMagnet, status: 'approved' })} className="rounded-[16px] border border-[rgba(94,234,212,0.22)] bg-[rgba(94,234,212,0.1)] px-4 py-2 text-sm font-semibold text-[rgb(94,234,212)]">
                  Approve
                </Button>
                <Button type="button" onClick={() => setLeadMagnet({ ...leadMagnet, status: 'review' })} className="rounded-[16px] border border-[rgba(250,204,21,0.18)] bg-[rgba(250,204,21,0.08)] px-4 py-2 text-sm font-semibold text-[rgb(250,204,21)]">
                  Edit
                </Button>
                <Button type="button" onClick={onReset} className="rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
                  Reject
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <LeadMagnetPreview leadMagnet={leadMagnet} />
            <div className="rounded-[22px] border border-[rgba(250,204,21,0.16)] bg-[rgba(255,255,255,0.025)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(250,204,21)]">Publish</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Оберіть куди саме публікувати лідмагніт.</p>
              <div className="mt-3 space-y-2">
                {[
                  { value: 'telegram_bot', label: 'Telegram bot' },
                  { value: 'landing_page', label: 'Landing page' },
                  { value: 'dm_script', label: 'DM script' },
                ].map((option) => {
                  const checked = destinations.includes(option.value as LeadMagnetDestination)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDestinations(checked ? destinations.filter((item) => item !== option.value) : [...destinations, option.value as LeadMagnetDestination])}
                      className={`flex w-full items-center justify-between rounded-[16px] border px-3 py-2.5 text-left ${checked ? 'border-[rgba(250,204,21,0.24)] bg-[rgba(250,204,21,0.08)] text-[var(--text-primary)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'}`}
                    >
                      <span>{option.label}</span>
                      <span className="text-xs">{checked ? '✓' : '○'}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="button" onClick={handlePublish} disabled={!canPublish} className="btn-liquid-dashboard--ice inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                  <PenLine className="h-4 w-4" />
                   Опублікувати
                </Button>
                <span className="self-center text-xs text-[var(--text-muted)]">{canPublish ? 'Лідмагніт підтверджено' : `Підтвердь чекбокси (${readyCount}/5)`}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
