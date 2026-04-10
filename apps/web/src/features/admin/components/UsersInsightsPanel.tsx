import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Mail, MessageCircle, Search } from 'lucide-react'
import { Button, InfoHint, Select } from '@/ui'
import { useGetUserInsightsQuery, useUpdateBotMessagesMutation } from '../services/ownership.api'

type UserInsightRow = {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  lastLoginAt: string | null
  lastSeenAt: string | null
  telegramUserName: string | null
  source: string
  accessLabel: string
  activityLabel: string
  viewedSummary: string
  risk: 'low' | 'medium' | 'high'
  riskLabel: string
  nextAction: string
  streakDays: number
  actions7d: number
  activeDays7d: number
  estimatedMinutes7d: number
  botMessagesEnabled: boolean
  isLeadOnly: boolean
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatLastSeen(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffHours < 1) return 'щойно'
  if (diffHours < 24) return `${diffHours} год тому`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'вчора'
  if (diffDays < 7) return `${diffDays} дн тому`
  return formatDate(value)
}

function getRiskClasses(risk: UserInsightRow['risk']) {
  if (risk === 'high') return 'border-[rgba(244,114,114,0.22)] bg-[rgba(244,114,114,0.12)] text-[rgb(252,165,165)]'
  if (risk === 'medium') return 'border-[rgba(250,204,21,0.24)] bg-[rgba(250,204,21,0.12)] text-[rgb(253,224,71)]'
  return 'border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.12)] text-[rgb(134,239,172)]'
}

function getSummary(rows: UserInsightRow[]) {
  return {
    total: rows.length,
    engaged7d: rows.filter((item) => item.activeDays7d >= 2).length,
    atRisk: rows.filter((item) => item.risk !== 'low').length,
    expiring: rows.filter((item) => item.accessLabel.toLowerCase().includes('тріал до')).length,
  }
}

function buildCoachEmailHref(item: UserInsightRow) {
  const subject = `Starway · Контакт із користувачем ${item.name}`
  const body = [
    `Привіт, ${item.name}!`,
    '',
    'Пишу тобі зі Starway, щоб допомогти швидко повернутись у процес.',
    '',
    `Що я бачу зараз:`,
    `• Доступ: ${item.accessLabel}`,
    `• Активність: ${item.activityLabel}`,
    `• Наступний крок: ${item.nextAction}`,
    '',
    'Якщо хочеш, я підкажу найкоротший маршрут, з якого варто продовжити саме зараз.',
    '',
    'Відповідай на цей лист, і я допоможу з наступним кроком.',
  ].join('\n')

  const params = new URLSearchParams({
    to: item.email,
    su: subject,
    body,
    fs: '1',
  })

  return `https://mail.google.com/mail/?view=cm&${params.toString()}`
}

const SUMMARY_HINTS = {
  total: {
    label: 'Усього',
    description: 'Скільки користувачів зараз потрапило в таблицю після всіх активних фільтрів.',
    instruction: 'Це робочий обсяг для коуча. Якщо число маленьке, дивись точково; якщо велике, починай із ризику й trial.',
  },
  engaged7d: {
    label: 'Ритм 7д',
    description: 'Користувачі, які були активні щонайменше у 2 різні дні за останні 7 днів.',
    instruction: 'Це сигнал живого ритму. Низьке число означає, що база не тримає темп і потребує повернення в процес.',
  },
  atRisk: {
    label: 'Ризик',
    description: 'Кількість користувачів із середнім або високим ризиком відтоку.',
    instruction: 'Починай роботу саме з них: перевір останню активність, доступ і запропонуй наступний крок або реактивацію.',
  },
  expiring: {
    label: 'Фінал trial',
    description: 'Користувачі, у яких trial ще активний, але вже добігає кінця.',
    instruction: 'Це зона дожиму: підказати цінність, дати вибір плану й не дати втратити ритм після trial.',
  },
  botEnabled: {
    label: 'Бот увімкнено',
    description: 'Користувачі, для яких не заборонено Telegram-повідомлення через ручний повзунок.',
    instruction: 'Якщо треба писати або запускати бот-дії, спершу перевір цей показник і за потреби увімкни повзунок у рядку користувача.',
  },
} as const

