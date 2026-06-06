import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  useGetUserProductAccessQuery,
  useGetUsersQuery,
  useGrantProductAccessMutation,
  useRevokeProductAccessMutation,
} from '@/features/admin/services/ownership.api'
import type {
  AdminUser,
  ProductAccessNotificationPreview,
  ProductAccessProduct,
  ProductAccessRole,
} from '@/features/admin/services/ownership.types'

const PRODUCT_OPTIONS: Array<{ value: ProductAccessProduct; label: string; description: string }> = [
  {
    value: 'AI_MENTOR',
    label: 'ABsystem',
    description: 'Доступ до ABsystem, користувачів, воронки й робочих блоків менторського продукту.',
  },
  {
    value: 'AI_ASSISTANT',
    label: 'Assistant',
    description: 'Доступ до Assistant і пов’язаних product tools без глобальної зміни ролі.',
  },
]

const ROLE_OPTIONS: Array<{ value: ProductAccessRole; label: string; description: string }> = [
  {
    value: 'EXPERT',
    label: 'EXPERT',
    description: 'Контент, користувачі та продуктова робота без фінансів і без керування ролями.',
  },
  {
    value: 'ADMIN',
    label: 'ADMIN',
    description: 'Ширший product-доступ для операцій, але без права роздавати доступи далі.',
  },
]

function getUserName(user: AdminUser) {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return name || user.email
}

function getProductLabel(product: ProductAccessProduct) {
  return PRODUCT_OPTIONS.find((item) => item.value === product)?.label ?? product
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('uk-UA')
}

function buildAccessEmailHref(input: {
  recipientEmail: string
  recipientName: string
  productLabel: string
  role: ProductAccessRole
}) {
  const subject = `Starway · Доступ до ${input.productLabel}`
  const body = [
    `Привіт, ${input.recipientName}!`,
    '',
    `Тобі відкрито доступ до ${input.productLabel} у ролі ${input.role}.`,
    '',
    'Що потрібно зробити далі:',
    '1. Увійди в Starway під своїм email.',
    '2. У відповідь на цей лист надішли, будь ласка, або свій Telegram username, або номер телефону для звʼязку.',
    '3. Це потрібно, щоб ти могла отримувати службові повідомлення, підтверджувати публікації, відстежувати прогрес користувачів і швидко відповідати їм у роботі.',
    '4. Якщо Telegram вже є, просто надішли username у форматі @username.',
    '',
    'Після цього ми швидко завершуємо налаштування твого робочого контуру в Starway.',
    '',
    `З повагою,`,
    `Vira · SuperAdmin Starway`,
  ].join('\n')

  const params = new URLSearchParams({
    to: input.recipientEmail,
    su: subject,
    body,
    fs: '1',
  })

  return `https://mail.google.com/mail/?view=cm&${params.toString()}`
}

