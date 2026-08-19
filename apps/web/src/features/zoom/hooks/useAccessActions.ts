import { useAppDispatch } from '@/app/hooks'
import { accessApi } from '@/features/auth/services/accessApi'
import {
  useCreateProductPaymentMutation,
  useReportFocusPaymentIssueMutation,
} from '@/features/subscription/services/billing.api'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'
import { api } from '@/services/api'
import { hasConfirmedFocusAccess } from '../utils/zoomCalendar.utils'

type Refetch = () => Promise<unknown> | unknown

type Input = {
  userId: string | null
  zoomAccess: unknown
  setMessage: (message: string | null) => void
  refetchCurrentWeek: Refetch
  refetchUpcoming: Refetch
  refetchMySessions: Refetch
}

export function useAccessActions(input: Input) {
  const dispatch = useAppDispatch()

  const [createProductPayment, { isLoading: isOpeningPayment }] =
    useCreateProductPaymentMutation()

  const [reportFocusPaymentIssue, { isLoading: isReportingPaymentIssue }] =
    useReportFocusPaymentIssueMutation()

  const refreshAccess = async () => {
    input.setMessage(null)

    const telegram = window as {
      Telegram?: {
        WebApp?: {
          initDataUnsafe?: {
            user?: { id?: number }
          }
        }
      }
    }

    const telegramUserId =
      telegram.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null

    const zoomAccessBeforeRefresh = input.zoomAccess

    let responseBody: unknown = null
    let httpStatus: number | null = null
    let focusAccessConfirmed = false

    try {
      const accessResponse = await dispatch(
        accessApi.endpoints.getMySystemState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      )

      if ('data' in accessResponse) {
        const nextSystemState = accessResponse.data

        responseBody = nextSystemState
        httpStatus = 200

        if (nextSystemState) {
          dispatch(
            accessApi.util.upsertQueryData(
              'getMySystemState',
              undefined,
              nextSystemState,
            ),
          )

          focusAccessConfirmed =
            hasConfirmedFocusAccess(nextSystemState)
        }
      } else {
        responseBody = accessResponse.error

        httpStatus =
          typeof accessResponse.error === 'object' &&
          accessResponse.error &&
          'status' in accessResponse.error
            ? Number(accessResponse.error.status ?? 0) || null
            : null
      }
    } catch (error) {
      responseBody = error
    }

    if (focusAccessConfirmed) {
      dispatch(api.util.invalidateTags(['ZoomSession']))

      await Promise.all([
        input.refetchCurrentWeek(),
        input.refetchUpcoming(),
        input.refetchMySessions(),
      ])
    }

    console.info('[ZOOM_ACCESS_REFRESH_FRONTEND]', {
      telegramUserId,
      authSessionUserId: input.userId,
      endpoint: '/access/state',
      httpStatus,
      responseBody,
      zoomAccessBeforeRefresh,
      zoomAccessAfterRefresh:
        typeof responseBody === 'object' && responseBody
          ? ((responseBody as { zoomAccess?: unknown }).zoomAccess ?? null)
          : null,
    })

    input.setMessage(
      focusAccessConfirmed
        ? 'Доступ оновлено.'
        : 'Доступ ще не підтверджено. Якщо вже оплатила, натисни ПРОБЛЕМИ З ОПЛАТОЮ.',
    )

    return focusAccessConfirmed
  }

  const openPayment = async () => {
    input.setMessage(null)

    try {
      const response = await createProductPayment({
        productId: 'focus',
        planCode: '1month',
        source: 'web',
        targetPath: '/miniapp/zoom-calendar?payment=success',
      }).unwrap()

      if (response.status === 'already_active') {
        await refreshAccess()
        return
      }

      const checkoutUrl =
        response.checkoutUrl ?? response.paymentUrl

      if (!checkoutUrl) {
        input.setMessage(
          'Не вдалося відкрити оплату. Натисни ПРОБЛЕМИ З ОПЛАТОЮ.',
        )
        return
      }

      openExternalPaymentUrl(checkoutUrl)
    } catch (error) {
      const paymentError =
        typeof error === 'object' && error
          ? (error as {
              status?: number | string
              data?:
                | { error?: string; message?: string }
                | string
                | null
            })
          : null

      const errorMessage =
        typeof paymentError?.data === 'object' &&
        paymentError.data
          ? (
              paymentError.data.error ??
              paymentError.data.message ??
              null
            )
          : typeof paymentError?.data === 'string'
            ? paymentError.data
            : null

      console.error('[FOCUS_PAYMENT_OPEN_ERROR]', {
        status: paymentError?.status ?? null,
        data: paymentError?.data ?? null,
        error,
      })

      input.setMessage(
        errorMessage ??
          'Не вдалося відкрити оплату. Натисни ПРОБЛЕМИ З ОПЛАТОЮ.',
      )
    }
  }

  const handleReportPaymentIssue = async () => {
    input.setMessage(null)

    try {
      await reportFocusPaymentIssue().unwrap()

      input.setMessage(
        'Проблему з оплатою передано в STARWAY OPS. Перевіряємо транзакцію.',
      )
    } catch {
      input.setMessage(
        'Не вдалося зафіксувати проблему з оплатою. Спробуй ще раз.',
      )
    }
  }

  return {
    refreshAccess,
    handleRefreshAccess: refreshAccess,
    openPayment,
    handleReportPaymentIssue,
    isOpeningPayment,
    isReportingPaymentIssue,
  }
}
