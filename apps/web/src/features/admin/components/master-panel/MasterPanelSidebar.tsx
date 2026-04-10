export type MasterPanelTab = 'prompts' | 'notifications' | 'funnels'
export type MasterPanelItemKind = 'prompt' | 'notification' | 'funnel'

export interface MasterPanelSidebarItem {
  id: string
  tab: MasterPanelTab
  kind: MasterPanelItemKind
  label: string
  tag: string
  hint: string
  promptName?: string
  aliases?: string[]
  notificationIds?: string[]
  notificationModuleId?: string
  funnelAliases?: string[]
  funnelId?: string
}

export interface MasterPanelSidebarSection {
  id: string
  label: string
  items: MasterPanelSidebarItem[]
}

export interface MasterPanelSidebarCounts {
  totalPrompts: number
  changedToday: number
  versionsSaved: number
}

export interface MasterPanelSidebarSectionView {
  id: string
  label: string
  items: MasterPanelSidebarItem[]
}

export const MASTER_PANEL_SECTIONS: MasterPanelSidebarSection[] = [
  {
    id: 'daily-cycle',
    label: 'Щоденний цикл',
    items: [
      {
        id: 'prompt.morning-session',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Ранкова сесія',
        tag: 'core',
        hint: 'Базова ранкова сесія для старту дня',
        promptName: 'morning_session',
        aliases: ['morning', 'morning session', 'ранкова', 'ранкова сесія'],
      },
      {
        id: 'prompt.evening-session',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Вечірня сесія',
        tag: 'core',
        hint: 'Підсумок дня і переведення в аналіз',
        promptName: 'evening_session',
        aliases: ['evening', 'evening session', 'вечірня', 'вечірня сесія'],
      },
      {
        id: 'prompt.microtasks-generation',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Генерація мікрозавдань',
        tag: 'AI',
        hint: 'Контекст і генерація мікрозавдань',
        promptName: 'microtasks_generation',
        aliases: ['microtasks', 'microtasks generation', 'мікрозавдання', 'tasks gen'],
      },
      {
        id: 'prompt.ai-insight-day',
        tab: 'prompts',
        kind: 'prompt',
        label: 'AI-інсайт дня',
        tag: 'AI',
        hint: 'Щоденний інсайт на основі прогресу',
        promptName: 'daily_ai_insight',
        aliases: ['ai insight day', 'daily insight', 'ai-insight', 'інсайт дня'],
      },
    ],
  },
  {
    id: 'analytics-reports',
    label: 'Аналітика і звіти',
    items: [
      {
        id: 'prompt.weekly-report',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Тижневий звіт',
        tag: 'звіт',
        hint: 'Підсумок тижня та наступні кроки',
        promptName: 'weekly_report',
        aliases: ['weekly report', 'тижневий звіт', 'weekly'],
      },
      {
        id: 'prompt.monthly-report',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Місячний звіт',
        tag: 'звіт',
        hint: 'Місячна динаміка та висновки',
        promptName: 'monthly_report',
        aliases: ['monthly report', 'місячний звіт', 'monthly'],
      },
      {
        id: 'prompt.funnel-analysis',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Аналіз воронки',
        tag: 'звіт',
        hint: 'Вузькі місця воронки та точки росту',
        promptName: 'funnel_analysis',
        aliases: ['funnel analysis', 'аналіз воронки', 'воронка'],
      },
    ],
  },
  {
    id: 'wheel',
    label: 'Колесо балансу',
    items: [
      {
        id: 'prompt.wheel-results',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Аналіз результатів',
        tag: 'AI',
        hint: 'Підсумок оцінок по сферах',
        promptName: 'wheel_results_analysis',
        aliases: ['wheel results', 'аналіз результатів', 'wheel', 'balance analysis'],
      },
      {
        id: 'prompt.wheel-recommendations',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Рекомендації по сферах',
        tag: 'AI',
        hint: 'Дії для слабких сфер',
        promptName: 'wheel_sphere_recommendations',
        aliases: ['wheel recommendations', 'рекомендації по сферах', 'сферами'],
      },
    ],
  },
  {
    id: 'notifications',
    label: 'Сповіщення (TG)',
    items: [
      {
        id: 'notification.morning-push',
        tab: 'notifications',
        kind: 'notification',
        label: 'Ранковий пуш',
        tag: 'TG',
        hint: 'Ранкове нагадування в Telegram',
        notificationIds: ['morning-reflection', 'morning-reflection-repeat'],
      },
      {
        id: 'notification.streak-danger',
        tab: 'notifications',
        kind: 'notification',
        label: 'Streak danger',
        tag: 'TG',
        hint: 'Ризик втрати стріка',
        notificationIds: ['streak-danger'],
      },
      {
        id: 'notification.trial-conversion-d6',
        tab: 'notifications',
        kind: 'notification',
        label: 'Trial conversion D6',
        tag: 'TG',
        hint: 'Шостий день тріалу',
        notificationIds: ['trial-conversion-d6'],
      },
    ],
  },
  {
    id: 'content-machine',
    label: 'Content Machine',
    items: [
      {
        id: 'prompt.hook-generator',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Hook generator',
        tag: 'CM',
        hint: 'Генерація хуків для контенту',
        promptName: 'hook_generator',
        aliases: ['hook generator', 'hooks', 'hook'],
      },
      {
        id: 'prompt.reels-script',
        tab: 'prompts',
        kind: 'prompt',
        label: 'Reels script',
        tag: 'CM',
        hint: 'Сценарії для reels',
        promptName: 'reels_script',
        aliases: ['reels script', 'reels', 'script'],
      },
    ],
  },
  {
    id: 'funnels',
    label: 'Воронки',
    items: [
      {
        id: 'funnel.lead-magnet-diagnostics',
        tab: 'funnels',
        kind: 'funnel',
        label: 'Лід-магніт: діагностика',
        tag: 'funnel',
        hint: 'Вхідна діагностика та lead magnet',
        funnelAliases: ['lead magnet', 'diagnostics', 'діагностика', 'lead_magnet'],
      },
      {
        id: 'funnel.trial-to-subscription',
        tab: 'funnels',
        kind: 'funnel',
        label: 'Trial → підписка',
        tag: 'funnel',
        hint: 'Конверсія з trial у paid',
        funnelAliases: ['trial to subscription', 'trial subscription', 'trial', 'purchase'],
      },
    ],
  },
]

