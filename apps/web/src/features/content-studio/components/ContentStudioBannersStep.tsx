import { useState } from 'react'

import toast from 'react-hot-toast'

import { CrossChannelPreviewModal } from '@/features/content-preview'
import type { CrossChannelPreviewMode } from '@/features/content-preview'
import { InfoHint, Textarea } from '@/ui'

import type { ContentStudioItem } from '../types/contentStudio.types'

type BannerVariantPreset = {
  key: string
  title: string
  badge: string
  emoji: string
  imagePrompt: string
}

type Props = {
  sectionTitleClass: string
  adItems: ContentStudioItem[]
  bannerVariantPresets: ReadonlyArray<BannerVariantPreset>
  imageBusyItemId: string | null
  busyItemId: string | null
  isGenerating: boolean
  isStrategyReady: boolean
  onUpdatePrompt: (id: string, value: string) => void
  onGenerateImagesExisting: (item: ContentStudioItem) => Promise<ContentStudioItem | null | undefined> | ContentStudioItem | null | undefined
  onGenerateImagesTemplate: (index: number) => Promise<ContentStudioItem | null | undefined> | ContentStudioItem | null | undefined
  onRegenerateExisting: (item: ContentStudioItem) => Promise<ContentStudioItem | null | undefined> | ContentStudioItem | null | undefined
  onRegenerateTemplate: () => Promise<ContentStudioItem[] | null | undefined> | ContentStudioItem[] | null | undefined
  onApproveItem: (id: string) => void
  onPublishItem: (item: ContentStudioItem) => Promise<void> | void
}

