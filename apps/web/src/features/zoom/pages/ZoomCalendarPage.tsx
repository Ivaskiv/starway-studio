import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser, selectAuthStatus } from '@/features/auth/services/auth.slice'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { buildTelegramDeepLink } from '@/shared/telegram/telegramDeepLinks'
import ZoomCalendar from '@/features/zoom/ZoomCalendar'
import { useBookTelegramSlotMutation, useGetTelegramAvailableSlotsQuery } from '@/features/zoom/zoom.api'
import { hasPaidAccess } from '@/features/user/types/user.types'
import { useEffect, useMemo, useState } from 'react'

type ViewState = 'locked' | 'personal' | 'pending'

type ZoomCalendarPageProps = Record<string, never>

function formatBookingError(error: unknown): string {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: unknown }).data
    if (typeof data === 'string' && data.trim()) return data
    if (typeof data === 'object' && data && 'error' in data) {
      const message = (data as { error?: unknown }).error
      if (typeof message === 'string' && message.trim()) return message
    }
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }

  return 'невідома'
}

function showTelegramBookingAlert(message: string) {
  if (typeof window === 'undefined') return

  const webApp = (window as {
    Telegram?: {
      WebApp?: {
        showAlert?: (text: string) => void
      }
    }
  }).Telegram?.WebApp

  if (webApp?.showAlert) {
    webApp.showAlert(message)
    return
  }

  window.alert(message)
}

function TelegramSlotBookingView() {
  const {
    data: slots = [],
    isLoading,
    isError,
    refetch,
  } = useGetTelegramAvailableSlotsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })
  const [bookTelegramSlot] = useBookTelegramSlotMutation()
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)

  const handleBook = async (slotId: string) => {
    setBookingSlotId(slotId)
    try {
      await bookTelegramSlot(slotId).unwrap()
      await refetch()
      showTelegramBookingAlert('✅ Записано! Чекай на посилання перед зустріччю.')
    } catch (error) {
      showTelegramBookingAlert(`Помилка: ${formatBookingError(error)}`)
    } finally {
      setBookingSlotId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/80">
        Завантажуємо доступні Zoom-слоти…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/80">
        Не вдалося завантажити доступні Zoom-слоти.
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h1 className="text-2xl font-semibold">📅 Записатись на Zoom</h1>
        <p className="mt-2 text-sm text-white/65">Обери зручний час</p>
      </div>

      {slots.length > 0 ? (
        <div className="grid gap-3">
          {slots.map((slot) => {
            const date = new Date(slot.date)
            const isSubmitting = bookingSlotId === slot.id
            return (
              <div key={slot.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <div className="text-sm font-medium text-white">
                    {date.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })} о {slot.hour}:00
                  </div>
                  <div className="mt-1 text-xs text-white/50">{slot.bookedCount || 0} записано</div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleBook(slot.id)}
                  disabled={slot.isBooked || isSubmitting}
                  className={[
                    'rounded-xl px-4 py-2 text-sm font-semibold transition',
                    slot.isBooked
                      ? 'cursor-not-allowed bg-emerald-500/20 text-emerald-100 opacity-70'
                      : 'bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 disabled:opacity-70',
                  ].join(' ')}
                >
                  {slot.isBooked ? '✓ Записано' : isSubmitting ? '...' : 'Записатись'}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
          Немає доступних слотів на цьому тижні
        </div>
      )}
    </div>
  )
}

export default function ZoomCalendarPage(_: ZoomCalendarPageProps) {
  const user = useAppSelector(selectCurrentUser)
  const authStatus = useAppSelector(selectAuthStatus)
  const [viewState, setViewState] = useState<ViewState>('pending')
  const isTelegramRuntime = isTelegramMiniApp(window.location.pathname)
  const hasTelegramInitData = Boolean(
    typeof window !== 'undefined' &&
      (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim()
  )
  const isCoach = Boolean(user && ['SUPERADMIN', 'ADMIN', 'EXPERT'].includes(user.role))
  const canSeePersonalCalendar = Boolean(user && (isCoach || hasPaidAccess(user)))
  const shouldShowPersonalCalendar = canSeePersonalCalendar
  const isBrowserFallback = !isTelegramRuntime || !hasTelegramInitData
  const shouldUseTelegramSlotBooking = shouldShowPersonalCalendar && !isCoach && isTelegramRuntime && hasTelegramInitData

  useEffect(() => {
    if (canSeePersonalCalendar) {
      setViewState('personal')
      return
    }

    if (isBrowserFallback) {
      setViewState('locked')
      return
    }

    if (authStatus === 'loading') {
      setViewState('pending')
      return
    }

    setViewState('locked')
  }, [canSeePersonalCalendar, isBrowserFallback, authStatus])

  const personalMode = useMemo(() => {
    return isCoach ? 'coach' : 'user'
  }, [isCoach])

  if (viewState === 'pending' || (isTelegramRuntime && authStatus === 'loading' && !user && hasTelegramInitData)) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-white/80">
        Авторизуємо Zoom Calendar…
      </div>
    )
  }

  if (shouldShowPersonalCalendar && user) {
    if (shouldUseTelegramSlotBooking) {
      return <TelegramSlotBookingView />
    }

    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <ZoomCalendar mode={personalMode} userId={user.id} expertId={user.expertId ?? undefined} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center gap-4 px-4 py-10 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h1 className="text-2xl font-semibold">Zoom Calendar</h1>
        <p className="mt-2 text-sm text-white/70">
          Персональний календар доступний тільки після входу через Telegram Mini App або з активним доступом ФОКУС.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="/focus"
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/22"
          >
            Активувати ФОКУС
          </a>
          {!isTelegramRuntime ? (
            <a
              href={buildTelegramDeepLink({ source: 'DIRECT', startParam: 'zoom_calendar' })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Відкрити в Telegram
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
