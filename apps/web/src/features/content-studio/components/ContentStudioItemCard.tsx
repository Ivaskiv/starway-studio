import { useState } from 'react'
import { Check, ImagePlus, PencilLine, Play, RefreshCcw } from 'lucide-react'

import {
  AdPreview,
  DMPreview,
  CrossChannelPreviewModal,
  PodcastPreview,
  ReelsPreview,
  StoriesPreview,
  TelegramPreview,
  buildDmSteps,
  buildSubtitles,
  normalizePreviewStatus,
  splitTextSlides,
} from '@/features/content-preview'
import { Textarea } from '@/ui'
import type { CrossChannelPreviewMode } from '@/features/content-preview'
import type { ContentStudioItem } from '../types/contentStudio.types'
import type { PreviewButton } from '@/features/content-preview/types'

const STATUS_STYLES = {
  draft: 'border-white/10 bg-white/5 text-white/65',
  approved: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  published: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
} as const

function getStatusLabel(status: ContentStudioItem['status']) {
  if (status === 'approved') return 'Підтверджено'
  if (status === 'published') return 'Опубліковано'
  return 'Чернетка'
}

function splitMultiline(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function ContentStudioItemCard({
  item,
  onApprove,
  onPublish,
  onRegenerate,
  onGenerateImages,
  onUpdateContent,
  isPublishing,
  isRegenerating,
  isGeneratingImages,
}: {
  item: ContentStudioItem
  onApprove: () => void
  onPublish: () => void
  onRegenerate: () => void
  onGenerateImages: () => void
  onUpdateContent: (content: string[]) => void
  isPublishing: boolean
  isRegenerating: boolean
  isGeneratingImages: boolean
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(true)
  const [isChannelPreviewOpen, setIsChannelPreviewOpen] = useState(false)
  const [channelPreviewMode, setChannelPreviewMode] = useState<CrossChannelPreviewMode>('miniapp')
  const [isEditing, setIsEditing] = useState(false)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [draftText, setDraftText] = useState(item.content.join('\n\n'))

  const playPodcast = () => {
    if (item.type !== 'podcast') return
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(item.content.join('. '))
      utterance.lang = 'uk-UA'
      window.speechSynthesis.speak(utterance)
    }
  }

  const adMetaHook = item.content[0] ?? ''
  const adAidaText = item.content.slice(1)
  const previewStatus = normalizePreviewStatus(item.status)

  const renderVisualPreview = () => {
    if (item.type === 'reel') {
      return (
        <ReelsPreview
          hook={item.hook ?? item.content[0]}
          body={item.content}
          cta={item.cta}
          subtitles={buildSubtitles(item.content)}
          coverImageUrl={item.generatedImages?.[0]?.url}
          status={previewStatus}
        />
      )
    }

    if (item.type === 'ad') {
      return (
        <AdPreview
          hook={adMetaHook}
          body={adAidaText}
          cta={item.cta}
          imagePrompt={item.imagePrompt}
          imageUrl={item.generatedImages?.[0]?.url}
          status={previewStatus}
        />
      )
    }

    if (item.type === 'story') {
      return (
        <StoriesPreview
          slides={splitTextSlides(item.content)}
          cta={item.cta}
          status={previewStatus}
        />
      )
    }

    if (item.type === 'podcast') {
      return (
        <PodcastPreview
          title={item.title}
          subtitles={buildSubtitles(item.content)}
          status={previewStatus}
        />
      )
    }

    return (
      <DMPreview
        steps={buildDmSteps(item.content)}
        status={previewStatus}
      />
    )
  }

  const telegramPreviewButtons = [
    item.cta ? { label: item.cta, tone: 'primary' as const } : null,
    item.dmEntry ? { label: item.dmEntry, tone: 'secondary' as const } : null,
    item.telegramPayload ? { label: item.telegramPayload, tone: 'ghost' as const } : null,
  ].filter(Boolean) as PreviewButton[]
  const funnelPath = item.funnelPath ?? []

  const summaryRows = [
    { label: 'Формат', value: item.formatLabel },
    item.goal
      ? { label: 'Ціль', value: item.goal === 'sale' ? 'Продаж' : item.goal === 'traffic' ? 'Трафік' : 'Прогрів' }
      : null,
    item.topic ? { label: 'Тема', value: item.topic } : null,
    item.offer ? { label: 'Офер', value: item.offer } : null,
    item.cta ? { label: 'CTA', value: item.cta, accent: true } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; accent?: boolean }>

  const strategyRows = item.strategy
    ? [
        { label: 'Angle', value: item.strategy.angle },
        { label: 'Hook type', value: item.strategy.hookType },
        { label: 'Emotion', value: item.strategy.emotion },
        { label: 'Format logic', value: item.strategy.format },
      ]
    : []

  const performanceRows = item.performance
    ? [
        { label: 'Перегляди', value: item.performance.views },
        { label: 'DM', value: item.performance.dm },
        { label: 'Trial', value: item.performance.trial },
        { label: 'Потенціал', value: item.performance.revenue },
      ]
    : []

  const materialsRows = [
    item.dmEntry ? { label: 'DM entry', value: item.dmEntry } : null,
    item.telegramPayload ? { label: 'Telegram payload', value: item.telegramPayload, accent: true } : null,
    item.telegramMessage && item.type !== 'dm' && item.type !== 'ad'
      ? { label: 'Telegram follow-up', value: item.telegramMessage }
      : null,
    item.imagePrompt ? { label: 'Image prompt', value: item.imagePrompt } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; accent?: boolean }>
  const canGenerateImages = item.type === 'ad' || item.type === 'reel' || item.type === 'story' || item.type === 'podcast'

  const codeTitle =
    item.type === 'ad'
      ? 'Текст рекламного поста'
      : item.type === 'podcast'
        ? 'Текст підкасту'
        : item.type === 'story'
          ? 'Текст сторіз'
          : item.type === 'dm'
            ? 'DM-сценарій'
            : 'Текст сценарію'

  return (
    <div className="overflow-hidden rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</p>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[item.status]}`}>
              {getStatusLabel(item.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{item.formatLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-[62%] xl:justify-end">
          <button type="button" onClick={() => setIsPreviewOpen(value => !value)} className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
            {isPreviewOpen ? 'Сховати прев’ю' : 'Прев’ю'}
          </button>
          <div className="inline-flex rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={[
                'rounded-[14px] px-3 py-1.5 text-sm font-semibold transition-colors',
                viewMode === 'preview'
                  ? 'bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]'
                  : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={[
                'rounded-[14px] px-3 py-1.5 text-sm font-semibold transition-colors',
                viewMode === 'code'
                  ? 'bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]'
                  : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              Code
            </button>
          </div>
          <button type="button" onClick={() => setIsEditing(value => !value)} className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="inline-flex items-center gap-2">
              <PencilLine className="h-4 w-4" />
              {isEditing ? 'Готово' : 'Редагувати'}
            </span>
          </button>
          <button type="button" onClick={onApprove} className="rounded-[18px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" />
              Підтвердити
            </span>
          </button>
          <button type="button" onClick={onRegenerate} disabled={isRegenerating} className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60">
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              {isRegenerating ? 'Оновлюю…' : 'Оновити'}
            </span>
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing || item.status === 'draft'}
            className="rounded-[18px] border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 disabled:opacity-60"
          >
            {isPublishing ? 'Публікую…' : 'Публікувати'}
          </button>
        </div>
      </div>

      {isPreviewOpen ? (
        <div className="px-5 py-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="space-y-3">
              <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                    {isEditing ? 'Редагування' : viewMode === 'code' ? codeTitle : 'Опис'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {isEditing
                      ? 'Внеси правки й клікни поза полем, щоб зберегти.'
                      : viewMode === 'code'
                        ? 'Чистий текст без метаданих і шуму.'
                        : 'Основний зміст, логіка й матеріали цього формату.'}
                  </p>
                </div>

                <div className="mt-4">
                  {isEditing ? (
                    <Textarea
                      value={draftText}
                      onChange={(event) => setDraftText(event.target.value)}
                      onBlur={() => onUpdateContent(splitMultiline(draftText))}
                      className="min-h-[420px] w-full bg-transparent text-sm leading-7 text-[var(--text-primary)] outline-none"
                    />
                  ) : viewMode === 'code' ? (
                    <div className="space-y-4">
                      {item.type === 'ad' ? (
                        <>
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                              Meta Hook
                            </p>
                            <p className="text-sm leading-7 text-[var(--text-primary)]">{adMetaHook}</p>
                          </div>
                          <div className="space-y-3 border-t border-[rgba(255,255,255,0.06)] pt-4">
                            {adAidaText.map((paragraph) => (
                              <p key={paragraph} className="text-sm leading-7 text-[var(--text-primary)]">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          {item.content.map((paragraph) => (
                            <p key={paragraph} className="text-sm leading-7 text-[var(--text-primary)]">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {item.content.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-7 text-[var(--text-primary)]">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                  Коротко
                </p>
                <div className="mt-3 space-y-2.5">
                  {summaryRows.map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {row.label}
                      </span>
                      <span className={`max-w-[70%] text-right text-sm ${row.accent ? 'text-[rgb(var(--accent-soft-rgb))]' : 'text-[var(--text-secondary)]'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {strategyRows.length || funnelPath.length ? (
                <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                    AI логіка
                  </p>
                  {strategyRows.length ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {strategyRows.map((row) => (
                        <div key={row.label}>
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{row.label}</p>
                          <p className="mt-1 text-sm text-[var(--text-primary)]">{row.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {funnelPath.length ? (
                    <div className={strategyRows.length ? 'mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4' : 'mt-3'}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Шлях до оплати</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {funnelPath.map((step, index) => (
                          <div key={`${item.id}-${step}`} className="flex items-center gap-2">
                            <span className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.07)] px-3 py-1 text-xs font-medium text-[rgb(var(--accent-soft-rgb))]">
                              {step}
                            </span>
                            {index < funnelPath.length - 1 ? (
                              <span className="text-xs text-[var(--text-muted)]">→</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {performanceRows.length ? (
                <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                      Прогноз
                    </p>
                    {item.launchReady ? (
                      <span className="rounded-full border border-[rgba(94,234,212,0.24)] bg-[rgba(94,234,212,0.08)] px-3 py-1 text-[11px] font-semibold text-[rgb(94,234,212)]">
                        Готово до запуску
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {performanceRows.map((row) => (
                      <div key={row.label}>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{row.label}</p>
                        <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {materialsRows.length || item.type === 'podcast' ? (
                <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                        Матеріали
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Усе допоміжне для публікації й передачі в канал.
                      </p>
                    </div>
                    {item.type === 'podcast' ? (
                      <button type="button" onClick={playPodcast} className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                        <Play className="h-4 w-4" />
                        Прослухати
                      </button>
                    ) : null}
                  </div>
                  {canGenerateImages ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onGenerateImages}
                        disabled={isGeneratingImages}
                        className="inline-flex items-center gap-2 rounded-[18px] border border-[rgba(var(--accent-rgb),0.28)] bg-[rgba(var(--accent-rgb),0.1)] px-4 py-2 text-sm font-semibold text-[rgb(var(--accent-soft-rgb))] disabled:opacity-60"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {isGeneratingImages ? 'Генерую 5 зображень…' : 'Згенерувати 5 зображень'}
                      </button>
                      <p className="text-xs text-[var(--text-muted)]">
                        ChatGPT підготує 5 візуальних варіантів на основі поточного prompt.
                      </p>
                    </div>
                  ) : null}
                  {materialsRows.length ? (
                    <div className="mt-3 space-y-3">
                      {materialsRows.map((row) => (
                        <div key={row.label}>
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{row.label}</p>
                          <p className={`mt-1 text-sm leading-6 ${row.accent ? 'text-[rgb(var(--accent-soft-rgb))]' : 'text-[var(--text-secondary)]'}`}>
                            {row.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {item.generatedImages?.length ? (
                    <div className={materialsRows.length || canGenerateImages ? 'mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4' : 'mt-3'}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">5 згенерованих варіантів</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {item.generatedImages.map((image, index) => (
                          <div key={image.id} className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
                            <img src={image.url} alt={`${item.title} image ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
                            <div className="px-3 py-2">
                              <p className="text-xs font-medium text-[var(--text-primary)]">Варіант {index + 1}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {item.type === 'podcast' ? (
                    <div className={materialsRows.length || item.generatedImages?.length || canGenerateImages ? 'mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4' : 'mt-3'}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Текст підкасту</p>
                      <div className="mt-2 space-y-3">
                        {item.content.map((paragraph) => (
                          <p key={paragraph} className="text-sm leading-7 text-[var(--text-secondary)]">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="xl:sticky xl:top-4 xl:self-start">
              <div className="dashboard-liquid-card overflow-hidden rounded-[24px] border border-[var(--border)]">
                <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-5 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
                    Превʼю каналу
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Повний preview відкривається в модалці, щоб не дублювати блоки й не ламати сторінку.
                  </p>
                </div>
                <div className="px-5 py-5">
                  <button
                    type="button"
                    onClick={() => {
                      setChannelPreviewMode('miniapp')
                      setIsChannelPreviewOpen(true)
                    }}
                    className="w-full rounded-[18px] border border-[rgba(121,145,209,0.38)] bg-[linear-gradient(180deg,rgba(111,128,157,0.96),rgba(54,72,115,0.98))] px-5 py-3 text-sm font-semibold text-white transition-transform hover:translate-y-[-1px]"
                  >
                    Відкрити preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <CrossChannelPreviewModal
        isOpen={isChannelPreviewOpen}
        onClose={() => setIsChannelPreviewOpen(false)}
        title="Превʼю каналу"
        description="Один і той самий контент можна переглянути як desktop, mini app і Telegram без втрати контексту."
        mode={channelPreviewMode}
        onModeChange={setChannelPreviewMode}
        moduleName={item.title}
        desktop={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[320px]">{renderVisualPreview()}</div>
          </div>
        }
        miniApp={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[320px]">{renderVisualPreview()}</div>
          </div>
        }
        telegram={
          item.telegramMessage || item.telegramPayload || item.cta ? (
            <div className="flex items-start justify-center">
              <div className="w-full max-w-[320px]">
                <TelegramPreview
                  text={item.telegramMessage ?? item.dmEntry ?? item.content.slice(0, 2).join(' ')}
                  buttons={telegramPreviewButtons}
                  status={previewStatus}
                />
              </div>
            </div>
          ) : undefined
        }
      />
    </div>
  )
}