export default function ContentStudioBannersStep(props: Props) {
  const {
    sectionTitleClass,
    adItems,
    bannerVariantPresets,
    imageBusyItemId,
    busyItemId,
    isGenerating,
    isStrategyReady,
    onUpdatePrompt,
    onGenerateImagesExisting,
    onGenerateImagesTemplate,
    onRegenerateExisting,
    onRegenerateTemplate,
    onApproveItem,
    onPublishItem,
  } = props

  const hasLiveCards = adItems.length > 0
  const bannerCards = adItems.slice(0, 6)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState<CrossChannelPreviewMode>('miniapp')
  const previewCard = hasLiveCards ? bannerCards[previewIndex ?? 0] ?? null : null
  const previewPreset = bannerVariantPresets[previewIndex ?? 0] ?? bannerVariantPresets[0]
  const previewTitle = previewCard?.title ?? previewPreset.title
  const previewPrompt = previewCard?.imagePrompt ?? previewPreset.imagePrompt
  const previewImage = previewCard?.generatedImages?.[0]?.url ?? null

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className={sectionTitleClass}>Банери з зображеннями</p>
            <InfoHint label="Банери і реклама" description="Кожен банер відповідає окремому варіанту тексту і має свій image prompt." instruction="Відредагуй prompt, натисни «Генерувати» й після цього переходь у Reels Engine." />
          </div>
          <p className="text-xs text-[var(--text-muted)]">Зображення генеруються через ChatGPT Images / DALL·E</p>
        </div>
        <div className="mt-4 rounded-[18px] border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
          Кожен банер відповідає одній формулі. Відредагуй prompt → натисни “Генерувати” → ChatGPT Images збере візуал під цей кут.
        </div>
        {!isStrategyReady ? <p className="mt-3 text-xs text-[rgb(255,160,130)]">Спочатку підтвердь AI стратегію, щоб банери йшли з правильного контексту.</p> : null}

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-3 auto-rows-fr">
          {Array.from({ length: 6 }, (_, index) => {
            const item = bannerCards[index] ?? null
            const preset = bannerVariantPresets[index] ?? bannerVariantPresets[0]
            const promptValue = item?.imagePrompt ?? preset.imagePrompt
            const imageUrl = item?.generatedImages?.[0]?.url

            return (
              <div key={item?.id ?? preset.key} className="flex h-full flex-col overflow-hidden rounded-[20px] border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{preset.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] text-[14px] text-[rgb(var(--accent-soft-rgb))] grayscale">
                      {preset.emoji}
                    </span>
                    <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-soft-rgb))]">
                      {preset.badge}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col border-t border-[rgba(255,255,255,0.06)] bg-[rgba(7,10,18,0.72)] px-4 py-4">
                  <div className="flex min-h-[180px] flex-1 items-center justify-center rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt={preset.title} className="h-full w-full rounded-[14px] object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center px-4">
                        <div className="text-3xl text-[var(--text-muted)]">🖼</div>
                        <p className="mt-3 max-w-[180px] text-sm text-[var(--text-muted)]">Натисни “Генерувати” для ChatGPT Images</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Image prompt</p>
                    <Textarea
                      value={promptValue}
                      onChange={(event) => {
                        if (!item) return
                        onUpdatePrompt(item.id, event.target.value)
                      }}
                      className="mt-2 min-h-[112px] w-full resize-none rounded-[14px] bg-[rgba(7,10,18,0.82)] px-3 py-3 text-xs leading-5 text-[var(--text-primary)] outline-none"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (item) {
                            const result = await onGenerateImagesExisting(item)
                            if (result) toast.success('Зображення згенеровано')
                            else toast.error('Не вдалося згенерувати зображення')
                            return
                          }
                          const result = await onGenerateImagesTemplate(index)
                          if (result) toast.success('Зображення згенеровано')
                          else toast.error('Не вдалося згенерувати зображення')
                        } catch (error) {
                          console.error('[ContentStudioBannersStep] generate images failed', error)
                          toast.error('Не вдалося згенерувати зображення')
                        }
                      }}
                      disabled={(item ? imageBusyItemId === item.id : isGenerating) || !isStrategyReady}
                      className="rounded-[14px] border border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.14)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {!isStrategyReady ? 'Підтверди AI стратегію' : item && imageBusyItemId === item.id ? 'Генерую…' : 'Генерувати'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (item) {
                            await onRegenerateExisting(item)
                            toast.success('Згенеровано')
                            return
                          }
                          const regenerated = await onRegenerateTemplate()
                          if (regenerated?.length) toast.success('Згенеровано')
                          else toast.error('Не вдалося згенерувати')
                        } catch (error) {
                          console.error('[ContentStudioBannersStep] regenerate failed', error)
                          toast.error('Не вдалося згенерувати')
                        }
                      }}
                      disabled={item ? busyItemId === item.id : isGenerating}
                      className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-60"
                    >
                      ↺ Ще раз
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewIndex(index)
                      }}
                      className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Превʼю
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!item) {
                          setPreviewIndex(index)
                          toast('Спочатку згенеруй банер, щоб опублікувати його.', { icon: '🖼' })
                          return
                        }
                        try {
                          await onPublishItem(item)
                          onApproveItem(item.id)
                          toast.success('Банер опубліковано')
                        } catch (error) {
                          console.error('[ContentStudioBannersStep] publish failed', error)
                          toast.error('Не вдалося опублікувати')
                        }
                      }}
                      className={[
                        'rounded-[14px] border px-3 py-2 text-xs font-semibold transition-colors',
                        item
                          ? 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.1)] text-white hover:border-[rgba(var(--accent-rgb),0.34)]'
                          : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-rgb),0.22)] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                    >
                      Опублікувати
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <CrossChannelPreviewModal
        isOpen={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        title={previewTitle}
        description="Банер можна подивитися як спільний креатив для desktop, mini app і Telegram, а потім опублікувати в потрібний канал."
        mode={previewMode}
        onModeChange={setPreviewMode}
        moduleName={previewTitle}
        desktop={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(7,10,18,0.92)]">
              {previewImage ? (
                <img src={previewImage} alt={previewTitle} className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--text-muted)]">
                  {previewPrompt}
                </div>
              )}
              <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Desktop preview</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Готовий візуал для вебу й рекламного показу.</p>
              </div>
            </div>
          </div>
        }
        miniApp={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(7,10,18,0.92)]">
              {previewImage ? (
                <img src={previewImage} alt={previewTitle} className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--text-muted)]">
                  {previewPrompt}
                </div>
              )}
              <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Mini App preview</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Той самий креатив у мініапці, без втрати контексту.</p>
              </div>
            </div>
          </div>
        }
        telegram={
          <div className="flex items-start justify-center">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(7,10,18,0.92)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Telegram preview</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{previewTitle}</p>
              <div className="mt-4 overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                {previewImage ? (
                  <img src={previewImage} alt={previewTitle} className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--text-muted)]">
                    {previewPrompt}
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      />
    </div>
  )
}
