import { useEffect, useMemo, useState } from 'react'

import { CheckCircle2, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'

import { Textarea } from '@/ui'

import type { ContentStudioItem } from '../types/contentStudio.types'

type TextVariantPreset = {
  title: string
  badge: string
  tone: string
}

type Props = {
  sectionTitleClass: string
  groups: ReadonlyArray<{ key: string; label: string }>
  activeGroup: string
  setActiveGroup: (value: string) => void
  formulaType: string
  selectedHookLabel: string
  isGenerating: boolean
  isStrategyReady: boolean
  runGenerateAll: () => Promise<ContentStudioItem[] | undefined>
  textItems: ContentStudioItem[]
  busyItemId: string | null
  onRegenerateItem: (item: ContentStudioItem) => Promise<ContentStudioItem | null> | ContentStudioItem | null
  onApproveItem: (id: string) => void
  onCopy: (value: string) => Promise<void> | void
  onUpdateItemContent: (id: string, value: string) => void
  textVariantPresets: ReadonlyArray<TextVariantPreset>
}

export default function ContentStudioTextsStep(props: Props) {
  const {
    sectionTitleClass,
    groups,
    activeGroup: currentGroup,
    setActiveGroup,
    formulaType,
    selectedHookLabel,
    isGenerating,
    runGenerateAll,
    textItems,
    busyItemId,
    onRegenerateItem,
    onApproveItem,
    onCopy,
    onUpdateItemContent,
    textVariantPresets,
  } = props

  const hasLiveCards = textItems.length > 0
  const [selectedTextItemId, setSelectedTextItemId] = useState<string | null>(null)

  const visibleTextItems = useMemo(() => {
    if (!hasLiveCards) return []
    const seen = new Set<string>()
    return textItems
      .filter((item) => {
        const fingerprint = [item.title.trim().toLowerCase(), item.content.join('\n').trim().toLowerCase()].join('::')
        if (seen.has(fingerprint)) return false
        seen.add(fingerprint)
        return true
      })
      .slice(0, 3)
  }, [hasLiveCards, textItems])

  useEffect(() => {
    if (!hasLiveCards) {
      setSelectedTextItemId(null)
      return
    }

    const latestApproved =
      textItems
        .filter((item) => item.status === 'approved' || item.status === 'published')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.id ?? null

    setSelectedTextItemId(latestApproved)
  }, [hasLiveCards, textItems])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveGroup(group.key)}
            className={[
              'rounded-[18px] border px-4 py-2 text-sm font-semibold transition-colors',
              currentGroup === group.key
                ? 'border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.1)] text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.025)] text-[var(--text-secondary)]',
            ].join(' ')}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={sectionTitleClass}>Три варіанти тексту</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Кожна картка нижче вже є готовим блоком продажу: її можна уточнювати, копіювати, підтвердити або перегенерувати. Поточний hook, який впливає на цей крок: {selectedHookLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(255,122,89,0.22)] bg-[rgba(255,122,89,0.1)] px-3 py-1 text-[11px] font-semibold text-[rgb(255,160,130)]">
              {formulaType} формула
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await runGenerateAll()
                  toast.success('Згенеровано')
                } catch (error) {
                  console.error('[ContentStudioTextsStep] regenerate all failed', error)
                  toast.error('Не вдалося згенерувати')
                }
              }}
              disabled={isGenerating}
              className="rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                {isGenerating ? 'Перегенерація…' : 'Перегенерувати всі'}
              </span>
            </button>
          </div>
        </div>
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
          {(hasLiveCards ? visibleTextItems : textVariantPresets).map((entry, index) => {
            const preset = textVariantPresets[index] ?? textVariantPresets[0]
            const item = hasLiveCards ? (entry as ContentStudioItem) : null
            const bodyText = item
              ? item.content.join('\n\n')
              : [
                  'Вона не чекала дозволу.',
                  'Вона просто вирішила: сьогодні — по-іншому.',
                  'ABsystem не змінює тебе. Він збирає систему, яка перестає зливати твою енергію.',
                ].join('\n\n')

            return (
              <div
                key={item?.id ?? `${preset.badge}-${index}`}
                className={[
                  'flex h-full flex-col rounded-[20px] border px-4 py-4 transition-all',
                  item?.id === selectedTextItemId
                    ? 'border-[rgba(var(--accent-rgb),0.38)] bg-[rgba(var(--accent-rgb),0.08)] shadow-[0_18px_34px_rgba(44,72,180,0.18)]'
                    : 'border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(255,255,255,0.02)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] text-[11px] font-semibold text-[var(--text-muted)]">
                      {preset.tone}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">{preset.title}</p>
                      <span className="mt-2 inline-flex rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-soft-rgb))]">
                        {preset.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[16px] bg-[rgba(7,10,18,0.88)] p-3">
                  <Textarea
                    value={bodyText}
                    onChange={(event) => {
                      if (!item) return
                      onUpdateItemContent(item.id, event.target.value)
                    }}
                    className="min-h-[176px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--text-primary)] outline-none"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (item) {
                          const regenerated = await onRegenerateItem(item)
                          if (regenerated) toast.success('Згенеровано')
                          else toast.error('Не вдалося згенерувати')
                        } else {
                          const generated = await runGenerateAll()
                          if (generated?.length) toast.success('Згенеровано')
                          else toast.error('Не вдалося згенерувати')
                        }
                      } catch (error) {
                        console.error('[ContentStudioTextsStep] regenerate item failed', error)
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
                    onClick={async () => {
                      try {
                        await onCopy(bodyText)
                        toast.success('Скопійовано в буфер обміну')
                      } catch (error) {
                        console.error('[ContentStudioTextsStep] copy failed', error)
                        toast.error('Не вдалося скопіювати текст')
                      }
                    }}
                    className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Копіювати
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (item) {
                        setSelectedTextItemId(item.id)
                        onApproveItem(item.id)
                        toast.success('Картку обрано')
                        return
                      }
                      const generatedItems = await runGenerateAll()
                      const generatedTexts = generatedItems?.filter((nextItem) => nextItem.type === currentGroup) ?? []
                      const generatedItem = generatedTexts[index] ?? generatedTexts[0]
                      if (generatedItem) {
                        setSelectedTextItemId(generatedItem.id)
                        onApproveItem(generatedItem.id)
                        toast.success('Картку обрано')
                      }
                    }}
                    className="rounded-[14px] border border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.12)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {item?.id === selectedTextItemId ? (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[rgb(var(--accent-soft-rgb))]">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    ) : (
                      'Обрати'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