export default function AccessControlPage() {
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery()
  const [grantAccess, { isLoading: granting }] = useGrantProductAccessMutation()
  const [revokeAccess, { isLoading: revoking }] = useRevokeProductAccessMutation()

  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [product, setProduct] = useState<ProductAccessProduct>('AI_MENTOR')
  const [role, setRole] = useState<ProductAccessRole>('EXPERT')
  const [latestNotification, setLatestNotification] = useState<ProductAccessNotificationPreview | null>(null)

  const { data: selectedAccessData, isFetching: loadingAccess } = useGetUserProductAccessQuery(selectedUser?.id ?? '', {
    skip: !selectedUser?.id,
  })

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return users

    return users.filter((user) => {
      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.toLowerCase()
      return user.email.toLowerCase().includes(normalized) || fullName.includes(normalized)
    })
  }, [search, users])

  const emailFallbackHref = useMemo(() => {
    if (!selectedAccessData?.user?.email || !selectedUser) return null

    return buildAccessEmailHref({
      recipientEmail: selectedAccessData.user.email,
      recipientName: getUserName(selectedUser),
      productLabel: getProductLabel(product),
      role,
    })
  }, [product, role, selectedAccessData?.user?.email, selectedUser])

  const handleGrant = async () => {
    if (!selectedUser) return

    try {
      const result = await grantAccess({
        userId: selectedUser.id,
        product,
        role,
      }).unwrap()
      setLatestNotification(result.notification)

      toast.success(
        result.migration?.reassignedUsers
          ? `Доступ видано ${selectedUser.email}. До експерта також прив’язано ${result.migration.reassignedUsers} користувачів із lead magnet.`
          : result.notified
            ? `Доступ видано і Telegram-сповіщення надіслано ${selectedUser.email}`
            : `Доступ видано ${selectedUser.email}`,
      )
    } catch {
      toast.error('Не вдалося видати доступ')
    }
  }

  const handleRevoke = async (targetProduct: ProductAccessProduct) => {
    if (!selectedUser) return

    try {
      await revokeAccess({
        userId: selectedUser.id,
        product: targetProduct,
      }).unwrap()
      toast.success(`Доступ до ${getProductLabel(targetProduct)} відкликано`)
    } catch {
      toast.error('Не вдалося відкликати доступ')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="rounded-[28px] border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(255,255,255,0.02)] px-6 py-6 shadow-[0_24px_60px_rgba(3,8,20,0.34)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--accent-rgb))]">
              Product Access
            </p>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Передача доступу до продуктів
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              SuperAdmin може видавати точковий доступ до ABsystem або Assistant без зміни глобальної ролі користувача.
              Після видачі доступу система надсилає Telegram-повідомлення, якщо акаунт уже прив’язаний.
            </p>
          </div>

          <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.07)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            Лише <span className="font-semibold text-[rgb(var(--accent-rgb))]">SUPERADMIN</span> може видавати або відкликати product-level доступ.
          </div>
        </div>
      </div>

      <div className="dashboard-responsive-split--wide">
        <section className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-5 py-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--accent-rgb))]">
              Користувач
            </p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Обери користувача
            </h2>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Пошук</span>
            <input
              type="text"
              className="input-glass w-full"
              placeholder="Email або ім’я"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
            {usersLoading && (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-4 py-3 text-sm text-[var(--text-muted)]">
                Завантаження користувачів...
              </div>
            )}

            {!usersLoading && filteredUsers.length === 0 && (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-4 py-3 text-sm text-[var(--text-muted)]">
                За цим запитом користувачів не знайдено.
              </div>
            )}

            {filteredUsers.map((user) => {
              const isActive = selectedUser?.id === user.id
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUser(user)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'border-[rgba(var(--accent-rgb),0.38)] bg-[rgba(var(--accent-rgb),0.08)]'
                      : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] hover:border-[rgba(var(--accent-rgb),0.24)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {getUserName(user)}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {user.email}
                      </p>
                    </div>
                    <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {user.role}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-5 py-5 space-y-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--accent-rgb))]">
              Доступ
            </p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Налаштування product-level ролі
            </h2>
          </div>

          {!selectedUser ? (
            <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.015)] px-4 py-6 text-sm text-[var(--text-muted)]">
              Спочатку обери користувача зліва, щоб видати або переглянути доступи.
            </div>
          ) : (
            <>
              <div className="rounded-[24px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.05)] px-4 py-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgb(var(--accent-rgb))]">
                  Обраний користувач
                </p>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {getUserName(selectedUser)}
                </p>
                <p className="text-sm text-[var(--text-muted)]">{selectedUser.email}</p>
              </div>

              {selectedAccessData?.user && (
                <div className="space-y-3 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--accent-rgb))]">
                      Дані користувача з БД
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Контакти й технічні поля, які реально збережені для доставки доступу.
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Email</span>
                      <span className="font-medium text-[var(--text-primary)]">{selectedAccessData.user.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Telegram username</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {selectedAccessData.user.telegramUserName ? `@${selectedAccessData.user.telegramUserName}` : 'Не вказано'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Telegram chat ID</span>
                      <span className="font-medium text-[var(--text-primary)]">{selectedAccessData.user.telegramChatId ?? 'Не вказано'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Telegram user ID</span>
                      <span className="font-medium text-[var(--text-primary)]">{selectedAccessData.user.telegramUserId ?? 'Не вказано'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Telegram прив'язано</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatDateTime(selectedAccessData.user.telegramLinkedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--text-secondary)]">Номер телефону</span>
                      <span className="font-medium text-[var(--text-primary)]">Не зберігається в User</span>
                    </div>
                  </div>

                  {selectedAccessData.user.telegramLinks?.length ? (
                    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                        Активні Telegram-зв'язки
                      </p>
                      <div className="space-y-2">
                        {selectedAccessData.user.telegramLinks.map((link) => (
                          <div key={link.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-[var(--text-secondary)]">{link.chatId ?? 'chatId відсутній'}</span>
                            <span className="text-[var(--text-muted)]">{formatDateTime(link.updatedAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!selectedAccessData.user.telegramChatId && !selectedAccessData.user.telegramUserId && !selectedAccessData.user.telegramUserName && emailFallbackHref ? (
                    <div className="rounded-2xl border border-[rgba(255,184,77,0.18)] bg-[rgba(255,184,77,0.06)] px-4 py-3">
                      <p className="text-sm text-[var(--text-primary)]">
                        У користувача немає Telegram і номера телефону. Найкращий канал зараз — email.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <a
                          href={emailFallbackHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[rgba(var(--accent-rgb),0.28)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-2 text-sm font-semibold text-[rgb(var(--accent-rgb))] transition-all hover:bg-[rgba(var(--accent-rgb),0.18)]"
                        >
                          Написати листа у новій вкладці
                        </a>
                        <span className="inline-flex items-center text-xs text-[var(--text-muted)]">
                          Лист відкриється з шаблоном від поточного SUPERADMIN
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 block">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Продукт</span>
                  <select
                    className="input-glass w-full"
                    value={product}
                    onChange={(event) => setProduct(event.target.value as ProductAccessProduct)}
                    aria-label="Оберіть продукт"
                    title="Оберіть продукт"
                  >
                    {PRODUCT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-[var(--text-muted)]">
                    {PRODUCT_OPTIONS.find((option) => option.value === product)?.description}
                  </p>
                </label>

                <label className="space-y-2 block">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Роль</span>
                  <select
                    className="input-glass w-full"
                    value={role}
                    onChange={(event) => setRole(event.target.value as ProductAccessRole)}
                    aria-label="Оберіть роль"
                    title="Оберіть роль"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-[var(--text-muted)]">
                    {ROLE_OPTIONS.find((option) => option.value === role)?.description}
                  </p>
                </label>
              </div>

              <button
                type="button"
                onClick={handleGrant}
                disabled={granting}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-[rgba(var(--accent-rgb),0.38)] bg-[rgba(var(--accent-rgb),0.14)] px-5 py-3 text-sm font-semibold text-[rgb(var(--accent-rgb))] transition-all hover:bg-[rgba(var(--accent-rgb),0.18)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {granting ? 'Видаємо доступ...' : 'Дати доступ'}
              </button>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--accent-rgb))]">
                      Поточні доступи
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Видано для обраного користувача.
                    </p>
                  </div>
                  {loadingAccess && (
                    <span className="text-xs text-[var(--text-muted)]">Оновлюємо...</span>
                  )}
                </div>

                {selectedAccessData?.accesses?.length ? (
                  <div className="space-y-2">
                    {selectedAccessData.accesses.map((access) => (
                      <div
                        key={access.id}
                        className="flex flex-col gap-3 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] px-4 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {getProductLabel(access.product)}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {access.role} · {new Date(access.createdAt).toLocaleString('uk-UA')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevoke(access.product)}
                          disabled={revoking}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[rgba(244,118,118,0.3)] hover:text-[#f47676] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Відкликати
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.015)] px-4 py-4 text-sm text-[var(--text-muted)]">
                    Для цього користувача ще не видано product-level доступів.
                  </div>
                )}
              </div>

              {latestNotification && (
                <div className="space-y-3 rounded-[24px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(var(--accent-rgb),0.04)] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--accent-rgb))]">
                        Що надіслано користувачу
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">
                        Підтвердження каналу, одержувача і самого повідомлення після видачі доступу.
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      latestNotification.delivered
                        ? 'border border-[rgba(91,196,140,0.28)] bg-[rgba(91,196,140,0.12)] text-[#8de2a9]'
                        : 'border border-[rgba(255,184,77,0.22)] bg-[rgba(255,184,77,0.1)] text-[#f6d28b]'
                    }`}>
                      {latestNotification.delivered ? 'Надіслано' : 'Не доставлено'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Канал</span>
                      <span className="font-medium text-[var(--text-primary)]">Telegram</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Одержувач</span>
                      <span className="font-medium text-[var(--text-primary)]">{latestNotification.recipient.email ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">Chat ID</span>
                      <span className="font-medium text-[var(--text-primary)]">{latestNotification.recipient.chatId ?? 'Не прив’язано'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-2">
                      <span className="text-[var(--text-secondary)]">CTA</span>
                      <span className="font-medium text-[var(--text-primary)]">{latestNotification.cta.label}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                      Текст повідомлення
                    </p>
                    <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-primary)]">
                      {latestNotification.text || 'Повідомлення не сформовано.'}
                    </pre>
                  </div>

                  <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm">
                    <span className="text-[var(--text-secondary)]">Посилання кнопки: </span>
                    <a
                      href={latestNotification.cta.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-medium text-[rgb(var(--accent-rgb))]"
                    >
                      {latestNotification.cta.url}
                    </a>
                  </div>

                  {!latestNotification.delivered && emailFallbackHref ? (
                    <div className="rounded-2xl border border-[rgba(255,184,77,0.18)] bg-[rgba(255,184,77,0.06)] px-4 py-3">
                      <p className="text-sm text-[var(--text-primary)]">
                        Telegram недоступний для цього користувача. Можна одразу перейти на email-фолбек.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <a
                          href={emailFallbackHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[rgba(var(--accent-rgb),0.28)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-2 text-sm font-semibold text-[rgb(var(--accent-rgb))] transition-all hover:bg-[rgba(var(--accent-rgb),0.18)]"
                        >
                          Написати листа у новій вкладці
                        </a>
                        <span className="inline-flex items-center text-xs text-[var(--text-muted)]">
                          Шаблон підготовлено для {selectedAccessData?.user?.email}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