export const MASTER_PANEL_ITEMS = MASTER_PANEL_SECTIONS.flatMap((section) => section.items)

export function getDefaultMasterPanelItem(tab: MasterPanelTab) {
  return MASTER_PANEL_ITEMS.find((item) => item.tab === tab) ?? MASTER_PANEL_ITEMS[0]
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[\s_\-→:·/]+/g, '')
}

function matchesAny(source: string, keywords: readonly string[]) {
  const normalizedSource = normalizeLookup(source)
  return keywords.some((keyword) => normalizedSource.includes(normalizeLookup(keyword)))
}

export function matchItemKeywords(source: string, item: Pick<MasterPanelSidebarItem, 'label' | 'hint' | 'aliases'> & Partial<Pick<MasterPanelSidebarItem, 'promptName'>>) {
  const keywords = [
    item.promptName,
    item.label,
    item.hint,
    ...(item.aliases ?? []),
  ].filter((value): value is string => Boolean(value))

  return matchesAny(source, keywords)
}

export function MasterPanelSidebar({
  activeTab,
  tabs,
  sections,
  roleLabel,
  activeItemId,
  counts,
  itemCounts,
  onSelectTab,
  onSelectItem,
}: {
  activeTab: MasterPanelTab
  tabs: Array<{ id: MasterPanelTab; label: string }>
  sections: MasterPanelSidebarSectionView[]
  roleLabel: string
  activeItemId: string
  counts: MasterPanelSidebarCounts
  itemCounts: Record<string, number>
  onSelectTab: (tab: MasterPanelTab) => void
  onSelectItem: (item: MasterPanelSidebarItem) => void
}) {
  return (
    <aside className="flex h-full min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-[30px] border border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text-secondary)] shadow-[0_24px_60px_rgba(0,0,0,0.34)]">
      <div className="border-b border-[var(--admin-sidebar-border)] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--accent-rgb),0.18)] text-[var(--admin-sidebar-text-primary)]">
            ★
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--admin-sidebar-text-primary)]">
              Starway Studio
            </p>
            <span className="mt-2 inline-flex rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.12)] px-3 py-1 text-[12px] font-semibold text-[rgb(var(--accent-soft-rgb))]">
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-5 border-b border-[var(--admin-sidebar-border)] pb-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={[
                  'relative pb-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[var(--admin-sidebar-text-primary)]'
                    : 'text-[var(--admin-sidebar-text-muted)] hover:text-[var(--admin-sidebar-text-secondary)]',
                ].join(' ')}
              >
                {tab.label}
                {isActive ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--admin-sidebar-accent-border)]" />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.id} className="space-y-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--admin-sidebar-text-muted)]">
              {section.label}
            </p>

            <div className="space-y-2">
              {section.items.map((item) => {
                const isActive = item.id === activeItemId
                const itemCount = itemCounts[item.id]

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className={[
                      'flex w-full items-center gap-3 rounded-[20px] border px-3.5 py-3 text-left transition-colors',
                      isActive
                        ? 'border-[var(--admin-sidebar-accent-border)] bg-[var(--admin-sidebar-item-active)] text-[var(--admin-sidebar-text-primary)] shadow-[inset_2px_0_0_var(--admin-sidebar-accent-border)]'
                        : 'border-transparent bg-transparent text-[var(--admin-sidebar-text-secondary)] hover:border-[var(--admin-sidebar-border)] hover:bg-[var(--admin-sidebar-item-hover)] hover:text-[var(--admin-sidebar-text-primary)]',
                    ].join(' ')}
                  >
                    <span className={tagDotClass(item.tag)} />

                    <span className="flex min-w-0 flex-1 flex-col justify-center">
                      <span className="block truncate text-[13px] font-semibold leading-5">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-[var(--admin-sidebar-text-muted)]">{item.hint}</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      {typeof itemCount === 'number' ? (
                        <span className="inline-flex min-w-[30px] justify-center rounded-full border border-[var(--admin-sidebar-border)] px-2 py-1 text-[10px] font-semibold text-[var(--admin-sidebar-text-secondary)]">
                          {itemCount}
                        </span>
                      ) : null}
                      <span className={tagBadgeClass(item.tag)}>
                        {item.tag}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--admin-sidebar-border)] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-sidebar-text-muted)]">
          Статистика
        </p>

        <div className="mt-3 space-y-2 text-sm text-[var(--admin-sidebar-text-secondary)]">
          <StatLine label="Всього промптів" value={counts.totalPrompts} />
          <StatLine label="Змінено сьогодні" value={counts.changedToday} />
          <StatLine label="Версій збережено" value={counts.versionsSaved} />
        </div>
      </div>
    </aside>
  )
}

