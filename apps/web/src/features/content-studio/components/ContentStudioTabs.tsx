import { openGlobalAssistant } from '@/features/assistant/lib/assistantBridge'
import { InfoHint } from '@/ui'
import type { ContentItemType, ContentStudioItem } from '../types/contentStudio.types'
import { ContentStudioItemCard } from './ContentStudioItemCard'

const STATUS_STYLES = {
  draft: 'border-white/10 bg-white/5 text-white/65',
  approved: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  published: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
} as const

const REELS_ENGINE_NODES = [
  'Контекст',
  'СТА',
  'Hook',
  'Формула',
  'API',
  'Дослідження',
  'Текст × 3',
  'Банери × 3',
  'Reels Engine',
] as const

const REELS_STAGE_EMOJIS = ['🧭', '💬', '✦', '⚑', '🔌', '🔎', '✍', '🖼', '🚀'] as const

export function ContentStudioScriptsTab({
  sectionTitleClass,
  groups,
  activeGroup,
  setActiveGroup,
  items,
  activeItems,
  activeSummary,
  onOpenSimulator,
  onApproveSection,
  onGenerateAll,
  isGenerating,
  renderItemCard,
}: {
  sectionTitleClass: string
  groups: Array<{ key: ContentItemType; label: string }>
  activeGroup: ContentItemType
  setActiveGroup: (value: ContentItemType) => void
  items: ContentStudioItem[]
  activeItems: ContentStudioItem[]
  activeSummary: { total: number; approved: number; published: number }
  onOpenSimulator: () => void
  onApproveSection: () => void
  onGenerateAll: () => void
  isGenerating: boolean
  renderItemCard: (item: ContentStudioItem) => React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.05)] p-4">
        <div className="flex items-center gap-2">
          <p className={sectionTitleClass}>Пакет перед публікацією</p>
          <InfoHint
            label="Пакет перед публікацією"
            description="Тут повністю видно готові Reels, рекламу, Telegram preview, podcast і DM-логіку перед запуском."
            instruction="На цьому етапі прав текст, підтверджуй сильні варіанти і тільки після цього тисни «Запустити продаж»."
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Кожна картка нижче вже є готовим блоком продажу: її можна редагувати, підтвердити, перегенерувати або відправити далі в publish-flow.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Reels', 'Реклама', 'Stories', 'Podcast', 'DM', 'Telegram'].map((label) => (
            <span
              key={label}
              className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.07)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-soft-rgb))]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {groups.map((group) => {
            const count = items.filter(item => item.type === group.key).length
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroup(group.key)}
                className={[
                  'rounded-[20px] border px-5 py-3 text-sm font-semibold transition-colors',
                  activeGroup === group.key
                    ? 'border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                <span>{group.label}</span>
                <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenSimulator}
            disabled={items.length === 0}
            className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-2 text-sm font-semibold text-[rgb(var(--accent-soft-rgb))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Прожити як користувач
          </button>
          <button
            type="button"
            onClick={onApproveSection}
            disabled={activeItems.length === 0}
            className="rounded-[18px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300"
          >
            Підтвердити все в секції
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: `У секції ${groups.find(group => group.key === activeGroup)?.label ?? ''}`, value: activeSummary.total },
          { label: 'Підтверджені в секції', value: activeSummary.approved },
          { label: 'Опубліковані в секції', value: activeSummary.published },
        ].map(card => (
          <div key={card.label} className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">{card.label}</p>
            <p className="mt-2 text-xl font-medium text-[var(--text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {activeItems.length > 0 ? activeItems.map((item) => renderItemCard(item)) : (
          <div className="border-t border-[rgba(255,255,255,0.06)] px-1 py-8 text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">Тут з’являться готові тексти після генерації.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onGenerateAll}
                disabled={isGenerating}
                className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.32)] bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.26),rgba(103,179,255,0.18))] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[rgba(var(--accent-rgb),0.42)] hover:bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.32),rgba(103,179,255,0.22))] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? 'Генерую пакет…' : 'Згенерувати весь пакет ⚡'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ContentStudioReelsTab({
  sectionTitleClass,
  queueItems,
  completedNodeCount,
  onPrimaryAction,
}: {
  sectionTitleClass: string
  queueItems: Array<{
    id: string
    title: string
    status: 'draft' | 'approved' | 'published'
    formatLabel: string
    sourceItem?: ContentStudioItem
  }>
  completedNodeCount: number
  onPrimaryAction: (item: { id: string; title: string; status: 'draft' | 'approved' | 'published'; formatLabel: string; sourceItem?: ContentStudioItem }) => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
        <p className={sectionTitleClass}>Reels Engine · стан → контент → продаж</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-9">
          {REELS_ENGINE_NODES.map((label, index) => {
            const stepNumber = index + 1
            const isDone = stepNumber < completedNodeCount
            const isActive = stepNumber === completedNodeCount

            return (
              <div
                key={label}
                className={[
                  'flex min-h-[108px] flex-col items-center justify-center rounded-[18px] border px-3 py-3 text-center transition-colors',
                  isDone
                    ? 'border-emerald-400/28 bg-emerald-500/10'
                    : isActive
                      ? 'border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.1)]'
                      : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)]',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border text-[14px] font-semibold grayscale',
                    isDone
                      ? 'border-emerald-400/28 bg-emerald-500/10 text-emerald-300'
                      : isActive
                        ? 'border-[rgba(var(--accent-rgb),0.42)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]'
                        : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]',
                  ].join(' ')}
                >
                  {isDone ? '✓' : REELS_STAGE_EMOJIS[index] ?? '•'}
                </span>
                <p className="mt-2 text-[11px] font-medium leading-4 text-[var(--text-primary)]">{label}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-[22px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
        <p className={sectionTitleClass}>Черга Reels (reels_queue)</p>

        <div className="mt-4 space-y-3">
          {queueItems.map((item, index) => (
            <div
              key={item.id}
              className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,12,20,0.78)] px-4 py-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-sm text-[var(--text-muted)]">
                    {index === 0 ? '🎬' : index === 1 ? '⚙️' : '📝'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{item.formatLabel}</p>
                    <div className="mt-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[item.status]}`}>
                        {item.status === 'draft' && index === 1 ? 'Генерується' : item.status === 'approved' ? 'Підтверджено' : item.status === 'published' ? 'Опубліковано' : 'Чернетка'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:w-[160px] md:flex-col">
                  <button
                    type="button"
                    onClick={() => onPrimaryAction(item)}
                    disabled={!item.sourceItem}
                    className={[
                      'rounded-[14px] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50',
                      item.status === 'approved'
                        ? 'bg-[rgba(38,208,124,0.9)]'
                        : 'bg-[rgba(105,112,255,0.92)]',
                    ].join(' ')}
                  >
                    {item.status === 'approved' ? 'Публікувати' : 'Запустити'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openGlobalAssistant({ mode: 'product_assistant' })}
                    className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]"
                  >
                    Редагувати
                  </button>
                  <button
                    type="button"
                    disabled={!item.sourceItem || item.status === 'draft'}
                    className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] disabled:opacity-50"
                  >
                    Пропустити
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[18px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">DB schema · reels_queue</p>
        <pre className="mt-3 overflow-x-auto rounded-[14px] bg-[rgba(7,10,18,0.88)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
{`model ReelsQueue {
  id        String
  text      String
  imageUrl  String?
  voiceUrl  String?
  finalUrl  String?
  status    String
}`}
        </pre>
      </div>
    </div>
  )
}

export function ContentStudioPublishTab({
  sectionTitleClass,
  sectionCardClass,
  fieldClass,
  dominantGoalLabel,
  payloadReadyCount,
  dmReadyCount,
  trialCtaCount,
  items,
  draftItemsCount,
  approvedItemsCount,
  publishedItemsCount,
  approvedItemsEmpty,
  publishSchedule,
  setPublishSchedule,
  sendTelegram,
  tgStatusText,
  setTgStatusText,
  isStrategyReady,
  onGenerateAll,
  onGenerateFormat,
  isGenerating,
  bundleBusyKey,
  formatGenerationOptions,
  onPublishApprovedItems,
  onOpenQueueStep,
}: {
  sectionTitleClass: string
  sectionCardClass: string
  fieldClass: string
  dominantGoalLabel: string
  payloadReadyCount: number
  dmReadyCount: number
  trialCtaCount: number
  items: ContentStudioItem[]
  draftItemsCount: number
  approvedItemsCount: number
  publishedItemsCount: number
  approvedItemsEmpty: boolean
  publishSchedule: string
  setPublishSchedule: (value: string) => void
  sendTelegram: boolean
  tgStatusText: string
  setTgStatusText: (value: string) => void
  isStrategyReady: boolean
  onGenerateAll: () => void
  onGenerateFormat: (formats: readonly string[]) => void
  isGenerating: boolean
  bundleBusyKey: string | null
  formatGenerationOptions: ReadonlyArray<{ key: string; label: string; itemType: ContentItemType; requestFormats: readonly string[] }>
  onPublishApprovedItems: () => void
  onOpenQueueStep: () => void
}) {
  return (
    <div className="space-y-5">
      <div className={sectionCardClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={sectionTitleClass}>Генерація форматів</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Спочатку згенеруй потрібні формати окремо або весь пакет одразу. Поки пакет порожній, завершити крок не можна.
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerateAll}
            disabled={isGenerating || bundleBusyKey === 'all' || !isStrategyReady}
            className="btn-liquid-dashboard--ice rounded-[18px] px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {!isStrategyReady ? 'Підтверди AI стратегію' : bundleBusyKey === 'all' ? 'Генерую все…' : 'Згенерувати все'}
          </button>
        </div>
        {!isStrategyReady ? <p className="mt-3 text-xs text-[rgb(255,160,130)]">Поки стратегія не підтверджена, генерація тут заблокована.</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {formatGenerationOptions.map((format) => {
            const count = items.filter((item) => item.type === format.itemType).length
            const busy = bundleBusyKey === format.requestFormats.join(',')
            return (
              <div key={format.key} className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{format.label}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {count > 0 ? `Згенеровано: ${count}` : 'Ще не згенеровано'}
                    </p>
                  </div>
                  <span className="rounded-full border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.06)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))]">
                    {format.itemType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onGenerateFormat(format.requestFormats)}
                  disabled={isGenerating || busy || !isStrategyReady}
                  className="mt-4 w-full rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
                >
                  {!isStrategyReady ? 'Підтверди AI стратегію' : busy ? 'Генерую…' : `Згенерувати ${format.label}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid items-start gap-4 min-[480px]:grid-cols-2">
        <div className={`${sectionCardClass} self-start`}>
          <p className={sectionTitleClass}>Telegram</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Щоденна розсилка контенту ментору на перевірку</p>
          <button
            type="button"
            onClick={() => {
              setTgStatusText(sendTelegram ? 'Готово до відправки після підключення review API' : 'Telegram-відправка вимкнена')
            }}
            className="mt-4 rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.16)]"
          >
            Відправити в Telegram
          </button>
          {tgStatusText ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{tgStatusText}</p> : null}
        </div>

        <div className={`${sectionCardClass} self-start`}>
          <p className={sectionTitleClass}>Instagram / планер</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Reels · Stories · DM прогрів</p>
          <select
            value={publishSchedule}
            onChange={(event) => setPublishSchedule(event.target.value)}
            aria-label="Час публікації"
            title="Час публікації"
            className={`mt-4 ${fieldClass}`}
          >
            <option value="Зараз">Зараз</option>
            <option value="Сьогодні 18:00">Сьогодні 18:00</option>
            <option value="Завтра 10:00">Завтра 10:00</option>
            <option value="Обрати час...">Обрати час...</option>
          </select>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPublishApprovedItems}
              disabled={approvedItemsEmpty}
              className="btn-liquid-dashboard--ice rounded-[18px] px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Опублікувати зараз
            </button>
            <button
              type="button"
              onClick={onOpenQueueStep}
              className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.16)]"
            >
              Поставити в чергу
            </button>
          </div>
        </div>
      </div>

      <div className={sectionCardClass}>
        <p className={sectionTitleClass}>DM-скрипти · прогрів і продаж</p>
        {items.filter(item => item.type === 'dm').length > 0 ? (
          <div className="mt-4 space-y-3">
            {items.filter(item => item.type === 'dm').map((item) => (
              <div key={item.id} className="border-t border-[rgba(255,255,255,0.06)] px-1 py-3 text-sm leading-6 text-[var(--text-primary)] first:border-t-0 first:pt-0">
                <p className="font-medium">{item.title}</p>
                <div className="mt-2 space-y-2">
                  {item.content.slice(0, 2).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Запусти генерацію — DM-скрипти з'являться тут.
          </p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Чернетки</p>
            <p className="mt-2 text-xl font-medium text-[var(--text-primary)]">{draftItemsCount}</p>
          </div>
          <div className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Готові</p>
            <p className="mt-2 text-xl font-medium text-[var(--text-primary)]">{approvedItemsCount}</p>
          </div>
          <div className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Опубліковані</p>
            <p className="mt-2 text-xl font-medium text-[var(--text-primary)]">{publishedItemsCount}</p>
          </div>
        </div>
      </div>

      <div className={sectionCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className={sectionTitleClass}>Telegram payload + performance loop</p>
            <InfoHint
              label="Payload + performance"
              description="Тут видно, чи кожен блок уже має Telegram payload, DM entry і trial-ready CTA."
              instruction="Payload потрібен, щоб бот знав джерело ліда. Performance loop потрібен, щоб масштабувати саме ті зв’язки, які реально ведуть у DM і trial."
            />
          </div>
          <span className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.07)] px-3 py-1 text-xs font-medium text-[rgb(var(--accent-soft-rgb))]">
            Поточна ціль: {dominantGoalLabel}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            { label: 'Payload ready', value: payloadReadyCount },
            { label: 'DM entry ready', value: dmReadyCount },
            { label: 'Trial CTA', value: trialCtaCount },
            { label: 'Live conversions', value: 0 },
          ].map((card) => (
            <div key={card.label} className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">{card.label}</p>
              <p className="mt-2 text-2xl font-medium text-[var(--text-primary)]">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[18px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.05)] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Шпаргалка</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Зараз машина вже генерує payload і DM-entry для кожного блоку. Наступний рівень — підключити live-метрики:
            views → DM starts → trial starts → conversions. Тоді система зможе підказувати, який hook і який формат повторити ще 5 разів.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="mt-4 space-y-3">
            {items.slice(0, 6).map((item) => (
              <div key={`${item.id}-payload`} className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.06)] px-1 pt-3 first:border-t-0 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.dmEntry ?? 'DM entry буде сформовано після генерації'}</p>
                </div>
                <span className="rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.07)] px-3 py-1 text-xs font-medium text-[rgb(var(--accent-soft-rgb))]">
                  {item.telegramPayload ?? 'payload pending'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Після генерації тут з’являться payload-и й DM entry для кожного блоку.
          </p>
        )}
      </div>
    </div>
  )
}