type SummaryHintKey = keyof typeof SUMMARY_HINTS

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  ariaLabel: string
}) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.26)]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--accent-rgb),0.12)] bg-[rgba(var(--accent-rgb),0.06)] px-3 py-1.5 text-[11px] font-medium text-[rgb(var(--accent-soft-rgb))] transition-colors hover:border-[rgba(var(--accent-rgb),0.2)] hover:bg-[rgba(var(--accent-rgb),0.1)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {icon}
      {label}
    </button>
  )
}

function MiniLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border-b border-[rgba(255,255,255,0.05)] px-3 py-3 last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

export default function UsersInsightsPanel() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useGetUserInsightsQuery({ limit: 200 })
  const [updateBotMessages, { isLoading: isUpdatingBotMessages }] = useUpdateBotMessagesMutation()
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [accessFilter, setAccessFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [actionHintUserId, setActionHintUserId] = useState<string | null>(null)
  const pageSize = 10

  const sourceOptions = useMemo(() => {
    const uniqueSources = [...new Set(data.map((item) => item.source).filter(Boolean))].sort()
    return [{ value: 'all', label: 'Усі джерела' }, ...uniqueSources.map((item) => ({ value: item, label: item }))]
  }, [data])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.filter((item) => {
      const matchesSearch = !query
        || item.name.toLowerCase().includes(query)
        || item.email.toLowerCase().includes(query)
        || (item.telegramUserName ?? '').toLowerCase().includes(query)
      const matchesRisk = riskFilter === 'all' || item.risk === riskFilter
      const matchesSource = sourceFilter === 'all' || item.source === sourceFilter
      const accessValue =
        item.accessLabel.toLowerCase().includes('тріал')
          ? 'trial'
          : item.accessLabel.toLowerCase().includes('без активного') || item.accessLabel.toLowerCase().includes('завершено')
            ? 'inactive'
            : 'active'
      const matchesAccess = accessFilter === 'all' || accessValue === accessFilter
      return matchesSearch && matchesRisk && matchesSource && matchesAccess
    })
  }, [accessFilter, data, riskFilter, search, sourceFilter])

  const summary = getSummary(filtered)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filtered],
  )
  const summaryStats: Array<{ key: SummaryHintKey; label: string; value: number }> = [
    { key: 'total', label: 'Усього', value: summary.total },
    { key: 'engaged7d', label: 'Ритм 7д', value: summary.engaged7d },
    { key: 'atRisk', label: 'Ризик', value: summary.atRisk },
    { key: 'expiring', label: 'Фінал trial', value: summary.expiring },
    { key: 'botEnabled', label: 'Бот увімкнено', value: filtered.filter((item) => item.botMessagesEnabled).length },
  ]

  const openCoachMessage = (item: UserInsightRow) => {
    if (!item.botMessagesEnabled) {
      setActionHintUserId(item.id)
      return
    }

    if (item.telegramUserName) {
      window.open(`https://t.me/${item.telegramUserName}`, '_blank', 'noopener,noreferrer')
      return
    }
    window.open(buildCoachEmailHref(item), '_blank', 'noopener,noreferrer')
  }

  const openZoomAction = (item: UserInsightRow) => {
    if (!item.botMessagesEnabled) {
      setActionHintUserId(item.id)
      return
    }

    navigate('/dashboard/zoom')
  }

  const openOfferAction = (item: UserInsightRow) => {
    if (!item.botMessagesEnabled) {
      setActionHintUserId(item.id)
      return
    }

    navigate('/dashboard/products')
  }

  const toggleBotMessages = async (item: UserInsightRow) => {
    await updateBotMessages({
      userId: item.id,
      enabled: !item.botMessagesEnabled,
    }).unwrap()
    setActionHintUserId(item.id)
  }

  return (
    <div className="dashboard-liquid-card overflow-hidden">
      <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-6 py-5">
        <div className="flex flex-col gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Користувачі</p>
              <InfoHint
                label="Користувачі"
                description="Жива coach-таблиця з головними сигналами по кожному користувачу: джерело, активність, що саме дивився, ризик відтоку і найближча дія."
                instruction="Це робочий список для коуча. Спочатку дивись ризик і доступ, далі — що людина реально відкривала і скільки була в ритмі за останні 7 днів."
              />
            </div>
            <h2 className="mt-2 text-[1.55rem] font-medium leading-tight text-[var(--text-primary)]">Користувачі · жива coach-таблиця</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Один список без хаосу: звідки прийшов користувач, що дивився останнім часом, скільки був активний у застосунку і яка наступна дія коуча.
            </p>
          </div>

          <div className="w-full overflow-hidden rounded-[22px] border border-[rgba(var(--accent-rgb),0.08)] bg-[rgba(255,255,255,0.02)]">
            <div className="grid grid-cols-2 lg:grid-cols-5">
              {summaryStats.map((stat, index) => (
                <div
                  key={stat.key}
                  className={[
                    'relative flex min-h-[112px] flex-col justify-center px-5 py-4 text-center',
                    index > 0 ? 'border-l border-[rgba(255,255,255,0.05)]' : '',
                    index > 1 ? 'lg:border-l' : '',
                    index > 1 ? 'border-t lg:border-t-0 border-[rgba(255,255,255,0.05)]' : '',
                  ].join(' ')}
                >
                  <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{stat.label}</p>
                    <InfoHint
                      label={SUMMARY_HINTS[stat.key].label}
                      description={SUMMARY_HINTS[stat.key].description}
                      instruction={SUMMARY_HINTS[stat.key].instruction}
                    />
                  </div>
                  <p className="mt-2 text-[1.9rem] font-medium leading-none text-[var(--text-primary)]">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-[rgba(255,255,255,0.04)] pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Пошук по імені, email або Telegram"
              className="w-full rounded-[16px] border border-[rgba(var(--accent-rgb),0.1)] bg-[rgba(255,255,255,0.035)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.22)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={riskFilter}
              onChange={(value) => {
                setRiskFilter(value)
                setPage(1)
              }}
              ariaLabel="Фільтр за рівнем ризику"
              options={[
                { value: 'all', label: 'Усі ризики' },
                { value: 'high', label: 'Високий ризик' },
                { value: 'medium', label: 'Середній ризик' },
                { value: 'low', label: 'Низький ризик' },
              ]}
            />
            <FilterSelect
              value={accessFilter}
              onChange={(value) => {
                setAccessFilter(value)
                setPage(1)
              }}
              ariaLabel="Фільтр за типом доступу"
              options={[
                { value: 'all', label: 'Усі доступи' },
                { value: 'trial', label: 'Trial' },
                { value: 'active', label: 'Активні' },
                { value: 'inactive', label: 'Неактивні' },
              ]}
            />
            <FilterSelect
              value={sourceFilter}
              onChange={(value) => {
                setSourceFilter(value)
                setPage(1)
              }}
              ariaLabel="Фільтр за джерелом користувача"
              options={sourceOptions}
            />
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-[24px] border border-[rgba(var(--accent-rgb),0.085)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.012))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] lg:block">
          <div className="grid grid-cols-[1.45fr_0.8fr_0.95fr_1fr_0.9fr_0.8fr_0.95fr_1.35fr] divide-x divide-[rgba(255,255,255,0.04)] border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <span className="pr-4">Користувач</span>
            <span className="pl-4">Джерело</span>
            <span className="pl-4">Доступ</span>
            <span className="pl-4">Що дивився</span>
            <span className="pl-4">Активність</span>
            <span className="pl-4">Ризик</span>
            <span className="pl-4">Наступна дія</span>
            <span className="pl-4 text-right">Дії коуча / бот</span>
          </div>

          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {paginated.map((item, index) => (
              <div
                key={item.id}
                className={[
                  'grid grid-cols-[1.45fr_0.8fr_0.95fr_1fr_0.9fr_0.8fr_0.95fr_1.35fr] items-start divide-x divide-[rgba(255,255,255,0.035)] px-5 py-4 text-sm text-[var(--text-secondary)]',
                  index % 2 === 0 ? 'bg-[rgba(255,255,255,0.012)]' : 'bg-[rgba(var(--accent-rgb),0.02)]',
                ].join(' ')}
              >
                <div className="min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-medium text-[var(--text-primary)]">{item.name}</p>
                    {item.isLeadOnly ? (
                      <span className="inline-flex rounded-full border border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(147,197,253)]">
                        Lead-only
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{item.email}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Реєстрація {formatDate(item.createdAt)} · був {formatLastSeen(item.lastSeenAt)}
                  </p>
                </div>
                <div className="pl-4">
                  <p className="text-[15px] font-medium text-[var(--text-primary)]">{item.source}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.telegramUserName ? `@${item.telegramUserName}` : 'без Telegram'}
                  </p>
                </div>
                <div className="pl-4">
                  <p className="text-[15px] font-medium text-[var(--text-primary)]">{item.accessLabel}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">стрік {item.streakDays} · {item.actions7d} дій / 7д</p>
                </div>
                <div className="pl-4">
                  <p className="text-[15px] font-medium text-[var(--text-primary)]">{item.viewedSummary}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.activeDays7d} активних днів</p>
                </div>
                <div className="pl-4">
                  <p className="text-[15px] font-medium text-[var(--text-primary)]">{item.activityLabel}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">останній логін {formatDate(item.lastLoginAt)}</p>
                </div>
                <div className="pl-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getRiskClasses(item.risk)}`}>
                    {item.riskLabel}
                  </span>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{formatLastSeen(item.lastSeenAt)}</p>
                </div>
                <div className="pl-4">
                  <p className="text-[15px] font-medium text-[var(--text-primary)]">{item.nextAction}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.isLeadOnly ? 'Lead magnet only' : item.role}</p>
                </div>
                <div className="space-y-3 pl-4">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">Бот</span>
                    <Button
                      type="button"
                      role="switch"
                      aria-checked={item.botMessagesEnabled}
                      aria-label={item.botMessagesEnabled ? 'Вимкнути всі повідомлення бота' : 'Увімкнути повідомлення бота'}
                      disabled={isUpdatingBotMessages}
                      onClick={() => void toggleBotMessages(item)}
                      className={[
                        'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors disabled:opacity-50',
                        item.botMessagesEnabled
                          ? 'border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.16)]'
                          : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)]',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute h-5 w-5 rounded-full bg-white/90 transition-transform',
                          item.botMessagesEnabled ? 'translate-x-6' : 'translate-x-1',
                        ].join(' ')}
                      />
                    </Button>
                  </div>
                  {!item.botMessagesEnabled ? (
                    <p className="text-right text-[11px] leading-5 text-[rgb(253,224,71)]">
                      Щоб бот написав користувачу, спершу увімкни повзунок.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-2">
                  <ActionButton
                    icon={<MessageCircle className="h-3.5 w-3.5" />}
                    label="Написати"
                    onClick={() => openCoachMessage(item)}
                  />
                  <ActionButton
                    icon={<CalendarPlus className="h-3.5 w-3.5" />}
                    label="Zoom"
                    onClick={() => openZoomAction(item)}
                  />
                  <ActionButton
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label="Offer"
                    onClick={() => openOfferAction(item)}
                  />
                  </div>
                  {actionHintUserId === item.id && !item.botMessagesEnabled ? (
                    <p className="text-right text-[11px] leading-5 text-[var(--text-muted)]">
                      Зараз `Бот` вимкнений, тому спершу увімкни його для цього користувача.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {!isLoading && !paginated.length ? (
              <div className="px-5 py-6 text-sm text-[var(--text-muted)]">Ще немає користувачів для цього режиму.</div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 lg:hidden">
          {paginated.map((item, index) => (
            <div
              key={item.id}
              className={[
                'space-y-3 rounded-[24px] border border-[var(--border)] p-4',
                index % 2 === 0 ? 'bg-[rgba(255,255,255,0.02)]' : 'bg-[rgba(var(--accent-rgb),0.045)]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-medium text-[var(--text-primary)]">{item.name}</p>
                    {item.isLeadOnly ? (
                      <span className="inline-flex rounded-full border border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(147,197,253)]">
                        Lead-only
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-[var(--text-muted)]">{item.email}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getRiskClasses(item.risk)}`}>
                  {item.riskLabel}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <MiniLine label="Джерело" value={item.source} />
                <MiniLine label="Доступ" value={item.accessLabel} />
                <MiniLine label="Що дивився" value={item.viewedSummary} />
                <MiniLine label="Активність" value={item.activityLabel} />
                <MiniLine label="Останній рух" value={formatLastSeen(item.lastSeenAt)} />
                <MiniLine label="Наступна дія" value={item.nextAction} />
              </div>
              <div className="flex items-center justify-between rounded-[16px] border border-[rgba(255,255,255,0.05)] px-3 py-2">
                <span className="text-xs font-medium text-[var(--text-muted)]">Повідомлення бота</span>
                <Button
                  type="button"
                  role="switch"
                  aria-checked={item.botMessagesEnabled}
                  aria-label={item.botMessagesEnabled ? 'Вимкнути всі повідомлення бота' : 'Увімкнути повідомлення бота'}
                  disabled={isUpdatingBotMessages}
                  onClick={() => void toggleBotMessages(item)}
                  className={[
                    'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors disabled:opacity-50',
                    item.botMessagesEnabled
                      ? 'border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.16)]'
                      : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute h-5 w-5 rounded-full bg-white/90 transition-transform',
                      item.botMessagesEnabled ? 'translate-x-6' : 'translate-x-1',
                    ].join(' ')}
                  />
                </Button>
              </div>
              {!item.botMessagesEnabled ? (
                <p className="text-[11px] leading-5 text-[rgb(253,224,71)]">
                  Щоб бот написав користувачу, спершу увімкни повзунок `Бот`.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <ActionButton
                  icon={<MessageCircle className="h-3.5 w-3.5" />}
                  label="Написати"
                  onClick={() => openCoachMessage(item)}
                />
                <ActionButton
                  icon={<CalendarPlus className="h-3.5 w-3.5" />}
                  label="Zoom"
                  onClick={() => openZoomAction(item)}
                />
                <ActionButton
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="Offer"
                  onClick={() => openOfferAction(item)}
                />
              </div>
              {actionHintUserId === item.id && !item.botMessagesEnabled ? (
                <p className="text-[11px] leading-5 text-[var(--text-muted)]">
                  Зараз `Бот` вимкнений, тому спершу увімкни його для цього користувача.
                </p>
              ) : null}
            </div>
          ))}

          {!isLoading && !paginated.length ? (
            <div className="rounded-[18px] border border-[rgba(255,255,255,0.05)] px-4 py-4 text-sm text-[var(--text-muted)]">Ще немає користувачів для цього режиму.</div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Показано {(filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1)}–{Math.min(currentPage * pageSize, filtered.length)} з {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-40"
            >
              Назад
            </button>
            <span className="rounded-[14px] border border-[var(--border)] bg-[rgba(var(--accent-rgb),0.08)] px-3 py-2 text-sm text-[var(--text-primary)]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-[14px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-40"
            >
              Далі
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