function tagDotClass(tag: string) {
  const normalized = tag.toLowerCase()
  if (normalized === 'core') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--accent-soft-rgb))]'
  if (normalized === 'ai') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-text-success)]'
  if (normalized === 'tg') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-text-info)]'
  if (normalized === 'cm') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-text-warning)]'
  if (normalized === 'cold') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-text-info)]'
  if (normalized === 'warm') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-text-success)]'
  if (normalized === 'hot') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-text-warning)]'
  if (normalized === 're') return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--accent-soft-rgb))]'
  return 'h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--admin-sidebar-text-muted)]'
}

function tagBadgeClass(tag: string) {
  const normalized = tag.toLowerCase()
  const base =
    'inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]'

  if (normalized === 'cold') {
    return `${base} border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.12)] text-[rgb(147,197,253)]`
  }
  if (normalized === 'warm') {
    return `${base} border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.12)] text-[rgb(134,239,172)]`
  }
  if (normalized === 'hot') {
    return `${base} border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.12)] text-[rgb(253,224,71)]`
  }
  if (normalized === 're') {
    return `${base} border-[rgba(var(--accent-rgb),0.2)] bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]`
  }

  return `${base} border-[var(--admin-sidebar-border)] text-[var(--admin-sidebar-text-muted)]`
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold text-[var(--admin-sidebar-text-primary)]">{value}</span>
    </div>
  )
}
