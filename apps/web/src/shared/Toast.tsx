import { Toaster, toast as hotToast, type ToastOptions } from 'react-hot-toast'

import { TOASTER_CONFIG } from '@/app/config/toaster'
import { getToastMessage, type ToastKey, type ToastLang } from '@/features/notifications/i18n/toast'

type ToastMessageInput =
  | string
  | {
      key: ToastKey
      lang?: ToastLang
    }

function resolveToastMessage(input: ToastMessageInput): string {
  if (typeof input === 'string') return input

  return getToastMessage(input.key, input.lang)
}

export function AppToaster() {
  return <Toaster {...TOASTER_CONFIG} />
}

export const toast = Object.assign(
  (input: ToastMessageInput, options?: ToastOptions) => hotToast(resolveToastMessage(input), options),
  {
    success: (input: ToastMessageInput, options?: ToastOptions) =>
      hotToast.success(resolveToastMessage(input), options),
    error: (input: ToastMessageInput, options?: ToastOptions) =>
      hotToast.error(resolveToastMessage(input), options),
    loading: (input: ToastMessageInput, options?: ToastOptions) =>
      hotToast.loading(resolveToastMessage(input), options),
    dismiss: (toastId?: string) => hotToast.dismiss(toastId),
    remove: (toastId?: string) => hotToast.remove(toastId),
    promise: hotToast.promise,
    custom: hotToast.custom,
    message: resolveToastMessage,
    fromKey: (key: ToastKey, lang: ToastLang = 'uk') => getToastMessage(key, lang),
  },
)

export type AppToast = typeof toast
